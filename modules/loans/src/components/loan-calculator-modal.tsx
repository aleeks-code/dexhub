'use client'

import React, { useState, useMemo } from 'react'
import {
  Calculator,
  X,
  PieChart,
  Calendar,
  Sparkles,
  TrendingDown,
  Percent,
} from 'lucide-react'
import { Button, cn } from '@dexhub/ui'
import {
  calculateFrenchMonthlyInstallment,
  generateAmortizationSchedule,
  round,
} from '../engine/amortization'

interface LoanCalculatorModalProps {
  isOpen: boolean
  onClose: () => void
}

export function LoanCalculatorModal({ isOpen, onClose }: LoanCalculatorModalProps) {
  const [amountStr, setAmountStr] = useState('15000')
  const [tanStr, setTanStr] = useState('5.9')
  const [monthsStr, setMonthsStr] = useState('60')
  const [feeStr, setFeeStr] = useState('1.50')

  const amount = parseFloat(amountStr) || 0
  const tan = parseFloat(tanStr) || 0
  const months = parseInt(monthsStr, 10) || 0
  const fee = parseFloat(feeStr) || 0

  const monthlyInstallment = useMemo(() => {
    return calculateFrenchMonthlyInstallment(amount, tan, months)
  }, [amount, tan, months])

  const totalPayment = useMemo(() => {
    return round((monthlyInstallment + fee) * months)
  }, [monthlyInstallment, fee, months])

  const totalInterest = useMemo(() => {
    return Math.max(0, round(monthlyInstallment * months - amount))
  }, [monthlyInstallment, months, amount])

  const totalFees = useMemo(() => {
    return round(fee * months)
  }, [fee, months])

  if (!isOpen) return null

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
              <Calculator className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-text">Calcolatore Ammortamento Francese</h2>
              <p className="text-xs text-text-subtle">
                Simula rata, interessi e costo complessivo di qualsiasi finanziamento
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
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-semibold text-text">Importo Richiesto (€)</label>
              <input
                type="number"
                step="500"
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
                className="w-full rounded-xl border border-border bg-surface-subtle/50 px-3 py-2 text-xs font-bold text-text focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-text">Durata (Mesi)</label>
              <input
                type="number"
                step="12"
                min="1"
                value={monthsStr}
                onChange={(e) => setMonthsStr(e.target.value)}
                className="w-full rounded-xl border border-border bg-surface-subtle/50 px-3 py-2 text-xs font-bold text-text focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-text">Tasso Nominale TAN (%)</label>
              <input
                type="number"
                step="0.1"
                min="0"
                value={tanStr}
                onChange={(e) => setTanStr(e.target.value)}
                className="w-full rounded-xl border border-border bg-surface-subtle/50 px-3 py-2 text-xs text-text focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-text">Spese Incasso Rata (€)</label>
              <input
                type="number"
                step="0.5"
                min="0"
                value={feeStr}
                onChange={(e) => setFeeStr(e.target.value)}
                className="w-full rounded-xl border border-border bg-surface-subtle/50 px-3 py-2 text-xs text-text focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Result Card */}
          <div className="rounded-2xl bg-surface-subtle/70 border border-border/80 p-4 space-y-4">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div>
                <span className="text-[10px] uppercase font-semibold text-text-muted">
                  Rata Mensile Stimata
                </span>
                <p className="text-2xl font-black text-emerald-500">
                  {(monthlyInstallment + fee).toFixed(2)} €
                  <span className="text-xs font-normal text-text-muted"> / mese</span>
                </p>
                {fee > 0 && (
                  <span className="text-[10px] text-text-subtle">
                    (Quota rata: {monthlyInstallment.toFixed(2)} € + Spese: {fee.toFixed(2)} €)
                  </span>
                )}
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase font-semibold text-text-muted">
                  Costo Totale Finanziamento
                </span>
                <p className="text-lg font-bold text-text">{totalPayment.toLocaleString('it-IT')} €</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-xl bg-surface p-2.5 border border-border/40">
                <span className="text-[9px] uppercase font-semibold text-text-muted">Capitale Erogato</span>
                <p className="text-xs font-bold text-text">{amount.toLocaleString('it-IT')} €</p>
              </div>
              <div className="rounded-xl bg-surface p-2.5 border border-border/40">
                <span className="text-[9px] uppercase font-semibold text-text-muted">Interessi Totali</span>
                <p className="text-xs font-bold text-text">{totalInterest.toLocaleString('it-IT')} €</p>
              </div>
              <div className="rounded-xl bg-surface p-2.5 border border-border/40">
                <span className="text-[9px] uppercase font-semibold text-text-muted">Spese Incasso Tot.</span>
                <p className="text-xs font-bold text-text-muted">{totalFees.toLocaleString('it-IT')} €</p>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button size="sm" onClick={onClose} className="text-xs">
              Chiudi
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
