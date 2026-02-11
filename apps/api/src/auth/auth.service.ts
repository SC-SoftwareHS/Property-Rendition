import { Injectable, Logger } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { InjectDrizzle } from '../database/drizzle.decorator';
import { DrizzleDB } from '../database/database.module';
import { users, firms } from '../database/schema';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(@InjectDrizzle() private db: DrizzleDB) {}

  async findUserByClerkId(clerkUserId: string) {
    const [user] = await this.db
      .select({
        userId: users.id,
        firmId: users.firmId,
        role: users.role,
        clerkUserId: users.clerkUserId,
      })
      .from(users)
      .where(eq(users.clerkUserId, clerkUserId))
      .limit(1);

    return user ?? null;
  }

  async autoProvision(clerkUserId: string, email: string, firstName?: string, lastName?: string) {
    return this.db.transaction(async (tx) => {
      const [firm] = await tx
        .insert(firms)
        .values({ name: `${firstName ?? email}'s Firm` })
        .returning({ id: firms.id });

      const [user] = await tx
        .insert(users)
        .values({
          firmId: firm.id,
          clerkUserId,
          email,
          firstName: firstName ?? null,
          lastName: lastName ?? null,
          role: 'admin',
        })
        .returning({
          userId: users.id,
          firmId: users.firmId,
          role: users.role,
          clerkUserId: users.clerkUserId,
        });

      this.logger.log(`Auto-provisioned firm ${firm.id} + user for ${clerkUserId}`);
      return user;
    });
  }
}
