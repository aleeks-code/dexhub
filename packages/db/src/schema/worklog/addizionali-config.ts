import { boolean, check, integer, numeric, pgTable, text, timestamp } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'
import { users } from '../core/users'

// Addizionali IRPEF (regionale/comunale/acconto comunale) — trattenuta NETTA PURA a Stadio 10,
// mirror worklog_mensa_config. Importi GIÀ MENSILI presi dalla busta reale (rata anno
// precedente + acconto), NON calcolati/rateizzati qui.
// Gestione temporale: meseInizio (default 3 = Marzo) e meseFine (default 11 = Novembre).
export const worklogAddizionaliConfig = pgTable(
  'worklog_addizionali_config',
  {
    userId: text('user_id')
      .primaryKey()
      .references(() => users.id, { onDelete: 'cascade' }),
    attivo: boolean('attivo').notNull().default(false),
    addizionaleRegionale: numeric('addizionale_regionale', { precision: 10, scale: 2 }).notNull().default('0'),
    addizionaleComunale: numeric('addizionale_comunale', { precision: 10, scale: 2 }).notNull().default('0'),
    accontoComunale: numeric('acconto_comunale', { precision: 10, scale: 2 }).notNull().default('0'),
    meseInizio: integer('mese_inizio').notNull().default(3),
    meseFine: integer('mese_fine').notNull().default(11),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check('chk_worklog_addizionali_config_regionale_nonneg', sql`${t.addizionaleRegionale} >= 0`),
    check('chk_worklog_addizionali_config_comunale_nonneg', sql`${t.addizionaleComunale} >= 0`),
    check('chk_worklog_addizionali_config_acconto_nonneg', sql`${t.accontoComunale} >= 0`),
    check('chk_worklog_addizionali_config_mese_inizio', sql`${t.meseInizio} >= 1 AND ${t.meseInizio} <= 12`),
    check('chk_worklog_addizionali_config_mese_fine', sql`${t.meseFine} >= 1 AND ${t.meseFine} <= 12`),
    check('chk_worklog_addizionali_config_mesi_range', sql`${t.meseInizio} <= ${t.meseFine}`),
  ],
)

export type WorklogAddizionaliConfig = typeof worklogAddizionaliConfig.$inferSelect
export type NewWorklogAddizionaliConfig = typeof worklogAddizionaliConfig.$inferInsert
