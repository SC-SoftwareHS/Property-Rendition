import {
  pgTable,
  uuid,
  varchar,
  text,
  numeric,
  integer,
  boolean,
  date,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';
import { assetCategoryEnum } from './enums';
import { locations } from './locations';

export const assets = pgTable(
  'assets',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    locationId: uuid('location_id')
      .notNull()
      .references(() => locations.id),
    description: varchar('description', { length: 500 }).notNull(),
    category: assetCategoryEnum('category').notNull().default('other'),
    originalCost: numeric('original_cost', {
      precision: 14,
      scale: 2,
    }).notNull(),
    acquisitionDate: date('acquisition_date').notNull(),
    disposalDate: date('disposal_date'),
    quantity: integer('quantity').notNull().default(1),
    isLeased: boolean('is_leased').notNull().default(false),
    lessorName: varchar('lessor_name', { length: 255 }),
    lessorAddress: varchar('lessor_address', { length: 500 }),
    notes: text('notes'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at')
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    deletedAt: timestamp('deleted_at'),
  },
  (table) => [
    index('assets_location_id_idx').on(table.locationId),
    index('assets_category_idx').on(table.category),
    index('assets_acquisition_date_idx').on(table.acquisitionDate),
  ],
);
