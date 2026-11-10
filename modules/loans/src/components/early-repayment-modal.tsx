'use client'

import React, { useState, useMemo } from 'react'
import {
  TrendingDown,
  Clock,
  Sparkles,
  CheckCircle2,
  X,
  AlertCircle,
  PiggyBank,
  ArrowRight,
  PlusCircle,
} from 'lucide-react'
import { Button, cn } from '@dexhub/ui'
import type { Loan, LoanStatistics } from '../types'
import { simulateEarlyRepayment, calculateLoanStatistics, getTodayIso } from '../engine/amortization'

interface EarlyRepaymentModalProps {
  isOpen: boolean
  onClose: () => void
  loan: Loan
  onApplyRepayment: (
    loanId: string,
    extra: {
      date: string
      amount: number
      strategy: 'reduce_term' | 'reduce_installment'
      note?: string
    },
  ) => Promise<void>
}

export function EarlyRepaymentModal({
  isOpen,
  onClose,
  loan,
  onApplyRepayment,
}: EarlyRepaymentModalProps) {
  const [extraAmountStr, setExtraAmountStr] = useState<string>('1000')
  const [strategy, setStrategy] = useState<'reduce_term' | 'reduce_installment'>('reduce_term')
  const [paymentDate, setPaymentDate] = useState<string>(getTodayIso())
  const [note, setNote] = useState<string>('')
  const [isApplying, setIsApplying] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const stats: LoanStatistics = useMemo(() => {
    return calculateLoanStatistics(loan)
  }, [loan])

  const extraAmount = parseFloat(extraAmountStr) || 0

  const simulation = useMemo(() => {
    if (extraAmount <= 0) return null
    return simulateEarlyRepayment(loan, extraAmount, strategy)
  }, [loan, extraAmount, strategy])

  if (!isOpen) return null

  const handleApply = async () => {
    if (extraAmount <= 0) {
      setErrorMsg('Inserisci un importo valido per il rimborso.')
      return
    }
    if (extraAmount > stats.residualDebt) {
      setErrorMsg('L’importo inserito supera il debito residuo attuale.')
      return
    }

    try {
      setIsApplying(true)
      setErrorMsg(null)
      await onApplyRepayment(loan.id, {
        amount: extraAmount,
        strategy,
        date: paymentDate,
        note: note.trim() || undefined,
      })
      onClose()
    } catch (err) {
      console.error(err)
      setErrorMsg('Errore nel registrare il rimborso.')
    } finally {
      setIsApplying(false)
    }
  }

  const quickAmounts = [500, 1000, 2000, 5000]

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="relative w-full max-w-xl rounded-2xl bg-surface border border-border/70 shadow-2xl overflow-hidden my-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/60 px-6 py-4 bg-surface-subtle/40">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-500">
              <PiggyBank className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-text">
                Simulatore Estinzione / Rimborso Straordinario
              </h2>
              <p className="text-xs text-text-subtle">
                Scopri quanti interessi e mesi risparmi versando una quota extra
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-text-muted hover:bg-surface-subtle hover:text-text transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {errorMsg && (
            <div className="flex items-center gap-2 rounded-xl bg-red-500/10 border border-red-500/20 px-3.5 py-2 text-xs text-red-500">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Current snapshot banner */}
          <div className="grid grid-cols-3 gap-2 rounded-xl bg-surface-subtle/50 p-3 border border-border/40 text-center">
            <div>
              <span className="text-[10px] uppercase font-semibold text-text-muted">Debito Residuo</span>
              <p className="text-xs font-bold text-text">
                {stats.residualDebt.toLocaleString('it-IT', { minimumFractionDigits: 2 })} €
              </p>
            </div>
            <div>
              <span className="text-[10px] uppercase font-semibold text-text-muted">Rata Attuale</span>
              <p className="text-xs font-bold text-text">
                {loan.monthlyInstallment.toFixed(2)} €
              </p>
            </div>
            <div>
              <span className="text-[10px] uppercase font-semibold text-text-muted">Mesi Rimanenti</span>
              <p className="text-xs font-bold text-text">{stats.installmentsRemainingCount} mesi</p>
            </div>
          </div>

          {/* Amount input + Quick Buttons */}
          <div>
            <label className="mb-1 block text-xs font-semibold text-text">
              Importo Rimborso Straordinario (€)
            </label>
            <div className="relative">
              <input
                type="number"
                step="50"
                min="1"
                max={stats.residualDebt}
                value={extraAmountStr}
                onChange={(e) => setExtraAmountStr(e.target.value)}
                placeholder="es. 1000"
                className="w-full rounded-xl border border-border bg-surface-subtle/50 px-3 py-2 text-sm font-bold text-text focus:border-emerald-500 focus:outline-none"
              />
              <span className="absolute right-3 top-2.5 text-xs text-text-muted">EUR</span>
            </div>

            <div className="mt-2 flex flex-wrap gap-1.5">
              {quickAmounts.map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setExtraAmountStr(amt.toString())}
                  className={cn(
                    'rounded-lg px-2.5 py-1 text-xs font-medium transition-colors border',
                    extraAmount === amt
                      ? 'bg-emerald-500 text-white border-emerald-500'
                      : 'bg-surface-subtle border-border/60 text-text-muted hover:text-text hover:border-emerald-500/50',
                  )}
                >
                  +{amt.toLocaleString('it-IT')} €
                </button>
              ))}
              <button
                type="button"
                onClick={() => setExtraAmountStr(stats.residualDebt.toString())}
                className={cn(
                  'rounded-lg px-2.5 py-1 text-xs font-medium transition-colors border',
                  extraAmount === stats.residualDebt
                    ? 'bg-emerald-500 text-white border-emerald-500'
                    : 'bg-surface-subtle border-border/60 text-emerald-500 hover:border-emerald-500',
                )}
              >
                Salda Tutto ({stats.residualDebt.toFixed(0)} €)
              </button>
            </div>
          </div>

          {/* Strategy Selector */}
          <div>
            <label className="mb-2 block text-xs font-semibold text-text">
              Strategia di Rimborso
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setStrategy('reduce_term')}
                className={cn(
                  'flex flex-col items-start p-3 rounded-xl border text-left transition-all',
                  strategy === 'reduce_term'
                    ? 'border-emerald-500 bg-emerald-500/10 ring-1 ring-emerald-500'
                    : 'border-border/60 bg-surface-subtle/40 hover:border-border',
                )}
              >
                <div className="flex items-center gap-1.5 text-xs font-bold text-text">
                  <Clock className="h-4 w-4 text-emerald-500" />
                  Riduci la Durata
                </div>
                <p className="mt-1 text-[11px] text-text-muted leading-relaxed">
                  Mantieni la stessa rata mensile, estingui il debito molto prima e azzera gli interessi
                  futuri.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setStrategy('reduce_installment')}
                className={cn(
                  'flex flex-col items-start p-3 rounded-xl border text-left transition-all',
                  strategy === 'reduce_installment'
                    ? 'border-emerald-500 bg-emerald-500/10 ring-1 ring-emerald-500'
                    : 'border-border/60 bg-surface-subtle/40 hover:border-border',
                )}
              >
                <div className="flex items-center gap-1.5 text-xs font-bold text-text">
                  <TrendingDown className="h-4 w-4 text-emerald-500" />
                  Riduci la Rata
                </div>
                <p className="mt-1 text-[11px] text-text-muted leading-relaxed">
                  Mantieni la data di scadenza invariata e abbassa l’esborso mensile per liberare liquidità.
                </p>
              </button>
            </div>
          </div>

          {/* Simulation Results Display */}
          {simulation && (
            <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/30 p-4 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                <Sparkles className="h-4 w-4" />
                Risultato della Simulazione
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Interest Saved */}
                <div className="rounded-xl bg-surface/80 p-3 border border-emerald-500/20">
                  <span className="text-[10px] uppercase font-semibold text-text-muted">
                    Risparmio Interessi Totale
                  </span>
                  <p className="text-lg font-extrabold text-emerald-500">
                    +{simulation.interestSaved.toLocaleString('it-IT', { minimumFractionDigits: 2 })} €
                  </p>
                  <span className="text-[10px] text-text-subtle">
                    Denaro che non pagherai alla banca!
                  </span>
                </div>

                {/* Key Gain: Months or Installment reduction */}
                <div className="rounded-xl bg-surface/80 p-3 border border-emerald-500/20">
                  {strategy === 'reduce_term' ? (
                    <>
                      <span className="text-[10px] uppercase font-semibold text-text-muted">
                        Mesi Guadagnati
                      </span>
                      <p className="text-lg font-extrabold text-text">
                        {simulation.monthsSaved} mesi prima
                      </p>
                      <span className="text-[10px] text-text-subtle">
                        Da {simulation.originalRemainingMonths} a {simulation.newRemainingMonths} rate residue
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="text-[10px] uppercase font-semibold text-text-muted">
                        Nuova Rata Mensile
                      </span>
                      <p className="text-lg font-extrabold text-text">
                        {simulation.newMonthlyInstallment.toFixed(2)} €
                      </p>
                      <span className="text-[10px] text-emerald-500 font-medium">
                        Risparmi {simulation.monthlySaving.toFixed(2)} € ogni mese!
                      </span>
                    </>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-text-subtle pt-1 border-t border-emerald-500/20">
                <span>Nuovo debito residuo dopo il versamento:</span>
                <span className="font-bold text-text">
                  {simulation.newResidualDebt.toLocaleString('it-IT', { minimumFractionDigits: 2 })} €
                </span>
              </div>
            </div>
          )}

          {/* Form details to record as real payment */}
          <div className="border-t border-border/60 pt-3 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-text">Data Versamento</label>
                <input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="w-full rounded-xl border border-border bg-surface-subtle/50 px-3 py-1.5 text-xs text-text focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-text">
                  Causale / Nota (Opzionale)
                </label>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="es. Quattordicesima, Premio aziendale..."
                  className="w-full rounded-xl border border-border bg-surface-subtle/50 px-3 py-1.5 text-xs text-text focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Footer buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/60">
            <Button type="button" variant="ghost" size="sm" onClick={onClose} className="text-xs">
              Chiudi
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={isApplying || extraAmount <= 0}
              onClick={handleApply}
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs gap-1.5"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              Registra Rimborso Reale
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
