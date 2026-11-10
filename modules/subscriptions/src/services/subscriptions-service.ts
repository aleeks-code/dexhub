import type { ModuleContext } from '@dexhub/sdk'
import type { Subscription, SubscriptionsSummary, UpcomingRenewal } from '../types'

const STORAGE_KEY = 'dexhub:subscriptions:items'
let _ctx: ModuleContext | null = null
const _memoryStore: Record<string, string> = {}

export function initSubscriptionsService(ctx: ModuleContext): void {
  _ctx = ctx
}

function getStored(): Subscription[] {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as Subscription[]
        if (Array.isArray(parsed)) {
          // If demo subscriptions were previously injected automatically, clean them up
          const cleaned = parsed.filter(
            (i) =>
              !i.id.startsWith('sub-netflix') &&
              !i.id.startsWith('sub-spotify') &&
              !i.id.startsWith('sub-icloud') &&
              !i.id.startsWith('sub-prime') &&
              !i.id.startsWith('sub-gym'),
          )
          if (cleaned.length !== parsed.length) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(cleaned))
          }
          return cleaned
        }
      }
      return []
    }
    const mem = _memoryStore[STORAGE_KEY]
    if (mem) {
      const parsed = JSON.parse(mem) as Subscription[]
      return Array.isArray(parsed) ? parsed : []
    }
    return []
  } catch {
    return []
  }
}

function saveStored(items: Subscription[]): void {
  try {
    const serialized = JSON.stringify(items)
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(STORAGE_KEY, serialized)
    } else {
      _memoryStore[STORAGE_KEY] = serialized
    }
  } catch {
    // Ignore storage quota
  }
}

export async function listSubscriptions(): Promise<Subscription[]> {
  return getStored()
}

export async function getSubscription(id: string): Promise<Subscription | null> {
  const items = getStored()
  return items.find((i) => i.id === id) ?? null
}

export async function createSubscription(
  input: Omit<Subscription, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<Subscription> {
  const items = getStored()
  const now = new Date().toISOString()
  const newSub: Subscription = {
    ...input,
    id: `sub-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    createdAt: now,
    updatedAt: now,
  }
  items.unshift(newSub)
  saveStored(items)
  return newSub
}

export async function updateSubscription(
  id: string,
  updates: Partial<Subscription>,
): Promise<Subscription | null> {
  const items = getStored()
  const idx = items.findIndex((i) => i.id === id)
  if (idx === -1) return null

  const updated: Subscription = {
    ...items[idx]!,
    ...updates,
    updatedAt: new Date().toISOString(),
  }
  items[idx] = updated
  saveStored(items)
  return updated
}

export async function deleteSubscription(id: string): Promise<boolean> {
  const items = getStored()
  const filtered = items.filter((i) => i.id !== id)
  if (filtered.length === items.length) return false
  saveStored(filtered)
  return true
}

export function calculateSubscriptionsSummary(subs: Subscription[]): SubscriptionsSummary {
  const activeSubs = subs.filter((s) => s.status === 'attivo')
  const pausedCount = subs.filter((s) => s.status === 'in_pausa').length

  let totalMonthlyCost = 0
  let totalAnnualCost = 0

  for (const s of activeSubs) {
    switch (s.cycle) {
      case 'mensile':
        totalMonthlyCost += s.cost
        totalAnnualCost += s.cost * 12
        break
      case 'annuale':
        totalMonthlyCost += s.cost / 12
        totalAnnualCost += s.cost
        break
      case 'trimestrale':
        totalMonthlyCost += s.cost / 3
        totalAnnualCost += s.cost * 4
        break
      case 'settimanale':
        totalMonthlyCost += s.cost * 4.333
        totalAnnualCost += s.cost * 52
        break
    }
  }

  // Calculate upcoming renewals
  const todayMs = new Date().setHours(0, 0, 0, 0)
  const renewals: UpcomingRenewal[] = activeSubs
    .map((s) => {
      const renewalMs = new Date(s.nextRenewalDate).getTime()
      const daysUntil = Math.round((renewalMs - todayMs) / (1000 * 60 * 60 * 24))
      return { subscription: s, daysUntil }
    })
    .filter((r) => r.daysUntil >= 0)
    .sort((a, b) => a.daysUntil - b.daysUntil)

  const nextRenewal = renewals[0] ?? null

  return {
    totalMonthlyCost: Math.round(totalMonthlyCost * 100) / 100,
    totalAnnualCost: Math.round(totalAnnualCost * 100) / 100,
    activeCount: activeSubs.length,
    pausedCount,
    nextRenewal,
    upcomingRenewals: renewals.slice(0, 5),
  }
}
