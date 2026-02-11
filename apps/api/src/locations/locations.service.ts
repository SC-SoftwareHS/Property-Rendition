import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { and, eq, isNull, asc } from 'drizzle-orm';
import { InjectDrizzle } from '../database/drizzle.decorator';
import { DrizzleDB } from '../database/database.module';
import { locations, clients, jurisdictions } from '../database/schema';
import { CreateLocationDto } from './dto/create-location.dto';
import { UpdateLocationDto } from './dto/update-location.dto';

@Injectable()
export class LocationsService {
  constructor(@InjectDrizzle() private db: DrizzleDB) {}

  async findAllForClient(firmId: string, clientId: string) {
    // Verify client ownership
    await this.verifyClientOwnership(firmId, clientId);

    return this.db
      .select({
        location: locations,
        jurisdiction: {
          id: jurisdictions.id,
          appraisalDistrictName: jurisdictions.appraisalDistrictName,
          filingDeadline: jurisdictions.filingDeadline,
          extensionDeadline: jurisdictions.extensionDeadline,
        },
      })
      .from(locations)
      .leftJoin(jurisdictions, eq(locations.jurisdictionId, jurisdictions.id))
      .where(
        and(
          eq(locations.clientId, clientId),
          isNull(locations.deletedAt),
        ),
      )
      .orderBy(asc(locations.name));
  }

  async findOne(firmId: string, clientId: string, locationId: string) {
    await this.verifyClientOwnership(firmId, clientId);

    const result = await this.db
      .select({
        location: locations,
        jurisdiction: {
          id: jurisdictions.id,
          appraisalDistrictName: jurisdictions.appraisalDistrictName,
          filingDeadline: jurisdictions.filingDeadline,
          extensionDeadline: jurisdictions.extensionDeadline,
        },
      })
      .from(locations)
      .leftJoin(jurisdictions, eq(locations.jurisdictionId, jurisdictions.id))
      .where(
        and(
          eq(locations.id, locationId),
          eq(locations.clientId, clientId),
          isNull(locations.deletedAt),
        ),
      )
      .limit(1);

    if (result.length === 0) {
      throw new NotFoundException('Location not found');
    }

    return result[0];
  }

  async create(firmId: string, clientId: string, dto: CreateLocationDto) {
    await this.verifyClientOwnership(firmId, clientId);

    // Auto-resolve jurisdiction if state + county provided
    let jurisdictionId: string | null = null;
    if (dto.state && dto.county) {
      jurisdictionId = await this.resolveJurisdictionId(dto.state, dto.county);
    }

    const result = await this.db
      .insert(locations)
      .values({
        clientId,
        jurisdictionId,
        name: dto.name,
        address: dto.address,
        city: dto.city,
        state: dto.state,
        zip: dto.zip,
        county: dto.county,
        accountNumber: dto.accountNumber,
        notes: dto.notes,
      })
      .returning();

    return result[0];
  }

  async update(firmId: string, clientId: string, locationId: string, dto: UpdateLocationDto) {
    await this.verifyClientOwnership(firmId, clientId);

    // Verify location exists
    const existing = await this.db
      .select()
      .from(locations)
      .where(
        and(
          eq(locations.id, locationId),
          eq(locations.clientId, clientId),
          isNull(locations.deletedAt),
        ),
      )
      .limit(1);

    if (existing.length === 0) {
      throw new NotFoundException('Location not found');
    }

    // Re-resolve jurisdiction if state or county changed
    let jurisdictionId: string | null | undefined = undefined;
    const newState = dto.state ?? existing[0].state;
    const newCounty = dto.county ?? existing[0].county;
    if (dto.state !== undefined || dto.county !== undefined) {
      if (newState && newCounty) {
        jurisdictionId = await this.resolveJurisdictionId(newState, newCounty);
      } else {
        jurisdictionId = null;
      }
    }

    const result = await this.db
      .update(locations)
      .set({
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.address !== undefined && { address: dto.address }),
        ...(dto.city !== undefined && { city: dto.city }),
        ...(dto.state !== undefined && { state: dto.state }),
        ...(dto.zip !== undefined && { zip: dto.zip }),
        ...(dto.county !== undefined && { county: dto.county }),
        ...(dto.accountNumber !== undefined && { accountNumber: dto.accountNumber }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
        ...(jurisdictionId !== undefined && { jurisdictionId }),
      })
      .where(eq(locations.id, locationId))
      .returning();

    return result[0];
  }

  async softDelete(firmId: string, clientId: string, locationId: string) {
    await this.verifyClientOwnership(firmId, clientId);

    const existing = await this.db
      .select()
      .from(locations)
      .where(
        and(
          eq(locations.id, locationId),
          eq(locations.clientId, clientId),
          isNull(locations.deletedAt),
        ),
      )
      .limit(1);

    if (existing.length === 0) {
      throw new NotFoundException('Location not found');
    }

    const result = await this.db
      .update(locations)
      .set({ deletedAt: new Date() })
      .where(eq(locations.id, locationId))
      .returning();

    return result[0];
  }

  private async verifyClientOwnership(firmId: string, clientId: string) {
    const client = await this.db
      .select({ id: clients.id })
      .from(clients)
      .where(
        and(
          eq(clients.id, clientId),
          eq(clients.firmId, firmId),
          isNull(clients.deletedAt),
        ),
      )
      .limit(1);

    if (client.length === 0) {
      throw new ForbiddenException('Client not found or access denied');
    }
  }

  private async resolveJurisdictionId(state: string, county: string): Promise<string | null> {
    const result = await this.db
      .select({ id: jurisdictions.id })
      .from(jurisdictions)
      .where(
        and(
          eq(jurisdictions.state, state.toUpperCase()),
          eq(jurisdictions.county, county),
        ),
      )
      .limit(1);

    return result[0]?.id ?? null;
  }
}
