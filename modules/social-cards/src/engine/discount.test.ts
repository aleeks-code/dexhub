import { describe, it, expect } from 'vitest'
import { calculateDiscountSavings, calculateGrossAmount } from './discount'

describe('calculateDiscountSavings (formula di scorporo)', () => {
  it('calcola correttamente lo sconto del 15% su 85 € (risparmio di 15 € con lordo 100 €)', () => {
    // Se il lordo originario era 100 € e lo sconto 15% è 15 €, l'utente ha pagato 85 €
    const savings = calculateDiscountSavings(85.0, 0.15)
    expect(savings).toBe(15.0)
  })

  it('calcola correttamente lo sconto su importi reali con decimali', () => {
    // Pagato 42,50 € con sconto 15%
    // Lordo = 42.50 / 0.85 = 50.00 €
    // Risparmio = 7.50 €
    const savings = calculateDiscountSavings(42.5, 0.15)
    expect(savings).toBe(7.5)
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
