import {
  pgTable,
  uuid,
  varchar,
  integer,
  numeric,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { assetCategoryEnum } from './enums';

export const depreciationSchedules = pgTable(
  'depreciation_schedules',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    state: varchar('state', { length: 2 }).notNull(),
    category: assetCategoryEnum('category').notNull(),
    yearOfLife: integer('year_of_life').notNull(),
    depreciationPercent: numeric('depreciation_percent', {
      precision: 5,
      scale: 2,
    }).notNull(),
    method: varchar('method', { length: 50 }).notNull().default('percent_good'),
    sourceDocument: varchar('source_document', { length: 255 }),
    sourceYear: integer('source_year'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at')
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex('depreciation_schedules_unique_idx').on(
      table.state,
      table.category,
      table.yearOfLife,
    ),
  ],
);
