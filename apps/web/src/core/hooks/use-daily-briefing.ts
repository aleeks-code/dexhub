'use client'

import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useVisibleModules } from '@/core/hooks/use-modules'
import { getLoans, calculateGlobalLoansSummary } from '@dexhub/loans'
import { listPeople, listTransactions, computePersonSummaries, computeGlobalSummary } from '@dexhub/debts'
import { useSpaces, useTasks } from '@dexhub/tasks'
import { useStima, useWorklogDays } from '@dexhub/worklog'
import { listSubscriptions, calculateSubscriptionsSummary } from '@dexhub/subscriptions'
import { useMe } from '@/core/hooks/use-me'
import { useInviteRequests } from '@/core/hooks/use-admin'

export interface DailyAlert {
  id: string
  moduleId: string
  moduleName: string
  type: 'urgent' | 'warning' | 'info' | 'success'
  title: string
  subtitle?: string
  badge?: string
  badgeVariant?: 'red' | 'yellow' | 'amber' | 'emerald' | 'cyan' | 'neutral'
  href: string
  actionLabel?: string
  createdAt?: string
}

export interface FinancialSynergy {
  stimaStipendio: number | null
  rateFinanziamenti: number
  netBalanceDebiti: number
  totalCrediti: number
  totalDebiti: number
  disponibilitaStimata: number | null
}

function formatCleanName(lender: string, loanName: string): string {
  const l = lender.trim().toLowerCase()
  const n = loanName.trim().toLowerCase()
  if (n.includes(l) || l.includes(n)) {
    return loanName.trim()
  }
  return `${lender.trim()} - ${loanName.trim()}`
}

