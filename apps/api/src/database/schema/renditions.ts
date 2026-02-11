import {
  pgTable,
  uuid,
  integer,
  jsonb,
  varchar,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';
import { renditionStatusEnum } from './enums';
import { locations } from './locations';
import { jurisdictions } from './jurisdictions';

// Created in schema for Phase 2 rendition generation — not used in Phase 1
export const renditions = pgTable(
  'renditions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    locationId: uuid('location_id')
      .notNull()
      .references(() => locations.id),
    jurisdictionId: uuid('jurisdiction_id')
      .notNull()
      .references(() => jurisdictions.id),
    taxYear: integer('tax_year').notNull(),
    status: renditionStatusEnum('status').notNull().default('not_started'),
    calculatedTotals: jsonb('calculated_totals'),
    filedBy: uuid('filed_by'),
    filedAt: timestamp('filed_at'),
    pdfUrl: varchar('pdf_url', { length: 1000 }),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at')
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index('renditions_location_id_idx').on(table.locationId),
    index('renditions_tax_year_idx').on(table.taxYear),
  ],
);
