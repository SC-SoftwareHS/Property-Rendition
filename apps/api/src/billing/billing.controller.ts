import {
  Controller,
  Get,
  Post,
  Body,
  Req,
  Res,
  HttpStatus,
  Logger,
  RawBodyRequest,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import Stripe from 'stripe';
import { BillingService } from './billing.service';
import { CreateCheckoutDto } from './dto/create-checkout.dto';
import { CurrentUser, AuthUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('billing')
export class BillingController {
  private readonly logger = new Logger(BillingController.name);

  constructor(
    private readonly billingService: BillingService,
    private configService: ConfigService,
  ) {}

  @Get()
  getBilling(@CurrentUser() user: AuthUser) {
    return this.billingService.getFirmBilling(user.firmId);
  }

  @Roles('admin')
  @Post('checkout')
  createCheckout(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateCheckoutDto,
  ) {
    return this.billingService.createCheckoutSession(
      user.firmId,
      dto.tier,
      dto.interval,
    );
  }

  @Roles('admin')
  @Post('portal')
  createPortal(@CurrentUser() user: AuthUser) {
    return this.billingService.createPortalSession(user.firmId);
  }
}

@Controller('webhooks')
export class StripeWebhookController {
  private readonly logger = new Logger(StripeWebhookController.name);

  constructor(
    private readonly billingService: BillingService,
    private configService: ConfigService,
  ) {}

  @Public()
  @Post('stripe')
  async handleStripeWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Res() res: Response,
  ) {
    const secret = this.configService.get<string>('STRIPE_WEBHOOK_SECRET');
    if (!secret) {
      this.logger.error('STRIPE_WEBHOOK_SECRET not configured');
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        error: 'Webhook secret not configured',
      });
    }

    const signature = req.headers['stripe-signature'] as string;
    if (!signature) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        error: 'Missing stripe-signature header',
      });
    }

    const stripeKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    if (!stripeKey) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        error: 'Stripe not configured',
      });
    }

    const stripe = new Stripe(stripeKey);
    let event: Stripe.Event;

    try {
      const rawBody = req.rawBody;
      if (!rawBody) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          error: 'Missing raw body',
        });
      }
      event = stripe.webhooks.constructEvent(rawBody, signature, secret);
    } catch (err) {
      this.logger.warn(`Stripe webhook verification failed: ${(err as Error).message}`);
      return res.status(HttpStatus.BAD_REQUEST).json({
        error: 'Invalid signature',
      });
    }

    await this.billingService.handleWebhook(event);

    return res.status(HttpStatus.OK).json({ received: true });
  }
}
