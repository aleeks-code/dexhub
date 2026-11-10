'use client'

import React, { useState, useMemo } from 'react'
import {
  ArrowLeft,
  Calendar,
  Clock,
  Download,
  Landmark,
  PiggyBank,
  Sparkles,
  TrendingDown,
  Trash2,
  Pencil,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  Search,
  Filter,
  Check,
  Coins,
  ChevronRight,
  Info,
  Calculator,
  FileText,
} from 'lucide-react'
import { Button, cn } from '@dexhub/ui'
import type { Loan, Installment, LoanStatistics, LoanType } from '../types'
import { LOAN_TYPE_LABELS } from '../types'
import {
  calculateLoanStatistics,
  getInstallmentStatus,
  getTodayIso,
  round,
} from '../engine/amortization'
import { EarlyRepaymentModal } from './early-repayment-modal'

interface LoanDetailSpaceProps {
  loan: Loan
  onBack: () => void
  onUpdateLoan: (id: string, updates: Partial<Loan>) => Promise<Loan | null>
  onDeleteLoan: (id: string) => Promise<void>
  onAddExtraPayment: (
    loanId: string,
    extra: {
      date: string
      amount: number
      strategy: 'reduce_term' | 'reduce_installment'
      note?: string
    },
  ) => Promise<void>
  onToggleOverride: (
    loanId: string,
    installmentNumber: number,
    override: 'paid' | 'unpaid' | undefined,
  ) => Promise<void>
}

