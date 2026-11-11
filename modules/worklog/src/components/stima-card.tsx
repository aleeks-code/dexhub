'use client'

import { useEffect, useState } from 'react'
import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Info,
  TrendingDown,
  ChevronRight,
  Pencil,
  Trash2,
  X,
  Plus,
} from 'lucide-react'
import { Button } from '@dexhub/ui'
import { useStima, useUpdateNettoReale, useDeleteNettoReale } from '../services/worklog-api'
import type { StimaBlocker, StimaWarningCode } from '../services/worklog-api'
import type { WorklogTranslations } from '../i18n'
import { blockerMessage } from '../lib/blockers'
import { ConguaglioSection } from './conguaglio-section'
import { StoricoBustePagaModal } from './storico-buste-paga-modal'

interface Props {
  month: string // 'YYYY-MM'
  t: WorklogTranslations
  onSelectMonth?: (month: string) => void
}

// ─── Currency formatting ──────────────────────────────────────────────────────

export function formatEur(n: number, locale: string): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n)
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      {[80, 64, 64, 64, 96].map((w, i) => (
        <div key={i} className="flex items-center justify-between">
          <div className={`h-3 rounded bg-border`} style={{ width: `${w}%` }} />
          <div className="h-3 w-16 rounded bg-border" />
        </div>
      ))}
    </div>
  )
}

function BlockerState({
  blocker,
  t,
}: {
  blocker: StimaBlocker
  t: WorklogTranslations
}) {
  return (
    <div className="flex flex-col items-center gap-3 py-6 text-center">
      <TrendingDown size={28} className="text-text-muted opacity-40" />
      <p className="text-sm text-text-muted">{blockerMessage(blocker, t)}</p>
    </div>
  )
}

/** Riassunto breve sempre visibile, click espande il testo pieno. Stesso stile/colore warning
 * di sempre — cambia solo la struttura (collassa/espandi), non la palette. */
function WarningItem({ summary, message }: { summary: string; message: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="rounded-lg bg-warning/10 text-xs text-warning">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left"
      >
        <AlertTriangle size={13} className="shrink-0" />
        <span className="flex-1 font-medium">{summary}</span>
        {open ? <ChevronUp size={14} className="shrink-0" /> : <ChevronDown size={14} className="shrink-0" />}
      </button>
      {open && (
        <div className="flex gap-2 px-3 pb-2">
          <span className="w-[13px] shrink-0" />
          <span>{message}</span>
        </div>
      )}
    </div>
  )
}

