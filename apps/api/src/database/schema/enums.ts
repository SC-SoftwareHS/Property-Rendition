import { pgEnum } from 'drizzle-orm/pg-core';

export const subscriptionTierEnum = pgEnum('subscription_tier', [
  'starter',
  'professional',
  'firm',
]);

export const userRoleEnum = pgEnum('user_role', [
  'admin',
  'preparer',
  'reviewer',
]);

export const assetCategoryEnum = pgEnum('asset_category', [
  'furniture_fixtures',
  'machinery_equipment',
  'computer_equipment',
  'leasehold_improvements',
  'vehicles',
  'inventory',
  'supplies',
  'leased_equipment',
  'other',
]);

export const renditionStatusEnum = pgEnum('rendition_status', [
  'not_started',
  'in_progress',
  'review',
  'approved',
  'filed',
]);

export const billingStatusEnum = pgEnum('billing_status', [
  'trialing',
  'active',
  'past_due',
  'canceled',
  'unpaid',
]);
