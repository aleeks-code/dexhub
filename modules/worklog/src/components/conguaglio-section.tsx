'use client'

import { useMemo, useState } from 'react'
import { AlertTriangle, ChevronDown, TrendingDown, TrendingUp } from 'lucide-react'
import { stimaConguaglio } from '@dexhub/worklog-engine'
import { useConguaglioRaw, type ConguaglioStatus } from '../services/worklog-api'
import type { WorklogTranslations } from '../i18n'
import { formatEur } from './stima-card'
import { blockerMessage } from '../lib/blockers'

interface Props {
  t: WorklogTranslations
}

function fill(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ''))
}

function statusMessage(
  status: Exclude<ConguaglioStatus, 'ok'>,
  mesiCompleti: number | undefined,
  mesiMinimi: number | undefined,
  t: WorklogTranslations,
): string {
  switch (status) {
    case 'anno_incompleto': return t.stima.conguaglio_status_anno_incompleto
    case 'dati_inconsistenti': return t.stima.conguaglio_status_dati_inconsistenti
    case 'dati_insufficienti':
      return fill(t.stima.conguaglio_status_dati_insufficienti, {
        mesiMinimi: mesiMinimi ?? 0,
        mesiCompleti: mesiCompleti ?? 0,
      })
  }
}

export function ConguaglioSection({ t }: Props) {
  const [open, setOpen] = useState(false)
  const { data, isLoading } = useConguaglioRaw({ enabled: open })
  const locale = t.locale

  // Nessuna proiezione sui mesi futuri (rimossa): mesiFuturi fisso a 0, il delta
  // riflette solo lo straordinario reale già registrato quest'anno.
  const result = useMemo(() => {
    if (!data || data.conguaglioStatus !== 'ok') return null
    return stimaConguaglio({ ...data.conguaglioRaw, mesiFuturi: 0, proiezione: 'prudente' })
  }, [data])

  return (
    <div className="border-t border-border pt-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between text-sm font-medium text-text-muted hover:text-text"
      >
        <span>{t.stima.conguaglio_title}</span>
        <ChevronDown
          size={16}
          className={`transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="mt-3 space-y-3">
          {isLoading || !data ? (
            <p className="text-xs text-text-muted">{t.stima.conguaglio_loading}</p>
          ) : data.conguaglioStatus === null ? (
            <p className="text-xs text-text-muted">{blockerMessage(data.stimaBlocker, t)}</p>
          ) : data.conguaglioStatus !== 'ok' ? (
            <p className="text-xs text-text-muted">
              {statusMessage(
                data.conguaglioStatus,
                data.conguaglioStatus === 'dati_insufficienti' ? data.mesiCompleti : undefined,
                data.conguaglioStatus === 'dati_insufficienti' ? data.mesiMinimi : undefined,
                t,
              )}
            </p>
          ) : result ? (
            <>
              {/* ── Result ───────────────────────────────────────────────── */}
              {(() => {
                const isCredito = result.conguaglioStimato < 0
                const importo = formatEur(Math.abs(result.conguaglioStimato), locale)
                const message = fill(
                  isCredito ? t.stima.conguaglio_result_credito : t.stima.conguaglio_result_debito,
                  { importo },
                )
                const Icon = isCredito ? TrendingUp : TrendingDown

                return result.warningConguaglio ? (
                  <div className="flex gap-2 rounded-lg bg-warning/10 px-3 py-2 text-xs text-warning">
                    <AlertTriangle size={13} className="mt-0.5 shrink-0" />
                    <span>{message}</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-sm">
                    <Icon size={14} className="shrink-0 text-text-muted" />
                    <span className="tabular-nums text-text">{message}</span>
                  </div>
                )
              })()}

              {/* ── Disclaimer ───────────────────────────────────────────── */}
              <p className="text-xs text-text-muted">
                {fill(t.stima.conguaglio_disclaimer_incertezza, { mesiCompleti: result.mesiCompletiUsati })}
              </p>
            </>
          ) : null}
        </div>
      )}
    </div>
  )
}
