import { integer, jsonb, numeric, pgTable, timestamp } from 'drizzle-orm/pg-core'

export interface IrpefScaglione {
  fino: number | null  // null = no upper limit (last bracket)
  aliquota: number     // e.g. 0.23, 0.33, 0.43
}

// One entry per income range. The engine iterates fasce in order and stops at the first match.
// tipo='flat':             detrazione = valore_base  (constant; e.g. fascia A ≤€15k in 2026)
// tipo='lineare':          detrazione = base + aggiunta × (reddito_fino - RC) / denominatore
// tipo='lineare_solo_base': detrazione = base × (reddito_fino - RC) / denominatore
export interface DetrazioneFascia {
  tipo: 'flat' | 'lineare' | 'lineare_solo_base'
  reddito_da?: number    // inclusive; omit if starting from 0
  reddito_fino: number   // inclusive upper bound for this fascia
  valore_base?: number   // used by 'flat'
  base?: number          // used by 'lineare' and 'lineare_solo_base'
  aggiunta?: number      // used by 'lineare'
  denominatore?: number  // used by 'lineare' and 'lineare_solo_base'
}

// Flat bonus applied additively when RC falls within the income range.
export interface DetrazioneBonusFlat {
  reddito_da: number
  reddito_fino: number
  importo: number
}

export interface DetrazioniLavoroRule {
  fasce: DetrazioneFascia[]
  bonus?: DetrazioneBonusFlat[]  // additive flat bonuses checked independently of fasce
}

// Cuneo fiscale strutturale 2026 (L.199/2025) — TWO-TIER mechanism:
//
// Tier 1 (RC within fasce_non_imponibili): reduces the IRPEF taxable base.
//   For each fascia, (reddito_in_fascia × percentuale) is excluded from taxable income.
//   Applied progressively (like tax brackets).
//
// Tier 2 (RC above the fasce threshold): detrazione IRPEF (reduces tax owed directly).
//   Flat at detrazione_importo from detrazione_da to detrazione_piatto_fino,
//   then decreases linearly to 0 at detrazione_zero_a.
//
// Source: fiscomania.com (L.199/2025), research date 2026-06-30.
// Confirmed against the real payslip during Phase 4 calibration (aprile 2026):
// seeded as the L.199/2025 mechanism only. The old pending-verification warning
// was removed once the coefficients matched.
// To disable: set trattamento_integrativo to NULL in worklog_fiscal_profile.
export interface TrattamentoIntegrativoRule {
  fasce_non_imponibili: Array<{
    reddito_da: number    // inclusive
    reddito_fino: number  // inclusive
    percentuale: number   // fraction of reddito_in_fascia excluded from IRPEF base
  }>
  detrazione_da: number           // RC threshold where tier 2 begins
  detrazione_piatto_fino: number  // flat amount up to this RC
  detrazione_importo: number      // e.g. 1000
  detrazione_zero_a: number       // RC at which the detrazione reaches 0
}

export const worklogFiscalProfile = pgTable('worklog_fiscal_profile', {
  // PK is the year: one row per fiscal year, global (not per-user)
  anno: integer('anno').primaryKey(),
  // Employee INPS contribution rate. Stored with 5 decimal places (e.g. 0.09190).
  // WARNING: verify from official INPS circulars before seeding each year.
  contributiInps: numeric('contributi_inps', { precision: 6, scale: 5 }).notNull(),
  // Progressive IRPEF brackets. Verify from Agenzia delle Entrate / L.199/2025.
  scaglioniIrpef: jsonb('scaglioni_irpef').notNull().$type<IrpefScaglione[]>(),
  // No-tax area threshold (dipendenti). 8500 for 2026.
  noTaxArea: numeric('no_tax_area', { precision: 10, scale: 2 }).notNull(),
  // Art.13 TUIR employee deductions — formula, NOT a fixed amount.
  // MUST be verified from official source before seeding (coefficients change yearly).
  detrazioniLavoro: jsonb('detrazioni_lavoro').notNull().$type<DetrazioniLavoroRule>(),
  // Bonus cuneo fiscale strutturale (optional — null if not applicable for the year)
  trattamentoIntegrativo: jsonb('trattamento_integrativo').$type<TrattamentoIntegrativoRule>(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export type WorklogFiscalProfile = typeof worklogFiscalProfile.$inferSelect
export type NewWorklogFiscalProfile = typeof worklogFiscalProfile.$inferInsert
