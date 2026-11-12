'use client'

import React from 'react'
import { AlertCircle, CheckCircle2, Clock } from 'lucide-react'
import { cn } from '@dexhub/ui'
import type { CardBalanceSummary } from '../types'

interface Props {
  summary: CardBalanceSummary
  onNewExpenseClick?: () => void
}

export function ActivationBanner({ summary, onNewExpenseClick }: Props) {
  const { firstPurchaseMet, isFirstPurchaseExpired, daysToFirstPurchaseDeadline } = summary

  // 1. Già attivata (Successo)
  if (firstPurchaseMet) {
    return (
      <div className="flex items-center justify-between rounded-xl border border-emerald-500/30 bg-surface px-4 py-3 text-xs text-emerald-400 shadow-xs">
        <div className="flex items-center gap-2.5">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          <span className="font-semibold text-text">
            Carta attivata con successo
          </span>
          <span className="text-text-subtle hidden sm:inline">
            — Il vincolo di primo acquisto entro il 16 Dicembre 2026 è stato assolto.
          </span>
        </div>
        <span className="rounded-md bg-emerald-500/15 px-2 py-0.5 text-[11px] font-bold text-emerald-300">
          Attiva
        </span>
      </div>
    )
  }

  // 2. Scaduta e non attivata
  if (isFirstPurchaseExpired) {
    return (
      <div className="flex items-center justify-between rounded-xl border border-rose-500/40 bg-surface p-4 text-xs text-rose-300 shadow-xs">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-rose-400 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-rose-200 text-sm">
              Termine del 16 Dicembre 2026 superato
            </h4>
            <p className="mt-1 text-rose-300/80 leading-relaxed">
              Non risultano spese registrate entro il 16/12/2026. Le disposizioni ministeriali prevedono la decadenza del beneficio qualora non sia stato effettuato almeno un pagamento entro tale data.
            </p>
          </div>
        </div>
      </div>
    )
  }

  // 3. In attesa di primo acquisto — Nuova Palette Sky / Indaco (Professionale ed Elegante)
  return (
    <div className="relative overflow-hidden rounded-xl border border-sky-500/30 bg-surface p-4 text-text shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-sky-500/15 p-2.5 text-sky-400 shrink-0 mt-0.5">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-sky-400">
                Attivazione Richiesta
              </span>
              <span className="rounded-full bg-sky-500/20 px-2.5 py-0.5 text-[11px] font-bold text-sky-200">
                Mancano {daysToFirstPurchaseDeadline ?? 0} giorni
              </span>
            </div>
            <h4 className="font-bold text-sm text-text mt-0.5">
              Primo acquisto obbligatorio entro il 16 Dicembre 2026
            </h4>
            <p className="mt-1 text-xs text-text-subtle leading-relaxed max-w-2xl">
              Per attivare la carta ed evitare il riassorbimento del fondo da 500 €, effettua almeno un pagamento di generi alimentari entro la scadenza.
            </p>
          </div>
        </div>

        {onNewExpenseClick && (
          <button
            type="button"
            onClick={onNewExpenseClick}
            className="shrink-0 rounded-lg bg-sky-500 hover:bg-sky-400 text-black font-semibold text-xs px-3.5 py-2 transition-colors shadow-xs cursor-pointer"
          >
            Registra Primo Acquisto
          </button>
        )}
      </div>
    </div>
  )
}
