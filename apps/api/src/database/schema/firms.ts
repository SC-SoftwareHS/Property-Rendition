import { pgTable, uuid, varchar, timestamp } from 'drizzle-orm/pg-core';
import { subscriptionTierEnum, billingStatusEnum } from './enums';

export const firms = pgTable('firms', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  subscriptionTier: subscriptionTierEnum('subscription_tier')
    .notNull()
    .default('starter'),
  billingStatus: billingStatusEnum('billing_status')
    .notNull()
    .default('trialing'),
  stripeCustomerId: varchar('stripe_customer_id', { length: 255 }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at')
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});
