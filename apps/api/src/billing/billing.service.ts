import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { eq } from 'drizzle-orm';
import Stripe from 'stripe';
import { InjectDrizzle } from '../database/drizzle.decorator';
import { DrizzleDB } from '../database/database.module';
import { firms } from '../database/schema';

// Map tier + interval to Stripe Price IDs (configured via env)
const PRICE_KEY_MAP: Record<string, string> = {
  'starter_monthly': 'STRIPE_PRICE_STARTER_MONTHLY',
  'starter_yearly': 'STRIPE_PRICE_STARTER_YEARLY',
  'professional_monthly': 'STRIPE_PRICE_PROFESSIONAL_MONTHLY',
  'professional_yearly': 'STRIPE_PRICE_PROFESSIONAL_YEARLY',
  'firm_monthly': 'STRIPE_PRICE_FIRM_MONTHLY',
  'firm_yearly': 'STRIPE_PRICE_FIRM_YEARLY',
};

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);
  private stripe: Stripe | null = null;

  constructor(
    private configService: ConfigService,
    @InjectDrizzle() private db: DrizzleDB,
  ) {
    const secretKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    if (secretKey) {
      this.stripe = new Stripe(secretKey);
    } else {
      this.logger.warn('STRIPE_SECRET_KEY not configured — billing disabled');
    }
  }

  private getStripe(): Stripe {
    if (!this.stripe) {
      throw new BadRequestException('Billing is not configured');
    }
    return this.stripe;
  }

  async createCheckoutSession(firmId: string, tier: string, interval: string) {
    const stripe = this.getStripe();

    const priceKey = PRICE_KEY_MAP[`${tier}_${interval}`];
    if (!priceKey) {
      throw new BadRequestException(`Invalid tier/interval: ${tier}/${interval}`);
    }

    const priceId = this.configService.get<string>(priceKey);
    if (!priceId) {
      throw new BadRequestException(`Price not configured for ${tier}/${interval}`);
    }

    const [firm] = await this.db
      .select()
      .from(firms)
      .where(eq(firms.id, firmId))
      .limit(1);

    let customerId = firm.stripeCustomerId;

    if (!customerId) {
      const customer = await stripe.customers.create({
        metadata: { firmId },
      });
      customerId = customer.id;
      await this.db
        .update(firms)
        .set({ stripeCustomerId: customerId })
        .where(eq(firms.id, firmId));
    }

    const appUrl = this.configService.get<string>('APP_URL') ?? 'http://localhost:3000';

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      subscription_data: {
        trial_period_days: 14,
        metadata: { firmId, tier },
      },
      success_url: `${appUrl}/settings?tab=billing&status=success`,
      cancel_url: `${appUrl}/settings?tab=billing&status=canceled`,
    });

    return { url: session.url };
  }

  async createPortalSession(firmId: string) {
    const stripe = this.getStripe();

    const [firm] = await this.db
      .select({ stripeCustomerId: firms.stripeCustomerId })
      .from(firms)
      .where(eq(firms.id, firmId))
      .limit(1);

    if (!firm?.stripeCustomerId) {
      throw new BadRequestException('No billing account found. Please subscribe first.');
    }

    const appUrl = this.configService.get<string>('APP_URL') ?? 'http://localhost:3000';

    const session = await stripe.billingPortal.sessions.create({
      customer: firm.stripeCustomerId,
      return_url: `${appUrl}/settings?tab=billing`,
    });

    return { url: session.url };
  }

  async handleWebhook(event: Stripe.Event) {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const firmId = session.subscription
          ? ((await this.getStripe().subscriptions.retrieve(session.subscription as string))
              .metadata.firmId)
          : session.metadata?.firmId;

        if (firmId) {
          const tier = session.metadata?.tier ?? 'starter';
          await this.db
            .update(firms)
            .set({
              subscriptionTier: tier as 'starter' | 'professional' | 'firm',
              billingStatus: 'active',
              stripeCustomerId: session.customer as string,
            })
            .where(eq(firms.id, firmId));
          this.logger.log(`Firm ${firmId} subscribed to ${tier}`);
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const firmId = subscription.metadata.firmId;
        if (!firmId) break;

        const statusMap: Record<string, string> = {
          active: 'active',
          trialing: 'trialing',
          past_due: 'past_due',
          canceled: 'canceled',
          unpaid: 'unpaid',
        };

        const billingStatus = statusMap[subscription.status] ?? 'active';
        const tier = subscription.metadata.tier ?? 'starter';

        await this.db
          .update(firms)
          .set({
            subscriptionTier: tier as 'starter' | 'professional' | 'firm',
            billingStatus: billingStatus as 'trialing' | 'active' | 'past_due' | 'canceled' | 'unpaid',
          })
          .where(eq(firms.id, firmId));
        this.logger.log(`Firm ${firmId} subscription updated: ${subscription.status}`);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const firmId = subscription.metadata.firmId;
        if (!firmId) break;

        await this.db
          .update(firms)
          .set({
            billingStatus: 'canceled',
          })
          .where(eq(firms.id, firmId));
        this.logger.log(`Firm ${firmId} subscription canceled`);
        break;
      }
    }
  }

  async getFirmBilling(firmId: string) {
    const [firm] = await this.db
      .select({
        subscriptionTier: firms.subscriptionTier,
        billingStatus: firms.billingStatus,
        stripeCustomerId: firms.stripeCustomerId,
      })
      .from(firms)
      .where(eq(firms.id, firmId))
      .limit(1);

    return firm;
  }
}
