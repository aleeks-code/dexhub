export type SubscriptionCategory =
  | 'streaming'
  | 'software'
  | 'utilities'
  | 'fitness'
  | 'hosting'
  | 'other'

export type BillingCycle = 'mensile' | 'annuale' | 'trimestrale' | 'settimanale'

export type SubscriptionStatus = 'attivo' | 'in_pausa' | 'cancellato'

export interface Subscription {
  id: string
  name: string
  category: SubscriptionCategory
  cost: number
  cycle: BillingCycle
  nextRenewalDate: string // 'YYYY-MM-DD'
  paymentMethod?: string
  status: SubscriptionStatus
  color?: string
  notes?: string
  url?: string
  createdAt: string
  updatedAt: string
}

export interface UpcomingRenewal {
  subscription: Subscription
  daysUntil: number
}

export interface SubscriptionsSummary {
  totalMonthlyCost: number
  totalAnnualCost: number
  activeCount: number
  pausedCount: number
  nextRenewal: UpcomingRenewal | null
  upcomingRenewals: UpcomingRenewal[]
}
