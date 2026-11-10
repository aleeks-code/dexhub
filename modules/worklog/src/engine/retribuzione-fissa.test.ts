import { describe, expect, it } from 'vitest'
import { computeRetribuzioneFissaMensile, quadraturaOk } from '@dexhub/worklog-engine'

describe('computeRetribuzioneFissaMensile — Stadio 2, somma pura dei 4 componenti', () => {
  it('somma i 4 componenti, arrotondato a 2 decimali', () => {
    expect(computeRetribuzioneFissaMensile({
      minimoTabellare: 1500, superminimo: 300, scattiAnzianita: 100, premioProduzioneFisso: 100.005,
    })).toBe(2000.01)
  })

  it('componenti a zero → 0', () => {
    expect(computeRetribuzioneFissaMensile({
      minimoTabellare: 0, superminimo: 0, scattiAnzianita: 0, premioProduzioneFisso: 0,
    })).toBe(0)
  })

  it('bucket unico (compatibilità legacy) = importo diretto', () => {
    expect(computeRetribuzioneFissaMensile({
      minimoTabellare: 2200, superminimo: 0, scattiAnzianita: 0, premioProduzioneFisso: 0,
    })).toBe(2200)
  })
})

describe('quadraturaOk — Modalità 1, confronto con la fissa dichiarata (epsilon 0.01)', () => {
  const componenti = { minimoTabellare: 1500, superminimo: 300, scattiAnzianita: 100, premioProduzioneFisso: 100 }
  // somma = 2000

  it('somma esatta → true', () => expect(quadraturaOk(componenti, 2000)).toBe(true))
  it('dentro epsilon (2000.01) → true', () => expect(quadraturaOk(componenti, 2000.01)).toBe(true))
  it('fuori epsilon (2000.02) → false', () => expect(quadraturaOk(componenti, 2000.02)).toBe(false))
  it('scostamento grosso (2200) → false', () => expect(quadraturaOk(componenti, 2200)).toBe(false))
})
