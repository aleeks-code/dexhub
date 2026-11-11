'use client'

import { useState } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  TrendingDown,
  TrendingUp,
  Percent,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Pencil,
  Trash2,
  X,
  Check,
  Calculator,
} from 'lucide-react'
import { Button } from '@dexhub/ui'
import {
  useNettoRealeHistory,
  useUpdateNettoReale,
  useDeleteNettoReale,
  type NettoRealeHistoryItem,
} from '../services/worklog-api'
import type { WorklogTranslations } from '../i18n'

function formatEur(amount: number | null, locale = 'it-IT'): string {
  if (amount === null || isNaN(amount)) return '—'
  return new Intl.NumberFormat(locale, { style: 'currency', currency: 'EUR' }).format(amount)
}

function formatMonthLabel(yyyymm: string, locale: string): string {
  const [y, m] = yyyymm.split('-').map(Number)
  if (!y || !m) return yyyymm
  return new Date(y, m - 1, 1).toLocaleDateString(locale, { month: 'long' })
}

interface Props {
  initialYear?: number
  t: WorklogTranslations
  onSelectMonth?: (month: string) => void
}

export function StoricoBustePagaView({ initialYear, t, onSelectMonth }: Props) {
  const currentYear = new Date().getFullYear()
  const [year, setYear] = useState<number>(initialYear ?? currentYear)
  const { data, isLoading } = useNettoRealeHistory(year)
  const updateNetto = useUpdateNettoReale()
  const deleteNetto = useDeleteNettoReale()

  // Stato editing inline su una riga specifica
  const [editingMese, setEditingMese] = useState<string | null>(null)
  const [editValue, setEditValue] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Stato conferma eliminazione
  const [confirmDeleteMese, setConfirmDeleteMese] = useState<string | null>(null)

  function startEdit(item: NettoRealeHistoryItem) {
    setEditingMese(item.mese)
    setEditValue(item.nettoReale != null ? String(item.nettoReale) : '')
    setConfirmDeleteMese(null)
  }

  function cancelEdit() {
    setEditingMese(null)
    setEditValue('')
  }

  async function handleSaveEdit(mese: string) {
    const val = parseFloat(editValue)
    if (isNaN(val) || val < 0) return
    setIsSubmitting(true)
    try {
      await updateNetto.mutateAsync({ mese, netto: val })
      setEditingMese(null)
      setEditValue('')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleDelete(mese: string) {
    setIsSubmitting(true)
    try {
      await deleteNetto.mutateAsync(mese)
      setConfirmDeleteMese(null)
      if (editingMese === mese) {
        setEditingMese(null)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const metriche = data?.metriche
  const mesi = data?.mesi ?? []

  return (
    <div className="space-y-5">
      {/* ── Toolbar Anno & Navigazione ── */}
      <div className="flex items-center justify-between border-b border-border pb-3">
        <div className="flex items-center gap-2">
          <Calculator className="h-5 w-5 text-primary" />
          <h2 className="text-base font-semibold text-text">{t.nettoRealeConfig.historyTitle}</h2>
        </div>
        <div className="flex items-center gap-1.5 rounded-xl border border-border bg-surface px-2 py-1">
          <button
            type="button"
            onClick={() => setYear((y) => y - 1)}
            className="rounded p-1 text-text-muted hover:bg-surface-raised hover:text-text cursor-pointer"
            aria-label="Anno precedente"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="px-2 text-sm font-bold text-text tabular-nums">{year}</span>
          <button
            type="button"
            onClick={() => setYear((y) => y + 1)}
            className="rounded p-1 text-text-muted hover:bg-surface-raised hover:text-text cursor-pointer"
            aria-label="Anno successivo"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* ── KPI Cards: MAE, MAPE, Bias, Mesi ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* 1. MAE */}
        <div className="rounded-xl border border-border bg-surface p-3 space-y-1">
          <div className="flex items-center justify-between text-text-muted">
            <span className="text-[11px] font-medium uppercase tracking-wider">MAE</span>
            <Calculator size={13} className="text-text-muted opacity-70" />
          </div>
          <p className="text-lg font-bold text-text tabular-nums">
            {metriche?.mae !== null && metriche?.mae !== undefined ? `${metriche.mae.toFixed(2)} €` : '—'}
          </p>
          <p className="text-[10px] text-text-muted truncate">{t.nettoRealeConfig.mae}</p>
        </div>

        {/* 2. MAPE */}
        <div className="rounded-xl border border-border bg-surface p-3 space-y-1">
          <div className="flex items-center justify-between text-text-muted">
            <span className="text-[11px] font-medium uppercase tracking-wider">MAPE</span>
            <Percent size={13} className="text-text-muted opacity-70" />
          </div>
          <p className="text-lg font-bold text-text tabular-nums">
            {metriche?.mape !== null && metriche?.mape !== undefined ? `${metriche.mape.toFixed(2)}%` : '—'}
          </p>
          <p className="text-[10px] text-text-muted truncate">{t.nettoRealeConfig.mape}</p>
        </div>

        {/* 3. Bias medio */}
        <div className="rounded-xl border border-border bg-surface p-3 space-y-1">
          <div className="flex items-center justify-between text-text-muted">
            <span className="text-[11px] font-medium uppercase tracking-wider">{t.nettoRealeConfig.bias}</span>
            {metriche?.bias !== null && metriche?.bias !== undefined && metriche.bias > 0 ? (
              <TrendingUp size={13} className="text-warning" />
            ) : metriche?.bias !== null && metriche?.bias !== undefined && metriche.bias < 0 ? (
              <TrendingDown size={13} className="text-primary" />
            ) : (
              <CheckCircle2 size={13} className="text-emerald-400" />
            )}
          </div>
          <p className="text-lg font-bold text-text tabular-nums">
            {metriche?.bias !== null && metriche?.bias !== undefined
              ? `${metriche.bias > 0 ? '+' : ''}${metriche.bias.toFixed(2)} €`
              : '—'}
          </p>
          <p className="text-[10px] text-text-muted truncate">
            {metriche?.bias !== null && metriche?.bias !== undefined
              ? metriche.bias > 0
                ? t.nettoRealeConfig.biasOver.replace('{amount}', `${metriche.bias.toFixed(2)} €`)
                : metriche.bias < 0
                  ? t.nettoRealeConfig.biasUnder.replace('{amount}', `${Math.abs(metriche.bias).toFixed(2)} €`)
                  : t.nettoRealeConfig.biasNeutral
              : t.nettoRealeConfig.bias}
          </p>
        </div>

        {/* 4. Mesi confrontati */}
        <div className="rounded-xl border border-border bg-surface p-3 space-y-1">
          <div className="flex items-center justify-between text-text-muted">
            <span className="text-[11px] font-medium uppercase tracking-wider">{t.nettoRealeConfig.monthsCompared}</span>
            <CheckCircle2 size={13} className="text-text-muted opacity-70" />
          </div>
          <p className="text-lg font-bold text-text tabular-nums">
            {metriche ? `${metriche.mesiValidi} / ${metriche.totaleMesi}` : '—'}
          </p>
          <p className="text-[10px] text-text-muted truncate">{year}</p>
        </div>
      </div>

      {/* ── Tabella 12 Mesi ── */}
      <div className="overflow-x-auto rounded-xl border border-border bg-surface">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-border bg-surface-raised/40 font-semibold text-text-muted">
              <th className="px-3 py-2.5">{t.nettoRealeConfig.period}</th>
              <th className="px-3 py-2.5">{t.nettoRealeConfig.estimate}</th>
              <th className="px-3 py-2.5">{t.nettoRealeConfig.actual}</th>
              <th className="px-3 py-2.5">{t.nettoRealeConfig.gap}</th>
              <th className="px-3 py-2.5">{t.nettoRealeConfig.assessment}</th>
              <th className="px-3 py-2.5 text-right">Azioni</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {mesi.map((item) => {
              const isEditing = editingMese === item.mese
              const isConfirmingDelete = confirmDeleteMese === item.mese
              const monthName = formatMonthLabel(item.mese, t.locale)
              const sc = item.scostamento

              return (
                <tr key={item.mese} className="hover:bg-surface-raised/30 transition-colors">
                  {/* Periodo */}
                  <td className="px-3 py-3 font-medium capitalize text-text">
                    <button
                      type="button"
                      onClick={() => onSelectMonth?.(item.mese)}
                      className={onSelectMonth ? 'hover:text-primary transition-colors cursor-pointer underline-offset-2 hover:underline' : ''}
                      title={`Apri ${item.mese}`}
                    >
                      {monthName}
                    </button>
                  </td>

                  {/* Stima (Snapshot congelato, o assente) */}
                  <td className="px-3 py-3 tabular-nums text-text">
                    {item.stimaDisponibile ? (
                      formatEur(item.nettoStimato, t.locale)
                    ) : (
                      <span className="text-[11px] italic text-text-muted">
                        {t.nettoRealeConfig.historicalUnavailable}
                      </span>
                    )}
                  </td>

                  {/* Netto Reale (oppure input inline) */}
                  <td className="px-3 py-3 tabular-nums font-semibold text-text">
                    {isEditing ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          step={0.01}
                          min={0}
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          placeholder="0.00"
                          className="w-24 rounded border border-border bg-surface-raised px-2 py-1 text-xs text-text focus:border-primary focus:outline-none"
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={() => handleSaveEdit(item.mese)}
                          disabled={isSubmitting || editValue === ''}
                          className="rounded bg-primary p-1 text-bg hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50"
                          title="Salva"
                        >
                          <Check size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={cancelEdit}
                          className="rounded p-1 text-text-muted hover:text-text hover:bg-surface-raised cursor-pointer"
                          title="Annulla"
                        >
                          <X size={13} />
                        </button>
                      </div>
                    ) : item.nettoReale !== null ? (
                      formatEur(item.nettoReale, t.locale)
                    ) : (
                      <span className="text-text-muted">—</span>
                    )}
                  </td>

                  {/* Scarto Delta e Scostamento % */}
                  <td className="px-3 py-3 tabular-nums">
                    {sc ? (
                      <div className="flex flex-col">
                        <span className={`font-semibold ${sc.delta > 0 ? 'text-warning' : sc.delta < 0 ? 'text-primary' : 'text-emerald-400'}`}>
                          {sc.delta > 0 ? `+${formatEur(sc.delta, t.locale)}` : formatEur(sc.delta, t.locale)}
                        </span>
                        <span className="text-[10px] text-text-muted">
                          {sc.scostamentoPerc.toFixed(2)}%
                        </span>
                      </div>
                    ) : (
                      <span className="text-text-muted">—</span>
                    )}
                  </td>

                  {/* Badge Valutazione */}
                  <td className="px-3 py-3">
                    {sc ? (
                      <span
                        className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-semibold border ${
                          sc.valutazione === 'excellent'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                            : sc.valutazione === 'moderate'
                              ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                              : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                        }`}
                      >
                        {sc.valutazione === 'excellent'
                          ? t.nettoRealeConfig.excellent
                          : sc.valutazione === 'moderate'
                            ? t.nettoRealeConfig.moderate
                            : t.nettoRealeConfig.significant}
                      </span>
                    ) : (
                      <span className="text-text-muted text-[11px]">—</span>
                    )}
                  </td>

                  {/* Azioni */}
                  <td className="px-3 py-3 text-right">
                    {isConfirmingDelete ? (
                      <div className="inline-flex items-center gap-1.5 bg-error/10 border border-error/30 rounded-lg px-2 py-1">
                        <span className="text-[10px] font-bold text-error">Eliminare?</span>
                        <button
                          type="button"
                          onClick={() => handleDelete(item.mese)}
                          disabled={isSubmitting}
                          className="text-[10px] font-bold text-error underline hover:opacity-80 cursor-pointer"
                        >
                          Sì
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteMese(null)}
                          className="text-[10px] text-text-muted hover:text-text cursor-pointer"
                        >
                          No
                        </button>
                      </div>
                    ) : !isEditing && (
                      <div className="inline-flex items-center gap-1">
                        {item.nettoReale !== null ? (
                          <>
                            <button
                              type="button"
                              onClick={() => startEdit(item)}
                              className="rounded p-1 text-text-muted hover:text-text hover:bg-surface-raised transition-colors cursor-pointer"
                              title={t.nettoRealeConfig.edit}
                            >
                              <Pencil size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteMese(item.mese)}
                              className="rounded p-1 text-text-muted hover:text-error hover:bg-error/10 transition-colors cursor-pointer"
                              title={t.nettoRealeConfig.delete}
                            >
                              <Trash2 size={13} />
                            </button>
                          </>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => startEdit(item)}
                            className="h-6 px-2 text-[11px] gap-1 text-primary hover:text-primary-hover"
                          >
                            <Plus size={12} />
                            <span>{t.nettoRealeConfig.save}</span>
                          </Button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
