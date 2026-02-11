import {
  pgTable,
  uuid,
  varchar,
  text,
  jsonb,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

// Created in schema for Phase 2 PDF generation — not used in Phase 1
export const formTemplates = pgTable(
  'form_templates',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    state: varchar('state', { length: 2 }).notNull(),
    formName: varchar('form_name', { length: 255 }).notNull(),
    version: varchar('version', { length: 50 }).notNull(),
    templateUrl: varchar('template_url', { length: 1000 }),
    fieldMappings: jsonb('field_mappings'),
    notes: text('notes'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at')
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex('form_templates_state_form_version_idx').on(
      table.state,
      table.formName,
      table.version,
    ),
  ],
);
