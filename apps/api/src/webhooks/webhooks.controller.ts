import {
  Controller,
  Post,
  Req,
  Res,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Webhook } from 'svix';
import { ConfigService } from '@nestjs/config';
import { eq } from 'drizzle-orm';
import { Public } from '../auth/decorators/public.decorator';
import { InjectDrizzle } from '../database/drizzle.decorator';
import { DrizzleDB } from '../database/database.module';
import { firms, users } from '../database/schema';

interface ClerkUserCreatedEvent {
  data: {
    id: string;
    email_addresses: Array<{
      email_address: string;
      id: string;
    }>;
    first_name: string | null;
    last_name: string | null;
  };
  type: string;
}

@Controller('webhooks')
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);

  constructor(
    private configService: ConfigService,
    @InjectDrizzle() private db: DrizzleDB,
  ) {}

  @Public()
  @Post('clerk')
  async handleClerkWebhook(
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const webhookSecret = this.configService.get<string>(
      'CLERK_WEBHOOK_SECRET',
    );
    if (!webhookSecret) {
      this.logger.error('CLERK_WEBHOOK_SECRET not configured');
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        error: 'Webhook secret not configured',
      });
    }

    const svixId = req.headers['svix-id'] as string;
    const svixTimestamp = req.headers['svix-timestamp'] as string;
    const svixSignature = req.headers['svix-signature'] as string;

    if (!svixId || !svixTimestamp || !svixSignature) {
      return res
        .status(HttpStatus.BAD_REQUEST)
        .json({ error: 'Missing svix headers' });
    }

    const wh = new Webhook(webhookSecret);
    let event: ClerkUserCreatedEvent;

    try {
      event = wh.verify(JSON.stringify(req.body), {
        'svix-id': svixId,
        'svix-timestamp': svixTimestamp,
        'svix-signature': svixSignature,
      }) as ClerkUserCreatedEvent;
    } catch {
      this.logger.warn('Webhook signature verification failed');
      return res
        .status(HttpStatus.BAD_REQUEST)
        .json({ error: 'Invalid signature' });
    }

    if (event.type === 'user.created') {
      await this.handleUserCreated(event);
    }

    return res.status(HttpStatus.OK).json({ received: true });
  }

  private async handleUserCreated(event: ClerkUserCreatedEvent) {
    const { id: clerkUserId, email_addresses, first_name, last_name } =
      event.data;

    const email = email_addresses[0]?.email_address;
    if (!email) {
      this.logger.warn(
        `user.created event for ${clerkUserId} has no email address`,
      );
      return;
    }

    // Check if user already exists (idempotency)
    const [existing] = await this.db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.clerkUserId, clerkUserId))
      .limit(1);

    if (existing) {
      this.logger.log(`User ${clerkUserId} already exists, skipping`);
      return;
    }

    // Create firm + admin user in a single transaction
    await this.db.transaction(async (tx) => {
      const [firm] = await tx
        .insert(firms)
        .values({
          name: `${first_name ?? email}'s Firm`,
        })
        .returning({ id: firms.id });

      await tx.insert(users).values({
        firmId: firm.id,
        clerkUserId,
        email,
        firstName: first_name,
        lastName: last_name,
        role: 'admin',
      });

      this.logger.log(
        `Created firm ${firm.id} and admin user for ${clerkUserId}`,
      );
    });
  }
}
