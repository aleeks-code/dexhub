import { describe, it, expect } from 'vitest'
import { calculateCardBalance } from './balance'
import { EDITION_2026_2027 } from '../config/dedicata-a-te'
import type { SocialBenefitCard, SocialCardExpense, PostamatReconciliation } from '../types'

const mockCard: SocialBenefitCard = {
  id: 'card-1',
  profileId: 'dedicata-a-te',
  editionId: '2026-2027',
  cardNumberLast4: '1234',
  createdAt: '2026-09-01T08:00:00.000Z',
  updatedAt: '2026-09-01T08:00:00.000Z',
}

describe('calculateCardBalance', () => {
  it('calcola il saldo stimato iniziale di 500 € senza spese a novembre 2026', () => {
    const summary = calculateCardBalance({
      card: mockCard,
      edition: EDITION_2026_2027,
      expenses: [],
      reconciliations: [],
      currentDate: '2026-11-12T12:00:00.000Z',
    })

    expect(summary.totalCreditedToDate).toBe(500.0)
    expect(summary.totalSpentToDate).toBe(0.0)
    expect(summary.estimatedBalance).toBe(500.0)
    expect(summary.firstPurchaseMet).toBe(false)
    expect(summary.isFirstPurchaseExpired).toBe(false)
    expect(summary.daysToFirstPurchaseDeadline).toBeGreaterThan(0)
    expect(summary.activeTranche?.id).toBe('tranche-2026')
    expect(summary.nextTranche?.id).toBe('tranche-2027')
  })

  it('scala correttamente le spese dal saldo stimato e valida l’attivazione primo acquisto', () => {
    const expenses: SocialCardExpense[] = [
      {
        id: 'exp-1',
        cardId: 'card-1',
        amount: 85.0,
        spentAt: '2026-11-10T10:30:00.000Z',
        merchant: 'Conad',
        isPartnerMerchant: true,
        discountSaved: 15.0,
        category: 'alimentari_prima_necessita',
        createdAt: '2026-11-10T10:30:00.000Z',
        updatedAt: '2026-11-10T10:30:00.000Z',
      },
    ]

    const summary = calculateCardBalance({
      card: mockCard,
      edition: EDITION_2026_2027,
      expenses,
      reconciliations: [],
      currentDate: '2026-11-12T12:00:00.000Z',
    })

    expect(summary.totalCreditedToDate).toBe(500.0)
    expect(summary.totalSpentToDate).toBe(85.0)
    expect(summary.estimatedBalance).toBe(415.0)
    expect(summary.totalDiscountSaved).toBe(15.0)
    expect(summary.firstPurchaseMet).toBe(true) // Primo acquisto effettuato entro il 16/12!
    expect(summary.isFirstPurchaseExpired).toBe(false)
  })

  it('segnala decadenza se superato il 16 Dicembre 2026 senza nessun acquisto effettuato', () => {
    const summary = calculateCardBalance({
      card: mockCard,
      edition: EDITION_2026_2027,
      expenses: [],
      reconciliations: [],
      currentDate: '2026-12-18T10:00:00.000Z',
    })

    expect(summary.firstPurchaseMet).toBe(false)
    expect(summary.isFirstPurchaseExpired).toBe(true)
    expect(summary.daysToFirstPurchaseDeadline).toBe(0)
  })

  it('gestisce la Riconciliazione Postamat a "Checkpoint Anchor"', () => {
    // Spesa 1 effettuata la mattina prima del controllo Postamat
    const exp1: SocialCardExpense = {
      id: 'exp-1',
      cardId: 'card-1',
      amount: 50.0,
      spentAt: '2026-11-10T09:00:00.000Z',
      merchant: 'Coop',
      isPartnerMerchant: true,
      discountSaved: 8.82,
      category: 'alimentari_prima_necessita',
      createdAt: '2026-11-10T09:00:00.000Z',
      updatedAt: '2026-11-10T09:00:00.000Z',
    }

    // Checkpoint Postamat effettuato alle 12:00: saldo effettivo riscontrato 435 €
    const rec: PostamatReconciliation = {
      id: 'rec-1',
      cardId: 'card-1',
      reconciledAt: '2026-11-10T12:00:00.000Z',
      atmBalance: 435.0, // Anchor assoluto!
      estimatedBalanceAtAnchor: 450.0,
      delta: -15.0,
      notes: 'Verifica ATM Postamat Luzzara',
      createdAt: '2026-11-10T12:00:00.000Z',
    }

    // Spesa 2 effettuata il pomeriggio DOPO il checkpoint
    const exp2: SocialCardExpense = {
      id: 'exp-2',
      cardId: 'card-1',
      amount: 35.0,
      spentAt: '2026-11-10T17:30:00.000Z',
      merchant: 'Eurospin',
      isPartnerMerchant: true,
      discountSaved: 6.18,
      category: 'alimentari_prima_necessita',
      createdAt: '2026-11-10T17:30:00.000Z',
      updatedAt: '2026-11-10T17:30:00.000Z',
    }

    const summary = calculateCardBalance({
      card: mockCard,
      edition: EDITION_2026_2027,
      expenses: [exp1, exp2],
      reconciliations: [rec],
      currentDate: '2026-11-12T12:00:00.000Z',
    })

    // Formula Checkpoint Anchor:
    // estimatedBalance = atmBalance (435) - spese successive (35) = 400.00 €
    expect(summary.estimatedBalance).toBe(400.0)
    expect(summary.lastReconciliation?.atmBalance).toBe(435.0)
    expect(summary.lastReconciliation?.delta).toBe(-15.0)
    expect(summary.totalSpentToDate).toBe(85.0)
  })

  it('gestisce la logica FIFO e lo sblocco automatico della Tranche da aprile 2027', () => {
    // A febbraio 2027 è attiva solo la Tranche 2026 (500 €) prima della sua scadenza
    const summaryFebbraio = calculateCardBalance({
      card: mockCard,
      edition: EDITION_2026_2027,
      expenses: [
        {
          id: 'exp-1',
          cardId: 'card-1',
          amount: 400.0,
          spentAt: '2027-01-15T10:00:00.000Z',
          merchant: 'Esselunga',
          isPartnerMerchant: true,
          discountSaved: 70.59,
          category: 'alimentari_prima_necessita',
          createdAt: '2027-01-15T10:00:00.000Z',
          updatedAt: '2027-01-15T10:00:00.000Z',
        },
      ],
      reconciliations: [],
      currentDate: '2027-02-15T12:00:00.000Z',
    })

    expect(summaryFebbraio.totalCreditedToDate).toBe(500.0)
    expect(summaryFebbraio.estimatedBalance).toBe(100.0)
    expect(summaryFebbraio.tranchesStatus[0]?.spentAmount).toBe(400.0)
    expect(summaryFebbraio.tranchesStatus[0]?.remainingAmount).toBe(100.0)
    expect(summaryFebbraio.tranchesStatus[1]?.isUnlocked).toBe(false)

    // Ad aprile 2027 si sbloccano automaticamente ulteriori 500 € (+500 € -> 1000 € totali)
    const summaryAprile = calculateCardBalance({
      card: mockCard,
      edition: EDITION_2026_2027,
      expenses: [
        {
          id: 'exp-1',
          cardId: 'card-1',
          amount: 500.0, // Tranche 1 interamente spesa
          spentAt: '2027-01-15T10:00:00.000Z',
          merchant: 'Esselunga',
          isPartnerMerchant: true,
          discountSaved: 88.24,
          category: 'alimentari_prima_necessita',
          createdAt: '2027-01-15T10:00:00.000Z',
          updatedAt: '2027-01-15T10:00:00.000Z',
        },
        {
          id: 'exp-2',
          cardId: 'card-1',
          amount: 150.0, // Consuma Tranche 2!
          spentAt: '2027-04-10T11:00:00.000Z',
          merchant: 'Coop',
          isPartnerMerchant: true,
          discountSaved: 26.47,
          category: 'alimentari_prima_necessita',
          createdAt: '2027-04-10T11:00:00.000Z',
          updatedAt: '2027-04-10T11:00:00.000Z',
        },
      ],
      reconciliations: [],
      currentDate: '2027-04-15T12:00:00.000Z',
    })

    expect(summaryAprile.totalCreditedToDate).toBe(1000.0)
    expect(summaryAprile.totalSpentToDate).toBe(650.0)
    expect(summaryAprile.estimatedBalance).toBe(350.0)

    // FIFO: Tranche 1 (500 €) esaurita
    expect(summaryAprile.tranchesStatus[0]?.spentAmount).toBe(500.0)
    expect(summaryAprile.tranchesStatus[0]?.remainingAmount).toBe(0.0)

    // Tranche 2 (500 €): 150 € spesi, 350 € rimanenti
    expect(summaryAprile.tranchesStatus[1]?.isUnlocked).toBe(true)
    expect(summaryAprile.tranchesStatus[1]?.spentAmount).toBe(150.0)
    expect(summaryAprile.tranchesStatus[1]?.remainingAmount).toBe(350.0)
  })

  it('gestisce la decadenza dell’importo residuo non speso oltre la scadenza finale', () => {
    // Tranche 2026 scade il 2027-02-28. Il 2027-03-05 l'utente aveva speso solo 400 €.
    // I 100 € residui sono decaduti per legge!
    const summaryDecadenza = calculateCardBalance({
      card: mockCard,
      edition: EDITION_2026_2027,
      expenses: [
        {
          id: 'exp-1',
          cardId: 'card-1',
          amount: 400.0,
          spentAt: '2027-01-15T10:00:00.000Z',
          merchant: 'Esselunga',
          isPartnerMerchant: true,
          discountSaved: 70.59,
          category: 'alimentari_prima_necessita',
          createdAt: '2027-01-15T10:00:00.000Z',
          updatedAt: '2027-01-15T10:00:00.000Z',
        },
      ],
      reconciliations: [],
      currentDate: '2027-03-05T12:00:00.000Z',
    })

    expect(summaryDecadenza.tranchesStatus[0]?.isExpired).toBe(true)
    expect(summaryDecadenza.tranchesStatus[0]?.remainingAmount).toBe(100.0)
    // Saldo stimato ridotto a 0 perché i 100 € sono decaduti
    expect(summaryDecadenza.estimatedBalance).toBe(0.0)
  })
})
