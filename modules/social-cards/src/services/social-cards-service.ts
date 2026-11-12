import type { ModuleContext } from '@dexhub/sdk'
import type {
  SocialCardsStorageState,
  SocialBenefitCard,
  SocialCardExpense,
  PostamatReconciliation,
  CardBalanceSummary,
} from '../types'
import { calculateCardBalance } from '../engine/balance'
import { calculateDiscountSavings } from '../engine/discount'
import { DEDICATA_A_TE_PROFILE, EDITION_2026_2027, getEditionConfig } from '../config/dedicata-a-te'

const STORAGE_KEY = 'dexhub:social-cards:state'
const KV_KEY = 'social_cards_state'

let _ctx: ModuleContext | null = null
let _memoryState: SocialCardsStorageState | null = null

export function initSocialCardsService(ctx: ModuleContext): void {
  _ctx = ctx
}

export function _clearStateForTesting(): void {
  _memoryState = null
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {
      // Ignore
    }
  }
}

function getDefaultState(): SocialCardsStorageState {
  const defaultCard: SocialBenefitCard = {
    id: 'default-dedicata-a-te-2026',
    profileId: DEDICATA_A_TE_PROFILE.id,
    editionId: EDITION_2026_2027.editionId,
    customName: 'Carta Dedicata a Te (2026–2027)',
    cardNumberLast4: '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  return {
    schemaVersion: 1,
    cards: [defaultCard],
    expenses: [],
    reconciliations: [],
  }
}

export async function loadState(): Promise<SocialCardsStorageState> {
  // 1. Memory cache
  if (_memoryState) return _memoryState

  // 2. Try Module KV Adapter
  if (_ctx?.kv) {
    try {
      const remote = await _ctx.kv.get<SocialCardsStorageState>(KV_KEY)
      if (remote && remote.schemaVersion === 1) {
        _memoryState = remote
        return remote
      }
    } catch (err) {
      console.warn('[SocialCardsService] Failed to read from KV adapter:', err)
    }
  }

  // 3. Fallback LocalStorage
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as SocialCardsStorageState
        if (parsed.schemaVersion === 1) {
          _memoryState = parsed
          return parsed
        }
      }
    } catch (err) {
      console.warn('[SocialCardsService] Failed to read from localStorage:', err)
    }
  }

  // 4. Default state
  const fallback = getDefaultState()
  _memoryState = fallback
  return fallback
}

export async function saveState(state: SocialCardsStorageState): Promise<void> {
  _memoryState = state

  // LocalStorage
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch (err) {
      console.warn('[SocialCardsService] LocalStorage save failed:', err)
    }
  }

  // KV Adapter
  if (_ctx?.kv) {
    try {
      await _ctx.kv.set(KV_KEY, state)
    } catch (err) {
      console.warn('[SocialCardsService] KV set failed:', err)
    }
  }
}

// -----------------------------------------------------------------------------
// CRUD Operations
// -----------------------------------------------------------------------------

export async function getCards(): Promise<SocialBenefitCard[]> {
  const state = await loadState()
  if (state.cards.length === 0) {
    const defaultState = getDefaultState()
    state.cards = defaultState.cards
    await saveState(state)
  }
  return state.cards
}

export async function getCardById(cardId: string): Promise<SocialBenefitCard | undefined> {
  const cards = await getCards()
  return cards.find((c) => c.id === cardId)
}

export async function addExpense(input: {
  cardId: string
  amount: number
  spentAt?: string // ISO string or default now
  merchant: string
  isPartnerMerchant: boolean
  discountSaved?: number
  category?: string
  notes?: string
}): Promise<SocialCardExpense> {
  const state = await loadState()
  const nowIso = new Date().toISOString()

  let discountSaved = input.discountSaved
  if (discountSaved === undefined && input.isPartnerMerchant) {
    discountSaved = calculateDiscountSavings(input.amount, 0.15)
  }

  const newExpense: SocialCardExpense = {
    id: `exp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    cardId: input.cardId,
    amount: Math.round(input.amount * 100) / 100,
    spentAt: input.spentAt ?? nowIso,
    merchant: input.merchant.trim(),
    isPartnerMerchant: input.isPartnerMerchant,
    discountSaved: discountSaved ? Math.round(discountSaved * 100) / 100 : 0,
    category: input.category ?? 'alimentari_prima_necessita',
    notes: input.notes?.trim() || undefined,
    createdAt: nowIso,
    updatedAt: nowIso,
  }

  state.expenses.push(newExpense)
  await saveState(state)
  return newExpense
}

export async function updateExpense(
  id: string,
  input: Partial<Omit<SocialCardExpense, 'id' | 'cardId' | 'createdAt'>>
): Promise<SocialCardExpense | null> {
  const state = await loadState()
  const idx = state.expenses.findIndex((e) => e.id === id)
  if (idx === -1) return null

  const existing = state.expenses[idx]!
  const updated: SocialCardExpense = {
    ...existing,
    ...input,
    updatedAt: new Date().toISOString(),
  }

  state.expenses[idx] = updated
  await saveState(state)
  return updated
}

export async function deleteExpense(id: string): Promise<boolean> {
  const state = await loadState()
  const initialLen = state.expenses.length
  state.expenses = state.expenses.filter((e) => e.id !== id)
  if (state.expenses.length !== initialLen) {
    await saveState(state)
    return true
  }
  return false
}

export async function addReconciliation(input: {
  cardId: string
  reconciledAt?: string
  atmBalance: number
  notes?: string
}): Promise<PostamatReconciliation> {
  const state = await loadState()
  const card = state.cards.find((c) => c.id === input.cardId)
  if (!card) throw new Error(`Card ${input.cardId} not found`)

  const edition = getEditionConfig(card.profileId, card.editionId) ?? EDITION_2026_2027
  const nowIso = new Date().toISOString()
  const reconciledAt = input.reconciledAt ?? nowIso

  // Calcola quale era la stima DexHub fino all'istante della riconciliazione
  const priorSummary = calculateCardBalance({
    card,
    edition,
    expenses: state.expenses,
    reconciliations: state.reconciliations,
    currentDate: reconciledAt,
  })

  const atmBalance = Math.round(input.atmBalance * 100) / 100
  const delta = Math.round((atmBalance - priorSummary.estimatedBalance) * 100) / 100

  const reconciliation: PostamatReconciliation = {
    id: `rec-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    cardId: input.cardId,
    reconciledAt,
    atmBalance,
    estimatedBalanceAtAnchor: priorSummary.estimatedBalance,
    delta,
    notes: input.notes?.trim() || undefined,
    createdAt: nowIso,
  }

  state.reconciliations.push(reconciliation)
  await saveState(state)
  return reconciliation
}

export async function deleteReconciliation(id: string): Promise<boolean> {
  const state = await loadState()
  const initialLen = state.reconciliations.length
  state.reconciliations = state.reconciliations.filter((r) => r.id !== id)
  if (state.reconciliations.length !== initialLen) {
    await saveState(state)
    return true
  }
  return false
}

export async function getCardSummary(
  cardId: string,
  currentDate?: string | Date
): Promise<CardBalanceSummary | null> {
  const state = await loadState()
  const card = state.cards.find((c) => c.id === cardId)
  if (!card) return null

  const edition = getEditionConfig(card.profileId, card.editionId) ?? EDITION_2026_2027

  return calculateCardBalance({
    card,
    edition,
    expenses: state.expenses,
    reconciliations: state.reconciliations,
    currentDate,
  })
}
