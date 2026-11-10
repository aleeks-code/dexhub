'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import {
  Landmark,
  Plus,
  Upload,
  Calculator,
  Search,
  Filter,
  ArrowRight,
  Calendar,
  AlertCircle,
  Clock,
  Sparkles,
  ChevronRight,
  TrendingDown,
  PieChart,
  Banknote,
  Receipt,
  CheckCircle2,
} from 'lucide-react'
import { Button, cn } from '@dexhub/ui'
import type { Loan, GlobalLoansSummary, LoanType } from '../types'
import { LOAN_TYPE_LABELS } from '../types'
import {
  getLoans,
  createLoan,
  updateLoan,
  deleteLoan,
  addExtraPayment,
  setInstallmentOverride,
} from '../services/loans-service'
import {
  calculateGlobalLoansSummary,
  calculateLoanStatistics,
  getTodayIso,
} from '../engine/amortization'
import { PdfUploadModal } from '../components/pdf-upload-modal'
import { LoanCalculatorModal } from '../components/loan-calculator-modal'
import { LoanDetailSpace } from '../components/loan-detail-space'

export default function LoansPage() {
  const [loans, setLoans] = useState<Loan[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedLoanId, setSelectedLoanId] = useState<string | null>(null)

  // Modals
  const [pdfModalOpen, setPdfModalOpen] = useState(false)
  const [calcModalOpen, setCalcModalOpen] = useState(false)

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<'all' | LoanType>('all')

  const todayIso = useMemo(() => getTodayIso(), [])

  // Load loans on mount
  const refreshLoans = useCallback(async () => {
    try {
      setLoading(true)
      const data = await getLoans()
      setLoans(data)
    } catch (e) {
      console.error('[LoansPage] Error loading loans:', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refreshLoans()
  }, [refreshLoans])

  // Aggregate stats
  const globalSummary: GlobalLoansSummary = useMemo(() => {
    return calculateGlobalLoansSummary(loans, todayIso)
  }, [loans, todayIso])

  const overallProgress = useMemo(() => {
    if (globalSummary.totalInitialFinanced <= 0) return 0
    return Math.min(
      100,
      Math.round((globalSummary.totalPrincipalRepaid / globalSummary.totalInitialFinanced) * 100),
    )
  }, [globalSummary])

  // Selected loan instance
  const selectedLoan = useMemo(() => {
    if (!selectedLoanId) return null
    return loans.find((l) => l.id === selectedLoanId) || null
  }, [loans, selectedLoanId])

  // Filtered loans list
  const filteredLoans = useMemo(() => {
    return loans.filter((loan) => {
      if (typeFilter !== 'all' && loan.type !== typeFilter) return false
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchesName = loan.name.toLowerCase().includes(q)
        const matchesLender = loan.lender.toLowerCase().includes(q)
        const matchesContract = loan.contractNumber?.toLowerCase().includes(q)
        if (!matchesName && !matchesLender && !matchesContract) return false
      }
      return true
    })
  }, [loans, typeFilter, searchQuery])

  // CRUD Handlers
  const handleSaveLoan = async (loanData: Omit<Loan, 'id' | 'createdAt' | 'updatedAt'>) => {
    const created = await createLoan(loanData)
    await refreshLoans()
    // Automatically open the dedicated space for the newly registered loan
    setSelectedLoanId(created.id)
  }

  const handleUpdateLoan = async (id: string, updates: Partial<Loan>) => {
    const updated = await updateLoan(id, updates)
    await refreshLoans()
    return updated
  }

  const handleDeleteLoan = async (id: string) => {
    await deleteLoan(id)
    if (selectedLoanId === id) setSelectedLoanId(null)
    await refreshLoans()
  }

  const handleAddExtraPayment = async (
    loanId: string,
    extra: {
      date: string
      amount: number
      strategy: 'reduce_term' | 'reduce_installment'
      note?: string
    },
  ) => {
    await addExtraPayment(loanId, extra)
    await refreshLoans()
  }

  const handleToggleOverride = async (
    loanId: string,
    installmentNumber: number,
    override: 'paid' | 'unpaid' | undefined,
  ) => {
    await setInstallmentOverride(loanId, installmentNumber, override)
    await refreshLoans()
  }

  // If a loan space is open, render LoanDetailSpace
  if (selectedLoan) {
    return (
      <div className="mx-auto max-w-6xl p-4 sm:p-6 lg:p-8">
        <LoanDetailSpace
          loan={selectedLoan}
          onBack={() => setSelectedLoanId(null)}
          onUpdateLoan={handleUpdateLoan}
          onDeleteLoan={handleDeleteLoan}
          onAddExtraPayment={handleAddExtraPayment}
          onToggleOverride={handleToggleOverride}
        />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6 lg:p-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-500">
              <Landmark className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-text">
                Finanziamenti & Ammortamenti
              </h1>
              <p className="text-xs text-text-subtle mt-0.5">
                Monitoraggio mutui, prestiti, caricamento PDF e domiciliazioni automatiche per data
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="sm"
            onClick={() => setPdfModalOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs gap-1.5 shadow-sm"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Carica Contratto PDF
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setPdfModalOpen(true)}
            className="text-xs gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" />
            Nuovo Manuale
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setCalcModalOpen(true)}
            className="text-xs gap-1.5"
            title="Simula mutui e prestiti al volo"
          >
            <Calculator className="h-3.5 w-3.5" />
            Calcolatore Libero
          </Button>
        </div>
      </div>

      {/* Global Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* 1. Debito Residuo Complessivo */}
        <div className="rounded-2xl bg-surface-subtle/60 p-4 border border-border/60">
          <span className="text-[10px] uppercase font-bold text-text-muted">Debito Residuo Totale</span>
          <p className="text-2xl font-extrabold text-text mt-1 truncate">
            {globalSummary.totalResidualDebt.toLocaleString('it-IT', { minimumFractionDigits: 2 })} €
          </p>
          <div className="mt-2 flex items-center gap-2">
            <div className="h-1.5 flex-1 rounded-full bg-surface-subtle overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all"
                style={{ width: `${overallProgress}%` }}
              />
            </div>
            <span className="text-[10px] font-bold text-emerald-500">{overallProgress}% rimborsato</span>
          </div>
        </div>

        {/* 2. Impegno Totale Mensile */}
        <div className="rounded-2xl bg-surface-subtle/60 p-4 border border-border/60">
          <span className="text-[10px] uppercase font-bold text-text-muted">Impegno Mensile</span>
          <p className="text-2xl font-extrabold text-emerald-500 mt-1 truncate">
            {globalSummary.totalMonthlyCommitment.toLocaleString('it-IT', { minimumFractionDigits: 2 })} €
          </p>
          <span className="text-[11px] text-text-subtle mt-1 block">
            {globalSummary.activeLoansCount} finanziamenti in corso
          </span>
        </div>

        {/* 3. Prossima Uscita / Domiciliazione */}
        <div className="rounded-2xl bg-emerald-500/10 p-4 border border-emerald-500/25">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400">
              Prossimo Addebito SDD
            </span>
            {globalSummary.nextPayment && (
              <span
                className={cn(
                  'text-[9px] font-bold px-1.5 py-0.5 rounded',
                  globalSummary.nextPayment.daysUntil <= 3
                    ? 'bg-amber-500 text-white'
                    : 'bg-emerald-500/20 text-emerald-500',
                )}
              >
                {globalSummary.nextPayment.daysUntil === 0
                  ? 'Oggi!'
                  : globalSummary.nextPayment.daysUntil === 1
                    ? 'Domani'
                    : `Tra ${globalSummary.nextPayment.daysUntil} gg`}
              </span>
            )}
          </div>
          {globalSummary.nextPayment ? (
            <>
              <p className="text-xl font-extrabold text-text mt-1 truncate">
                {globalSummary.nextPayment.installment.totalAmount.toFixed(2)} €
              </p>
              <span className="text-[11px] text-text-subtle truncate block">
                {globalSummary.nextPayment.lender} •{' '}
                {new Date(globalSummary.nextPayment.installment.dueDate).toLocaleDateString('it-IT', {
                  day: 'numeric',
                  month: 'short',
                })}
              </span>
            </>
          ) : (
            <p className="text-xs font-semibold text-emerald-500 mt-2">Nessuna rata imminente</p>
          )}
        </div>

        {/* 4. Capitale Complessivo Già Rimborsato */}
        <div className="rounded-2xl bg-surface-subtle/60 p-4 border border-border/60">
          <span className="text-[10px] uppercase font-bold text-text-muted">Capitale Già Rimborsato</span>
          <p className="text-2xl font-extrabold text-text mt-1 truncate">
            {globalSummary.totalPrincipalRepaid.toLocaleString('it-IT', { minimumFractionDigits: 2 })} €
          </p>
          <span className="text-[11px] text-text-subtle mt-1 block">
            su {globalSummary.totalInitialFinanced.toLocaleString('it-IT')} € totali
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* Search Box */}
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-text-muted" />
            <input
              type="text"
              placeholder="Cerca finanziamento o banca..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-48 sm:w-60 rounded-xl border border-border bg-surface-subtle/50 pl-8 pr-3 py-1.5 text-xs text-text focus:border-emerald-500 focus:outline-none"
            />
          </div>

          {/* Category Filter Pills - High Contrast & Legible */}
          <div className="flex items-center gap-1 overflow-x-auto max-w-full rounded-xl bg-surface-subtle/80 p-0.5 border border-border/60">
            <button
              type="button"
              onClick={() => setTypeFilter('all')}
              className={cn(
                'rounded-lg px-2.5 py-1 text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer',
                typeFilter === 'all'
                  ? 'bg-surface text-text shadow-sm'
                  : 'text-text-muted hover:text-text hover:bg-surface/50',
              )}
            >
              Tutte le categorie
            </button>
            {Object.entries(LOAN_TYPE_LABELS).map(([k, v]) => {
              const count = loans.filter((l) => l.type === k).length
              const isSelected = typeFilter === k
              return (
                <button
                  key={k}
                  type="button"
                  onClick={() => setTypeFilter(k as LoanType)}
                  className={cn(
                    'rounded-lg px-2.5 py-1 text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer flex items-center gap-1.5',
                    isSelected
                      ? 'bg-emerald-600 text-white shadow-sm font-bold'
                      : 'text-text-muted hover:text-text hover:bg-surface/50',
                  )}
                >
                  <span>{v}</span>
                  {count > 0 && (
                    <span
                      className={cn(
                        'rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none',
                        isSelected ? 'bg-white/25 text-white' : 'bg-surface text-text-subtle',
                      )}
                    >
                      {count}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        <span className="text-xs text-text-subtle shrink-0">
          Mostrando {filteredLoans.length} di {loans.length} finanziamenti
        </span>
      </div>

      {/* Loading & Empty States */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
        </div>
      ) : filteredLoans.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border/80 bg-surface-subtle/20 p-12 text-center">
          <Landmark className="mx-auto h-12 w-12 text-text-muted opacity-40 mb-3" />
          <h3 className="text-base font-bold text-text">
            {loans.length === 0
              ? 'Nessun finanziamento presente'
              : 'Nessun finanziamento corrisponde ai filtri'}
          </h3>
          <p className="mt-1 text-xs text-text-subtle max-w-md mx-auto">
            {loans.length === 0
              ? 'Carica un contratto PDF (Findomestic, Compass, Agos, Santander, banche...) o inserisci i dati manualmente per creare uno spazio dedicato con piano di ammortamento e statistiche in tempo reale.'
              : 'Prova a selezionare "Tutte le categorie" o a modificare il testo di ricerca.'}
          </p>
          {loans.length > 0 ? (
            <div className="mt-4 flex justify-center">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setTypeFilter('all')
                  setSearchQuery('')
                }}
                className="text-xs"
              >
                Reimposta filtri
              </Button>
            </div>
          ) : (
            <div className="mt-5 flex justify-center gap-2">
              <Button
                size="sm"
                onClick={() => setPdfModalOpen(true)}
                className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs gap-1.5"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Carica Contratto PDF
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setPdfModalOpen(true)}
                className="text-xs gap-1.5"
              >
                + Inserisci Manualmente
              </Button>
            </div>
          )}
        </div>
      ) : (
        /* Loans Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredLoans.map((loan) => {
            const stats = calculateLoanStatistics(loan, todayIso)

            return (
              <div
                key={loan.id}
                onClick={() => setSelectedLoanId(loan.id)}
                className="group relative cursor-pointer rounded-2xl bg-surface border border-border/70 p-5 shadow-sm hover:border-emerald-500/60 hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Card Header: Type Badge & Status */}
                  <div className="flex items-center justify-between mb-2">
                    <span className="rounded-full bg-surface-subtle px-2.5 py-0.5 text-[10px] font-semibold text-text-subtle border border-border/40">
                      {LOAN_TYPE_LABELS[loan.type] || 'Finanziamento'}
                    </span>
                    {stats.isCompleted ? (
                      <span className="rounded-full bg-blue-500/15 px-2 py-0.5 text-[10px] font-semibold text-blue-500">
                        Completato
                      </span>
                    ) : (
                      <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-500">
                        Attivo
                      </span>
                    )}
                  </div>

                  {/* Loan Title & Lender */}
                  <h3 className="text-base font-bold text-text group-hover:text-emerald-500 transition-colors truncate">
                    {loan.name}
                  </h3>
                  <p className="text-xs text-text-muted mt-0.5 truncate">
                    {loan.lender}
                    {loan.contractNumber ? ` • ${loan.contractNumber}` : ''}
                  </p>

                  {/* Financial Snapshot */}
                  <div className="mt-4 grid grid-cols-2 gap-2 rounded-xl bg-surface-subtle/50 p-2.5 border border-border/40">
                    <div>
                      <span className="text-[9px] uppercase font-bold text-text-muted">
                        Debito Residuo
                      </span>
                      <p className="text-sm font-extrabold text-emerald-500">
                        {stats.residualDebt.toLocaleString('it-IT', { minimumFractionDigits: 2 })} €
                      </p>
                    </div>
                    <div>
                      <span className="text-[9px] uppercase font-bold text-text-muted">
                        Rata Mensile
                      </span>
                      <p className="text-sm font-bold text-text">
                        {loan.monthlyInstallment.toFixed(2)} €
                      </p>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mt-3 space-y-1">
                    <div className="flex items-center justify-between text-[10px] text-text-muted">
                      <span>Rimborsato {stats.completionPercentage}%</span>
                      <span>
                        {stats.installmentsPaidCount}/{stats.installmentsTotalCount} rate
                      </span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-surface-subtle overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all"
                        style={{ width: `${stats.completionPercentage}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Card Footer */}
                <div className="mt-4 pt-3 border-t border-border/50 flex items-center justify-between">
                  {stats.nextInstallment ? (
                    <div className="flex items-center gap-1.5 text-[11px] text-text-subtle">
                      <Calendar className="h-3.5 w-3.5 text-emerald-500" />
                      <span>
                        Prossima:{' '}
                        <strong className="text-text">
                          {new Date(stats.nextInstallment.dueDate).toLocaleDateString('it-IT', {
                            day: 'numeric',
                            month: 'short',
                          })}
                        </strong>
                      </span>
                      {stats.daysUntilNext !== undefined && (
                        <span
                          className={cn(
                            'text-[9px] font-bold px-1 rounded',
                            stats.daysUntilNext <= 3
                              ? 'bg-amber-500/20 text-amber-500'
                              : 'text-text-muted',
                          )}
                        >
                          ({stats.daysUntilNext === 0 ? 'Oggi' : `${stats.daysUntilNext} gg`})
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-[11px] text-emerald-500 font-medium">Estinto 🎉</span>
                  )}

                  <span className="flex items-center gap-1 text-xs font-semibold text-emerald-500 group-hover:translate-x-1 transition-transform">
                    Apri Spazio <ChevronRight className="h-3.5 w-3.5" />
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modals */}
      <PdfUploadModal
        isOpen={pdfModalOpen}
        onClose={() => setPdfModalOpen(false)}
        onSaveLoan={handleSaveLoan}
      />

      <LoanCalculatorModal
        isOpen={calcModalOpen}
        onClose={() => setCalcModalOpen(false)}
      />
    </div>
  )
}
