'use client'

import { useEffect, useState } from 'react'
import { AlertTriangle, ChevronDown, ChevronUp, Info, TrendingDown } from 'lucide-react'
import { useStima } from '../services/worklog-api'
import type { StimaBlocker, StimaWarningCode } from '../services/worklog-api'
import type { WorklogTranslations } from '../i18n'
import { blockerMessage } from '../lib/blockers'
import { ConguaglioSection } from './conguaglio-section'

interface Props {
  month: string // 'YYYY-MM'
  t: WorklogTranslations
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

export function StimaCard({ month, t }: Props) {
  const { data, isLoading } = useStima(month)
  const locale = t.locale

  // Preferenza di sola UI (no DB) — quale livello di dettaglio l'utente ha scelto l'ultima volta.
  const [detailsOpen, setDetailsOpen] = useState(false)
  useEffect(() => {
    setDetailsOpen(localStorage.getItem(DETAILS_STORAGE_KEY) === 'true')
  }, [])

  function toggleDetails() {
    setDetailsOpen((v) => {
      const next = !v
      localStorage.setItem(DETAILS_STORAGE_KEY, String(next))
      return next
    })
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
            {data.nettoReale !== null && data.scarto !== null && (
              <ChainRow
                label={t.stima.nettoReale}
                value={`${formatEur(data.nettoReale, locale)} · ${t.stima.scarto} ${formatEur(data.scarto, locale)}`}
                valueClass="text-text-muted"
              />
            )}
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
  return (
    <>
      {dividerAbove && <div className="my-1 border-t border-border" />}
      <div className="flex items-baseline justify-between gap-2 text-sm">
        <span className={prominent ? 'font-semibold text-text' : 'text-text-muted'}>
          {label}
        </span>
        <span
          className={[
            'tabular-nums',
            prominent ? 'text-base font-bold text-text' : (valueClass ?? 'font-medium text-text'),
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
