import { describe, it, expect, beforeEach } from 'vitest'
import {
  _clearStateForTesting,
  getCards,
  registerCard,
  deleteCard,
  addExpense,
  addReconciliation,
  getCardSummary,
  deleteExpense,
} from './social-cards-service'

describe('SocialCardsService', () => {
  beforeEach(() => {
    _clearStateForTesting()
  })

  it('inizializza uno stato completamente vuoto senza carte automatiche', async () => {
    const cards = await getCards()
    expect(cards.length).toBe(0)
  })

  it('consente di registrare manualmente una nuova Carta Dedicata a Te (500 €)', async () => {
    const card = await registerCard({
      customName: 'Mia Dedicata a Te',
      cardNumberLast4: '4821',
    })

    expect(card.customName).toBe('Mia Dedicata a Te')
    expect(card.cardNumberLast4).toBe('4821')
    expect(card.profileId).toBe('dedicata-a-te')

    const cards = await getCards()
    expect(cards.length).toBe(1)

    const summary = await getCardSummary(card.id)
    expect(summary?.estimatedBalance).toBe(500.0)
    expect(summary?.totalCreditedToDate).toBe(500.0)
    expect(summary?.firstPurchaseMet).toBe(false)
  })

  it('consente di registrare una carta già utilizzata con saldo Postamat iniziale', async () => {
    const card = await registerCard({
      customName: 'Carta già usata',
      cardNumberLast4: '9999',
      initialAtmBalance: 380.0,
      notes: 'Saldo verificato all’ATM prima della registrazione',
    })

    const summary = await getCardSummary(card.id)
    expect(summary?.estimatedBalance).toBe(380.0)
    expect(summary?.lastReconciliation?.atmBalance).toBe(380.0)
    expect(summary?.lastReconciliation?.delta).toBe(-120.0)
  })

  it('aggiunge una spesa e aggiorna il riepilogo con sconto convenzione scorporato', async () => {
    const card = await registerCard({
      customName: 'Carta Famiglia',
    })

    const exp = await addExpense({
      cardId: card.id,
      amount: 42.5,
      merchant: 'Coop',
      isPartnerMerchant: true,
      category: 'alimentari_prima_necessita',
    })

    expect(exp.discountSaved).toBe(7.5) // 42.50 * (0.15 / 0.85) = 7.50 €

    const summary = await getCardSummary(card.id)
    expect(summary?.totalSpentToDate).toBe(42.5)
    expect(summary?.estimatedBalance).toBe(457.5)
    expect(summary?.firstPurchaseMet).toBe(true)
  })

  it('aggiunge una riconciliazione Postamat a Checkpoint Anchor', async () => {
    const card = await registerCard({
      customName: 'Carta Famiglia',
    })

    await addExpense({
      cardId: card.id,
      amount: 50.0,
      spentAt: '2026-11-10T09:00:00.000Z',
      merchant: 'Conad',
      isPartnerMerchant: true,
    })

    // Controllo Postamat
    const rec = await addReconciliation({
      cardId: card.id,
      reconciledAt: '2026-11-10T12:00:00.000Z',
      atmBalance: 440.0,
    })

    expect(rec.atmBalance).toBe(440.0)
    expect(rec.delta).toBe(-10.0)

    const summary = await getCardSummary(card.id, '2026-11-12T12:00:00.000Z')
    expect(summary?.estimatedBalance).toBe(440.0)
  })

  it('elimina una spesa e riallinea il saldo', async () => {
    const card = await registerCard({
      customName: 'Carta Famiglia',
    })

    const exp = await addExpense({
      cardId: card.id,
      amount: 100.0,
      merchant: 'Esselunga',
      isPartnerMerchant: false,
    })

    let summary = await getCardSummary(card.id)
    expect(summary?.estimatedBalance).toBe(400.0)

    const deleted = await deleteExpense(exp.id)
    expect(deleted).toBe(true)

    summary = await getCardSummary(card.id)
    expect(summary?.estimatedBalance).toBe(500.0)
  })

  it('elimina una carta e pulisce spese e riconciliazioni collegate', async () => {
    const card = await registerCard({
      customName: 'Carta da eliminare',
    })

    await addExpense({
      cardId: card.id,
      amount: 25.0,
      merchant: 'Lidl',
      isPartnerMerchant: true,
    })

    const deleted = await deleteCard(card.id)
    expect(deleted).toBe(true)

    const cards = await getCards()
    expect(cards.length).toBe(0)

    const summary = await getCardSummary(card.id)
    expect(summary).toBeNull()
  })

  it('cifra i dati sensibili della carta a riposo (cardNumber, cvv, pin) con AES-256-GCM', async () => {
    let savedKvState: any = null
    const mockCtx: any = {
      kv: {
        get: async (key: string) => savedKvState,
        set: async (key: string, val: any) => {
          savedKvState = val
        },
      },
    }

    const { initSocialCardsService } = await import('./social-cards-service')
    initSocialCardsService(mockCtx)

    const card = await registerCard({
      customName: 'Carta con Credenziali Segrete',
      cardNumber: '5333 1234 5678 9012',
      cvv: '918',
      pin: '77412',
      expiryDate: '11/28',
    })

    // In memoria il servizio fornisce i dati decifrati per la sessione corrente
    expect(card.cardNumber).toBe('5333123456789012')
    expect(card.cardNumberLast4).toBe('9012')
    expect(card.cvv).toBe('918')
    expect(card.pin).toBe('77412')

    // Nel supporto di memorizzazione persistente (KV) i dati sono cifrati con AES-256-GCM
    expect(savedKvState).toBeDefined()
    const storedCard = savedKvState.cards[0]
    expect(storedCard.cardNumber).not.toContain('5333123456789012')
    expect(storedCard.cardNumber.startsWith('enc:v1:')).toBe(true)
    expect(storedCard.cvv.startsWith('enc:v1:')).toBe(true)
    expect(storedCard.pin.startsWith('enc:v1:')).toBe(true)
    expect(storedCard.cardNumberLast4).toBe('9012') // Last4 conservato per PCI-DSS

    // Ricaricando lo stato da zero, i campi vengono decifrati correttamente
    _clearStateForTesting()
    const reloadedCards = await getCards()
    expect(reloadedCards.length).toBe(1)
    expect(reloadedCards[0]?.cardNumber).toBe('5333123456789012')
    expect(reloadedCards[0]?.cardNumberLast4).toBe('9012')
    expect(reloadedCards[0]?.cvv).toBe('918')
    expect(reloadedCards[0]?.pin).toBe('77412')
  })
})
