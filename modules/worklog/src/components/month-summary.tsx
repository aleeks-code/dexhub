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
  icon?: LucideIcon
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
  const giorniEquivalenti = (value / 8).toFixed(1)
  return (
    <div
      className={`flex items-center justify-between rounded-xl px-3 py-2 text-[13px] transition-colors ${
        low ? 'bg-warning/10 text-warning border border-warning/20' : 'bg-surface/60 text-text'
      }`}
    >
      <div className="flex items-center gap-2">
        {low && <AlertTriangle size={13} className="shrink-0 text-warning" />}
        <span className="text-text-muted font-medium">{label}</span>
      </div>
      <div className="flex items-baseline gap-1.5 tabular-nums">
        <span className="font-bold text-text">{value.toFixed(1)}h</span>
        <span className="text-xs text-text-subtle">(~{giorniEquivalenti} gg)</span>
        {low && (
          <span className="text-[10px] font-semibold text-warning">({t.residui.alert})</span>
        )}
      </div>
    </div>
  )
}

export function MonthSummary({ summary, oreNotturne, orePomeridiane, t }: Props) {
  if (!summary) return null

  // Registrazioni — tutti i kind presenti con ore > 0
  const registrazioniStats: StatItem[] = [
    { label: t.summary.ordinary, value: summary.oreOrdinarie, display: `${summary.oreOrdinarie.toFixed(1)}${t.hours}`, color: KIND_COLOR.work.dot },
    { label: t.summary.overtime, value: summary.oreStraordinario, display: `${summary.oreStraordinario.toFixed(1)}${t.hours}`, color: KIND_COLOR.overtime.dot },
    { label: t.summary.vacation, value: summary.oreFerie, display: `${summary.oreFerie.toFixed(1)}${t.hours}`, color: KIND_COLOR.vacation.dot },
    { label: t.summary.leave, value: summary.orePermesso, display: `${summary.orePermesso.toFixed(1)}${t.hours}`, color: KIND_COLOR.leave.dot },
    { label: t.summary.sick, value: summary.oreMalattia, display: `${summary.oreMalattia.toFixed(1)}${t.hours}`, color: KIND_COLOR.sick.dot },
    { label: t.summary.holiday, value: summary.oreFestivi, display: `${summary.oreFestivi.toFixed(1)}${t.hours}`, color: KIND_COLOR.holiday.dot },
    { label: t.summary.permessoNonRetribuito, value: summary.orePermessoNonRetribuito, display: `${summary.orePermessoNonRetribuito.toFixed(1)}${t.hours}`, color: KIND_COLOR.permesso_non_retribuito.dot },
    { label: t.summary.congedoParentale80, value: summary.oreCongedoParentale80 ?? 0, display: `${(summary.oreCongedoParentale80 ?? 0).toFixed(1)}${t.hours}`, color: KIND_COLOR.congedo_parentale_80.dot },
    { label: t.summary.congedoParentale30, value: summary.oreCongedoParentale30 ?? 0, display: `${(summary.oreCongedoParentale30 ?? 0).toFixed(1)}${t.hours}`, color: KIND_COLOR.congedo_parentale_30.dot },
    { label: t.summary.cig, value: summary.oreCig, display: `${summary.oreCig.toFixed(1)}${t.hours}`, color: KIND_COLOR.cig.dot },
  ].filter((s) => s.value > 0)

  // Dettagli — notturne/pomeridiane + mensa
  const dettagliStats: StatItem[] = [
    { label: t.summary.nightHours, value: oreNotturne, display: `${oreNotturne.toFixed(1)}${t.hours}`, color: 'text-violet', icon: Moon },
    { label: t.summary.afternoonHours, value: orePomeridiane, display: `${orePomeridiane.toFixed(1)}${t.hours}`, color: 'text-warning', icon: Sun },
  ].filter((s) => s.value > 0)

  const hasResidui = summary.residuiFerie !== null || summary.residuiPermessi !== null
  const progressPct = summary.giorniLavorabiliMese > 0
    ? Math.min(100, Math.round((summary.giorniRegistrati / summary.giorniLavorabiliMese) * 100))
    : 100

  const hasLowBalance =
    (summary.residuiFerie !== null && summary.residuiFerie < LOW_BALANCE_THRESHOLD) ||
    (summary.residuiPermessi !== null && summary.residuiPermessi < LOW_BALANCE_THRESHOLD)

  return (
    <div className="rounded-2xl border border-border bg-surface/50 backdrop-blur-md p-4 sm:p-5 space-y-4 shadow-sm">
      {/* ── Gruppo 1: Riepilogo Mensile (KPI Principali) ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider">
            {t.summary.title}
          </h3>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
            {progressPct}% completato
          </span>
        </div>

        {/* Griglia KPI — pulita, ariosa, senza doppi bordi pesanti */}
        <div className="grid grid-cols-2 gap-3 py-1">
          <div>
            <div className="text-[13px] text-text-muted font-medium">{t.summary.daysWorked}</div>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-2xl font-bold text-text tracking-tight tabular-nums">
                {summary.daysWorked}
              </span>
              <span className="text-xs text-text-muted">/ {summary.giorniLavorabiliMese} gg</span>
            </div>
            <div className="text-[11px] text-text-subtle mt-0.5">giorni lavorati</div>
          </div>

          <div className="text-right">
            <div className="text-[13px] text-text-muted font-medium">{t.summary.registered}</div>
            <div className="mt-1">
              <span className="text-2xl font-bold text-primary tracking-tight tabular-nums">
                {summary.totaleRegistrate.toFixed(1)}
              </span>
              <span className="text-sm font-semibold text-text-muted ml-0.5">{t.hours}</span>
            </div>
            <div className="text-[11px] text-text-subtle mt-0.5">Totale mensile</div>
          </div>
        </div>

        {/* Barra di Completamento & Avviso Buchi */}
        <div className="space-y-1.5">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-raised">
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
                <AlertTriangle size={12} className="shrink-0" />
                {t.summary.gapsWarning.replace('{count}', String(summary.giorniConBuco))}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Gruppo 2: Distribuzione Ore (Gerarchia Chiara) ── */}
      {(registrazioniStats.length > 0 || dettagliStats.length > 0 || summary.mensaAttiva) && (
        <div className="border-t border-border/40 pt-3 space-y-2">
          <div className="text-xs font-bold text-text-muted uppercase tracking-wider">
            Distribuzione ore
          </div>
          <div className="space-y-1.5">
            {registrazioniStats.map((s) => (
              <div key={s.label} className="flex items-center justify-between text-[13px]">
                <div className="flex items-center gap-2 text-text-muted font-medium">
                  <span className={`h-2 w-2 rounded-full shrink-0 ${s.color}`} />
                  <span>{s.label}</span>
                </div>
                <span className="font-semibold text-text tabular-nums">{s.display}</span>
              </div>
            ))}
            {dettagliStats.map((s) => (
              <div key={s.label} className="flex items-center justify-between text-[13px]">
                <div className="flex items-center gap-2 text-text-muted font-medium">
                  {s.icon ? (
                    <s.icon size={13} className={s.color} />
                  ) : (
                    <span className={`h-2 w-2 rounded-full ${s.color}`} />
                  )}
                  <span>{s.label}</span>
                </div>
                <span className="font-semibold text-text tabular-nums">{s.display}</span>
              </div>
            ))}
            {summary.mensaAttiva && (
              <div className="flex items-center justify-between text-[13px]">
                <div className="flex items-center gap-2 text-text-muted font-medium">
                  <Utensils size={13} className="text-primary" />
                  <span>{t.summary.mensa}</span>
                </div>
                <span className="font-semibold text-text tabular-nums">{summary.numeroPasti} pasti</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Gruppo 3: Banca Ore, Ferie e Permessi ── */}
      {hasResidui && (
        <div className="border-t border-border/40 pt-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-text-muted uppercase tracking-wider">
              Banca ore e ferie
            </span>
            {hasLowBalance ? (
              <span className="inline-flex items-center gap-1 rounded bg-warning/10 border border-warning/20 px-1.5 py-0.5 text-[10px] font-semibold text-warning">
                <AlertTriangle size={10} />
                <span>Attenzione</span>
              </span>
            ) : (
              <span className="text-[11px] text-text-subtle">Saldo ore</span>
            )}
          </div>

          <div className="space-y-1.5">
            <ResidualRow label={t.residui.ferie} value={summary.residuiFerie} t={t} />
            <ResidualRow label={t.residui.permessi} value={summary.residuiPermessi} t={t} />
          </div>
        </div>
      )}
    </div>
  )
}
