import { Module } from '@nestjs/common';
import { BillingService } from './billing.service';
import { BillingController, StripeWebhookController } from './billing.controller';
import { TierLimitGuard } from './tier-limit.guard';

@Module({
  controllers: [BillingController, StripeWebhookController],
  providers: [BillingService, TierLimitGuard],
  exports: [BillingService, TierLimitGuard],
})
export class BillingModule {}
