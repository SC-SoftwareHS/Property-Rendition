import { pgTable, uuid, varchar, timestamp } from 'drizzle-orm/pg-core';
import { userRoleEnum } from './enums';
import { firms } from './firms';

export const firmInvites = pgTable('firm_invites', {
  id: uuid('id').defaultRandom().primaryKey(),
  firmId: uuid('firm_id')
    .notNull()
    .references(() => firms.id),
  email: varchar('email', { length: 255 }).notNull(),
  role: userRoleEnum('role').notNull().default('preparer'),
  token: varchar('token', { length: 255 }).notNull().unique(),
  expiresAt: timestamp('expires_at').notNull(),
  acceptedAt: timestamp('accepted_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});
