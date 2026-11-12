'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { Wallet, ArrowRight, Clock, CheckCircle2, Store } from 'lucide-react'
import { cn } from '@dexhub/ui'
import { getCards, getCardSummary } from '../services/social-cards-service'
import type { CardBalanceSummary } from '../types'

function formatEuro(val: number): string {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(val)
}

export default function SocialCardsWidget() {
  const [summary, setSummary] = useState<CardBalanceSummary | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const cards = await getCards()
        if (cards[0]) {
          const sum = await getCardSummary(cards[0].id)
          setSummary(sum)
        }
      } catch (err) {
        console.error('[SocialCardsWidget] Failed to load summary:', err)
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [])

  if (loading || !summary) {
    return (
      <div className="flex h-full items-center justify-center p-3 text-xs text-text-subtle">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
      </div>
    )
  }

  const {
    estimatedBalance,
    totalCreditedToDate,
    totalSpentToDate,
    firstPurchaseMet,
    daysToFirstPurchaseDeadline,
    lastExpense,
  } = summary

  const spentPercent =
    totalCreditedToDate > 0
      ? Math.min(100, Math.round((totalSpentToDate / totalCreditedToDate) * 100))
      : 0

  return (
    <div className="flex h-full flex-col justify-between gap-2 p-1">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/60 pb-1.5">
        <div className="flex items-center gap-1.5">
          <Wallet className="h-4 w-4 text-emerald-400" />
          <span className="text-xs font-semibold text-text">Dedicata a Te</span>
        </div>
        <Link
          href="/social-cards"
          className="flex items-center gap-0.5 text-[11px] text-text-subtle hover:text-emerald-400 transition-colors"
        >
          Apri <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      {/* Saldo Stimato & Badge Attivazione */}
      <div>
        <div className="flex items-baseline justify-between">
          <span className="text-2xl font-black font-mono text-emerald-400">
            {formatEuro(estimatedBalance)}
          </span>
          {firstPurchaseMet ? (
            <span className="flex items-center gap-1 rounded bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-400">
              <CheckCircle2 className="h-3 w-3" /> Attiva
            </span>
          ) : (
            <span className="flex items-center gap-1 rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-bold text-amber-300">
              <Clock className="h-3 w-3 animate-pulse" /> {daysToFirstPurchaseDeadline ?? 0}gg al 16 Dic
            </span>
          )}
        </div>

        {/* Progress bar */}
        <div className="mt-2">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
            <div
              className="h-full bg-emerald-500 transition-all duration-300"
              style={{ width: `${spentPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Footer: Ultima spesa */}
      <div className="flex items-center justify-between text-[11px] text-text-subtle border-t border-border/40 pt-1.5">
        {lastExpense ? (
          <div className="flex items-center gap-1 truncate">
            <Store className="h-3 w-3 text-zinc-500 shrink-0" />
            <span className="truncate">{lastExpense.merchant}:</span>
            <span className="font-semibold text-text font-mono">
              -{formatEuro(lastExpense.amount)}
            </span>
          </div>
        ) : (
          <span>Nessuna spesa registrata</span>
        )}
        <span className="font-mono text-[10px] text-zinc-400">
          su {formatEuro(totalCreditedToDate)}
        </span>
      </div>
    </div>
  )
}
