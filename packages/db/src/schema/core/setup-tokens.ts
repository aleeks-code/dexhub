import { pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core'

export const setupTokens = pgTable('setup_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  token: varchar('token', { length: 255 }).notNull().unique(),
  userId: text('user_id'),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  usedAt: timestamp('used_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export type SetupToken = typeof setupTokens.$inferSelect
export type NewSetupToken = typeof setupTokens.$inferInsert
