'use client'

import { useEffect, useState } from 'react'
import {
  FileText,
  ExternalLink,
  ShieldCheck,
  Calendar,
  ChevronDown,
  ChevronUp,
  Info,
  Sliders,
} from 'lucide-react'
import { Button } from '@dexhub/ui'
import {
  useCigConfig,
  useUpsertCigConfig,
  useCigMassimali,
  type UpsertCigConfigInput,
} from '../services/worklog-api'
import type { WorklogTranslations } from '../i18n'
import { formatEur } from './stima-card'

interface Props {
  t: WorklogTranslations
}

// Dati ufficiali 2026 dal volantino INPS
const MONTHLY_RATES_2026 = [
  { month: 'Gennaio', days: 22, hours: 176, rate: 7.62 },
  { month: 'Febbraio', days: 20, hours: 160, rate: 8.38 },
  { month: 'Marzo', days: 22, hours: 176, rate: 7.62 },
  { month: 'Aprile', days: 20, hours: 160, rate: 8.38 },
  { month: 'Maggio', days: 21, hours: 168, rate: 7.98 },
  { month: 'Giugno', days: 21, hours: 168, rate: 7.98 },
  { month: 'Luglio', days: 23, hours: 184, rate: 7.29 },
  { month: 'Agosto', days: 21, hours: 168, rate: 7.98 },
  { month: 'Settembre', days: 22, hours: 176, rate: 7.62 },
  { month: 'Ottobre', days: 22, hours: 176, rate: 7.62 },
  { month: 'Novembre', days: 20, hours: 160, rate: 8.38 },
  { month: 'Dicembre', days: 21, hours: 168, rate: 7.98 },
]

