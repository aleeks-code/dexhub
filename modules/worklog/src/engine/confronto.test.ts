import { describe, expect, it } from 'vitest'
import {
  valutaScostamento,
  calcolaMetricheConfronto,
  type MeseConfrontoInput,
} from '@dexhub/worklog-engine'

describe('valutaScostamento', () => {
  it('identifica sottostima con scostamento eccellente (<= 1%)', () => {
    // Es. Stima: 2145.20, Reale: 2152.00 -> Delta: -6.80, Scostamento: 0.32%
    const res = valutaScostamento(2145.2, 2152.0)
    expect(res.delta).toBe(-6.8)
    expect(res.deltaAbs).toBe(6.8)
    expect(res.scostamentoPerc).toBe(0.32)
    expect(res.valutazione).toBe('excellent')
    expect(res.verso).toBe('underestimate')
  })

  it('identifica sovrastima con scostamento eccellente (<= 1%)', () => {
    // Es. Stima: 2080.00, Reale: 2078.50 -> Delta: +1.50, Scostamento: 0.07%
    const res = valutaScostamento(2080.0, 2078.5)
    expect(res.delta).toBe(1.5)
    expect(res.deltaAbs).toBe(1.5)
    expect(res.scostamentoPerc).toBe(0.07)
    expect(res.valutazione).toBe('excellent')
    expect(res.verso).toBe('overestimate')
  })

  it('identifica corrispondenza esatta (Delta = 0)', () => {
    const res = valutaScostamento(2000.0, 2000.0)
    expect(res.delta).toBe(0)
    expect(res.deltaAbs).toBe(0)
    expect(res.scostamentoPerc).toBe(0)
    expect(res.valutazione).toBe('excellent')
    expect(res.verso).toBe('exact')
  })

  it('identifica scostamento moderato (1% < S <= 5%)', () => {
    // Stima: 2100, Reale: 2040 -> Delta: 60, Scostamento: 60/2040 * 100 = 2.94%
    const res = valutaScostamento(2100.0, 2040.0)
    expect(res.delta).toBe(60.0)
    expect(res.scostamentoPerc).toBe(2.94)
    expect(res.valutazione).toBe('moderate')
    expect(res.verso).toBe('overestimate')
  })

  it('identifica scostamento significativo (> 5%)', () => {
    // Stima: 2100, Reale: 1950 -> Delta: 150, Scostamento: 150/1950 * 100 = 7.69%
    const res = valutaScostamento(2100.0, 1950.0)
    expect(res.delta).toBe(150.0)
    expect(res.scostamentoPerc).toBe(7.69)
    expect(res.valutazione).toBe('significant')
    expect(res.verso).toBe('overestimate')
  })

  it('gestisce nettoReale non impostato, nullo o pari a 0 come uncommunicated', () => {
    const resZero = valutaScostamento(2145.2, 0)
    expect(resZero.delta).toBe(0)
    expect(resZero.scostamentoPerc).toBe(0)
    expect(resZero.valutazione).toBe('uncommunicated')
    expect(resZero.verso).toBe('exact')

    const resNull = valutaScostamento(2145.2, null)
    expect(resNull.valutazione).toBe('uncommunicated')

    const resUndefined = valutaScostamento(2145.2, undefined)
    expect(resUndefined.valutazione).toBe('uncommunicated')
  })
})

describe('calcolaMetricheConfronto', () => {
  it('restituisce null per MAE, MAPE e bias se non ci sono mesi validi', () => {
    const input: MeseConfrontoInput[] = [
      { mese: '2026-01', nettoStimato: 2000, nettoReale: null },
      { mese: '2026-02', nettoStimato: null, nettoReale: 2100 },
      { mese: '2026-03', nettoStimato: null, nettoReale: null },
    ]
    const metriche = calcolaMetricheConfronto(input)
    expect(metriche.mae).toBeNull()
    expect(metriche.mape).toBeNull()
    expect(metriche.bias).toBeNull()
    expect(metriche.mesiValidi).toBe(0)
    expect(metriche.totaleMesi).toBe(3)
  })

  it('calcola correttamente MAE, MAPE e Bias su un insieme di mesi', () => {
    // Mese 1: Stima 2145.20, Reale 2152.00 -> Delta = -6.80, |Delta| = 6.80, % = 0.32%
    // Mese 2: Stima 2080.00, Reale 2078.50 -> Delta = +1.50, |Delta| = 1.50, % = 0.07%
    // Mese 3: Solo stima (escluso dal calcolo delle metriche)
    const input: MeseConfrontoInput[] = [
      { mese: '2026-09', nettoStimato: 2080.0, nettoReale: 2078.5 },
      { mese: '2026-10', nettoStimato: 2145.2, nettoReale: 2152.0 },
      { mese: '2026-11', nettoStimato: 2100.0, nettoReale: null },
    ]

    const metriche = calcolaMetricheConfronto(input)
    expect(metriche.mesiValidi).toBe(2)
    expect(metriche.totaleMesi).toBe(3)

    // MAE = (6.80 + 1.50) / 2 = 8.30 / 2 = 4.15 €
    expect(metriche.mae).toBe(4.15)

    // Bias = (-6.80 + 1.50) / 2 = -5.30 / 2 = -2.65 € (in media sottostima di 2.65 €)
    expect(metriche.bias).toBe(-2.65)

    // MAPE = (0.32 + 0.07) / 2 = 0.39 / 2 = 0.20 %
    expect(metriche.mape).toBe(0.2)
  })
})
