'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { CreditCard, ArrowRight, Clock, CheckCircle2, Store, Plus } from 'lucide-react'
import { cn } from '@dexhub/ui'
import { getCards, getCardSummary } from '../services/social-cards-service'
import type { CardBalanceSummary } from '../types'

function formatEuro(val: number): string {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(val)
}

export default function SocialCardsWidget() {
  const [summary, setSummary] = useState<CardBalanceSummary | null>(null)
  const [hasCards, setHasCards] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const cards = await getCards()
        if (cards.length > 0 && cards[0]) {
          setHasCards(true)
          const sum = await getCardSummary(cards[0].id)
          setSummary(sum)
        } else {
          setHasCards(false)
        }
      } catch (err) {
        console.error('[SocialCardsWidget] Failed to load summary:', err)
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [])

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-3 text-xs text-text-subtle">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-sky-500 border-t-transparent" />
      </div>
    )
  }

  // Nessuna carta registrata
  if (hasCards === false || !summary) {
    return (
      <div className="flex h-full flex-col justify-between gap-2 p-1">
        <div className="flex items-center justify-between border-b border-border/60 pb-1.5">
          <div className="flex items-center gap-1.5">
            <CreditCard className="h-4 w-4 text-sky-400" />
            <span className="text-xs font-semibold text-text">Dedicata a Te</span>
          </div>
          <Link
            href="/social-cards"
            className="flex items-center gap-0.5 text-[11px] text-text-subtle hover:text-sky-400 transition-colors"
          >
            Apri <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        <div className="py-2 text-center">
          <p className="text-xs font-medium text-text">
            Nessuna carta registrata
          </p>
          <p className="text-[10px] text-text-subtle mt-0.5">
            Registra la tua Carta Dedicata a Te per monitorarla
          </p>
        </div>

        <div className="border-t border-border/40 pt-1.5 text-center">
          <Link
            href="/social-cards"
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-sky-400 hover:text-sky-300"
          >
            <Plus className="h-3 w-3" /> Registra Carta
          </Link>
        </div>
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
          <CreditCard className="h-4 w-4 text-sky-400" />
          <span className="text-xs font-semibold text-text">Dedicata a Te</span>
        </div>
        <Link
          href="/social-cards"
          className="flex items-center gap-0.5 text-[11px] text-text-subtle hover:text-sky-400 transition-colors"
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
            <span className="flex items-center gap-1 rounded bg-sky-500/20 px-1.5 py-0.5 text-[10px] font-bold text-sky-200">
              <Clock className="h-3 w-3" /> {daysToFirstPurchaseDeadline ?? 0}gg al 16 Dic
            </span>
          )}
        </div>

        {/* Progress bar */}
        <div className="mt-2">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-raised border border-border/40">
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
