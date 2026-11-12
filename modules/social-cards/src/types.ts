export interface TrancheConfig {
  id: string
  label: string
  initialAmount: number
  availableDate: string // YYYY-MM-DD
  firstPurchaseDeadline: string | null // YYYY-MM-DD (es. 2026-12-16)
  finalSpendingDeadline: string | null // YYYY-MM-DD
}

export interface AllowedCategory {
  id: string
  label: string
  icon?: string
  description?: string
  isAllowed: boolean
}

export interface EditionConfig {
  editionId: string // es. '2026-2027'
  year: number
  label: string
  description?: string
  allowedCategories: AllowedCategory[]
  hasDiscountPartners: boolean
  defaultDiscountRate: number // 0.15 = 15%
  tranches: TrancheConfig[]
}

export interface SocialBenefitProfile {
  id: string // es. 'dedicata-a-te'
  name: string
  issuingAuthority: string
  defaultIcon: string
  description: string
  currentEditionId: string
  editions: Record<string, EditionConfig>
}

export interface SocialBenefitCard {
  id: string
  profileId: string // 'dedicata-a-te'
  editionId: string // '2026-2027'
  customName?: string
  cardNumber?: string // 16 cifre complete (es. 5333 1712 3456 7890)
  cardNumberLast4?: string // Ultime 4 cifre per identificazione rapida
  expiryDate?: string // Scadenza MM/AA
  cvv?: string // CVV a 3 cifre
  pin?: string // PIN a 5 cifre per prelievi e Postamat ATM
  createdAt: string // ISO timestamp
  updatedAt: string // ISO timestamp
}

export interface SocialCardExpense {
  id: string
  cardId: string
  amount: number // Importo pagato sullo scontrino (già scontato)
  spentAt: string // ISO timestamp con data e ora (YYYY-MM-DDTHH:mm:ss.sssZ)
  merchant: string
  isPartnerMerchant: boolean
  discountSaved: number // Risparmio calcolato (con scorporo o override manuale)
  category: string
  notes?: string
  createdAt: string
  updatedAt: string
}

export interface PostamatReconciliation {
  id: string
  cardId: string
  reconciledAt: string // ISO timestamp con data e ora (punto di ancoraggio assoluto)
  atmBalance: number // Saldo effettivo rilevato allo sportello Postamat
  estimatedBalanceAtAnchor: number // Saldo che DexHub stimava fino a quell'istante
  delta: number // atmBalance - estimatedBalanceAtAnchor
  notes?: string
  createdAt: string
}

export interface TrancheFifoStatus {
  tranche: TrancheConfig
  isUnlocked: boolean
  originalAmount: number
  spentAmount: number
  remainingAmount: number
  isExpired: boolean
  isFirstPurchaseMet: boolean
}

export interface CardBalanceSummary {
  cardId: string
  profileId: string
  editionId: string
  // Saldo stimato ad oggi / referenceDate
  estimatedBalance: number
  totalCreditedToDate: number
  totalSpentToDate: number
  totalDiscountSaved: number
  
  // Riconciliazione attiva
  lastReconciliation: PostamatReconciliation | null
  
  // Pool Tranche con logica FIFO
  tranchesStatus: TrancheFifoStatus[]
  activeTranche: TrancheConfig | null
  nextTranche: TrancheConfig | null
  
  // Scadenza primo acquisto (Tranche corrente)
  firstPurchaseMet: boolean
  firstPurchaseDeadline: string | null
  daysToFirstPurchaseDeadline: number | null
  isFirstPurchaseExpired: boolean
  
  // Scadenza spesa finale
  finalSpendingDeadline: string | null
  daysToFinalSpendingDeadline: number | null
  isFinalSpendingExpired: boolean
  
  // Ultime attività
  lastExpense: SocialCardExpense | null
  totalExpensesCount: number
}

export interface SocialCardsStorageState {
  schemaVersion: 1
  cards: SocialBenefitCard[]
  expenses: SocialCardExpense[]
  reconciliations: PostamatReconciliation[]
}
