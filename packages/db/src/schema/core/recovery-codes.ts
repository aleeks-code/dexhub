import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { users } from './users'

export const recoveryCodes = pgTable('recovery_codes', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  codeHash: text('code_hash').notNull(),
  // AES-256-GCM encrypted plaintext for admin viewing; NULL for codes created before this column existed
  codeEncrypted: text('code_encrypted'),
  usedAt: timestamp('used_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export type RecoveryCode = typeof recoveryCodes.$inferSelect
export type NewRecoveryCode = typeof recoveryCodes.$inferInsert
