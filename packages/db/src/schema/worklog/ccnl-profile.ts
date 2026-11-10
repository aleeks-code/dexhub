import { jsonb, numeric, pgTable, text, timestamp, varchar } from 'drizzle-orm/pg-core'

export interface CcnlMaggiorazioni {
  straordinarioDiurnoFeriale: number  // e.g. 0.25
  straordinarioNotturno: number       // e.g. 0.55
  straordinarioFestivo: number        // e.g. 0.50
  straordinarioFestivoNotturno: number // e.g. 0.75
  // Ordinary shift modifiers (not overtime)
  notturnoOrdinarioInTurno: number    // e.g. 0.15
  pomeridianoInTurno: number          // e.g. 0.065
}

export interface CcnlLimitiStraordinario {
  oreGiornoMax?: number
  oreSettimanaMax?: number
  oreAnnoMax?: number
  oreAnnoMaxConAccordo?: number
}

export interface CcnlBancaOre {
  // Fraction of the overtime surcharge that flows into the hour bank instead of pay
  maggiorazioneConfluita: number // e.g. 0.5 = 50%
}

// Turni standard — solo l'orario di INIZIO di ciascuno: la durata si deriva dall'inizio del
// turno successivo (notte → mattino wrappa mezzanotte). Usato SOLO come fallback quando
// un'entry ha il flag (notturno/pomeridiano) ma non orari espliciti — vedi worklog-engine.
export interface CcnlTurnoStandard {
  mattino: { inizio: string }    // 'HH:MM'
  pomeriggio: { inizio: string }
  notte: { inizio: string }
}

// Confini orari delle fasce maggiorate — chiave = stessa ModificatoreKey di CcnlMaggiorazioni.
// NON sostituisce le percentuali in `maggiorazioni` sopra (quelle restano la fonte attiva
// finché il motore non passa al calcolo a fasce): campo inerte finché non consumato.
export interface CcnlFasciaMaggiorata {
  da: string           // 'HH:MM'
  a: string             // 'HH:MM' — se ≤ da, la fascia wrappa mezzanotte
  percentuale: number
}

export interface CcnlFasceMaggiorate {
  notturnoOrdinarioInTurno: CcnlFasciaMaggiorata
  pomeridianoInTurno: CcnlFasciaMaggiorata
}

export const worklogCcnlProfile = pgTable('worklog_ccnl_profile', {
  // Natural PK: human-readable slug, e.g. 'metalmeccanica-industria'
  id: varchar('id', { length: 50 }).primaryKey(),
  nome: text('nome').notNull(),
  // Standard divisor: monthly salary → hourly rate (e.g. 173 for Metalmeccanica)
  divisoreOrario: numeric('divisore_orario', { precision: 5, scale: 2 }).notNull(),
  orarioSettimanale: numeric('orario_settimanale', { precision: 4, scale: 1 }).notNull(),
  // Stored as JSONB so values can be updated on contract renewal without schema migration
  maggiorazioni: jsonb('maggiorazioni').notNull().$type<CcnlMaggiorazioni>(),
  limitiStraordinario: jsonb('limiti_straordinario').notNull().$type<CcnlLimitiStraordinario>(),
  bancaOre: jsonb('banca_ore').$type<CcnlBancaOre>(),
  // Nullable, inerti finché il motore non passa al calcolo a fasce (vedi commenti sopra).
  turniStandard: jsonb('turni_standard').$type<CcnlTurnoStandard>(),
  fasceMaggiorate: jsonb('fasce_maggiorate').$type<CcnlFasceMaggiorate>(),
  defaultRolOreAnno: numeric('default_rol_ore_anno', { precision: 6, scale: 2 }),
  defaultExFestivitaOreAnno: numeric('default_ex_festivita_ore_anno', { precision: 6, scale: 2 }),
  // Contract expiry date: reminder to verify values on renewal
  validoFino: varchar('valido_fino', { length: 10 }), // 'YYYY-MM-DD'
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export type WorklogCcnlProfile = typeof worklogCcnlProfile.$inferSelect
export type NewWorklogCcnlProfile = typeof worklogCcnlProfile.$inferInsert
