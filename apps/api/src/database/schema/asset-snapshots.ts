import {
  pgTable,
  uuid,
  varchar,
  numeric,
  integer,
  boolean,
  date,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';
import { assetCategoryEnum } from './enums';
import { assets } from './assets';

// Created in schema for Phase 3 rollover — not used in Phase 1
export const assetSnapshots = pgTable(
  'asset_snapshots',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    assetId: uuid('asset_id')
      .notNull()
      .references(() => assets.id),
    taxYear: integer('tax_year').notNull(),
    description: varchar('description', { length: 500 }).notNull(),
    category: assetCategoryEnum('category').notNull(),
    originalCost: numeric('original_cost', {
      precision: 14,
      scale: 2,
    }).notNull(),
    acquisitionDate: date('acquisition_date').notNull(),
    quantity: integer('quantity').notNull().default(1),
    isLeased: boolean('is_leased').notNull().default(false),
    lessorName: varchar('lessor_name', { length: 255 }),
    lessorAddress: varchar('lessor_address', { length: 500 }),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [
    index('asset_snapshots_asset_id_idx').on(table.assetId),
    index('asset_snapshots_tax_year_idx').on(table.taxYear),
  ],
);
