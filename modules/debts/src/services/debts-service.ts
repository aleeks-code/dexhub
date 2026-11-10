import type { ModuleContext } from '@dexhub/sdk'
import {
  type Person,
  type DebtTransaction,
  type PersonSummary,
  type GlobalSummary,
  type HistoryStep,
  AVATAR_COLORS,
} from '../types'

const STORAGE_PEOPLE_KEY = 'dexhub:debts:people'
const STORAGE_TXS_KEY = 'dexhub:debts:transactions'

const KV_KEY_PEOPLE = 'people'
const KV_KEY_TXS = 'transactions'

let _ctx: ModuleContext | null = null
const _memoryStore: Record<string, string> = {}

export function initDebtsService(ctx: ModuleContext): void {
  _ctx = ctx
}

export function _clearStoreForTesting(): void {
  for (const k of Object.keys(_memoryStore)) {
    delete _memoryStore[k]
  }
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      localStorage.clear()
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

// ──────────────── People ────────────────

export async function listPeople(): Promise<Person[]> {
  if (_ctx?.kv) {
    try {
      const remote = await _ctx.kv.get<Person[]>(KV_KEY_PEOPLE)
      if (remote && Array.isArray(remote)) {
        saveLocal(STORAGE_PEOPLE_KEY, remote)
        return remote
      }
    } catch {
      // Fallback
    }
  }
  return getLocal<Person[]>(STORAGE_PEOPLE_KEY, [])
}

export async function addPerson(name: string, notes?: string, color?: string): Promise<Person> {
  const current = await listPeople()
  const randomColor = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)] ?? '#0d9488'
  const newPerson: Person = {
    id: `person_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    name: name.trim(),
    avatarColor: color || randomColor,
    notes: notes?.trim() || undefined,
    createdAt: new Date().toISOString(),
  }
  const updated = [...current, newPerson].sort((a, b) => a.name.localeCompare(b.name))
  saveLocal(STORAGE_PEOPLE_KEY, updated)

  if (_ctx?.kv) {
    try {
      await _ctx.kv.set(KV_KEY_PEOPLE, updated)
    } catch (err) {
      console.warn('[DebtsService] Failed to save person to KV:', err)
    }
  }
  return newPerson
}

export async function deletePerson(
  id: string,
): Promise<{ person: Person; txs: DebtTransaction[] } | null> {
  const currentPeople = await listPeople()
  const person = currentPeople.find((p) => p.id === id)
  if (!person) return null

  const updatedPeople = currentPeople.filter((p) => p.id !== id)
  saveLocal(STORAGE_PEOPLE_KEY, updatedPeople)

  // Also remove their transactions
  const currentTxs = await listTransactions()
  const deletedTxs = currentTxs.filter((t) => t.personId === id)
  const updatedTxs = currentTxs.filter((t) => t.personId !== id)
  saveLocal(STORAGE_TXS_KEY, updatedTxs)

  if (_ctx?.kv) {
    try {
      await _ctx.kv.set(KV_KEY_PEOPLE, updatedPeople)
      await _ctx.kv.set(KV_KEY_TXS, updatedTxs)
    } catch (err) {
      console.warn('[DebtsService] Failed to delete person in KV:', err)
    }
  }
  return { person, txs: deletedTxs }
}

export async function restorePerson(person: Person, txs: DebtTransaction[] = []): Promise<void> {
  const currentPeople = await listPeople()
  if (!currentPeople.some((p) => p.id === person.id)) {
    const updatedPeople = [...currentPeople, person].sort((a, b) => a.name.localeCompare(b.name))
    saveLocal(STORAGE_PEOPLE_KEY, updatedPeople)

    if (_ctx?.kv) {
      try {
        await _ctx.kv.set(KV_KEY_PEOPLE, updatedPeople)
      } catch (err) {
        console.warn('[DebtsService] Failed to restore person in KV:', err)
      }
    }
  }

  if (txs.length > 0) {
    await restoreTransactionsBatch(txs)
  }
}

// ──────────────── Transactions ────────────────

export async function listTransactions(personId?: string): Promise<DebtTransaction[]> {
  let list: DebtTransaction[] = []
  if (_ctx?.kv) {
    try {
      const remote = await _ctx.kv.get<DebtTransaction[]>(KV_KEY_TXS)
      if (remote && Array.isArray(remote)) {
        saveLocal(STORAGE_TXS_KEY, remote)
        list = remote
      }
    } catch {
      // Fallback
    }
  }
  if (list.length === 0) {
    list = getLocal<DebtTransaction[]>(STORAGE_TXS_KEY, [])
  }

  // Sort descending by date
  list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  if (personId) {
    return list.filter((t) => t.personId === personId)
  }
  return list
}

export async function addTransaction(
  data: Omit<DebtTransaction, 'id' | 'createdAt' | 'settled'>,
): Promise<DebtTransaction> {
  const current = await listTransactions()
  const newTx: DebtTransaction = {
    ...data,
    id: `tx_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    settled: false,
    createdAt: new Date().toISOString(),
  }
  const updated = [newTx, ...current]
  saveLocal(STORAGE_TXS_KEY, updated)

  if (_ctx?.kv) {
    try {
      await _ctx.kv.set(KV_KEY_TXS, updated)
    } catch (err) {
      console.warn('[DebtsService] Failed to save transaction in KV:', err)
    }
  }
  return newTx
}

