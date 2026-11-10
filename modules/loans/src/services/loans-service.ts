import type { ModuleContext } from '@dexhub/sdk'
import type { Loan, Installment, ExtraPayment, GlobalLoansSummary } from '../types'
import {
  generateAmortizationSchedule,
  calculateGlobalLoansSummary,
  calculateFrenchMonthlyInstallment,
} from '../engine/amortization'

const STORAGE_LOANS_KEY = 'dexhub:loans:data'
const KV_KEY_LOANS = 'loans_list'

let _ctx: ModuleContext | null = null
const _memoryStore: Record<string, string> = {}

export function initLoansService(ctx: ModuleContext): void {
  _ctx = ctx
}

export function _clearStoreForTesting(): void {
  for (const k of Object.keys(_memoryStore)) {
    delete _memoryStore[k]
  }
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      localStorage.removeItem(STORAGE_LOANS_KEY)
    } catch {
      // Ignore
    }
  }
}

function getLocal<T>(key: string, defaultVal: T): T {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const raw = localStorage.getItem(key)
      return raw ? (JSON.parse(raw) as T) : defaultVal
    }
    const raw = _memoryStore[key]
    return raw ? (JSON.parse(raw) as T) : defaultVal
  } catch {
    return defaultVal
  }
}

function saveLocal<T>(key: string, val: T): void {
  try {
    const serialized = JSON.stringify(val)
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(key, serialized)
    } else {
      _memoryStore[key] = serialized
    }
  } catch {
    // Ignore storage quota
  }
}

function generateId(): string {
  return 'loan_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7)
}

export async function getLoans(): Promise<Loan[]> {
  if (_ctx?.kv) {
    try {
      const remote = await _ctx.kv.get<Loan[]>(KV_KEY_LOANS)
      if (remote && Array.isArray(remote)) {
        saveLocal(STORAGE_LOANS_KEY, remote)
        return remote
      }
    } catch (e) {
      console.warn('[loans-service] KV get failed, falling back to local storage', e)
    }
  }
  return getLocal<Loan[]>(STORAGE_LOANS_KEY, [])
}

async function persistLoans(loans: Loan[]): Promise<void> {
  saveLocal(STORAGE_LOANS_KEY, loans)
  if (_ctx?.kv) {
    try {
      await _ctx.kv.set(KV_KEY_LOANS, loans)
    } catch (e) {
      console.warn('[loans-service] KV set failed', e)
    }
  }
}

export async function getLoanById(id: string): Promise<Loan | null> {
  const loans = await getLoans()
  return loans.find((l) => l.id === id) || null
}

export async function createLoan(
  data: Omit<Loan, 'id' | 'createdAt' | 'updatedAt' | 'schedule'> & {
    schedule?: Installment[]
  },
): Promise<Loan> {
  const loans = await getLoans()
  const now = new Date().toISOString()
  const id = generateId()

  const monthlyInstallment =
    data.monthlyInstallment && data.monthlyInstallment > 0
      ? data.monthlyInstallment
      : calculateFrenchMonthlyInstallment(data.financedAmount, data.tan, data.installmentsCount)

  const schedule =
    data.schedule && data.schedule.length > 0
      ? data.schedule
      : generateAmortizationSchedule({
          financedAmount: data.financedAmount,
          tan: data.tan,
          installmentsCount: data.installmentsCount,
          startDate: data.startDate,
          paymentDay: data.paymentDay,
          monthlyFee: data.monthlyFee,
          knownMonthlyInstallment: monthlyInstallment,
        })

  const newLoan: Loan = {
    ...data,
    id,
    monthlyInstallment,
    schedule,
    createdAt: now,
    updatedAt: now,
  }

  loans.unshift(newLoan)
  await persistLoans(loans)
  return newLoan
}

export async function updateLoan(id: string, updates: Partial<Loan>): Promise<Loan | null> {
  const loans = await getLoans()
  const idx = loans.findIndex((l) => l.id === id)
  if (idx === -1) return null

  const existing = loans[idx]!
  const updated: Loan = {
    ...existing,
    ...updates,
    updatedAt: new Date().toISOString(),
  }

  // If parameters that affect schedule were changed and no explicit schedule was provided, regenerate
  if (
    updates.financedAmount !== undefined ||
    updates.tan !== undefined ||
    updates.installmentsCount !== undefined ||
    updates.startDate !== undefined ||
    updates.paymentDay !== undefined ||
    updates.monthlyFee !== undefined
  ) {
    if (!updates.schedule) {
      updated.schedule = generateAmortizationSchedule({
        financedAmount: updated.financedAmount,
        tan: updated.tan,
        installmentsCount: updated.installmentsCount,
        startDate: updated.startDate,
        paymentDay: updated.paymentDay,
        monthlyFee: updated.monthlyFee,
        knownMonthlyInstallment: updated.monthlyInstallment,
      })
    }
  }

  loans[idx] = updated
  await persistLoans(loans)
  return updated
}

export async function deleteLoan(id: string): Promise<boolean> {
  const loans = await getLoans()
  const filtered = loans.filter((l) => l.id !== id)
  if (filtered.length === loans.length) return false
  await persistLoans(filtered)
  return true
}

export async function addExtraPayment(
  loanId: string,
  extra: Omit<ExtraPayment, 'id'>,
): Promise<Loan | null> {
  const loan = await getLoanById(loanId)
  if (!loan) return null

  const extraPayment: ExtraPayment = {
    ...extra,
    id: 'ep_' + Date.now().toString(36),
  }

  const existingList = loan.extraPayments || []
  return updateLoan(loanId, {
    extraPayments: [...existingList, extraPayment],
  })
}

export async function removeExtraPayment(
  loanId: string,
  paymentId: string,
): Promise<Loan | null> {
  const loan = await getLoanById(loanId)
  if (!loan || !loan.extraPayments) return null

  return updateLoan(loanId, {
    extraPayments: loan.extraPayments.filter((p) => p.id !== paymentId),
  })
}

export async function setInstallmentOverride(
  loanId: string,
  installmentNumber: number,
  override: 'paid' | 'unpaid' | undefined,
): Promise<Loan | null> {
  const loan = await getLoanById(loanId)
  if (!loan) return null

  const updatedSchedule = loan.schedule.map((inst) => {
    if (inst.number === installmentNumber) {
      return {
        ...inst,
        manualOverride: override,
        paidAt: override === 'paid' ? new Date().toISOString() : undefined,
      }
    }
    return inst
  })

  return updateLoan(loanId, { schedule: updatedSchedule })
}

export async function getGlobalSummary(): Promise<GlobalLoansSummary> {
  const loans = await getLoans()
  return calculateGlobalLoansSummary(loans)
}
