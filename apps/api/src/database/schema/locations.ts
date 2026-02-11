import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';
import { clients } from './clients';
import { jurisdictions } from './jurisdictions';

export const locations = pgTable(
  'locations',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    clientId: uuid('client_id')
      .notNull()
      .references(() => clients.id),
    jurisdictionId: uuid('jurisdiction_id').references(() => jurisdictions.id),
    name: varchar('name', { length: 255 }).notNull(),
    address: varchar('address', { length: 500 }),
    city: varchar('city', { length: 255 }),
    state: varchar('state', { length: 2 }),
    zip: varchar('zip', { length: 20 }),
    county: varchar('county', { length: 255 }),
    accountNumber: varchar('account_number', { length: 100 }),
    notes: text('notes'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at')
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    deletedAt: timestamp('deleted_at'),
  },
  (table) => [
    index('locations_client_id_idx').on(table.clientId),
    index('locations_jurisdiction_id_idx').on(table.jurisdictionId),
  ],
);