export async function deleteTransaction(id: string): Promise<DebtTransaction | null> {
  const current = await listTransactions()
  const target = current.find((t) => t.id === id)
  if (!target) return null

  const updated = current.filter((t) => t.id !== id)
  saveLocal(STORAGE_TXS_KEY, updated)

  if (_ctx?.kv) {
    try {
      await _ctx.kv.set(KV_KEY_TXS, updated)
    } catch (err) {
      console.warn('[DebtsService] Failed to delete transaction in KV:', err)
    }
  }
  return target
}

export async function restoreTransaction(tx: DebtTransaction): Promise<void> {
  const current = await listTransactions()
  if (current.some((t) => t.id === tx.id)) return

  const updated = [tx, ...current]
  saveLocal(STORAGE_TXS_KEY, updated)

  if (_ctx?.kv) {
    try {
      await _ctx.kv.set(KV_KEY_TXS, updated)
    } catch (err) {
      console.warn('[DebtsService] Failed to restore transaction in KV:', err)
    }
  }
}

export async function updateTransaction(
  id: string,
  data: Partial<Omit<DebtTransaction, 'id' | 'createdAt'>>,
): Promise<{ previous: DebtTransaction; updated: DebtTransaction } | null> {
  const current = await listTransactions()
  const idx = current.findIndex((t) => t.id === id)
  if (idx === -1) return null

  const previous = { ...current[idx]! }
  const updatedTx: DebtTransaction = {
    ...previous,
    ...data,
  }

  const updatedList = [...current]
  updatedList[idx] = updatedTx
  saveLocal(STORAGE_TXS_KEY, updatedList)

  if (_ctx?.kv) {
    try {
      await _ctx.kv.set(KV_KEY_TXS, updatedList)
    } catch (err) {
      console.warn('[DebtsService] Failed to update transaction in KV:', err)
    }
  }

  return { previous, updated: updatedTx }
}

export async function deleteTransactionsBatch(txIds: string[]): Promise<DebtTransaction[]> {
  const idSet = new Set(txIds)
  const current = await listTransactions()
  const deleted = current.filter((t) => idSet.has(t.id))
  const updated = current.filter((t) => !idSet.has(t.id))
  saveLocal(STORAGE_TXS_KEY, updated)

  if (_ctx?.kv) {
    try {
      await _ctx.kv.set(KV_KEY_TXS, updated)
    } catch (err) {
      console.warn('[DebtsService] Failed to delete transactions batch in KV:', err)
    }
  }
  return deleted
}

export async function restoreTransactionsBatch(txs: DebtTransaction[]): Promise<void> {
  if (txs.length === 0) return
  const current = await listTransactions()
  const existingIds = new Set(current.map((t) => t.id))
  const toAdd = txs.filter((t) => !existingIds.has(t.id))
  if (toAdd.length === 0) return

  const updated = [...toAdd, ...current]
  saveLocal(STORAGE_TXS_KEY, updated)

  if (_ctx?.kv) {
    try {
      await _ctx.kv.set(KV_KEY_TXS, updated)
    } catch (err) {
      console.warn('[DebtsService] Failed to restore transactions batch in KV:', err)
    }
  }
}

/**
 * Settles all open balance with a person by recording the necessary clearing repayment.
 */
export async function settlePersonAccount(
  personId: string,
  note?: string,
): Promise<DebtTransaction | null> {
  const allTxs = await listTransactions()
  const personTxs = allTxs.filter((t) => t.personId === personId)

  // Compute current balance
  let net = 0
  for (const t of personTxs) {
    if (t.type === 'lend') net += t.amount
    else if (t.type === 'borrow') net -= t.amount
    else if (t.type === 'repayment_received') net -= t.amount
    else if (t.type === 'repayment_sent') net += t.amount
  }

  if (Math.abs(net) < 0.01) return null // Already in balance

  const today = new Date().toISOString().slice(0, 10)
  const absNet = Math.round(Math.abs(net) * 100) / 100

  // If net > 0, they owe us money -> record repayment_received
  // If net < 0, we owe them money -> record repayment_sent
  const type: DebtTransaction['type'] = net > 0 ? 'repayment_received' : 'repayment_sent'
  const desc =
    note?.trim() ||
    (net > 0 ? 'Saldo conto (pagamento ricevuto)' : 'Saldo conto (pagamento inviato)')

  const createdTx = await addTransaction({
    personId,
    type,
    amount: absNet,
    description: desc,
    date: today,
    category: 'Saldo Conto',
  })
  return createdTx
}

