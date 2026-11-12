import type {
  EditionConfig,
  SocialBenefitCard,
  SocialCardExpense,
  PostamatReconciliation,
  CardBalanceSummary,
  TrancheFifoStatus,
  TrancheConfig,
} from '../types'

/**
 * Converte una stringa di data (YYYY-MM-DD o ISO) in un oggetto Date normalizzato.
 */
function parseDate(d: string | Date): Date {
  return typeof d === 'string' ? new Date(d) : d
}

/**
 * Restituisce la data in formato YYYY-MM-DD.
 */
function toDateString(d: Date): string {
  return d.toISOString().slice(0, 10)
}

/**
 * Calcola i giorni di differenza (interi) tra oggi e una data target.
 */
function daysDifference(fromDate: Date, targetDateStr: string): number {
  const target = new Date(targetDateStr + 'T23:59:59.999Z')
  const diffTime = target.getTime() - fromDate.getTime()
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}

/**
 * Calcola lo stato del saldo, le scadenze e la ripartizione FIFO delle tranche
 * per una specifica carta e configurazione di edizione.
 */
export function calculateCardBalance(params: {
  card: SocialBenefitCard
  edition: EditionConfig
  expenses: SocialCardExpense[]
  reconciliations: PostamatReconciliation[]
  currentDate?: string | Date
}): CardBalanceSummary {
  const { card, edition, expenses, reconciliations } = params
  const now = parseDate(params.currentDate ?? new Date())
  const nowIso = now.toISOString()
  const todayStr = toDateString(now)

  // 1. Filtra per la carta specifica e ordina cronologicamente
  const cardExpenses = expenses
    .filter((e) => e.cardId === card.id && e.spentAt <= nowIso)
    .sort((a, b) => new Date(a.spentAt).getTime() - new Date(b.spentAt).getTime())

  const cardReconciliations = reconciliations
    .filter((r) => r.cardId === card.id && r.reconciledAt <= nowIso)
    .sort((a, b) => new Date(a.reconciledAt).getTime() - new Date(b.reconciledAt).getTime())

  // Statistiche generali di spesa
  const totalSpentToDate = Math.round(
    cardExpenses.reduce((sum, e) => sum + e.amount, 0) * 100
  ) / 100

  const totalDiscountSaved = Math.round(
    cardExpenses.reduce((sum, e) => sum + (e.discountSaved || 0), 0) * 100
  ) / 100

  // 2. Tranche disponibili alla data corrente
  const allTranches = [...edition.tranches].sort(
    (a, b) => a.availableDate.localeCompare(b.availableDate)
  )

  const unlockedTranches = allTranches.filter((t) => t.availableDate <= todayStr)
  const totalCreditedToDate = Math.round(
    unlockedTranches.reduce((sum, t) => sum + t.initialAmount, 0) * 100
  ) / 100

  // 3. Calcolo Saldo con Riconciliazione "Checkpoint Anchor"
  let estimatedBalance: number
  const lastReconciliation =
    cardReconciliations.length > 0
      ? cardReconciliations[cardReconciliations.length - 1]!
      : null

  if (lastReconciliation) {
    const anchorTime = new Date(lastReconciliation.reconciledAt).getTime()
    const anchorDateStr = lastReconciliation.reconciledAt.slice(0, 10)

    // Tranche accreditate SUCCESSIVAMENTE alla data della riconciliazione
    const tranchesAfterAnchor = unlockedTranches.filter(
      (t) => t.availableDate > anchorDateStr
    )
    const newCreditedAfterAnchor = tranchesAfterAnchor.reduce(
      (sum, t) => sum + t.initialAmount,
      0
    )

    // Spese effettuate SUCCESSIVAMENTE al timestamp esatto della riconciliazione
    const expensesAfterAnchor = cardExpenses.filter(
      (e) => new Date(e.spentAt).getTime() > anchorTime
    )
    const newSpentAfterAnchor = expensesAfterAnchor.reduce(
      (sum, e) => sum + e.amount,
      0
    )

    estimatedBalance = Math.round(
      (lastReconciliation.atmBalance + newCreditedAfterAnchor - newSpentAfterAnchor) * 100
    ) / 100
  } else {
    // Nessun checkpoint: calcolo standard su tutte le tranche sbloccate e tutte le spese
    estimatedBalance = Math.round(
      (totalCreditedToDate - totalSpentToDate) * 100
    ) / 100
  }

  // 4. Ripartizione FIFO delle Tranche
  // Assegniamo le spese alle tranche in ordine cronologico
  let unassignedSpent = totalSpentToDate
  const tranchesStatus: TrancheFifoStatus[] = allTranches.map((tranche) => {
    const isUnlocked = tranche.availableDate <= todayStr
    const isExpired =
      Boolean(tranche.finalSpendingDeadline && tranche.finalSpendingDeadline < todayStr)

    let spentFromTranche = 0
    let remainingAmount = 0

    if (isUnlocked) {
      if (unassignedSpent >= tranche.initialAmount) {
        spentFromTranche = tranche.initialAmount
        unassignedSpent -= tranche.initialAmount
        remainingAmount = 0
      } else {
        spentFromTranche = unassignedSpent
        remainingAmount = Math.round((tranche.initialAmount - unassignedSpent) * 100) / 100
        unassignedSpent = 0
      }
    }

    // Verifica primo acquisto effettuato entro la deadline della tranche
    let isFirstPurchaseMet = true
    if (tranche.firstPurchaseDeadline) {
      const hasExpenseBeforeDeadline = cardExpenses.some(
        (e) =>
          e.spentAt.slice(0, 10) >= tranche.availableDate &&
          e.spentAt.slice(0, 10) <= tranche.firstPurchaseDeadline!
      )
      isFirstPurchaseMet = hasExpenseBeforeDeadline
    }

    return {
      tranche,
      isUnlocked,
      originalAmount: tranche.initialAmount,
      spentAmount: Math.round(spentFromTranche * 100) / 100,
      remainingAmount,
      isExpired,
      isFirstPurchaseMet,
    }
  })

  // Se una tranche è scaduta con residuo non speso, tale residuo decade dal saldo stimato
  const forfeitedExpiredAmount = tranchesStatus
    .filter((s) => s.isExpired && s.remainingAmount > 0)
    .reduce((sum, s) => sum + s.remainingAmount, 0)

  if (forfeitedExpiredAmount > 0) {
    estimatedBalance = Math.max(0, Math.round((estimatedBalance - forfeitedExpiredAmount) * 100) / 100)
  }

  // 5. Tranche attiva corrente e tranche successiva
  const activeStatus =
    tranchesStatus.find((s) => s.isUnlocked && (!s.isExpired || s.remainingAmount > 0)) ??
    tranchesStatus.find((s) => s.isUnlocked) ??
    tranchesStatus[0] ??
    null

  const activeTranche: TrancheConfig | null = activeStatus ? activeStatus.tranche : null

  const nextStatus = tranchesStatus.find((s) => !s.isUnlocked) ?? null
  const nextTranche: TrancheConfig | null = nextStatus ? nextStatus.tranche : null

  // 6. Monitoraggio Scadenza Primo Acquisto (Tranche corrente)
  let firstPurchaseMet = true
  let firstPurchaseDeadline: string | null = null
  let daysToFirstPurchaseDeadline: number | null = null
  let isFirstPurchaseExpired = false

  if (activeTranche && activeTranche.firstPurchaseDeadline) {
    firstPurchaseDeadline = activeTranche.firstPurchaseDeadline
    firstPurchaseMet = activeStatus ? activeStatus.isFirstPurchaseMet : false
    const daysDiff = daysDifference(now, firstPurchaseDeadline)
    daysToFirstPurchaseDeadline = Math.max(0, daysDiff)
    isFirstPurchaseExpired = daysDiff < 0 && !firstPurchaseMet
  }

  // 7. Scadenza Finale di Spesa (Tranche corrente)
  let finalSpendingDeadline: string | null = null
  let daysToFinalSpendingDeadline: number | null = null
  let isFinalSpendingExpired = false

  if (activeTranche && activeTranche.finalSpendingDeadline) {
    finalSpendingDeadline = activeTranche.finalSpendingDeadline
    const daysDiff = daysDifference(now, finalSpendingDeadline)
    daysToFinalSpendingDeadline = Math.max(0, daysDiff)
    isFinalSpendingExpired = daysDiff < 0
  }

  // Ultima spesa registrata
  const lastExpense =
    cardExpenses.length > 0 ? cardExpenses[cardExpenses.length - 1]! : null

  return {
    cardId: card.id,
    profileId: card.profileId,
    editionId: card.editionId,
    estimatedBalance: Math.max(0, estimatedBalance),
    totalCreditedToDate,
    totalSpentToDate,
    totalDiscountSaved,
    lastReconciliation,
    tranchesStatus,
    activeTranche,
    nextTranche,
    firstPurchaseMet,
    firstPurchaseDeadline,
    daysToFirstPurchaseDeadline,
    isFirstPurchaseExpired,
    finalSpendingDeadline,
    daysToFinalSpendingDeadline,
    isFinalSpendingExpired,
    lastExpense,
    totalExpensesCount: cardExpenses.length,
  }
}