export function CigConfigPanel({ t }: Props) {
  const { data: existing, isSuccess } = useCigConfig()
  const { data: massimali, isLoading: isLoadingMassimali } = useCigMassimali()
  const upsert = useUpsertCigConfig()

  const [massimaleStr, setMassimaleStr] = useState<string>(
    existing?.massimaleMensile != null ? String(existing.massimaleMensile) : '',
  )
  const [note, setNote] = useState(existing?.note ?? '')
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [showBreakdown, setShowBreakdown] = useState(true)
  const [showOverride, setShowOverride] = useState(Boolean(existing?.massimaleMensile))

  useEffect(() => {
    if (!isSuccess) return
    setMassimaleStr(existing?.massimaleMensile != null ? String(existing.massimaleMensile) : '')
    setNote(existing?.note ?? '')
    if (existing?.massimaleMensile) {
      setShowOverride(true)
    }
  }, [isSuccess, existing])

  async function handleSave() {
    if (status === 'saving') return
    setStatus('saving')
    const massimale = massimaleStr.trim() !== '' ? parseFloat(massimaleStr) : null
    const body: UpsertCigConfigInput = {
      tipo: 'solidarieta',
      // Manteniamo 0.596 per retrocompatibilità schema se non valorizzato
      coefficiente: existing?.coefficiente ?? 0.596,
      massimaleMensile: massimale != null && !isNaN(massimale) && massimale > 0 ? massimale : null,
      note: note.trim() || null,
    }
    await upsert.mutateAsync(body)
    setStatus('saved')
    setTimeout(() => setStatus('idle'), 2000)
  }

  const saveLabel =
    status === 'saving' ? t.cigConfig.saving : status === 'saved' ? t.cigConfig.saved : t.cigConfig.save

  return (
    <div className="flex flex-col gap-5 text-text">
      {/* ── Banner Informativo Calcolo Ufficiale ── */}
      <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-2">
        <div className="flex items-center gap-2 text-primary font-semibold text-sm">
          <ShieldCheck className="h-5 w-5 shrink-0" />
          <span>{t.cigConfig.activeFormula}</span>
        </div>
        <p className="text-xs text-text-muted leading-relaxed">
          {t.cigConfig.activeFormulaDesc}
        </p>
      </div>

      {/* ── Tabella Massimali INPS Ufficiali ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 text-primary" />
            {t.cigConfig.officialCeilings}
          </h3>
          <a
            href="/docs/volantino-cig-2026.pdf"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline font-medium"
          >
            <FileText className="h-3.5 w-3.5" />
            <span>{t.cigConfig.openPdf}</span>
            <ExternalLink className="h-3 w-3 opacity-70" />
          </a>
        </div>

        {isLoadingMassimali ? (
          <div className="h-24 animate-pulse rounded-lg bg-surface-muted/50" />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {massimali?.map((m) => {
              const isCurrent = m.anno === 2026
              return (
                <div
                  key={m.anno}
                  className={`rounded-lg border p-3 flex flex-col justify-between transition-colors ${
                    isCurrent
                      ? 'border-primary/40 bg-surface shadow-xs'
                      : 'border-border bg-surface/50 opacity-80'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-text">
                      {t.cigConfig.year} {m.anno}
                    </span>
                    {isCurrent && (
                      <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                        In vigore
                      </span>
                    )}
                  </div>
                  <div className="space-y-0.5">
                    <div className="text-[11px] text-text-muted">{t.cigConfig.netCeiling}</div>
                    <div className="text-base font-bold tabular-nums text-text">
                      {formatEur(m.massimaleNetto, t.locale)}
                    </div>
                  </div>
                  <div className="mt-2 pt-2 border-t border-border/50 text-[10px] text-text-muted">
                    {m.circolareInps ?? 'Circolare INPS'}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Prospetto Quote Orarie Mensili (Divisore Mobile) ── */}
      <div className="rounded-lg border border-border bg-surface overflow-hidden">
        <button
          type="button"
          onClick={() => setShowBreakdown((prev) => !prev)}
          className="w-full flex items-center justify-between p-3 text-left hover:bg-surface-hover/50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Info className="h-4 w-4 text-primary" />
            <span className="text-xs font-semibold text-text">
              {t.cigConfig.monthlyDivisorTable}
            </span>
          </div>
          {showBreakdown ? (
            <ChevronUp className="h-4 w-4 text-text-muted" />
          ) : (
            <ChevronDown className="h-4 w-4 text-text-muted" />
          )}
        </button>

        {showBreakdown && (
          <div className="border-t border-border p-3 space-y-2">
            <p className="text-[11px] text-text-muted">
              Quota oraria = € 1.340,56 ÷ (Giorni feriali × 8 ore). Ogni ora di CIG/solidarietà nel cartellino viene retribuita con questa quota esatta.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-border text-text-muted font-medium text-[11px]">
                    <th className="pb-1.5 font-normal">{t.cigConfig.month}</th>
                    <th className="pb-1.5 font-normal text-center">{t.cigConfig.workableDays}</th>
                    <th className="pb-1.5 font-normal text-center">{t.cigConfig.divisorHours}</th>
                    <th className="pb-1.5 font-normal text-right">{t.cigConfig.hourlyRate}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {MONTHLY_RATES_2026.map((row) => (
                    <tr key={row.month} className="hover:bg-surface-hover/30">
                      <td className="py-1 text-text font-medium">{row.month}</td>
                      <td className="py-1 text-center tabular-nums text-text-muted">{row.days} gg</td>
                      <td className="py-1 text-center tabular-nums text-text-muted">{row.hours} h</td>
                      <td className="py-1 text-right tabular-nums font-semibold text-primary">
                        {formatEur(row.rate, t.locale)}/h
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ── Personalizzazione / Override Custom (Opzionale) ── */}
      <div className="rounded-lg border border-border bg-surface overflow-hidden">
        <button
          type="button"
          onClick={() => setShowOverride((prev) => !prev)}
          className="w-full flex items-center justify-between p-3 text-left hover:bg-surface-hover/50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Sliders className="h-4 w-4 text-text-muted" />
            <span className="text-xs font-semibold text-text">
              {t.cigConfig.customOverrideTitle}
            </span>
          </div>
          {showOverride ? (
            <ChevronUp className="h-4 w-4 text-text-muted" />
          ) : (
            <ChevronDown className="h-4 w-4 text-text-muted" />
          )}
        </button>

        {showOverride && (
          <div className="border-t border-border p-3 space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-text-muted">
                {t.cigConfig.customCeiling}
              </label>
              <input
                type="number"
                value={massimaleStr}
                min={0}
                step={10}
                placeholder="1340.56"
                onChange={(e) => setMassimaleStr(e.target.value)}
                className="w-full rounded-md border border-border bg-surface-muted/30 px-3 py-1.5 text-sm text-text focus:border-primary focus:outline-none"
              />
              <p className="text-[11px] text-text-muted leading-tight">
                {t.cigConfig.customCeilingHint}
              </p>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-text-muted">{t.cigConfig.note}</label>
              <input
                type="text"
                value={note}
                placeholder="Es. Accordo integrativo aziendale..."
                onChange={(e) => setNote(e.target.value)}
                className="w-full rounded-md border border-border bg-surface-muted/30 px-3 py-1.5 text-sm text-text focus:border-primary focus:outline-none"
              />
            </div>

            <div className="flex justify-end pt-1">
              <Button
                variant="primary"
                size="sm"
                onClick={handleSave}
                disabled={status === 'saving'}
              >
                {saveLabel}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