// ──────────────── Undo / Redo Execution ────────────────

export async function executeUndoStep(step: HistoryStep): Promise<void> {
  switch (step.type) {
    case 'add_tx':
    case 'settle':
      await deleteTransaction(step.tx.id)
      break
    case 'delete_tx':
      await restoreTransaction(step.tx)
      break
    case 'edit_tx':
      await updateTransaction(step.previous.id, step.previous)
      break
    case 'split':
      await deleteTransactionsBatch(step.txs.map((t) => t.id))
      break
    case 'add_person':
      await deletePerson(step.person.id)
      break
    case 'delete_person':
      await restorePerson(step.person, step.txs)
      break
  }
}

export async function executeRedoStep(step: HistoryStep): Promise<void> {
  switch (step.type) {
    case 'add_tx':
    case 'settle':
      await restoreTransaction(step.tx)
      break
    case 'delete_tx':
      await deleteTransaction(step.tx.id)
      break
    case 'edit_tx':
      await updateTransaction(step.updated.id, step.updated)
      break
    case 'split':
      await restoreTransactionsBatch(step.txs)
      break
    case 'add_person':
      await restorePerson(step.person, [])
      break
    case 'delete_person':
      await deletePerson(step.person.id)
      break
  }
}

/**
 * Splits an expense between multiple participants.
 * e.g., if total is 90€ and participants are Me + PersonA + PersonB (3 people),
 * each share is 30€. PersonA and PersonB each owe Me 30€.
 */
export async function splitExpense(
  totalAmount: number,
  description: string,
  paidByMe: boolean,
  otherPersonIds: string[],
  category?: string,
): Promise<DebtTransaction[]> {
  if (otherPersonIds.length === 0 || totalAmount <= 0) return []

  const totalPeople = otherPersonIds.length + 1 // Me + others
  const sharePerPerson = Math.round((totalAmount / totalPeople) * 100) / 100
  const today = new Date().toISOString().slice(0, 10)

  const createdTxs: DebtTransaction[] = []

  for (const pid of otherPersonIds) {
    const tx = await addTransaction({
      personId: pid,
      type: paidByMe ? 'lend' : 'borrow',
      amount: sharePerPerson,
      description: `${description.trim()} (Quota ${totalPeople} persone)`,
      date: today,
      category: category || 'Spesa Condivisa',
    })
    createdTxs.push(tx)
  }

  return createdTxs
}

// ──────────────── Summary Calculations ────────────────

export function computePersonSummaries(people: Person[], txs: DebtTransaction[]): PersonSummary[] {
  return people.map((person) => {
    const personTxs = txs.filter((t) => t.personId === person.id)
    let net = 0
    let totalLent = 0
    let totalBorrowed = 0
    let openCount = 0

    for (const t of personTxs) {
      if (t.type === 'lend') {
        net += t.amount
        totalLent += t.amount
        openCount++
      } else if (t.type === 'borrow') {
        net -= t.amount
        totalBorrowed += t.amount
        openCount++
      } else if (t.type === 'repayment_received') {
        net -= t.amount
      } else if (t.type === 'repayment_sent') {
        net += t.amount
      }
    }

    const lastTx = personTxs[0]

    return {
      person,
      netBalance: Math.round(net * 100) / 100,
      totalLent: Math.round(totalLent * 100) / 100,
      totalBorrowed: Math.round(totalBorrowed * 100) / 100,
      openTransactionsCount: openCount,
      lastActivityDate: lastTx ? lastTx.date : undefined,
    }
  })
}

export function computeGlobalSummary(summaries: PersonSummary[], txs: DebtTransaction[]): GlobalSummary {
  let totalCredit = 0
  let totalDebt = 0

  for (const s of summaries) {
    if (s.netBalance > 0) {
      totalCredit += s.netBalance
    } else if (s.netBalance < 0) {
      totalDebt += Math.abs(s.netBalance)
    }
  }

  return {
    totalCredit: Math.round(totalCredit * 100) / 100,
    totalDebt: Math.round(totalDebt * 100) / 100,
    netBalance: Math.round((totalCredit - totalDebt) * 100) / 100,
    peopleCount: summaries.length,
    unsettledCount: summaries.filter((s) => Math.abs(s.netBalance) >= 0.01).length,
  }
}
