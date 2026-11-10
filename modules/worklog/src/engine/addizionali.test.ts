import { describe, expect, it } from 'vitest'
import { computeAddizionali, determineTaxDataSource, type TaxContext } from '@dexhub/worklog-engine'

const stimaCorrente: TaxContext = { fiscalYear: 2026, taxableIncome: 26241.56, source: 'ESTIMATED_CURRENT_YEAR' }
const snapshotPrecedente: TaxContext = { fiscalYear: 2025, taxableIncome: 24000, source: 'FINAL_PREVIOUS_YEAR' }

describe('determineTaxDataSource', () => {
  it('Caso 1 — nessuno storico → stima anno corrente', () => {
    expect(determineTaxDataSource(null, stimaCorrente)).toEqual(stimaCorrente)
  })

  it('Caso 2 — storico presente → snapshot anno precedente vince', () => {
    expect(determineTaxDataSource(snapshotPrecedente, stimaCorrente)).toEqual(snapshotPrecedente)
  })

  it('Caso 3 — cambio fonte: stesso input, storico compare tra una chiamata e l\'altra', () => {
    const primaChiamata = determineTaxDataSource(null, stimaCorrente)
    expect(primaChiamata.source).toBe('ESTIMATED_CURRENT_YEAR')

    const secondaChiamata = determineTaxDataSource(snapshotPrecedente, stimaCorrente)
    expect(secondaChiamata.source).toBe('FINAL_PREVIOUS_YEAR')
  })
})

describe('computeAddizionali — aliquota × imponibile della fonte scelta, flat', () => {
  it('calcola regionale/comunale sull\'imponibile stimato, arrotondato a 2 decimali', () => {
    expect(computeAddizionali(stimaCorrente, 0.0173, 0.008)).toEqual({
      regionalAmount: 453.98,
      municipalAmount: 209.93,
      source: 'ESTIMATED_CURRENT_YEAR',
    })
  })

  it('calcola sull\'imponibile consolidato quando la fonte è FINAL_PREVIOUS_YEAR', () => {
    expect(computeAddizionali(snapshotPrecedente, 0.0173, 0.008)).toEqual({
      regionalAmount: 415.2,
      municipalAmount: 192,
      source: 'FINAL_PREVIOUS_YEAR',
    })
  })

  it('aliquote a zero → importi zero', () => {
    expect(computeAddizionali(stimaCorrente, 0, 0)).toEqual({
      regionalAmount: 0,
      municipalAmount: 0,
      source: 'ESTIMATED_CURRENT_YEAR',
    })
  })
})
