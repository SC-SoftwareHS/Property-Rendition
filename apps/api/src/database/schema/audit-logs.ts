import {
  pgTable,
  uuid,
  varchar,
  jsonb,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';

export const auditLogs = pgTable(
  'audit_logs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    entityType: varchar('entity_type', { length: 100 }).notNull(),
    entityId: uuid('entity_id').notNull(),
    action: varchar('action', { length: 20 }).notNull(), // create, update, delete
    oldValue: jsonb('old_value'),
    newValue: jsonb('new_value'),
    changedBy: uuid('changed_by'),
    timestamp: timestamp('timestamp').notNull().defaultNow(),
  },
  (table) => [
    index('audit_logs_entity_type_entity_id_idx').on(
      table.entityType,
      table.entityId,
    ),
    index('audit_logs_changed_by_idx').on(table.changedBy),
    index('audit_logs_timestamp_idx').on(table.timestamp),
  ],
);
