import { describe, it, expect, beforeEach } from 'vitest'
import {
  _clearStateForTesting,
  getCards,
  addExpense,
  addReconciliation,
  getCardSummary,
  deleteExpense,
} from './social-cards-service'

describe('SocialCardsService', () => {
  beforeEach(() => {
    _clearStateForTesting()
  })

  it('inizializza una carta predefinita per la Carta Dedicata a Te se lo stato è vuoto', async () => {
    const cards = await getCards()
    expect(cards.length).toBe(1)
    expect(cards[0]?.profileId).toBe('dedicata-a-te')
    expect(cards[0]?.editionId).toBe('2026-2027')
  })

  it('aggiunge una spesa e aggiorna il riepilogo con sconto convenzione scorporato', async () => {
    const [card] = await getCards()
    const exp = await addExpense({
      cardId: card!.id,
      amount: 42.5,
      merchant: 'Coop',
      isPartnerMerchant: true,
      category: 'alimentari_prima_necessita',
    })

    expect(exp.discountSaved).toBe(7.5) // 42.50 * (0.15 / 0.85) = 7.50 €

    const summary = await getCardSummary(card!.id)
    expect(summary?.totalSpentToDate).toBe(42.5)
    expect(summary?.estimatedBalance).toBe(457.5)
    expect(summary?.firstPurchaseMet).toBe(true)
  })

  it('aggiunge una riconciliazione Postamat a Checkpoint Anchor', async () => {
    const [card] = await getCards()
    await addExpense({
      cardId: card!.id,
      amount: 50.0,
      spentAt: '2026-11-10T09:00:00.000Z',
      merchant: 'Conad',
      isPartnerMerchant: true,
    })

    // Controllo Postamat
    const rec = await addReconciliation({
      cardId: card!.id,
      reconciledAt: '2026-11-10T12:00:00.000Z',
      atmBalance: 440.0, // Delta di -10 €
    })

    expect(rec.atmBalance).toBe(440.0)
    expect(rec.delta).toBe(-10.0)

    const summary = await getCardSummary(card!.id, '2026-11-12T12:00:00.000Z')
    expect(summary?.estimatedBalance).toBe(440.0)
  })

  it('elimina una spesa e riallinea il saldo', async () => {
    const [card] = await getCards()
    const exp = await addExpense({
      cardId: card!.id,
      amount: 100.0,
      merchant: 'Esselunga',
      isPartnerMerchant: false,
    })

    let summary = await getCardSummary(card!.id)
    expect(summary?.estimatedBalance).toBe(400.0)

    const deleted = await deleteExpense(exp.id)
    expect(deleted).toBe(true)

    summary = await getCardSummary(card!.id)
    expect(summary?.estimatedBalance).toBe(500.0)
  })
})
