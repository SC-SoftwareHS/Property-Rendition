import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { eq, and, isNull } from 'drizzle-orm';
import { randomBytes } from 'crypto';
import { InjectDrizzle } from '../database/drizzle.decorator';
import { DrizzleDB } from '../database/database.module';
import { users, firmInvites } from '../database/schema';

@Injectable()
export class UsersService {
  constructor(@InjectDrizzle() private db: DrizzleDB) {}

  async listUsers(firmId: string) {
    return this.db
      .select({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        role: users.role,
        clerkUserId: users.clerkUserId,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.firmId, firmId))
      .orderBy(users.createdAt);
  }

  async createInvite(firmId: string, email: string, role: string) {
    // Check if user already in firm
    const [existing] = await this.db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.firmId, firmId), eq(users.email, email)))
      .limit(1);

    if (existing) {
      throw new ConflictException('User with this email is already in your firm');
    }

    // Check if pending invite exists
    const [pendingInvite] = await this.db
      .select({ id: firmInvites.id })
      .from(firmInvites)
      .where(
        and(
          eq(firmInvites.firmId, firmId),
          eq(firmInvites.email, email),
          isNull(firmInvites.acceptedAt),
        ),
      )
      .limit(1);

    if (pendingInvite) {
      throw new ConflictException('A pending invite already exists for this email');
    }

    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7-day expiry

    const [invite] = await this.db
      .insert(firmInvites)
      .values({
        firmId,
        email: email.toLowerCase(),
        role: role as 'admin' | 'preparer' | 'reviewer',
        token,
        expiresAt,
      })
      .returning();

    return invite;
  }

  async listInvites(firmId: string) {
    return this.db
      .select()
      .from(firmInvites)
      .where(
        and(
          eq(firmInvites.firmId, firmId),
          isNull(firmInvites.acceptedAt),
        ),
      )
      .orderBy(firmInvites.createdAt);
  }

  async revokeInvite(firmId: string, inviteId: string) {
    const [invite] = await this.db
      .select()
      .from(firmInvites)
      .where(
        and(
          eq(firmInvites.id, inviteId),
          eq(firmInvites.firmId, firmId),
        ),
      )
      .limit(1);

    if (!invite) {
      throw new NotFoundException('Invite not found');
    }

    await this.db.delete(firmInvites).where(eq(firmInvites.id, inviteId));
    return { deleted: true };
  }

  async updateRole(firmId: string, userId: string, role: string, currentUserId: string) {
    if (userId === currentUserId) {
      throw new ForbiddenException('Cannot change your own role');
    }

    const [user] = await this.db
      .select()
      .from(users)
      .where(and(eq(users.id, userId), eq(users.firmId, firmId)))
      .limit(1);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const [updated] = await this.db
      .update(users)
      .set({ role: role as 'admin' | 'preparer' | 'reviewer' })
      .where(eq(users.id, userId))
      .returning({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        role: users.role,
      });

    return updated;
  }

  async removeUser(firmId: string, userId: string, currentUserId: string) {
    if (userId === currentUserId) {
      throw new ForbiddenException('Cannot remove yourself');
    }

    const [user] = await this.db
      .select()
      .from(users)
      .where(and(eq(users.id, userId), eq(users.firmId, firmId)))
      .limit(1);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.db.delete(users).where(eq(users.id, userId));
    return { deleted: true };
  }
}
