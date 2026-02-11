import { pgTable, uuid, varchar, text, timestamp, index } from 'drizzle-orm/pg-core';
import { firms } from './firms';

export const clients = pgTable(
  'clients',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    firmId: uuid('firm_id')
      .notNull()
      .references(() => firms.id),
    companyName: varchar('company_name', { length: 255 }).notNull(),
    ein: varchar('ein', { length: 20 }),
    contactName: varchar('contact_name', { length: 255 }),
    contactEmail: varchar('contact_email', { length: 255 }),
    contactPhone: varchar('contact_phone', { length: 50 }),
    industry: varchar('industry', { length: 255 }),
    notes: text('notes'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at')
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    deletedAt: timestamp('deleted_at'),
  },
  (table) => [
    index('clients_firm_id_idx').on(table.firmId),
    index('clients_company_name_idx').on(table.companyName),
  ],
);