/** Nota (i): hover su desktop (CSS group-hover), tap su mobile (stato React, non solo hover). */
function InfoNote({ text }: { text: string }) {
  const [open, setOpen] = useState(false)
  return (
    <span className="group relative inline-flex">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="rounded p-0.5 text-text-subtle hover:text-text-muted"
      >
        <Info size={12} />
      </button>
      <span
        role="tooltip"
        className={`pointer-events-none absolute left-1/2 top-full z-20 mt-1.5 w-56 -translate-x-1/2 rounded-md border border-border bg-bg px-2 py-1.5 text-xs text-text shadow-lg transition-opacity duration-150 group-hover:opacity-100 ${open ? 'opacity-100' : 'opacity-0'}`}
      >
        {text}
      </span>
    </span>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

const DETAILS_STORAGE_KEY = 'dexhub-stima-details-open'

export function StimaCard({ month, t, onSelectMonth }: Props) {
  const { data, isLoading } = useStima(month)
  const updateNetto = useUpdateNettoReale()
  const deleteNetto = useDeleteNettoReale()
  const locale = t.locale

  // Preferenza di sola UI (no DB) — quale livello di dettaglio l'utente ha scelto l'ultima volta.
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [historyModalOpen, setHistoryModalOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [inputMonth, setInputMonth] = useState(month)
  const [inputNetto, setInputNetto] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setDetailsOpen(localStorage.getItem(DETAILS_STORAGE_KEY) === 'true')
  }, [])

  useEffect(() => {
    setInputMonth(month)
    setIsEditing(false)
    setConfirmDelete(false)
  }, [month])

  function toggleDetails() {
    setDetailsOpen((v) => {
      const next = !v
      localStorage.setItem(DETAILS_STORAGE_KEY, String(next))
      return next
    })
  }

  function startEditing() {
    setInputMonth(month)
    const currentNetto = data && 'nettoReale' in data && data.nettoReale != null ? String(data.nettoReale) : ''
    setInputNetto(currentNetto)
    setIsEditing(true)
    setConfirmDelete(false)
  }

  async function handleSave() {
    const val = parseFloat(inputNetto)
    if (isNaN(val) || val < 0) return
    setSaving(true)
    try {
      await updateNetto.mutateAsync({ mese: inputMonth, netto: val })
      setIsEditing(false)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    setSaving(true)
    try {
      await deleteNetto.mutateAsync(month)
      setConfirmDelete(false)
      setIsEditing(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="rounded-xl border border-border bg-surface-raised p-4 space-y-4">
      {/* Header */}
      <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wider">
        {t.stima.title}
      </h3>

      {/* Body */}
      {isLoading ? (
        <LoadingSkeleton />
      ) : !data ? null : data.stima === null ? (
        <BlockerState blocker={data.stimaBlocker} t={t} />
      ) : (
        <>
          {/* ── Flusso del netto (ridotto: sempre visibile) — somma dall'alto al netto ── */}
          <div className="space-y-1">
            <ChainRow label={t.stima.lordo} value={formatEur(data.stima.lordo, locale)} />
            <ChainRow
              label={t.stima.inps}
              value={`− ${formatEur(data.stima.contributiInps, locale)}`}
              valueClass="text-text-muted"
            />
            <ChainRow
              label={t.stima.irpef}
              value={`− ${formatEur(data.stima.irpefNettaMensile, locale)}`}
              valueClass="text-text-muted"
            />
            {data.stima.integrazioneSolidarieta > 0 && (
              <ChainRow
                label={t.stima.integrazioneSolidarieta}
                value={`+ ${formatEur(data.stima.integrazioneSolidarieta, locale)}`}
                valueClass="text-success"
              />
            )}
            {data.stima.trattenutaSindacale > 0 && (
              <ChainRow
                label={data.sindacatoNome ?? t.stima.trattenutaSindacale}
                value={`− ${formatEur(data.stima.trattenutaSindacale, locale)}`}
                valueClass="text-text-muted"
              />
            )}
            {data.stima.trattenutaMensa > 0 && (
              <ChainRow
                label={t.stima.trattenutaMensa}
                value={`− ${formatEur(data.stima.trattenutaMensa, locale)}`}
                valueClass="text-text-muted"
              />
            )}
            {data.stima.trattenutaAddizionali > 0 && (
              <ChainRow
                label={t.stima.trattenutaAddizionali}
                value={`− ${formatEur(data.stima.trattenutaAddizionali, locale)}`}
                valueClass="text-text-muted"
              />
            )}
            <ChainRow
              label={t.stima.netto}
              value={formatEur(data.stima.netto, locale)}
              dividerAbove
              prominent
            />
            {/* ── Sezione Netto Reale & Confronto Busta Paga ── */}
            <div className="mt-3 rounded-xl border border-border bg-surface p-3.5 space-y-3">
              {isEditing ? (
                /* ── Form Inline di Inserimento/Modifica ── */
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-text">
                      {data.nettoReale !== null ? t.nettoRealeConfig.edit : t.nettoRealeConfig.compareCta}
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsEditing(false)}
                      className="text-text-muted hover:text-text p-1 cursor-pointer"
                    >
                      <X size={14} />
                    </button>
                  </div>
                  <p className="text-[11px] text-text-muted">
                    {t.nettoRealeConfig.enterAmountPrompt}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[10px] font-medium uppercase tracking-wider text-text-muted">
                        {t.nettoRealeConfig.competencePeriod}
                      </label>
                      <input
                        type="month"
                        value={inputMonth}
                        onChange={(e) => setInputMonth(e.target.value)}
                        className="w-full rounded-lg border border-border bg-surface-raised px-2.5 py-1.5 text-xs text-text focus:border-primary focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-medium uppercase tracking-wider text-text-muted">
                        {t.nettoRealeConfig.netto} (€)
                      </label>
                      <input
                        type="number"
                        step={0.01}
                        min={0}
                        placeholder="0.00"
                        value={inputNetto}
                        onChange={(e) => setInputNetto(e.target.value)}
                        className="w-full rounded-lg border border-border bg-surface-raised px-2.5 py-1.5 text-xs text-text focus:border-primary focus:outline-none"
                        autoFocus
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-end gap-2 pt-1 border-t border-border">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsEditing(false)}
                      disabled={saving}
                      className="h-7 text-xs"
                    >
                      {t.nettoRealeConfig.cancel}
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={handleSave}
                      disabled={saving || inputNetto === ''}
                      className="h-7 text-xs"
                    >
                      {saving ? t.nettoRealeConfig.saving : t.nettoRealeConfig.save}
                    </Button>
                  </div>
                </div>
              ) : data.nettoReale !== null && data.scarto !== null ? (
                /* ── Stato Confrontato ── */
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
                      {t.nettoRealeConfig.title}
                    </span>
                    <span
                      className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-semibold border ${
                        data.valutazione === 'excellent'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          : data.valutazione === 'moderate'
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                            : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                      }`}
                    >
                      {data.valutazione === 'excellent'
                        ? t.nettoRealeConfig.excellent
                        : data.valutazione === 'moderate'
                          ? t.nettoRealeConfig.moderate
                          : t.nettoRealeConfig.significant}
                    </span>
                  </div>

                  {/* Grid 3 Colonne: Netto Stimato, Netto Reale, Scostamento */}
                  <div className="grid grid-cols-3 gap-2 border-y border-border py-2 text-center">
                    <div>
                      <span className="block text-[10px] text-text-muted">{t.nettoRealeConfig.estimate}</span>
                      <span className="text-xs font-semibold tabular-nums text-text">
                        {formatEur(data.stimaNettoSnapshot ?? data.stima.netto, locale)}
                      </span>
                    </div>
                    <div>
                      <span className="block text-[10px] text-text-muted">{t.nettoRealeConfig.actual}</span>
                      <span className="text-xs font-bold tabular-nums text-text">
                        {formatEur(data.nettoReale, locale)}
                      </span>
                    </div>
                    <div>
                      <span className="block text-[10px] text-text-muted">{t.nettoRealeConfig.gap}</span>
                      <span
                        className={`text-xs font-bold tabular-nums ${
                          data.scarto > 0 ? 'text-warning' : data.scarto < 0 ? 'text-primary' : 'text-emerald-400'
                        }`}
                      >
                        {data.scarto > 0 ? `+${formatEur(data.scarto, locale)}` : formatEur(data.scarto, locale)}
                      </span>
                    </div>
                  </div>

                  {/* Spiegazione dello scostamento */}
                  <div className="flex items-baseline justify-between text-xs text-text-muted">
                    <span className="text-[11px] leading-relaxed">
                      {data.verso === 'overestimate'
                        ? t.nettoRealeConfig.overestimatedDesc
                            .replace('{amount}', formatEur(Math.abs(data.scarto), locale))
                            .replace('{perc}', String(data.scostamentoPerc ?? 0))
                        : data.verso === 'underestimate'
                          ? t.nettoRealeConfig.underestimatedDesc
                              .replace('{amount}', formatEur(Math.abs(data.scarto), locale))
                              .replace('{perc}', String(data.scostamentoPerc ?? 0))
                          : t.nettoRealeConfig.exactDesc}
                    </span>
                    {data.scostamentoPerc !== null && (
                      <span className="ml-2 font-mono font-bold text-text tabular-nums shrink-0">
                        {data.scostamentoPerc.toFixed(2)}%
                      </span>
                    )}
                  </div>

                  {/* Azioni: Modifica, Elimina, Storico */}
                  <div className="flex items-center justify-between pt-1">
                    {confirmDelete ? (
                      <div className="inline-flex items-center gap-1.5 bg-error/10 border border-error/30 rounded-lg px-2 py-0.5">
                        <span className="text-[10px] font-bold text-error">Eliminare?</span>
                        <button
                          type="button"
                          onClick={handleDelete}
                          disabled={saving}
                          className="text-[10px] font-bold text-error underline hover:opacity-80 cursor-pointer"
                        >
                          Sì
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDelete(false)}
                          className="text-[10px] text-text-muted hover:text-text cursor-pointer"
                        >
                          No
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={startEditing}
                          className="text-[11px] font-medium text-text-muted hover:text-text flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          <Pencil size={11} />
                          <span>{t.nettoRealeConfig.edit}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDelete(true)}
                          className="text-[11px] font-medium text-text-muted hover:text-error flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          <Trash2 size={11} />
                          <span>{t.nettoRealeConfig.delete}</span>
                        </button>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => setHistoryModalOpen(true)}
                      className="text-[11px] font-medium text-primary hover:text-primary-hover flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <span>{t.nettoRealeConfig.historyCta}</span>
                      <ChevronRight size={12} />
                    </button>
                  </div>
                </div>
              ) : (
                /* ── Stato Non Inserito ── */
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
                      {t.nettoRealeConfig.title}
                    </span>
                    <span className="inline-flex items-center rounded-md border border-border bg-surface-raised px-2 py-0.5 text-[10px] font-medium text-text-muted">
                      {t.nettoRealeConfig.toVerify}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <p className="text-xs font-medium text-text">{t.nettoRealeConfig.notYetInserted}</p>
                      <p className="text-[11px] text-text-muted opacity-80">{t.nettoRealeConfig.enterAmountPrompt}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={startEditing}
                      className="h-7 text-xs gap-1 border-primary/30 text-primary hover:bg-primary/10"
                    >
                      <Plus size={13} />
                      <span>{t.nettoRealeConfig.compareCta}</span>
                    </Button>

                    <button
                      type="button"
                      onClick={() => setHistoryModalOpen(true)}
                      className="text-[11px] font-medium text-text-muted hover:text-primary flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <span>{t.nettoRealeConfig.historyCta}</span>
                      <ChevronRight size={12} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={toggleDetails}
            className="flex items-center gap-1 text-xs font-medium text-primary hover:text-primary-hover"
          >
            {detailsOpen ? t.stima.hideDetails : t.stima.showDetails}
            {detailsOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>

          {detailsOpen && (
            <>
              {/* ── Parametri di calcolo — grigio muted, NON entrano nella somma sopra ── */}
              <div className="space-y-1 border-t border-border pt-3">
                <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">
                  {t.stima.calcParams}
                </p>
                {data.stima.stornoCig > 0 && (
                  <DetailRow
                    label={t.stima.stornoCig}
                    value={`− ${formatEur(data.stima.stornoCig, locale)}`}
                  />
                )}
                <DetailRow
                  label={t.stima.imponibile}
                  value={formatEur(data.stima.imponibileIrpefMensile, locale)}
                />
                {data.stima.cometaDeducibile > 0 && (
                  <DetailRow
                    label={t.stima.cometaDeducibile}
                    value={`− ${formatEur(data.stima.cometaDeducibile, locale)}`}
                  />
                )}
                <div className="flex items-baseline justify-between gap-2 text-xs">
                  <span className="flex items-center gap-1 text-text-muted">
                    {t.stima.ralLordo}
                    <InfoNote text={t.stima.ralLordoInfo} />
                  </span>
                  <span className="tabular-nums text-text-muted">{formatEur(data.stima.ralLordo, locale)}</span>
                </div>
                <p className="text-[11px] text-text-subtle">{t.stima.ralLordoNote}</p>
                <DetailRow
                  label={t.stima.imponibileAnnuo}
                  value={formatEur(data.stima.imponibileIrpefAnnuo, locale)}
                />
                <DetailRow
                  label={t.stima.detrazioniArt13}
                  value={formatEur(data.stima.detrazioniArt13, locale)}
                />
                {data.stima.beneficioCuneo > 0 && (
                  <DetailRow
                    label={t.stima.beneficioCuneo}
                    value={formatEur(data.stima.beneficioCuneo, locale)}
                  />
                )}
              </div>

              {/* ── Rateo 13ª Mensilità ── */}
              {data.stima.ralLordo > 0 && (
                <div className="rounded-lg border border-border bg-surface/50 p-2.5 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-text">Maturazione 13ª Mensilità</span>
                    <span className="font-bold text-primary tabular-nums">
                      {Math.round((parseInt(month.slice(5, 7), 10) / 12) * 100)}% ({parseInt(month.slice(5, 7), 10)}/12)
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-border/40">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-300"
                      style={{ width: `${Math.round((parseInt(month.slice(5, 7), 10) / 12) * 100)}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-text-muted pt-0.5">
                    <span>Lordo maturato progressivo:</span>
                    <span className="font-semibold text-text tabular-nums">
                      {formatEur((data.stima.ralLordo / 13) * (parseInt(month.slice(5, 7), 10) / 12), locale)}
                    </span>
                  </div>
                </div>
              )}

              {/* ── Warnings ───────────────────────────────────────────────── */}
              {data.stimaWarnings.length > 0 && (
                <div className="space-y-2">
                  {data.stimaWarnings.map((code) => (
                    <WarningItem key={code} summary={warningSummary(code, t)} message={warningMessage(code, t)} />
                  ))}
                </div>
              )}

              {/* ── Conguaglio projection (Fase 3 Passo 2) ────────────────── */}
              <ConguaglioSection t={t} />
            </>
          )}
        </>
      )}

      {/* ── Permanent disclaimer ────────────────────────────────────────── */}
      {!isLoading && data?.stima !== null && (
        <div className="flex gap-1.5 border-t border-border pt-3 text-xs text-text-muted">
          <Info size={12} className="mt-0.5 shrink-0 opacity-60" />
          <span>{t.stima.disclaimer}</span>
        </div>
      )}

      {/* ── Storico Annuale Modal ── */}
      <StoricoBustePagaModal
        isOpen={historyModalOpen}
        onClose={() => setHistoryModalOpen(false)}
        initialYear={parseInt(month.slice(0, 4), 10) || new Date().getFullYear()}
        t={t}
        onSelectMonth={onSelectMonth}
      />
    </div>
  )
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function ChainRow({
  label,
  value,
  dividerAbove = false,
  prominent = false,
  valueClass,
}: {
  label: string
  value: string
  dividerAbove?: boolean
  prominent?: boolean
  valueClass?: string
}) {
  if (prominent) {
    return (
      <div className="mt-2 rounded-xl border border-primary/25 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-3 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-bold text-text">
            {label}
          </span>
          <span className="tabular-nums text-xl font-extrabold text-primary">
            {value}
          </span>
        </div>
      </div>
    )
  }

  return (
    <>
      {dividerAbove && <div className="my-1 border-t border-border" />}
      <div className="flex items-baseline justify-between gap-2 text-xs sm:text-sm">
        <span className="text-text-muted">
          {label}
        </span>
        <span
          className={[
            'tabular-nums font-medium',
            valueClass ?? 'text-text',
          ].join(' ')}
        >
          {value}
        </span>
      </div>
    </>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2 text-xs">
      <span className="text-text-muted">{label}</span>
      <span className="tabular-nums text-text-muted">{value}</span>
    </div>
  )
}

function warningMessage(code: StimaWarningCode, t: WorklogTranslations): string {
  switch (code) {
    case 'no_addizionali': return t.stima.warn_no_addizionali
    case 'annualizzazione': return t.stima.warn_annualizzazione
    case 'mese_parziale': return t.stima.warn_mese_parziale
    case 'malattia_stimata': return t.stima.warn_malattia_stimata
    case 'detrazioni_stimate_ral_teorico': return t.stima.warn_detrazioni_stimate_ral_teorico
    case 'quadratura_incongruente': return t.stima.warn_quadratura_incongruente
    case 'integrazione_solidarieta_stimata': return t.stima.warn_integrazione_solidarieta_stimata
    case 'trattenuta_sindacale_non_disponibile': return t.stima.warn_trattenuta_sindacale_non_disponibile
    case 'cometa_non_disponibile': return t.stima.warn_cometa_non_disponibile
  }
}

/** Riassunto breve per il collassato — solo i 3 warning con testo lungo ne hanno uno dedicato,
 * gli altri usano il testo pieno anche come riassunto (nessuna differenza collassa/espandi). */
function warningSummary(code: StimaWarningCode, t: WorklogTranslations): string {
  switch (code) {
    case 'integrazione_solidarieta_stimata': return t.stima.warn_summary_integrazione_solidarieta_stimata
    case 'detrazioni_stimate_ral_teorico': return t.stima.warn_summary_detrazioni_stimate_ral_teorico
    case 'mese_parziale': return t.stima.warn_summary_mese_parziale
    default: return warningMessage(code, t)
  }
}
