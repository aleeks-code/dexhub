import { boolean, check, numeric, pgTable, text, timestamp } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'
import { users } from '../core/users'

// Cometa (previdenza complementare) — quota lavoratore deducibile dall'imponibile IRPEF
// (Stadio 7/8 del motore, MAI netta pura come la trattenuta sindacale). Single-row per user,
// upsert, mirror worklog_sindacato_config. Coefficiente SENZA default: a differenza della
// sindacale (1% CGIL, valore reale noto in partenza) qui non esiste una % "tipica" da
// presupporre — l'utente deve dichiararla esplicitamente, nessun placeholder.
export const worklogCometaConfig = pgTable(
  'worklog_cometa_config',
  {
    userId: text('user_id')
      .primaryKey()
      .references(() => users.id, { onDelete: 'cascade' }),
    iscritto: boolean('iscritto').notNull().default(false),
    coefficiente: numeric('coefficiente', { precision: 5, scale: 4 }),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check(
      'chk_worklog_cometa_config_coefficiente_range',
      sql`${t.coefficiente} IS NULL OR (${t.coefficiente} >= 0 AND ${t.coefficiente} <= 1)`,
    ),
  ],
)

export type WorklogCometaConfig = typeof worklogCometaConfig.$inferSelect
export type NewWorklogCometaConfig = typeof worklogCometaConfig.$inferInsert
