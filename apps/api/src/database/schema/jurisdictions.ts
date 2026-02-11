import {
  pgTable,
  uuid,
  varchar,
  date,
  text,
  timestamp,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core';

export const jurisdictions = pgTable(
  'jurisdictions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    state: varchar('state', { length: 2 }).notNull(),
    county: varchar('county', { length: 255 }).notNull(),
    appraisalDistrictName: varchar('appraisal_district_name', {
      length: 500,
    }).notNull(),
    filingDeadline: date('filing_deadline'),
    extensionDeadline: date('extension_deadline'),
    notes: text('notes'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at')
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex('jurisdictions_state_county_idx').on(table.state, table.county),
    index('jurisdictions_state_idx').on(table.state),
  ],
);
