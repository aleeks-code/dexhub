import { describe, it, expect } from 'vitest'
import { calculateDough, calculatePanWeight, formatRecipeShareText } from './calculator'

describe('CalcolaPizza Engine', () => {
  it('calculates classic Neapolitan dough (8h room temperature) correctly', () => {
    const res = calculateDough({
      doughsNumber: 3,
      doughsWeight: 250,
      hydration: 60,
      saltPerLiter: 50,
      fatsPerLiter: 0,
      roomTemp: 20,
      risingTime: 8,
      fridgeRisingTime: 0,
      isGrandmaPizza: false,
    })

    expect(res.totalWeight).toBe(750)
    expect(res.flour).toBe(460)
    expect(res.water).toBe(276)
    expect(res.salt).toBe(13.8)
    expect(res.fats).toBe(0)
    expect(res.freshYeast).toBe(0.96)
    expect(res.dryYeast).toBe(0.32)
    // Baker's percentages: 276 / 460 = 60%
    expect(res.bakersPercentages.water).toBe(60)
  })

  it('calculates pizza in teglia with fridge retardation and fats', () => {
    const res = calculateDough({
      doughsNumber: 2,
      doughsWeight: 550,
      hydration: 80,
      saltPerLiter: 40,
      fatsPerLiter: 25,
      roomTemp: 20,
      risingTime: 48,
      fridgeRisingTime: 42,
      isGrandmaPizza: true,
    })

    expect(res.totalWeight).toBe(1100)
    expect(res.flour).toBeGreaterThan(500)
    expect(res.water).toBeGreaterThan(400)
    expect(res.fats).toBeGreaterThan(0)
    expect(res.freshYeast).toBeGreaterThan(0)
    expect(res.bakersPercentages.water).toBe(80)
  })

  it('calculates pan weight correctly based on rectangular dimensions and thickness factor', () => {
    // 30cm x 40cm = 1200 cm² * 0.55 = 660g
    const weightRect = calculatePanWeight({
      shape: 'rectangular',
      width: 30,
      length: 40,
      thicknessFactor: 0.55,
    })
    expect(weightRect).toBe(660)

    // Round pan 32cm diameter = radius 16cm -> pi * 256 = 804.25 cm² * 0.55 = 442g
    const weightRound = calculatePanWeight({
      shape: 'round',
      diameter: 32,
      thicknessFactor: 0.55,
    })
    expect(weightRound).toBe(442)
  })

  it('formats recipe share text cleanly', () => {
    const res = calculateDough({
      doughsNumber: 3,
      doughsWeight: 250,
      hydration: 60,
      saltPerLiter: 50,
      fatsPerLiter: 0,
      roomTemp: 21,
      risingTime: 8,
      fridgeRisingTime: 0,
      isGrandmaPizza: false,
    })
    const text = formatRecipeShareText('Napoletana Classica', res)
    expect(text).toContain('🍕 Napoletana Classica (Pizza tonda classica)')
    expect(text).toContain('Farina: 460g')
    expect(text).toContain('Acqua: 276g')
    expect(text).toContain('Lievito di birra fresco: 0.85g')
  })
})