function toLocalDateString(d: Date): string {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function useDailyBriefing() {
  const { data: visibleModules } = useVisibleModules()

  const isModuleActive = (id: string) =>
    (visibleModules ?? []).some((m) => m.id === id && m.enabled && !m.maintenance)

  const loansActive = isModuleActive('loans')
  const debtsActive = isModuleActive('debts')
  const tasksActive = isModuleActive('tasks')
  const worklogActive = isModuleActive('worklog')
  const subscriptionsActive = isModuleActive('subscriptions')

  // Admin invite requests
  const { data: me } = useMe()
  const { data: inviteRequests = [] } = useInviteRequests()
  const pendingInvites = useMemo(() => {
    if (!me?.isAdmin) return []
    return inviteRequests.filter((r) => r.status === 'pending' && !r.deletedAt)
  }, [me?.isAdmin, inviteRequests])

  // Date utilities
  const now = new Date()
  const todayStr = toLocalDateString(now)
  const monthStr = todayStr.slice(0, 7)
  const isWeekday = now.getDay() >= 1 && now.getDay() <= 5

  // 1. Loans query
  const { data: loans = [] } = useQuery({
    queryKey: ['loans-briefing'],
    queryFn: () => getLoans(),
    enabled: loansActive,
    staleTime: 30_000,
  })

  const loansSummary = useMemo(() => {
    if (!loansActive || loans.length === 0) return null
    return calculateGlobalLoansSummary(loans)
  }, [loansActive, loans])

  // 2. Debts query
  const { data: debtsData } = useQuery({
    queryKey: ['debts-briefing'],
    queryFn: async () => {
      const [people, txs] = await Promise.all([listPeople(), listTransactions()])
      return { people, txs }
    },
    enabled: debtsActive,
    staleTime: 30_000,
  })

  const debtsSummary = useMemo(() => {
    if (!debtsActive || !debtsData) return null
    const personSummaries = computePersonSummaries(debtsData.people, debtsData.txs)
    const globalSummary = computeGlobalSummary(personSummaries, debtsData.txs)
    return { personSummaries, globalSummary }
  }, [debtsActive, debtsData])

  // 3. Tasks query
  const { data: spaces = [] } = useSpaces()
  const personalSpace = useMemo(() => {
    if (!tasksActive) return null
    return spaces.find((s) => s.type === 'personal') ?? spaces[0] ?? null
  }, [tasksActive, spaces])

  const { data: tasks = [] } = useTasks(
    tasksActive && personalSpace ? { spaceId: personalSpace.id } : { spaceId: '__none__' },
  )

  const todayTasks = useMemo(() => {
    if (!tasksActive) return []
    return tasks.filter((t) => t.section === 'oggi' && t.status !== 'completata' && t.status !== 'archiviata')
  }, [tasksActive, tasks])

  // 4. Worklog query
  const { data: todayWorklogDays = [] } = useWorklogDays(todayStr, todayStr)
  const { data: stimaData } = useStima(monthStr)

  const hasLoggedToday = useMemo(() => {
    if (!worklogActive || !todayWorklogDays.length) return false
    return todayWorklogDays.some(
      (d) => !d.deletedAt && Array.isArray(d.entries) && d.entries.length > 0,
    )
  }, [worklogActive, todayWorklogDays])

  // 5. Subscriptions query
  const { data: subs = [] } = useQuery({
    queryKey: ['subscriptions-briefing'],
    queryFn: () => listSubscriptions(),
    enabled: subscriptionsActive,
    staleTime: 30_000,
  })

  const subsSummary = useMemo(() => {
    if (!subscriptionsActive || !subs.length) return null
    return calculateSubscriptionsSummary(subs)
  }, [subscriptionsActive, subs])

  // Aggregate alerts
  const alerts: DailyAlert[] = useMemo(() => {
    const list: DailyAlert[] = []

    // 0. Admin: Pending Invite Requests
    if (pendingInvites.length > 0) {
      const count = pendingInvites.length
      list.push({
        id: 'admin-pending-invites',
        moduleId: 'admin',
        moduleName: 'Amministrazione',
        type: 'warning',
        title: count === 1 ? '1 nuova richiesta di invito' : `${count} nuove richieste di invito`,
        subtitle:
          count === 1
            ? `${pendingInvites[0]!.email} ha richiesto l'accesso a DexHub`
            : `${count} persone in attesa di approvazione`,
        badge: 'Invito',
        badgeVariant: 'yellow',
        href: '/settings/administration/invite-requests',
        actionLabel: 'Gestisci',
      })
    }

    // 1. Loans: check nextPayment
    if (loansSummary?.nextPayment) {
      const np = loansSummary.nextPayment
      if (np.daysUntil <= 7) {
        const isOverdue = np.daysUntil < 0
        const isUrgent = np.daysUntil <= 3
        const loanLabel = formatCleanName(np.lender, np.loanName)
        const dueText =
          np.daysUntil < 0
            ? `Scaduta da ${Math.abs(np.daysUntil)} gg`
            : np.daysUntil === 0
              ? 'Oggi!'
              : np.daysUntil === 1
                ? 'Domani'
                : `tra ${np.daysUntil} giorni`

        list.push({
          id: `loan-due-${np.loanId}`,
          moduleId: 'loans',
          moduleName: 'Finanziamenti',
          type: isOverdue ? 'urgent' : isUrgent ? 'warning' : 'info',
          title: `Rata ${loanLabel}: ${np.installment.totalAmount.toFixed(2)} €`,
          subtitle: `Scadenza rata: ${dueText} (${new Date(np.installment.dueDate).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })})`,
          badge: dueText,
          badgeVariant: isOverdue ? 'red' : isUrgent ? 'yellow' : 'neutral',
          href: '/loans',
          actionLabel: 'Visualizza rata',
        })
      }
    }

    // 2. Tasks: pending tasks for today
    if (todayTasks.length > 0) {
      const count = todayTasks.length
      const firstTask = todayTasks[0]?.title
      list.push({
        id: 'tasks-today',
        moduleId: 'tasks',
        moduleName: 'Task',
        type: 'info',
        title: `${count} ${count === 1 ? 'task in programma per oggi' : 'task in programma per oggi'}`,
        subtitle: firstTask ? `In cima: "${firstTask}"` : undefined,
        badge: `${count} da fare`,
        badgeVariant: 'cyan',
        href: '/tasks',
        actionLabel: 'Apri task',
      })
    }

    // 3. Worklog: unlogged weekday hours
    if (worklogActive && isWeekday && !hasLoggedToday) {
      list.push({
        id: 'worklog-unlogged',
        moduleId: 'worklog',
        moduleName: 'Worklog',
        type: 'warning',
        title: 'Ore di lavoro non ancora registrate',
        subtitle: 'Ricordati di confermare le ore lavorate oggi per aggiornare la stima del mese',
        badge: 'Da inserire',
        badgeVariant: 'yellow',
        href: '/worklog',
        actionLabel: 'Registra ore',
      })
    }

    // 4. Debts: pending credits and debts
    if (debtsSummary?.globalSummary) {
      const { totalCredit, totalDebt } = debtsSummary.globalSummary
      if (totalCredit > 0.01) {
        list.push({
          id: 'debts-credits',
          moduleId: 'debts',
          moduleName: 'Debiti & Crediti',
          type: 'info',
          title: `Crediti da incassare: ${totalCredit.toFixed(2)} €`,
          subtitle: 'Hai crediti aperti con amici o colleghi in attesa di saldo',
          badge: `+${totalCredit.toFixed(2)} €`,
          badgeVariant: 'emerald',
          href: '/debts',
          actionLabel: 'Vedi debiti',
        })
      }
      if (totalDebt > 0.01) {
        list.push({
          id: 'debts-owed',
          moduleId: 'debts',
          moduleName: 'Debiti & Crediti',
          type: 'urgent',
          title: `Debiti da saldare: ${totalDebt.toFixed(2)} €`,
          subtitle: 'Hai importi in sospeso da restituire',
          badge: `-${totalDebt.toFixed(2)} €`,
          badgeVariant: 'red',
          href: '/debts',
          actionLabel: 'Vedi debiti',
        })
      }
    }

    // 5. Subscriptions: upcoming renewal
    if (subsSummary?.nextRenewal) {
      const nr = subsSummary.nextRenewal
      if (nr.daysUntil <= 5) {
        const isOverdue = nr.daysUntil < 0
        const isUrgent = nr.daysUntil <= 2
        const dueText =
          nr.daysUntil < 0
            ? `Scaduto da ${Math.abs(nr.daysUntil)} gg`
            : nr.daysUntil === 0
              ? 'Oggi!'
              : nr.daysUntil === 1
                ? 'Domani'
                : `tra ${nr.daysUntil} giorni`

        list.push({
          id: `sub-due-${nr.subscription.id}`,
          moduleId: 'subscriptions',
          moduleName: 'Abbonamenti',
          type: isOverdue ? 'urgent' : isUrgent ? 'warning' : 'info',
          title: `Rinnovo ${nr.subscription.name}: ${nr.subscription.cost.toFixed(2)} €`,
          subtitle: `Rinnovo programmato ${dueText} (${new Date(nr.subscription.nextRenewalDate).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })})`,
          badge: dueText,
          badgeVariant: isOverdue ? 'red' : isUrgent ? 'yellow' : 'neutral',
          href: '/subscriptions',
          actionLabel: 'Vedi abbonamento',
        })
      }
    }

    return list
  }, [
    pendingInvites,
    loansSummary,
    todayTasks,
    worklogActive,
    isWeekday,
    hasLoggedToday,
    debtsSummary,
    subsSummary,
  ])

  // Financial synergy calculation
  const financialSynergy: FinancialSynergy = useMemo(() => {
    const stimaStipendio = stimaData?.stima?.netto ?? null
    const rateFinanziamenti = loansSummary?.totalMonthlyCommitment ?? 0
    const netBalanceDebiti = debtsSummary?.globalSummary?.netBalance ?? 0
    const totalCrediti = debtsSummary?.globalSummary?.totalCredit ?? 0
    const totalDebiti = debtsSummary?.globalSummary?.totalDebt ?? 0
    const spesaAbbonamenti = subsSummary?.totalMonthlyCost ?? 0

    const disponibilitaStimata =
      stimaStipendio !== null
        ? Math.max(0, stimaStipendio - rateFinanziamenti - spesaAbbonamenti)
        : null

    return {
      stimaStipendio,
      rateFinanziamenti,
      netBalanceDebiti,
      totalCrediti,
      totalDebiti,
      disponibilitaStimata,
    }
  }, [stimaData, loansSummary, debtsSummary, subsSummary])

  return {
    alerts,
    financialSynergy,
    todayTasksCount: todayTasks.length,
    hasUrgentAlerts: alerts.some((a) => a.type === 'urgent'),
    totalAlertsCount: alerts.length,
  }
}
