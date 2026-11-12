'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { Repeat, ArrowRight, Calendar, Sparkles } from 'lucide-react'
import { listSubscriptions, calculateSubscriptionsSummary } from '../services/subscriptions-service'
import type { Subscription, SubscriptionsSummary } from '../types'

export default function SubscriptionsWidget() {
  const [subs, setSubs] = useState<Subscription[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    listSubscriptions()
      .then(setSubs)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const summary: SubscriptionsSummary = useMemo(() => {
    return calculateSubscriptionsSummary(subs)
  }, [subs])

  return (
    <div className="flex h-full flex-col justify-between gap-2.5">
      {/* Widget Header */}
      <div className="flex items-center justify-between border-b border-border/60 pb-2">
        <div className="flex items-center gap-2">
          <Repeat className="h-4 w-4 text-violet-500" />
          <span className="text-xs font-semibold text-text">Abbonamenti</span>
          {summary.activeCount > 0 && (
            <span className="rounded-full bg-violet-500/15 px-1.5 py-0.2 text-[10px] font-semibold text-violet-500">
              {summary.activeCount} attivi
            </span>
          )}
        </div>
        <Link
          href="/subscriptions"
          className="flex items-center gap-1 text-[11px] text-text-subtle hover:text-violet-500 transition-colors"
        >
          Apri <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      {loading ? (
        <div className="flex flex-1 items-center justify-center py-4 text-xs text-text-subtle">
          Caricamento…
        </div>
      ) : (
        <div className="flex flex-1 flex-col justify-between gap-2.5">
          {/* Monthly cost headline */}
          <div className="flex items-center justify-between rounded-xl bg-violet-500/10 border border-violet-500/20 px-3 py-2">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-text-subtle">
                Spesa Totale Mensile
              </p>
              <div className="font-mono text-base font-bold text-violet-500">
                {summary.totalMonthlyCost.toLocaleString('it-IT', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}{' '}
                €
              </div>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-text-subtle">Costo annuale</p>
              <p className="font-mono text-xs text-text-muted">
                ~
                {summary.totalAnnualCost.toLocaleString('it-IT', {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0,
                })}{' '}
                €
              </p>
            </div>
          </div>

          {/* Next renewal card */}
          {summary.nextRenewal ? (
            <div className="flex items-center justify-between rounded-lg bg-surface-raised px-2.5 py-1.5 border border-border/50">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <Calendar className="h-3.5 w-3.5 text-violet-500 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-semibold text-text truncate">
                    {summary.nextRenewal.subscription.name}
                  </p>
                  <p className="text-[10px] text-text-muted">
                    Rinnovo:{' '}
                    {new Date(
                      summary.nextRenewal.subscription.nextRenewalDate,
                    ).toLocaleDateString('it-IT', {
                      day: 'numeric',
                      month: 'short',
                    })}
                  </p>
                </div>
              </div>

              <div className="text-right shrink-0 ml-2">
                <span className="font-mono text-[11px] font-bold text-text">
                  {summary.nextRenewal.subscription.cost.toFixed(2)} €
                </span>
                <div
                  className={`text-[9px] font-semibold ${
                    summary.nextRenewal.daysUntil < 0
                      ? 'text-rose-400'
                      : summary.nextRenewal.daysUntil <= 3
                        ? 'text-yellow-400'
                        : 'text-text-subtle'
                  }`}
                >
                  {summary.nextRenewal.daysUntil < 0
                    ? `Scaduto (${Math.abs(summary.nextRenewal.daysUntil)} gg fa)`
                    : summary.nextRenewal.daysUntil === 0
                      ? 'Oggi!'
                      : summary.nextRenewal.daysUntil === 1
                        ? 'Domani'
                        : `tra ${summary.nextRenewal.daysUntil} gg`}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-2 text-xs text-text-subtle">
              Nessun rinnovo imminente
            </div>
          )}
        </div>
      )}
    </div>
  )
}
