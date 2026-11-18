import { describe, it, expect } from 'vitest'
import { calculateDiscountSavings, calculateScorporoSavings, calculateGrossAmount } from './discount'

describe('calculateDiscountSavings (calcolo cashback/sconto 15%)', () => {
  it('calcola correttamente il 15% di cashback su 100 € (15,00 €)', () => {
    const savings = calculateDiscountSavings(100.0, 0.15)
    expect(savings).toBe(15.0)
  })

  it('calcola correttamente il 15% di cashback su 50 € (7,50 €)', () => {
    const savings = calculateDiscountSavings(50.0, 0.15)
    expect(savings).toBe(7.5)
  })

  it('calcola correttamente lo sconto/cashback su importi reali con decimali', () => {
    // 42,50 € * 0.15 = 6.375 -> 6.38 €
    const savings = calculateDiscountSavings(42.5, 0.15)
    expect(savings).toBe(6.38)
  })

  it('calcola correttamente la formula di scorporo inversa', () => {
    // Se il netto pagato è 85,00 € e il lordo originario era 100,00 €, lo scorporo restituisce 15,00 €
    const scorporo = calculateScorporoSavings(85.0, 0.15)
    expect(scorporo).toBe(15.0)
  })

  it('calcola correttamente il lordo originario prima dello sconto', () => {
    const gross = calculateGrossAmount(85.0, 0.15)
    expect(gross).toBe(100.0)
  })

  it('restituisce 0 per importo <= 0 o tasso sconto nullo', () => {
    expect(calculateDiscountSavings(0, 0.15)).toBe(0)
    expect(calculateDiscountSavings(-10, 0.15)).toBe(0)
    expect(calculateDiscountSavings(50, 0)).toBe(0)
  })
})
