import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  index,
  unique,
} from 'drizzle-orm/pg-core';
import { firms } from './firms';
import { clients } from './clients';

export const relatedEntityGroups = pgTable(
  'related_entity_groups',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    firmId: uuid('firm_id')
      .notNull()
      .references(() => firms.id),
    name: varchar('name', { length: 255 }).notNull(),
    notes: text('notes'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at')
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index('related_entity_groups_firm_id_idx').on(table.firmId),
  ],
);

export const relatedEntityMembers = pgTable(
  'related_entity_members',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    groupId: uuid('group_id')
      .notNull()
      .references(() => relatedEntityGroups.id, { onDelete: 'cascade' }),
    clientId: uuid('client_id')
      .notNull()
      .references(() => clients.id),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [
    index('related_entity_members_group_id_idx').on(table.groupId),
    index('related_entity_members_client_id_idx').on(table.clientId),
    unique('related_entity_members_group_client_unique').on(table.groupId, table.clientId),
  ],
);
