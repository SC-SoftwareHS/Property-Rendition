import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { eq } from 'drizzle-orm';
import { InjectDrizzle } from '../database/drizzle.decorator';
import { DrizzleDB } from '../database/database.module';
import { firms } from '../database/schema';
import { IS_PUBLIC_KEY } from '../auth/decorators/public.decorator';
import { AuthUser } from '../auth/decorators/current-user.decorator';

export const TIER_LIMIT_KEY = 'tierLimit';

export interface TierLimitOptions {
  resource: 'clients' | 'users' | 'renditions';
}

import { SetMetadata } from '@nestjs/common';
export const TierLimit = (resource: TierLimitOptions['resource']) =>
  SetMetadata(TIER_LIMIT_KEY, { resource });

const TIER_LIMITS: Record<string, { maxClients: number; maxUsers: number; states: string[] }> = {
  starter: { maxClients: 25, maxUsers: 1, states: ['TX', 'OK', 'FL'] },
  professional: { maxClients: Infinity, maxUsers: 5, states: ['TX', 'OK', 'FL'] },
  firm: { maxClients: Infinity, maxUsers: Infinity, states: ['TX', 'OK', 'FL'] },
};

@Injectable()
export class TierLimitGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    @InjectDrizzle() private db: DrizzleDB,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const options = this.reflector.getAllAndOverride<TierLimitOptions>(
      TIER_LIMIT_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!options) return true;

    const request = context.switchToHttp().getRequest<{ user?: AuthUser }>();
    const user = request.user;
    if (!user) return true;

    const [firm] = await this.db
      .select({
        subscriptionTier: firms.subscriptionTier,
        billingStatus: firms.billingStatus,
      })
      .from(firms)
      .where(eq(firms.id, user.firmId))
      .limit(1);

    if (!firm) return true;

    // Block write operations if billing is past_due or canceled
    if (firm.billingStatus === 'canceled') {
      throw new ForbiddenException(
        'Your subscription has been canceled. Please resubscribe to continue.',
      );
    }

    if (firm.billingStatus === 'past_due') {
      throw new ForbiddenException(
        'Your trial has ended. Please add a payment method to continue.',
      );
    }

    const limits = TIER_LIMITS[firm.subscriptionTier] ?? TIER_LIMITS.starter;

    // Resource-specific checks are handled by the service layer via count queries
    // This guard primarily enforces billing status
    // Full count-based enforcement would require injecting each service
    // which would create circular dependencies — so we keep it lightweight here

    return true;
  }
}
