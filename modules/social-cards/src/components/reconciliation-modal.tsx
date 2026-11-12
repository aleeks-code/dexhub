'use client'

import React, { useState, useEffect } from 'react'
import { X, Landmark, ShieldCheck, AlertCircle } from 'lucide-react'
import { cn } from '@dexhub/ui'
import type { CardBalanceSummary } from '../types'

interface Props {
  isOpen: boolean
  onClose: () => void
  summary: CardBalanceSummary
  onSave: (data: {
    atmBalance: number
    reconciledAt: string
    notes?: string
  }) => Promise<void>
}

function formatEuro(val: number): string {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(val)
}

export function ReconciliationModal({ isOpen, onClose, summary, onSave }: Props) {
  const [atmBalanceStr, setAtmBalanceStr] = useState('')
  const [reconciledDate, setReconciledDate] = useState('')
  const [reconciledTime, setReconciledTime] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen) return
    const now = new Date()
    setAtmBalanceStr('')
    setReconciledDate(now.toISOString().slice(0, 10))
    setReconciledTime(now.toTimeString().slice(0, 5))
    setNotes('')
    setError(null)
  }, [isOpen])

  if (!isOpen) return null

  const numAtm = parseFloat(atmBalanceStr.replace(',', '.'))
  const hasValidAtm = !isNaN(numAtm) && numAtm >= 0
  const delta = hasValidAtm ? Math.round((numAtm - summary.estimatedBalance) * 100) / 100 : 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!hasValidAtm) {
      setError('Inserisci il saldo rilevato allo sportello Postamat.')
      return
    }

    let reconciledAtIso: string
    try {
      const combined = new Date(`${reconciledDate}T${reconciledTime || '12:00'}:00`)
      reconciledAtIso = combined.toISOString()
    } catch {
      reconciledAtIso = new Date().toISOString()
    }

    try {
      setSubmitting(true)
      await onSave({
        atmBalance: numAtm,
        reconciledAt: reconciledAtIso,
        notes: notes.trim() || undefined,
      })
      onClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Errore durante il salvataggio.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 overflow-y-auto">
      <div className="relative w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-2xl animate-in fade-in-50 zoom-in-95 my-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/60 pb-3">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-sky-500/15 p-1.5 text-sky-400">
              <Landmark className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-text">
                Riconciliazione Postamat
              </h3>
              <p className="text-[11px] text-text-subtle">
                Punto di ancoraggio saldo verificato all&apos;ATM
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-text-subtle hover:bg-surface-raised transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mt-3 rounded-lg bg-rose-500/15 border border-rose-500/30 p-2.5 text-xs text-rose-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Informazione Metodologia */}
          <div className="rounded-xl border border-border/80 bg-surface-raised p-3 text-xs text-text-subtle leading-relaxed">
            <div className="flex items-start gap-2">
              <ShieldCheck className="h-4 w-4 text-sky-400 shrink-0 mt-0.5" />
              <span>
                Inserisci il saldo visualizzato sullo scontrino o schermo del Postamat. Questo valore diventerà il <strong>nuovo ancoraggio assoluto</strong> da cui verranno scalate le spese successive.
              </span>
            </div>
          </div>

          {/* Saldo Attuale Stimato vs Saldo ATM */}
          <div className="rounded-xl border border-border bg-surface-raised p-3.5 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-text-subtle">Stima attuale DexHub:</span>
              <span className="font-mono font-bold text-text">
                {formatEuro(summary.estimatedBalance)}
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-text mb-1">
                Saldo Effettivo Rilevato al Postamat (€)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={atmBalanceStr}
                onChange={(e) => setAtmBalanceStr(e.target.value)}
                placeholder="es. 435.00"
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-base font-mono font-bold text-emerald-400 placeholder:text-zinc-600 focus:outline-hidden focus:border-emerald-500"
                required
                autoFocus
              />
            </div>

            {hasValidAtm && (
              <div className="pt-2 border-t border-border/60 flex items-center justify-between text-xs">
                <span className="text-text-subtle">Differenza riscontrata:</span>
                <span
                  className={cn(
                    'font-mono font-bold',
                    delta === 0
                      ? 'text-emerald-400'
                      : delta > 0
                      ? 'text-sky-400'
                      : 'text-amber-400'
                  )}
                >
                  {delta === 0 ? '✓ Pareggio perfetto (0,00 €)' : `${delta > 0 ? '+' : ''}${formatEuro(delta)}`}
                </span>
              </div>
            )}
          </div>

          {/* Data e Ora Controllo */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium text-text-subtle mb-1">
                Data Verifica
              </label>
              <input
                type="date"
                value={reconciledDate}
                onChange={(e) => setReconciledDate(e.target.value)}
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-xs text-text focus:outline-hidden"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-subtle mb-1">
                Ora Verifica
              </label>
              <input
                type="time"
                value={reconciledTime}
                onChange={(e) => setReconciledTime(e.target.value)}
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-xs text-text focus:outline-hidden"
              />
            </div>
          </div>

          {/* Note */}
          <div>
            <label className="block text-xs font-medium text-text-subtle mb-1">
              Luogo / Note (Opzionale)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="es. ATM Postamat Ufficio Postale"
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-xs text-text placeholder:text-zinc-600 focus:outline-hidden"
            />
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-border px-3.5 py-2 text-xs text-text-subtle hover:bg-surface-raised transition-colors cursor-pointer"
            >
              Annulla
            </button>
            <button
              type="submit"
              disabled={submitting || !hasValidAtm}
              className="rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-semibold px-4 py-2 text-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              {submitting ? 'Ancoraggio in corso...' : 'Fissa Saldo Postamat'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
