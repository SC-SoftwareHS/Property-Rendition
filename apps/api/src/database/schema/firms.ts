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
  logoUrl: varchar('logo_url', { length: 500 }),
  address: varchar('address', { length: 255 }),
  city: varchar('city', { length: 100 }),
  state: varchar('state', { length: 2 }),
  zip: varchar('zip', { length: 10 }),
  phone: varchar('phone', { length: 20 }),
  website: varchar('website', { length: 255 }),
  defaultState: varchar('default_state', { length: 2 }).default('TX'),
  timezone: varchar('timezone', { length: 50 }).default('America/Chicago'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at')
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});
