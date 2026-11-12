'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { Landmark, ArrowRight, Calendar } from 'lucide-react'
import { cn } from '@dexhub/ui'
import type { Loan, GlobalLoansSummary } from '../types'
import { getLoans } from '../services/loans-service'
import { calculateGlobalLoansSummary } from '../engine/amortization'

function formatCleanName(lender: string, loanName: string): string {
  const l = lender.trim().toLowerCase()
  const n = loanName.trim().toLowerCase()
  if (n.includes(l) || l.includes(n)) {
    return loanName.trim()
  }
  return `${lender.trim()} - ${loanName.trim()}`
}

export default function LoansWidget() {
  const [loans, setLoans] = useState<Loan[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getLoans()
      .then(setLoans)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const summary: GlobalLoansSummary = useMemo(() => {
    return calculateGlobalLoansSummary(loans)
  }, [loans])

  const totalRepaidPercent = useMemo(() => {
    if (summary.totalInitialFinanced <= 0) return 0
    return Math.min(
      100,
      Math.round((summary.totalPrincipalRepaid / summary.totalInitialFinanced) * 100),
    )
  }, [summary])

  return (
    <div className="flex h-full flex-col justify-between gap-2.5">
      {/* Widget Header */}
      <div className="flex items-center justify-between border-b border-border/60 pb-2">
        <div className="flex items-center gap-2">
          <Landmark className="h-4 w-4 text-emerald-500" />
          <span className="text-xs font-semibold text-text">Finanziamenti</span>
          {summary.activeLoansCount > 0 && (
            <span className="rounded-full bg-emerald-500/15 px-1.5 py-0.2 text-[10px] font-semibold text-emerald-500">
              {summary.activeLoansCount}
            </span>
          )}
        </div>
        <Link
          href="/loans"
          className="flex items-center gap-1 text-[11px] text-text-subtle hover:text-emerald-500 transition-colors"
        >
          Apri <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      {loading ? (
        <div className="flex flex-1 items-center justify-center py-4 text-xs text-text-subtle">
          Caricamento…
        </div>
      ) : loans.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center py-4 text-center">
          <Landmark className="h-6 w-6 text-text-muted mb-1 opacity-50" />
          <p className="text-xs text-text-subtle">Nessun finanziamento registrato</p>
          <Link
            href="/loans"
            className="mt-1.5 text-[11px] font-medium text-emerald-500 hover:underline"
          >
            + Carica PDF o crea
          </Link>
        </div>
      ) : (
        <div className="flex flex-1 flex-col justify-between gap-2">
          {/* Main Headline Banner: Residual Debt & Monthly Commitment */}
          <div className="flex items-center justify-between rounded-lg bg-surface-raised/70 border border-border/40 px-3 py-2">
            <div className="min-w-0">
              <span className="text-[10px] text-text-subtle uppercase tracking-wider block font-semibold">
                Debito Residuo
              </span>
              <div className="font-mono text-sm sm:text-base font-bold text-text truncate">
                {summary.totalResidualDebt.toLocaleString('it-IT', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}{' '}
                €
              </div>
            </div>

            <div className="text-right shrink-0 ml-2">
              <span className="text-[10px] text-text-subtle uppercase tracking-wider block font-semibold">
                Impegno Mese
              </span>
              <div className="font-mono text-xs sm:text-sm font-bold text-emerald-500 truncate">
                {summary.totalMonthlyCommitment.toLocaleString('it-IT', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}{' '}
                €
              </div>
            </div>
          </div>

          {/* Progress bar */}
          <div className="px-0.5 space-y-1">
            <div className="flex items-center justify-between text-[10px] text-text-subtle">
              <span>Rimborsato</span>
              <span className="font-medium text-emerald-500">{totalRepaidPercent}%</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-surface-raised overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                style={{ width: `${totalRepaidPercent}%` }}
              />
            </div>
          </div>

          {/* Next payment bottom row */}
          {summary.nextPayment ? (
            <div className="flex items-center justify-between rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1.5">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <Calendar className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-semibold text-text truncate">
                    {formatCleanName(summary.nextPayment.lender, summary.nextPayment.loanName)}
                  </p>
                  <p className="text-[10px] text-text-muted">
                    Scadenza:{' '}
                    {new Date(summary.nextPayment.installment.dueDate).toLocaleDateString('it-IT', {
                      day: 'numeric',
                      month: 'short',
                    })}
                  </p>
                </div>
              </div>

              <div className="text-right shrink-0 ml-2 whitespace-nowrap">
                <div className="font-mono text-[11px] font-bold text-text whitespace-nowrap">
                  {summary.nextPayment.installment.totalAmount.toFixed(2)} €
                </div>
                <div
                  className={cn(
                    'text-[9px] font-semibold whitespace-nowrap',
                    summary.nextPayment.daysUntil < 0
                      ? 'text-rose-400'
                      : summary.nextPayment.daysUntil <= 3
                        ? 'text-yellow-400'
                        : 'text-text-subtle',
                  )}
                >
                  {summary.nextPayment.daysUntil < 0
                    ? `Scaduta da ${Math.abs(summary.nextPayment.daysUntil)} gg`
                    : summary.nextPayment.daysUntil === 0
                      ? 'Oggi!'
                      : summary.nextPayment.daysUntil === 1
                        ? 'Domani'
                        : `tra ${summary.nextPayment.daysUntil} gg`}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-1 text-xs text-emerald-500 font-medium">
              Tutti i finanziamenti saldati! ✨
            </div>
          )}
        </div>
      )}
    </div>
  )
}
