import { boolean, check, numeric, pgTable, text, timestamp } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'
import { users } from '../core/users'

// Trattenuta sindacale (CGIL) — stato corrente dell'iscrizione, non una serie storica di eventi
// (a differenza di retribuzione/variabili flat): single-row per user, upsert, stesso pattern di
// worklog_cig_config. Se in futuro il coefficiente cambia nel tempo si affronta con una
// decorrenza allora — YAGNI oggi.
export const worklogSindacatoConfig = pgTable(
  'worklog_sindacato_config',
  {
    userId: text('user_id')
      .primaryKey()
      .references(() => users.id, { onDelete: 'cascade' }),
    iscritto: boolean('iscritto').notNull().default(false),
    // Trattenuta = coefficiente × minimoTabellare (Stadio 10, netta pura — non deducibile,
    // non tocca alcun imponibile). Default 1%.
    coefficiente: numeric('coefficiente', { precision: 5, scale: 4 }).notNull().default('0.01'),
    // Etichetta opzionale mostrata in card al posto del default "Trattenuta sindacale"
    // (es. "CGIL") — cosmetica, mai letta dal motore.
    nome: text('nome'),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check('chk_worklog_sindacato_config_coefficiente_range', sql`${t.coefficiente} >= 0 AND ${t.coefficiente} <= 1`),
  ],
)

export type WorklogSindacatoConfig = typeof worklogSindacatoConfig.$inferSelect
export type NewWorklogSindacatoConfig = typeof worklogSindacatoConfig.$inferInsert
