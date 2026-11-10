import { boolean, numeric, pgTable, text, timestamp } from 'drizzle-orm/pg-core'
import { users } from '../core/users'

// Trattenuta mensa — stato corrente dell'adesione, single-row per user, upsert.
// Mirror esatto di worklog_sindacato_config/worklog_cig_config.
export const worklogMensaConfig = pgTable('worklog_mensa_config', {
  userId: text('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  attivo: boolean('attivo').notNull().default(false),
  importo: numeric('importo', { precision: 10, scale: 2 }).notNull().default('0.77'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export type WorklogMensaConfig = typeof worklogMensaConfig.$inferSelect
export type NewWorklogMensaConfig = typeof worklogMensaConfig.$inferInsert
