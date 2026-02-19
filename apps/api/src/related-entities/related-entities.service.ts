import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { and, eq, inArray } from 'drizzle-orm';
import { InjectDrizzle } from '../database/drizzle.decorator';
import { DrizzleDB } from '../database/database.module';
import {
  relatedEntityGroups,
  relatedEntityMembers,
  clients,
  locations,
  renditions,
} from '../database/schema';

@Injectable()
export class RelatedEntitiesService {
  constructor(@InjectDrizzle() private db: DrizzleDB) {}

  async createGroup(firmId: string, name: string, notes?: string) {
    const [group] = await this.db
      .insert(relatedEntityGroups)
      .values({ firmId, name, notes })
      .returning();
    return group;
  }

  async findAllGroups(firmId: string) {
    const groups = await this.db
      .select()
      .from(relatedEntityGroups)
      .where(eq(relatedEntityGroups.firmId, firmId))
      .orderBy(relatedEntityGroups.name);

    // Load members for each group
    const result = [];
    for (const group of groups) {
      const members = await this.db
        .select({
          id: relatedEntityMembers.id,
          clientId: relatedEntityMembers.clientId,
          companyName: clients.companyName,
        })
        .from(relatedEntityMembers)
        .innerJoin(clients, eq(relatedEntityMembers.clientId, clients.id))
        .where(eq(relatedEntityMembers.groupId, group.id));

      result.push({ ...group, members });
    }

    return result;
  }

  async addMember(firmId: string, groupId: string, clientId: string) {
    // Verify group belongs to firm
    const [group] = await this.db
      .select()
      .from(relatedEntityGroups)
      .where(
        and(
          eq(relatedEntityGroups.id, groupId),
          eq(relatedEntityGroups.firmId, firmId),
        ),
      )
      .limit(1);

    if (!group) {
      throw new NotFoundException('Related entity group not found');
    }

    // Verify client belongs to firm
    const [client] = await this.db
      .select()
      .from(clients)
      .where(
        and(
          eq(clients.id, clientId),
          eq(clients.firmId, firmId),
        ),
      )
      .limit(1);

    if (!client) {
      throw new ForbiddenException('Client not found or access denied');
    }

    try {
      const [member] = await this.db
        .insert(relatedEntityMembers)
        .values({ groupId, clientId })
        .returning();
      return member;
    } catch {
      throw new ConflictException('Client is already a member of this group');
    }
  }

  async removeMember(firmId: string, groupId: string, memberId: string) {
    // Verify group belongs to firm
    const [group] = await this.db
      .select()
      .from(relatedEntityGroups)
      .where(
        and(
          eq(relatedEntityGroups.id, groupId),
          eq(relatedEntityGroups.firmId, firmId),
        ),
      )
      .limit(1);

    if (!group) {
      throw new NotFoundException('Related entity group not found');
    }

    await this.db
      .delete(relatedEntityMembers)
      .where(eq(relatedEntityMembers.id, memberId));

    return { deleted: true };
  }

  async deleteGroup(firmId: string, groupId: string) {
    const [group] = await this.db
      .select()
      .from(relatedEntityGroups)
      .where(
        and(
          eq(relatedEntityGroups.id, groupId),
          eq(relatedEntityGroups.firmId, firmId),
        ),
      )
      .limit(1);

    if (!group) {
      throw new NotFoundException('Related entity group not found');
    }

    // Cascade will delete members
    await this.db
      .delete(relatedEntityGroups)
      .where(eq(relatedEntityGroups.id, groupId));

    return { deleted: true };
  }

  /**
   * Check if a client belongs to any related entity group.
   * Returns the group and all co-members' client IDs.
   */
  async findGroupForClient(firmId: string, clientId: string) {
    const membership = await this.db
      .select({
        groupId: relatedEntityMembers.groupId,
        groupName: relatedEntityGroups.name,
      })
      .from(relatedEntityMembers)
      .innerJoin(
        relatedEntityGroups,
        eq(relatedEntityMembers.groupId, relatedEntityGroups.id),
      )
      .where(
        and(
          eq(relatedEntityMembers.clientId, clientId),
          eq(relatedEntityGroups.firmId, firmId),
        ),
      )
      .limit(1);

    if (membership.length === 0) {
      return null;
    }

    const groupId = membership[0].groupId;

    // Get all members of this group
    const members = await this.db
      .select({ clientId: relatedEntityMembers.clientId })
      .from(relatedEntityMembers)
      .where(eq(relatedEntityMembers.groupId, groupId));

    return {
      groupId,
      groupName: membership[0].groupName,
      clientIds: members.map((m) => m.clientId),
    };
  }

  /**
   * Compute aggregated BPP value for all locations of all clients
   * in a related entity group, for a given tax year.
   * Used to determine if the group exceeds the $125K HB 9 threshold.
   */
  async computeAggregatedValue(
    firmId: string,
    clientId: string,
    taxYear: number,
  ): Promise<{ aggregatedValue: number; isGrouped: boolean; groupName?: string }> {
    const group = await this.findGroupForClient(firmId, clientId);

    if (!group) {
      return { aggregatedValue: 0, isGrouped: false };
    }

    // Sum grandTotalDepreciatedValue from all renditions for all clients in the group
    const groupRenditions = await this.db
      .select({
        calculatedTotals: renditions.calculatedTotals,
      })
      .from(renditions)
      .innerJoin(locations, eq(renditions.locationId, locations.id))
      .innerJoin(clients, eq(locations.clientId, clients.id))
      .where(
        and(
          eq(clients.firmId, firmId),
          eq(renditions.taxYear, taxYear),
          inArray(clients.id, group.clientIds),
        ),
      );

    let aggregatedValue = 0;
    for (const r of groupRenditions) {
      const calc = r.calculatedTotals as { grandTotalDepreciatedValue?: number } | null;
      if (calc?.grandTotalDepreciatedValue) {
        aggregatedValue += calc.grandTotalDepreciatedValue;
      }
    }

    return {
      aggregatedValue: Math.round(aggregatedValue * 100) / 100,
      isGrouped: true,
      groupName: group.groupName,
    };
  }
}
