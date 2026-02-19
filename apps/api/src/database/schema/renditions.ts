import {
  pgTable,
  uuid,
  integer,
  jsonb,
  varchar,
  timestamp,
  boolean,
  numeric,
  index,
} from 'drizzle-orm/pg-core';
import { renditionStatusEnum } from './enums';
import { locations } from './locations';
import { jurisdictions } from './jurisdictions';

export interface FmvOverrideEntry {
  overrideValue: number;
  reason: string;
  appliedBy: string;
  appliedAt: string;
}

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
    // HB 9 ($125K BPP exemption) — effective Jan 1, 2026
    hb9Exempt: boolean('hb9_exempt').notNull().default(false),
    hb9HasRelatedEntities: boolean('hb9_has_related_entities').notNull().default(false),
    hb9ElectNotToRender: boolean('hb9_elect_not_to_render').notNull().default(false),
    hb9ExemptionAmount: numeric('hb9_exemption_amount', { precision: 14, scale: 2 }).notNull().default('0'),
    hb9NetTaxableValue: numeric('hb9_net_taxable_value', { precision: 14, scale: 2 }),
    // Per-asset FMV overrides — JSON map of assetId → override entry
    fmvOverrides: jsonb('fmv_overrides').$type<Record<string, FmvOverrideEntry>>().default({}),
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
