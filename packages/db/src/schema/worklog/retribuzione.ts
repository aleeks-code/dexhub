import { index, numeric, pgEnum, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core'
import { users } from '../core/users'

export const worklogRetribuzioneTipoEnum = pgEnum('worklog_retribuzione_tipo', [
  'hourly',
  'monthly',
])

export interface RetribuzioneRecord {
  tipo: 'hourly' | 'monthly'
  importo: number
  premioFisso: number | null
  decorrenza: string // 'YYYY-MM'
}

// Modalità 1 (scomposizione fissa) — solo tipo 'monthly', tutti opzionali. Se valorizzati,
// la loro somma deve quadrare con `importo` (verificato dal resolver via quadraturaOk).
// Se assenti (record legacy o Modalità 2 oraria): il resolver sintetizza un bucket unico
// da importo+premioFisso, stesso valore di oggi — zero regressione per chi non li usa.
export interface RetribuzioneFissaComponentiRecord {
  minimoTabellare: number | null
  superminimo: number | null
  scattiAnzianita: number | null
  premioProduzioneFisso: number | null
}

export const worklogRetribuzione = pgTable(
  'worklog_retribuzione',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    // 'YYYY-MM' — effective from the start of this month
    decorrenza: varchar('decorrenza', { length: 7 }).notNull(),
    tipo: worklogRetribuzioneTipoEnum('tipo').notNull(),
    // For 'monthly': stipendio mensile lordo. For 'hourly': paga oraria.
    importo: numeric('importo', { precision: 10, scale: 2 }).notNull(),
    // Only for 'monthly': fixed monthly prize (kept separate for future tax treatment)
    premioFisso: numeric('premio_fisso', { precision: 10, scale: 2 }),
    // Modalità 1 — scomposizione dichiarata della fissa (solo 'monthly', tutti opzionali).
    // Concetti ORTOGONALI a premioFisso sopra: non riusarlo, significati diversi (vedi
    // RetribuzioneFissaComponentiRecord).
    minimoTabellare: numeric('minimo_tabellare', { precision: 10, scale: 2 }),
    superminimo: numeric('superminimo', { precision: 10, scale: 2 }),
    scattiAnzianita: numeric('scatti_anzianita', { precision: 10, scale: 2 }),
    premioProduzioneFisso: numeric('premio_produzione_fisso', { precision: 10, scale: 2 }),
    note: text('note'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    // Resolver query: MAX(decorrenza) WHERE decorrenza <= target AND user_id = ?
    index('idx_worklog_retribuzione_user_dec').on(t.userId, t.decorrenza),
  ],
)

export type WorklogRetribuzione = typeof worklogRetribuzione.$inferSelect
export type NewWorklogRetribuzione = typeof worklogRetribuzione.$inferInsert
