import { integer, numeric, pgEnum, pgTable, text, timestamp, varchar } from 'drizzle-orm/pg-core'
import { users } from '../core/users'

// Solo default di compilazione (quali orari precompilare) — zero impatto sul calcolo ore:
// il giornaliero è 8h piene senza pausa rappresentata, resta tutto nel ramo variabili.
export const worklogRegimeOrarioEnum = pgEnum('worklog_regime_orario', ['giornaliero', 'turnista'])

export const worklogContract = pgTable('worklog_contract', {
  userId: text('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  // Stored as numeric strings; service parses to number
  oreGiornaliereStandard: numeric('ore_giornaliere_standard', { precision: 4, scale: 2 })
    .notNull()
    .default('8'),
  oreLavorativeSettimanali: numeric('ore_lavorative_settimanali', { precision: 4, scale: 2 })
    .notNull()
    .default('40'),
  // ISO weekdays: 1=Mon … 7=Sun
  giorniLavorativiSettimana: integer('giorni_lavorativi_settimana').array().notNull(),
  // Nullable: null = non ancora configurato, nessun fallback muto applicato altrove.
  regimeOrario: worklogRegimeOrarioEnum('regime_orario'),
  // Balance anchor: saldi iniziali riferiti a una data precisa
  // residuo = saldoIniziale + (rateo × mesi da saldoAllaData) − ore consumate da saldoAllaData
  saldoAllaData: varchar('saldo_alla_data', { length: 10 }),            // 'YYYY-MM-DD', null = non configurato
  ferieResidueOreIniziali: numeric('ferie_residue_ore_iniziali', { precision: 6, scale: 2 }),
  permessiResiduiOreIniziali: numeric('permessi_residui_ore_iniziali', { precision: 6, scale: 2 }),
  rateoFerieMensile: numeric('rateo_ferie_mensile', { precision: 5, scale: 2 }),
  rateoPermessiMensile: numeric('rateo_permessi_mensile', { precision: 5, scale: 2 }),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export type WorklogContract = typeof worklogContract.$inferSelect
export type NewWorklogContract = typeof worklogContract.$inferInsert
