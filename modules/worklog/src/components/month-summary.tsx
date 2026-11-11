'use client'

import { AlertTriangle, Moon, Sun, Utensils } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { MonthlySummary } from '../services/worklog-api'
import type { WorklogTranslations } from '../i18n'
import { KIND_COLOR } from '../utils/kind-colors'

const LOW_BALANCE_THRESHOLD = 8

interface Props {
  summary: MonthlySummary | undefined
  oreNotturne: number
  orePomeridiane: number
  t: WorklogTranslations
}

interface StatItem {
  label: string
  value: number
  display: string
  color: string
  // Fascia notturna/pomeridiana — icona al posto del pallino, stessi token di entry-editor.tsx
  // (Moon/text-violet, Sun/text-warning). Assente = pallino colorato (kind del calendario).
  icon?: LucideIcon
}

function StatRow({ item }: { item: StatItem }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="flex h-4 w-4 shrink-0 items-center justify-center">
        {item.icon
          ? <item.icon size={14} className={item.color} fill="currentColor" />
          : <span className={`h-2 w-2 rounded-full ${item.color}`} />}
      </span>
      <span className="flex-1 text-text-muted">{item.label}</span>
      <span className="font-medium text-text">{item.display}</span>
    </div>
  )
}

function ResidualRow({
  label,
  value,
  t,
}: {
  label: string
  value: number | null
  t: WorklogTranslations
}) {
  if (value === null) return null
  const low = value < LOW_BALANCE_THRESHOLD
  return (
    <div className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm ${low ? 'bg-warning/10' : 'bg-surface'}`}>
      {low && <AlertTriangle size={13} className="shrink-0 text-warning" />}
      <span className="flex-1 text-text-muted">{label}</span>
      <span className={`font-semibold ${low ? 'text-warning' : 'text-text'}`}>
        {value.toFixed(1)}h
      </span>
      {low && (
        <span className="text-xs text-warning">{t.residui.alert}</span>
      )}
    </div>
  )
}

export function MonthSummary({ summary, oreNotturne, orePomeridiane, t }: Props) {
  if (!summary) return null

  // Registrazioni — tutti i kind (stesso ordine di sempre: ordinarie→straord.→ferie→permesso→
  // malattia→festivi→permesso non retrib.→CIG), un solo blocco, pallino KIND_COLOR.
  const registrazioniStats: StatItem[] = [
    { label: t.summary.ordinary, value: summary.oreOrdinarie, display: `${summary.oreOrdinarie.toFixed(1)}${t.hours}`, color: KIND_COLOR.work.dot },
    { label: t.summary.overtime, value: summary.oreStraordinario, display: `${summary.oreStraordinario.toFixed(1)}${t.hours}`, color: KIND_COLOR.overtime.dot },
    { label: t.summary.vacation, value: summary.oreFerie, display: `${summary.oreFerie.toFixed(1)}${t.hours}`, color: KIND_COLOR.vacation.dot },
    { label: t.summary.leave, value: summary.orePermesso, display: `${summary.orePermesso.toFixed(1)}${t.hours}`, color: KIND_COLOR.leave.dot },
    { label: t.summary.sick, value: summary.oreMalattia, display: `${summary.oreMalattia.toFixed(1)}${t.hours}`, color: KIND_COLOR.sick.dot },
    { label: t.summary.holiday, value: summary.oreFestivi, display: `${summary.oreFestivi.toFixed(1)}${t.hours}`, color: KIND_COLOR.holiday.dot },
    { label: t.summary.permessoNonRetribuito, value: summary.orePermessoNonRetribuito, display: `${summary.orePermessoNonRetribuito.toFixed(1)}${t.hours}`, color: KIND_COLOR.permesso_non_retribuito.dot },
    { label: t.summary.cig, value: summary.oreCig, display: `${summary.oreCig.toFixed(1)}${t.hours}`, color: KIND_COLOR.cig.dot },
  ].filter((s) => s.value > 0)

  // Dettagli — notturne/pomeridiane (scomposizione ordinarie/straord., icona luna/sole) + mensa
  // (conteggio pasti, non ore) — sotto la linea grigia, ultimi della card per costruzione.
  const dettagliStats: StatItem[] = [
    { label: t.summary.nightHours, value: oreNotturne, display: `${oreNotturne.toFixed(1)}${t.hours}`, color: 'text-violet', icon: Moon },
    { label: t.summary.afternoonHours, value: orePomeridiane, display: `${orePomeridiane.toFixed(1)}${t.hours}`, color: 'text-warning', icon: Sun },
  ].filter((s) => s.value > 0)

  const hasResidui = summary.residuiFerie !== null || summary.residuiPermessi !== null
  const progressPct = summary.giorniLavorabiliMese > 0
    ? Math.min(100, Math.round((summary.giorniRegistrati / summary.giorniLavorabiliMese) * 100))
    : 100

  return (
    <div className="rounded-xl border border-border bg-surface-raised p-4 space-y-4 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider">
          {t.summary.title}
        </h3>
        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
          {progressPct}% completato
        </span>
      </div>

      {/* Main KPI Row */}
      <div className="grid grid-cols-2 gap-3 rounded-lg border border-border/80 bg-surface/60 p-3">
        <div>
          <div className="text-xs text-text-muted font-medium">{t.summary.daysWorked}</div>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-2xl font-bold text-text">{summary.daysWorked}</span>
            <span className="text-xs text-text-subtle">/ {summary.giorniLavorabiliMese} gg</span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs text-text-muted font-medium">{t.summary.registered}</div>
          <div className="text-2xl font-bold text-primary mt-0.5">
            {summary.totaleRegistrate.toFixed(1)}<span className="text-sm font-medium text-text-muted ml-0.5">{t.hours}</span>
          </div>
        </div>
      </div>

      {/* Progress Bar & Gaps Notice */}
      <div className="space-y-1.5">
        <div className="h-2 w-full overflow-hidden rounded-full bg-surface border border-border/60">
          <div
            className="h-full rounded-full bg-primary transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-xs text-text-muted">
          <span>
            {t.summary.completeness
              .replace('{registered}', String(summary.giorniRegistrati))
              .replace('{workable}', String(summary.giorniLavorabiliMese))}
          </span>
          {summary.giorniConBuco > 0 && (
            <span className="flex items-center gap-1 font-medium text-warning">
              <AlertTriangle size={11} className="shrink-0" />
              {t.summary.gapsWarning.replace('{count}', String(summary.giorniConBuco))}
            </span>
          )}
        </div>
      </div>

      {registrazioniStats.length > 0 && (
        <div className="space-y-1.5 border-t border-border pt-3">
          {registrazioniStats.map((s) => <StatRow key={s.label} item={s} />)}
        </div>
      )}

      {(dettagliStats.length > 0 || summary.mensaAttiva) && (
        <div className="space-y-1.5 border-t border-border pt-3">
          {dettagliStats.map((s) => <StatRow key={s.label} item={s} />)}
          {summary.mensaAttiva && (
            <StatRow item={{ label: t.summary.mensa, value: summary.numeroPasti, display: `${summary.numeroPasti} pasti`, color: 'text-primary', icon: Utensils }} />
          )}
        </div>
      )}

      {hasResidui && (
        <div className="space-y-1.5 border-t border-border pt-3">
          <ResidualRow label={t.residui.ferie} value={summary.residuiFerie} t={t} />
          <ResidualRow label={t.residui.permessi} value={summary.residuiPermessi} t={t} />
        </div>
      )}
    </div>
  )
}
