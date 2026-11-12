'use client'

import React, { useState } from 'react'
import {
  CreditCard,
  Landmark,
  Plus,
  ArrowUpRight,
  ShieldCheck,
  Eye,
  EyeOff,
} from 'lucide-react'
import { cn } from '@dexhub/ui'
import type { CardBalanceSummary } from '../types'

interface Props {
  summary: CardBalanceSummary
  onAddExpense: () => void
  onReconcile: () => void
}

function formatEuro(val: number): string {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(val)
}

function formatDateTime(iso: string): string {
  try {
    const d = new Date(iso)
    return d.toLocaleString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}

export function CardHeroBalance({ summary, onAddExpense, onReconcile }: Props) {
  const [showBalance, setShowBalance] = useState(false)

  const {
    estimatedBalance,
    totalCreditedToDate,
    totalSpentToDate,
    totalDiscountSaved,
    lastReconciliation,
    nextTranche,
  } = summary

  const spentPercent =
    totalCreditedToDate > 0
      ? Math.min(100, Math.round((totalSpentToDate / totalCreditedToDate) * 100))
      : 0

  const remainingPercent = 100 - spentPercent

  const balanceColor =
    estimatedBalance > 150
      ? 'text-emerald-400'
      : estimatedBalance > 40
      ? 'text-sky-400'
      : 'text-rose-400'

  return (
    <div className="rounded-2xl border border-border bg-surface p-6 shadow-xs">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-5">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-sky-500/15 p-2.5 text-sky-400 shrink-0">
            <CreditCard className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-text">Carta Dedicata a Te</h2>
              <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-400">
                Edizione 2026–2027
              </span>
            </div>
            <p className="text-xs text-text-subtle mt-0.5">
              Ministero dell’Agricoltura, INPS & Poste Italiane
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onReconcile}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-surface-raised hover:bg-surface px-3.5 py-2 text-xs font-medium text-text transition-colors cursor-pointer shadow-xs"
          >
            <Landmark className="h-3.5 w-3.5 text-text-subtle" />
            <span>Riconcilia Postamat</span>
          </button>

          <button
            type="button"
            onClick={onAddExpense}
            className="flex items-center gap-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black px-4 py-2 text-xs font-semibold transition-colors cursor-pointer shadow-xs"
          >
            <Plus className="h-4 w-4" />
            <span>Registra Spesa</span>
          </button>
        </div>
      </div>

      {/* Main Balance Display */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-6">
        {/* Left: Big Balance with Masking & Postamat Anchor */}
        <div className="lg:col-span-7 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-text-subtle">
                  Saldo Stimato DexHub
                </span>
                <span className="rounded-md bg-surface-raised px-1.5 py-0.5 text-[10px] text-zinc-400 font-mono border border-border/40">
                  CALCOLATO
                </span>
              </div>

              {/* Tasto Mostra/Nascondi Saldo */}
              <button
                type="button"
                onClick={() => setShowBalance((p) => !p)}
                className="flex items-center gap-1 text-xs text-text-subtle hover:text-text transition-colors cursor-pointer"
                title={showBalance ? 'Nascondi saldo' : 'Mostra saldo'}
              >
                {showBalance ? (
                  <>
                    <EyeOff className="h-3.5 w-3.5 text-zinc-400" />
                    <span>Nascondi</span>
                  </>
                ) : (
                  <>
                    <Eye className="h-3.5 w-3.5 text-zinc-400" />
                    <span>Mostra</span>
                  </>
                )}
              </button>
            </div>

            <div className="mt-2 flex items-baseline gap-3">
              <span className={cn('text-4xl sm:text-5xl font-black tracking-tight font-mono', balanceColor)}>
                {showBalance ? formatEuro(estimatedBalance) : '•••• €'}
              </span>
              <span className="text-xs text-text-subtle">
                su {showBalance ? formatEuro(totalCreditedToDate) : '•••• €'} accreditati
              </span>
            </div>

            {/* Progress bar */}
            <div className="mt-4">
              <div className="flex items-center justify-between text-xs text-text-subtle mb-1.5">
                <span>
                  Speso: {spentPercent}% ({showBalance ? formatEuro(totalSpentToDate) : '•••• €'})
                </span>
                <span>Residuo: {remainingPercent}%</span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-surface-raised border border-border/40">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500"
                  style={{ width: `${spentPercent}%` }}
                />
              </div>
            </div>
          </div>

          {/* Checkpoint Postamat Anchor Box */}
          <div className="mt-5 rounded-xl border border-border/80 bg-surface-raised p-3.5 text-xs">
            <div className="flex items-start gap-2.5">
              <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                {lastReconciliation ? (
                  <>
                    <div className="flex items-center justify-between flex-wrap gap-1">
                      <span className="font-semibold text-text">
                        Ancorato a controllo Postamat del {formatDateTime(lastReconciliation.reconciledAt)}
                      </span>
                      <span className="rounded bg-emerald-500/15 px-1.5 py-0.2 text-[10px] font-bold text-emerald-400 font-mono">
                        Saldo ATM: {showBalance ? formatEuro(lastReconciliation.atmBalance) : '•••• €'}
                      </span>
                    </div>
                    <p className="mt-1 text-text-subtle text-[11px] leading-relaxed">
                      {lastReconciliation.delta === 0 ? (
                        <span className="text-emerald-400/90">✓ Pareggio perfetto con la stima DexHub.</span>
                      ) : (
                        <span>
                          Delta applicato al momento del controllo: {lastReconciliation.delta > 0 ? '+' : ''}
                          {showBalance ? formatEuro(lastReconciliation.delta) : '•••• €'}. Le spese successive sono scalate da questo saldo fisso.
                        </span>
                      )}
                    </p>
                  </>
                ) : (
                  <div>
                    <span className="font-medium text-text">
                      Nessun controllo Postamat registrato
                    </span>
                    <p className="mt-0.5 text-text-subtle text-[11px]">
                      Il saldo è calcolato sommando le tranche ed eliminando le spese caricate. Esegui una riconciliazione quando controlli il saldo all’ATM.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right: Tranche & Stats Cards */}
        <div className="lg:col-span-5 flex flex-col justify-between gap-3">
          {/* Stat 1: Risparmio Convenzione 15% */}
          <div className="rounded-xl border border-border bg-surface-raised p-3.5 flex items-center justify-between">
            <div>
              <span className="text-xs text-text-subtle">Risparmio Convenzioni (15%)</span>
              <p className="text-lg font-bold text-emerald-400 font-mono mt-0.5">
                {showBalance ? formatEuro(totalDiscountSaved) : '•••• €'}
              </p>
              <span className="text-[11px] text-text-subtle">
                ottenuto presso i supermercati partner
              </span>
            </div>
            <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-400">
              <ArrowUpRight className="h-5 w-5" />
            </div>
          </div>

          {/* Stat 2: Pool Tranche & Future erogazioni */}
          <div className="rounded-xl border border-border bg-surface-raised p-3.5 text-xs">
            <span className="font-semibold text-text uppercase tracking-wider text-[11px] text-text-subtle">
              Gestione Tranche (Pool Unico)
            </span>
            <div className="mt-2 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-text">Tranche 2026 (500 €)</span>
                <span className="font-semibold text-emerald-400">Disponibile</span>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-border/40">
                <div>
                  <span className="text-text">Seconda Tranche (500 €)</span>
                  <span className="block text-[10px] text-text-subtle">Sblocco da Aprile 2027</span>
                </div>
                <span className="rounded bg-surface px-1.5 py-0.5 text-[10px] text-zinc-400 font-medium border border-border/40">
                  {nextTranche ? 'In arrivo' : 'Attiva'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
