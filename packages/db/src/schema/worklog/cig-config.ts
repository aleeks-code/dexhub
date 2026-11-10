import { check, numeric, pgTable, text, timestamp, varchar } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'
import { users } from '../core/users'

// CIG + solidarietà (Fase 3, CIG Step 1) — stato aziendale corrente del lavoratore, non una
// serie storica di eventi (a differenza di retribuzione/variabili flat): single-row per user,
// upsert, stesso pattern di worklog_user_fiscal_config. Se in futuro il coefficiente cambia nel
// tempo (nuovo accordo aziendale) si affronta con una decorrenza allora — YAGNI oggi.
export type CigConfigTipo = 'solidarieta'

export const worklogCigConfig = pgTable(
  'worklog_cig_config',
  {
    userId: text('user_id')
      .primaryKey()
      .references(() => users.id, { onDelete: 'cascade' }),
    tipo: varchar('tipo', { length: 40 }).$type<CigConfigTipo>().notNull().default('solidarieta'),
    // Integrazione = storno × coefficiente (Stadio 5b/imponibile, vedi motore). Calibrato
    // empiricamente sui mesi reali dell'utente — non la % ufficiale d'accordo né il massimale
    // INPS (v1, approssimazione dichiarata, warning integrazione_solidarieta_stimata).
    coefficiente: numeric('coefficiente', { precision: 5, scale: 4 }).notNull().default('0.596'),
    // Predisposto, non letto v1 — quando si implementa il massimale INPS.
    massimaleMensile: numeric('massimale_mensile', { precision: 10, scale: 2 }),
    note: text('note'),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check('chk_worklog_cig_config_coefficiente_range', sql`${t.coefficiente} >= 0 AND ${t.coefficiente} <= 1`),
  ],
)

export type WorklogCigConfig = typeof worklogCigConfig.$inferSelect
export type NewWorklogCigConfig = typeof worklogCigConfig.$inferInsert
