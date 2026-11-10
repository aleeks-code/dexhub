'use client'

import { AlertTriangle } from 'lucide-react'
import { useMonthlySummary, useStima } from '../services/worklog-api'
import type { StimaBlocker } from '../services/worklog-api'
import { blockerShortLabel } from '../lib/blockers'
import { useWorklogT, type WorklogTranslations } from '../i18n'

function BlockerShortBlock({ blocker, t }: { blocker: StimaBlocker; t: WorklogTranslations }) {
  const short = blockerShortLabel(blocker, t)
  return (
    <div>
      <div className="flex items-center gap-1.5">
        <AlertTriangle size={14} className="shrink-0 text-warning" />
        <p className="text-sm font-semibold text-warning">{short.label}</p>
      </div>
      {short.action && <p className="mt-0.5 text-xs text-text-muted">{short.action}</p>}
    </div>
  )
}

function currentMonth(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function formatEuro(n: number): string {
  return new Intl.NumberFormat('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)
}

function formatOre(n: number): string {
  return new Intl.NumberFormat('it-IT', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(n)
}

export default function WorklogSummaryWidget() {
  const t = useWorklogT()
  const month = currentMonth()
  const { data: summary, isLoading: summaryLoading } = useMonthlySummary(month)
  const { data: stimaResponse, isLoading: stimaLoading } = useStima(month)

  if (summaryLoading || stimaLoading) {
    return (
      <div className="flex h-full items-center justify-center text-xs text-text-subtle">
        Caricamento…
      </div>
    )
  }

  // ponytail: distinto dal caso "stima bloccata" sotto — qui la query stessa non ha risposto
  // (fetch fallita/rete), non un blocker di dominio. Non c'è un blockerMessage per questo.
  if (!summary || !stimaResponse) {
    return (
      <div className="flex h-full items-center justify-center text-xs text-text-subtle">
        Dati non disponibili
      </div>
    )
  }

  const completeness =
    summary.giorniConBuco > 0
      ? { text: `${summary.giorniConBuco} ${summary.giorniConBuco === 1 ? 'giorno da verificare' : 'giorni da verificare'}`, color: 'text-warning', dot: 'bg-warning' }
      : summary.giorniRegistrati < summary.giorniLavorabiliMese
        ? { text: `${summary.giorniRegistrati}/${summary.giorniLavorabiliMese} giorni registrati`, color: 'text-text-muted', dot: 'bg-neutral' }
        : { text: 'Tutto regolare', color: 'text-success', dot: 'bg-success' }

  return (
    <div className="flex h-full flex-col justify-center gap-3">
      {stimaResponse.stima !== null ? (
        <div>
          <p className="text-xs text-text-muted">Stima del mese</p>
          <p className="text-2xl font-medium leading-snug text-text">
            {formatEuro(stimaResponse.stima.netto)} <span className="text-primary">€</span>
          </p>
        </div>
      ) : (
        <BlockerShortBlock blocker={stimaResponse.stimaBlocker} t={t} />
      )}
      <div className="flex gap-2.5">
        <div className="flex-1 rounded-[9px] bg-overlay-subtle px-3 py-2.5">
          <p className="text-xs text-text-muted">Ore registrate</p>
          <p className="text-sm font-semibold text-text">{formatOre(summary.totaleRegistrate)}h</p>
        </div>
        <div className="min-w-0 flex-1 rounded-[9px] bg-overlay-subtle px-3 py-2.5">
          <p className="text-xs text-text-muted">Completezza</p>
          <div className="flex items-center gap-1.5">
            <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${completeness.dot}`} />
            <p className={`truncate text-xs font-medium ${completeness.color}`}>{completeness.text}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
