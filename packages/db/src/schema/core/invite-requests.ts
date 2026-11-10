import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'

export const inviteRequests = pgTable('invite_requests', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull(),
  phone: text('phone'),
  status: text('status').notNull().default('pending'), // 'pending' | 'invited' | 'dismissed'
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
})

export type InviteRequest = typeof inviteRequests.$inferSelect
export type NewInviteRequest = typeof inviteRequests.$inferInsert
