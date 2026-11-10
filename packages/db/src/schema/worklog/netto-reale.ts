import { check, numeric, pgTable, primaryKey, text, timestamp, varchar } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'
import { users } from '../core/users'

// Netto reale da busta paga, per mese — chiave composta (userId, mese), mirror module_settings
// (primaryKey composita, nessun id proprio). Forma pura: nessun endpoint/UI legge/scrive questa
// tabella ancora, popolata in un diff separato.
export const worklogNettoReale = pgTable(
  'worklog_netto_reale',
  {
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    mese: varchar('mese', { length: 7 }).notNull(), // 'YYYY-MM', stesso shape di worklog_variabili_flat.mese
    netto: numeric('netto', { precision: 10, scale: 2 }).notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.mese] }),
    check('chk_worklog_netto_reale_netto_nonneg', sql`${t.netto} >= 0`),
  ],
)

export type WorklogNettoReale = typeof worklogNettoReale.$inferSelect
export type NewWorklogNettoReale = typeof worklogNettoReale.$inferInsert