export function LoanDetailSpace({
  loan,
  onBack,
  onUpdateLoan,
  onDeleteLoan,
  onAddExtraPayment,
  onToggleOverride,
}: LoanDetailSpaceProps) {
  const [simModalOpen, setSimModalOpen] = useState(false)
  const [tableFilter, setTableFilter] = useState<'all' | 'unpaid' | 'paid'>('all')
  const [selectedYear, setSelectedYear] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)

  // Edit fields
  const [editName, setEditName] = useState(loan.name)
  const [editLender, setEditLender] = useState(loan.lender)
  const [editNotes, setEditNotes] = useState(loan.notes || '')
  const [editContract, setEditContract] = useState(loan.contractNumber || '')
  const [editPaymentDay, setEditPaymentDay] = useState<string>(loan.paymentDay?.toString() || '15')
  const [editShiftMode, setEditShiftMode] = useState<'from_month' | 'future' | 'all'>('from_month')
  const [editFromMonth, setEditFromMonth] = useState<string>(`${new Date().getFullYear()}-03`)

  // Sync edit state when modal opens or loan changes
  React.useEffect(() => {
    if (editModalOpen) {
      setEditName(loan.name)
      setEditLender(loan.lender)
      setEditNotes(loan.notes || '')
      setEditContract(loan.contractNumber || '')
      setEditPaymentDay(loan.paymentDay?.toString() || '15')
      setEditShiftMode('from_month')
      setEditFromMonth(`${new Date().getFullYear()}-03`)
    }
  }, [editModalOpen, loan])

  const todayIso = useMemo(() => getTodayIso(), [])

  const stats: LoanStatistics = useMemo(() => {
    return calculateLoanStatistics(loan, todayIso)
  }, [loan, todayIso])

  // Extract unique years from schedule
  const availableYears = useMemo(() => {
    const set = new Set<string>()
    for (const inst of loan.schedule) {
      set.add(inst.dueDate.slice(0, 4))
    }
    return Array.from(set).sort()
  }, [loan.schedule])

  // Filtered installments
  const filteredSchedule = useMemo(() => {
    return loan.schedule.filter((inst) => {
      const status = getInstallmentStatus(inst, todayIso)

      // Tab filter
      if (tableFilter === 'paid' && status !== 'paid') return false
      if (tableFilter === 'unpaid' && status === 'paid') return false

      // Year filter
      if (selectedYear !== 'all' && !inst.dueDate.startsWith(selectedYear)) return false

      // Search query (matches installment number or date)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchesNum = inst.number.toString().includes(q)
        const matchesDate = inst.dueDate.includes(q)
        if (!matchesNum && !matchesDate) return false
      }

      return true
    })
  }, [loan.schedule, tableFilter, selectedYear, searchQuery, todayIso])

  // Export to CSV
  const handleExportCsv = () => {
    const headers = [
      'Numero Rata',
      'Data Scadenza',
      'Rata Totale (€)',
      'Quota Capitale (€)',
      'Quota Interessi (€)',
      'Spese Incasso (€)',
      'Debito Residuo (€)',
      'Stato Domiciliazione',
    ]

    const rows = loan.schedule.map((inst) => {
      const status = getInstallmentStatus(inst, todayIso)
      const statusLabel =
        status === 'paid' ? 'Pagata (Auto)' : status === 'in_due' ? 'In Scadenza' : 'Futura'
      return [
        inst.number,
        inst.dueDate,
        inst.totalAmount.toFixed(2),
        inst.principalAmount.toFixed(2),
        inst.interestAmount.toFixed(2),
        inst.feeAmount.toFixed(2),
        inst.residualDebt.toFixed(2),
        statusLabel,
      ]
    })

    const csvContent =
      '\uFEFF' +
      [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\r\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `piano-ammortamento-${loan.name.replace(/\s+/g, '_')}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleDelete = async () => {
    if (window.confirm(`Sei sicuro di voler eliminare definitivamente "${loan.name}"?`)) {
      setIsDeleting(true)
      await onDeleteLoan(loan.id)
    }
  }

  const handleSaveEdit = async () => {
    const newDay = parseInt(editPaymentDay, 10)
    let updatedSchedule = [...loan.schedule]

    if (!isNaN(newDay) && newDay >= 1 && newDay <= 31) {
      updatedSchedule = loan.schedule.map((inst) => {
        let shouldShift = false
        if (editShiftMode === 'all') {
          shouldShift = true
        } else if (editShiftMode === 'future') {
          shouldShift = inst.dueDate >= todayIso
        } else if (editShiftMode === 'from_month') {
          const targetPrefix = editFromMonth || `${new Date().getFullYear()}-03`
          shouldShift = inst.dueDate >= `${targetPrefix}-01`
        }

        if (shouldShift) {
          const [yStr, mStr] = inst.dueDate.split('-')
          const year = parseInt(yStr || '2026', 10)
          const month = parseInt(mStr || '1', 10)
          const daysInMonth = new Date(year, month, 0).getDate()
          const validDay = Math.min(newDay, daysInMonth)
          const newDate = `${year}-${String(month).padStart(2, '0')}-${String(validDay).padStart(2, '0')}`
          return {
            ...inst,
            dueDate: newDate,
          }
        }
        return inst
      })
    }

    await onUpdateLoan(loan.id, {
      name: editName.trim() || loan.name,
      lender: editLender.trim() || loan.lender,
      notes: editNotes.trim() || undefined,
      contractNumber: editContract.trim() || undefined,
      paymentDay: !isNaN(newDay) && newDay >= 1 && newDay <= 31 ? newDay : loan.paymentDay,
      schedule: updatedSchedule,
    })
    setEditModalOpen(false)
  }

  return (
    <div className="space-y-6">
      {/* Top Bar Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/60 pb-4">
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onBack}
            className="text-xs gap-1.5 h-8 px-2.5"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Tutti i Finanziamenti
          </Button>

          <div className="flex items-center gap-2">
            <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-semibold text-emerald-500">
              {LOAN_TYPE_LABELS[loan.type] || 'Finanziamento'}
            </span>
            {stats.isCompleted ? (
              <span className="rounded-full bg-blue-500/15 px-2.5 py-0.5 text-xs font-semibold text-blue-500 flex items-center gap-1">
                <Check className="h-3 w-3" /> Completato / Estinto
              </span>
            ) : (
              <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-semibold text-emerald-500">
                In Corso
              </span>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            onClick={() => setSimModalOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs gap-1.5 h-8"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Simula Estinzione Anticipata
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            className="text-xs gap-1.5 h-8"
            title="Scarica piano completo in CSV per Excel"
          >
            <FileSpreadsheet className="h-3.5 w-3.5" />
            Esporta CSV
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setEditModalOpen(true)}
            className="text-xs h-8 px-2"
            title="Modifica dati"
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleDelete}
            disabled={isDeleting}
            className="text-xs text-red-500 hover:bg-red-500/10 h-8 px-2"
            title="Elimina finanziamento"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Loan Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Landmark className="h-6 w-6 text-emerald-500" />
            <h1 className="text-2xl font-bold text-text">{loan.name}</h1>
          </div>
          <p className="text-xs text-text-subtle mt-1">
            Istituto: <span className="font-semibold text-text">{loan.lender}</span>
            {loan.contractNumber && (
              <>
                {' '}
                • Pratica/Contratto: <span className="font-semibold text-text">{loan.contractNumber}</span>
              </>
            )}
            {' '}
            • TAN: <span className="font-semibold text-text">{loan.tan}%</span>
            {loan.taeg !== undefined && (
              <>
                {' '}
                • TAEG: <span className="font-semibold text-text">{loan.taeg}%</span>
              </>
            )}
            {' '}
            • Domiciliazione: ogni{' '}
            <span className="font-semibold text-text">{loan.paymentDay}°</span> del mese{' '}
            <button
              type="button"
              onClick={() => setEditModalOpen(true)}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-500 hover:text-emerald-400 hover:underline transition-colors ml-1 cursor-pointer"
              title="Cambia giorno di addebito o mese di decorrenza"
            >
              <Pencil className="h-3 w-3" /> Modifica giorno
            </button>
          </p>
        </div>

        {loan.notes && (
          <div className="max-w-xs rounded-xl bg-surface-subtle/70 border border-border/50 p-2.5 text-[11px] text-text-subtle">
            <span className="font-semibold text-text">Note: </span>
            {loan.notes}
          </div>
        )}
      </div>

      {/* Provenance Banner if fields were computed */}
      {loan.fieldProvenance &&
        Object.values(loan.fieldProvenance).some((p) => p.origin === 'computed') && (
          <div className="flex items-center gap-2.5 rounded-2xl bg-purple-500/10 border border-purple-500/25 px-4 py-2.5 text-xs text-purple-700 dark:text-purple-300">
            <Calculator className="h-4 w-4 shrink-0 text-purple-500" />
            <span>
              <strong>Nota calcolo automatico:</strong> I dati non esplicitati nel testo del
              documento (es. capitale totale) sono stati calcolati in automatico sommando le quote
              del piano di ammortamento.
            </span>
          </div>
        )}

      {/* Top Financial Metric Tiles */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* 1. Capitale Finanziato */}
        <div className="rounded-2xl bg-surface-subtle/50 p-4 border border-border/60">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-text-muted">
              Capitale Finanziato
            </span>
            {loan.fieldProvenance?.['financedAmount']?.origin === 'computed' ? (
              <span
                className="text-[9px] font-bold text-purple-500 bg-purple-500/15 border border-purple-500/30 px-1.5 py-0.5 rounded cursor-help"
                title={loan.fieldProvenance['financedAmount'].note}
              >
                Somma Quote
              </span>
            ) : null}
          </div>
          <p className="text-xl font-extrabold text-text mt-0.5">
            {loan.financedAmount.toLocaleString('it-IT', { minimumFractionDigits: 2 })} €
          </p>
          <span className="text-[11px] text-text-subtle">
            {loan.installmentsCount} rate totali
          </span>
        </div>

        {/* 2. Debito Residuo Attuale (AUTO-UPDATED) */}
        <div className="rounded-2xl bg-surface-subtle/50 p-4 border border-border/60 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-text-muted">Debito Residuo Attuale</span>
            <span className="text-[9px] font-semibold text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded">
              Auto
            </span>
          </div>
          <p className="text-xl font-extrabold text-emerald-500 mt-0.5">
            {stats.residualDebt.toLocaleString('it-IT', { minimumFractionDigits: 2 })} €
          </p>
          <span className="text-[11px] text-text-subtle">
            Rimanenti {stats.installmentsRemainingCount} rate
          </span>
        </div>

        {/* 3. Capitale Già Rimborsato */}
        <div className="rounded-2xl bg-surface-subtle/50 p-4 border border-border/60">
          <span className="text-[10px] uppercase font-bold text-text-muted">Capitale Rimborsato</span>
          <p className="text-xl font-extrabold text-text mt-0.5">
            {stats.totalPrincipalPaid.toLocaleString('it-IT', { minimumFractionDigits: 2 })} €
          </p>
          <span className="text-[11px] text-emerald-500 font-semibold">
            {stats.completionPercentage}% completato
          </span>
        </div>

        {/* 4. Prossima Rata In Scadenza */}
        <div className="rounded-2xl bg-emerald-500/10 p-4 border border-emerald-500/30">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400">
              Prossima Domiciliazione
            </span>
            {stats.daysUntilNext !== undefined && (
              <span
                className={cn(
                  'text-[10px] font-bold px-1.5 py-0.5 rounded',
                  stats.daysUntilNext <= 3
                    ? 'bg-amber-500 text-white'
                    : 'bg-emerald-500/20 text-emerald-500',
                )}
              >
                {stats.daysUntilNext === 0
                  ? 'Oggi!'
                  : stats.daysUntilNext === 1
                    ? 'Domani'
                    : `Tra ${stats.daysUntilNext} gg`}
              </span>
            )}
          </div>
          {stats.nextInstallment ? (
            <>
              <p className="text-xl font-extrabold text-text mt-0.5">
                {stats.nextInstallment.totalAmount.toFixed(2)} €
              </p>
              <span className="text-[11px] text-text-subtle">
                Scadenza:{' '}
                {new Date(stats.nextInstallment.dueDate).toLocaleDateString('it-IT', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </span>
            </>
          ) : (
            <p className="text-sm font-semibold text-emerald-500 mt-2">Nessuna rata residua 🎉</p>
          )}
        </div>
      </div>

      {/* Progress Bar & Interest Breakdown Banner */}
      <div className="rounded-2xl bg-surface-subtle/50 p-5 border border-border/60 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-xs font-bold text-text uppercase tracking-wider">
              Avanzamento Piano di Ammortamento
            </h3>
            <p className="text-xs text-text-subtle mt-0.5">
              {stats.installmentsPaidCount} di {stats.installmentsTotalCount} rate pagate
              automaticamente per decorrenza temporale.
            </p>
          </div>
          <div className="text-right">
            <span className="text-xs text-text-muted">Data fine prevista: </span>
            <span className="text-xs font-bold text-text">
              {new Date(stats.projectedEndDate).toLocaleDateString('it-IT', {
                month: 'long',
                year: 'numeric',
              })}
            </span>
          </div>
        </div>

        {/* Dual Progress Bar */}
        <div className="space-y-1.5">
          <div className="h-3 w-full rounded-full bg-surface-subtle overflow-hidden flex border border-border/40">
            <div
              className="h-full bg-emerald-500 transition-all duration-500"
              style={{ width: `${stats.completionPercentage}%` }}
              title={`Capitale rimborsato: ${stats.completionPercentage}%`}
            />
          </div>
          <div className="flex items-center justify-between text-[11px] text-text-subtle">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Capitale restituito: {stats.completionPercentage}% (
              {stats.totalPrincipalPaid.toLocaleString('it-IT')} €)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-surface-subtle border border-border" />
              Da restituire: {(100 - stats.completionPercentage).toFixed(1)}% (
              {stats.residualDebt.toLocaleString('it-IT')} €)
            </span>
          </div>
        </div>

        {/* Interest & Cost summary row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 border-t border-border/50 pt-3">
          <div className="flex items-center justify-between text-xs sm:flex-col sm:items-start">
            <span className="text-text-muted">Interessi Corrisposti / Totali:</span>
            <span className="font-bold text-text">
              {stats.totalInterestPaid.toLocaleString('it-IT')} €{' '}
              <span className="font-normal text-text-muted">
                / {stats.totalInterestDue.toLocaleString('it-IT')} €
              </span>
            </span>
          </div>

          <div className="flex items-center justify-between text-xs sm:flex-col sm:items-start">
            <span className="text-text-muted">Spese Incasso Totali:</span>
            <span className="font-bold text-text">
              {stats.totalFees.toLocaleString('it-IT')} €
            </span>
          </div>

          <div className="flex items-center justify-between text-xs sm:flex-col sm:items-start">
            <span className="text-text-muted">Costo Totale Finanziamento:</span>
            <span className="font-bold text-emerald-500">
              {stats.totalCostOfLoan.toLocaleString('it-IT')} €
            </span>
          </div>
        </div>
      </div>

      {/* Extra Payments (Rimborsi Straordinari) Section */}
      {loan.extraPayments && loan.extraPayments.length > 0 && (
        <div className="rounded-2xl bg-surface-subtle/50 p-4 border border-border/60 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <PiggyBank className="h-4 w-4 text-emerald-500" />
              <h3 className="text-xs font-bold text-text uppercase">
                Rimborsi Straordinari Effettuati ({loan.extraPayments.length})
              </h3>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setSimModalOpen(true)}
              className="text-[11px] h-7 px-2"
            >
              + Nuovo Rimborso
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
            {loan.extraPayments.map((ep) => (
              <div
                key={ep.id}
                className="rounded-xl bg-surface p-3 border border-border/50 flex flex-col justify-between"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-500">
                    +{ep.amount.toLocaleString('it-IT')} €
                  </span>
                  <span className="text-[10px] text-text-muted">{ep.date}</span>
                </div>
                <p className="text-[11px] text-text-subtle mt-1">
                  {ep.strategy === 'reduce_term' ? 'Riduzione durata' : 'Riduzione rata'}
                  {ep.note && ` • "${ep.note}"`}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Amortization Schedule Table Header & Filters */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-text">Piano di Ammortamento Completo</h2>
            <p className="text-xs text-text-subtle">
              Le rate vengono contrassegnate automaticamente come pagate al raggiungimento della data
              di scadenza.
            </p>
          </div>

          {/* Quick Filters */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-text-muted" />
              <input
                type="text"
                placeholder="Cerca rata o data..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-40 rounded-xl border border-border bg-surface-subtle/50 pl-8 pr-3 py-1.5 text-xs text-text focus:border-emerald-500 focus:outline-none"
              />
            </div>

            {/* Year Pills Bar - Ultra visible & accessible */}
            {availableYears.length > 1 && (
              <div className="flex items-center gap-1 overflow-x-auto max-w-full rounded-xl bg-surface-subtle/80 p-0.5 border border-border/60">
                <button
                  type="button"
                  onClick={() => setSelectedYear('all')}
                  className={cn(
                    'rounded-lg px-2.5 py-1 text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer',
                    selectedYear === 'all'
                      ? 'bg-surface text-text shadow-sm'
                      : 'text-text-muted hover:text-text hover:bg-surface/50',
                  )}
                >
                  Tutti gli anni
                </button>
                {availableYears.map((yr) => (
                  <button
                    key={yr}
                    type="button"
                    onClick={() => setSelectedYear(yr)}
                    className={cn(
                      'rounded-lg px-2.5 py-1 text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer',
                      selectedYear === yr
                        ? 'bg-emerald-600 text-white shadow-sm font-bold'
                        : 'text-text-muted hover:text-text hover:bg-surface/50',
                    )}
                  >
                    {yr}
                  </button>
                ))}
              </div>
            )}

            {/* Status tabs */}
            <div className="flex rounded-xl bg-surface-subtle/80 p-0.5 border border-border/60">
              <button
                type="button"
                onClick={() => setTableFilter('all')}
                className={cn(
                  'rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors',
                  tableFilter === 'all'
                    ? 'bg-surface text-text shadow-sm'
                    : 'text-text-muted hover:text-text',
                )}
              >
                Tutte ({loan.schedule.length})
              </button>
              <button
                type="button"
                onClick={() => setTableFilter('unpaid')}
                className={cn(
                  'rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors',
                  tableFilter === 'unpaid'
                    ? 'bg-surface text-text shadow-sm'
                    : 'text-text-muted hover:text-text',
                )}
              >
                Da Pagare ({stats.installmentsRemainingCount})
              </button>
              <button
                type="button"
                onClick={() => setTableFilter('paid')}
                className={cn(
                  'rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors',
                  tableFilter === 'paid'
                    ? 'bg-surface text-text shadow-sm'
                    : 'text-text-muted hover:text-text',
                )}
              >
                Pagate ({stats.installmentsPaidCount})
              </button>
            </div>
          </div>
        </div>

        {/* Full Table */}
        <div className="rounded-2xl border border-border/70 overflow-hidden bg-surface shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-border/80 bg-surface-subtle/60 text-text-muted font-bold uppercase text-[10px]">
                  <th className="py-3 px-4 w-12 text-center">N°</th>
                  <th className="py-3 px-4">Data Scadenza</th>
                  <th className="py-3 px-4 text-right">Rata Totale</th>
                  <th className="py-3 px-4 text-right">Quota Capitale</th>
                  <th className="py-3 px-4 text-right">Quota Interessi</th>
                  {loan.monthlyFee > 0 && <th className="py-3 px-4 text-right">Spese</th>}
                  <th className="py-3 px-4 text-right">Debito Residuo</th>
                  <th className="py-3 px-4 text-center">Stato Domiciliazione</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {filteredSchedule.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-xs text-text-subtle">
                      Nessuna rata trovata con i filtri selezionati.
                    </td>
                  </tr>
                ) : (
                  filteredSchedule.map((inst) => {
                    const status = getInstallmentStatus(inst, todayIso)
                    const isPaid = status === 'paid'
                    const isInDue = status === 'in_due'

                    return (
                      <tr
                        key={inst.number}
                        className={cn(
                          'hover:bg-surface-subtle/40 transition-colors',
                          isInDue && 'bg-amber-500/5 dark:bg-amber-500/10 font-medium',
                          isPaid && 'opacity-80',
                        )}
                      >
                        {/* Number */}
                        <td className="py-2.5 px-4 text-center font-bold text-text-muted">
                          {inst.number}
                        </td>

                        {/* Due Date */}
                        <td className="py-2.5 px-4 whitespace-nowrap text-text font-medium">
                          {new Date(inst.dueDate).toLocaleDateString('it-IT', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </td>

                        {/* Total Installment */}
                        <td className="py-2.5 px-4 text-right font-bold text-text whitespace-nowrap">
                          {inst.totalAmount.toFixed(2)} €
                        </td>

                        {/* Principal Quota */}
                        <td className="py-2.5 px-4 text-right text-text-subtle whitespace-nowrap">
                          {inst.principalAmount.toFixed(2)} €
                        </td>

                        {/* Interest Quota */}
                        <td className="py-2.5 px-4 text-right text-amber-600 dark:text-amber-400 whitespace-nowrap">
                          {inst.interestAmount.toFixed(2)} €
                        </td>

                        {/* Fee */}
                        {loan.monthlyFee > 0 && (
                          <td className="py-2.5 px-4 text-right text-text-muted whitespace-nowrap">
                            {inst.feeAmount.toFixed(2)} €
                          </td>
                        )}

                        {/* Residual Debt */}
                        <td className="py-2.5 px-4 text-right font-semibold text-text whitespace-nowrap">
                          {inst.residualDebt.toLocaleString('it-IT', { minimumFractionDigits: 2 })} €
                        </td>

                        {/* Status Badge with toggle capability */}
                        <td className="py-2.5 px-4 text-center whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => {
                              const nextOverride =
                                inst.manualOverride === 'paid'
                                  ? 'unpaid'
                                  : inst.manualOverride === 'unpaid'
                                    ? undefined
                                    : isPaid
                                      ? 'unpaid'
                                      : 'paid'
                              onToggleOverride(loan.id, inst.number, nextOverride)
                            }}
                            title="Clicca per forzare manualmente lo stato (opzionale)"
                            className={cn(
                              'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold transition-all hover:scale-105',
                              isPaid
                                ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                                : isInDue
                                  ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                                  : 'bg-surface-subtle text-text-muted border border-border/60',
                            )}
                          >
                            {isPaid ? (
                              <>
                                <CheckCircle2 className="h-3 w-3" />
                                {inst.manualOverride ? 'Pagata (Forzata)' : 'Pagata (Auto)'}
                              </>
                            ) : isInDue ? (
                              <>
                                <Clock className="h-3 w-3" />
                                In Scadenza
                              </>
                            ) : (
                              'Futura'
                            )}
                          </button>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Early Repayment Modal */}
      {simModalOpen && (
        <EarlyRepaymentModal
          isOpen={simModalOpen}
          onClose={() => setSimModalOpen(false)}
          loan={loan}
          onApplyRepayment={onAddExtraPayment}
        />
      )}

      {/* Edit Loan Metadata Modal */}
      {editModalOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setEditModalOpen(false)
          }}
        >
          <div className="w-full max-w-md rounded-2xl bg-surface border border-border p-6 shadow-2xl space-y-4">
            <h3 className="text-sm font-bold text-text">Modifica Informazioni Finanziamento</h3>

            <div>
              <label className="mb-1 block text-xs font-semibold text-text">Nome Finanziamento</label>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full rounded-xl border border-border bg-surface-subtle px-3 py-2 text-xs text-text focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-text">Istituto di Credito</label>
              <input
                type="text"
                value={editLender}
                onChange={(e) => setEditLender(e.target.value)}
                className="w-full rounded-xl border border-border bg-surface-subtle px-3 py-2 text-xs text-text focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-text">Numero Pratica / Contratto</label>
              <input
                type="text"
                value={editContract}
                onChange={(e) => setEditContract(e.target.value)}
                className="w-full rounded-xl border border-border bg-surface-subtle px-3 py-2 text-xs text-text focus:outline-none"
              />
            </div>

            {/* Giorno Domiciliazione SDD */}
            <div className="rounded-xl border border-border/70 bg-surface-subtle/50 p-3 space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-text">
                  Giorno di Addebito SDD (1..31)
                </label>
                <span className="text-[10px] text-text-muted">Attuale: ogni {loan.paymentDay}°</span>
              </div>
              <input
                type="number"
                min="1"
                max="31"
                value={editPaymentDay}
                onChange={(e) => setEditPaymentDay(e.target.value)}
                className="w-full rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-bold text-text focus:outline-none focus:border-emerald-500"
              />

              <div className="space-y-1.5 pt-1">
                <span className="text-[11px] font-medium text-text-muted block">
                  A partire da quando applicare il nuovo giorno:
                </span>

                <div className="space-y-1.5">
                  <label className="flex items-center gap-2 text-xs text-text cursor-pointer">
                    <input
                      type="radio"
                      name="shiftMode"
                      value="from_month"
                      checked={editShiftMode === 'from_month'}
                      onChange={() => setEditShiftMode('from_month')}
                      className="text-emerald-500"
                    />
                    <span>A partire da un mese specifico:</span>
                  </label>

                  {editShiftMode === 'from_month' && (
                    <div className="ml-5 flex flex-wrap items-center gap-2 pt-0.5">
                      <input
                        type="month"
                        value={editFromMonth}
                        onChange={(e) => setEditFromMonth(e.target.value)}
                        className="rounded-lg border border-border bg-surface px-2.5 py-1 text-xs text-text focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setEditFromMonth(`${new Date().getFullYear()}-03`)}
                        className="rounded-md bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 text-[10px] font-semibold text-emerald-500 hover:bg-emerald-500/20 cursor-pointer"
                      >
                        Marzo {new Date().getFullYear()}
                      </button>
                    </div>
                  )}

                  <label className="flex items-center gap-2 text-xs text-text cursor-pointer pt-0.5">
                    <input
                      type="radio"
                      name="shiftMode"
                      value="future"
                      checked={editShiftMode === 'future'}
                      onChange={() => setEditShiftMode('future')}
                      className="text-emerald-500"
                    />
                    <span>A partire da oggi (tutte le rate future da pagare)</span>
                  </label>

                  <label className="flex items-center gap-2 text-xs text-text cursor-pointer">
                    <input
                      type="radio"
                      name="shiftMode"
                      value="all"
                      checked={editShiftMode === 'all'}
                      onChange={() => setEditShiftMode('all')}
                      className="text-emerald-500"
                    />
                    <span>Per tutte le rate del piano</span>
                  </label>
                </div>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-text">Note Personali</label>
              <textarea
                rows={3}
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                className="w-full rounded-xl border border-border bg-surface-subtle px-3 py-2 text-xs text-text focus:outline-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <Button size="sm" variant="ghost" onClick={() => setEditModalOpen(false)} className="text-xs">
                Annulla
              </Button>
              <Button size="sm" onClick={handleSaveEdit} className="bg-emerald-600 text-white text-xs">
                Salva Modifiche
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
