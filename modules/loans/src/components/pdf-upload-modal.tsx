'use client'

import React, { useState, useRef } from 'react'
import {
  Upload,
  FileText,
  AlertCircle,
  CheckCircle2,
  X,
  Sparkles,
  Loader2,
  Calendar,
  Calculator,
  Info,
  Clock,
  Landmark,
} from 'lucide-react'
import { Button, cn } from '@dexhub/ui'
import type { Loan, LoanType, Installment, FieldProvenance } from '../types'
import { LOAN_TYPE_LABELS } from '../types'
import { extractLoanFromPdfBuffer } from '../engine/pdf-extractor'
import { generateAmortizationSchedule } from '../engine/amortization'

interface PdfUploadModalProps {
  isOpen: boolean
  onClose: () => void
  onSaveLoan: (loanData: Omit<Loan, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>
}

function ProvenanceBadge({ prov }: { prov?: FieldProvenance }) {
  if (!prov) return null
  if (prov.origin === 'computed') {
    return (
      <span
        className="inline-flex items-center gap-1 rounded-md bg-purple-500/15 border border-purple-500/30 px-1.5 py-0.5 text-[10px] font-bold text-purple-600 dark:text-purple-400 cursor-help"
        title={prov.note}
      >
        <Calculator className="h-3 w-3" />
        Calcolato in automatico
      </span>
    )
  }
  return (
    <span
      className="inline-flex items-center gap-1 rounded-md bg-emerald-500/15 border border-emerald-500/30 px-1.5 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 cursor-help"
      title={prov.note}
    >
      <FileText className="h-3 w-3" />
      Letto dal PDF
    </span>
  )
}

export function PdfUploadModal({ isOpen, onClose, onSaveLoan }: PdfUploadModalProps) {
  const [step, setStep] = useState<'upload' | 'review'>('upload')
  const [isDragging, setIsDragging] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Form State
  const [loanName, setLoanName] = useState('')
  const [lender, setLender] = useState('')
  const [loanType, setLoanType] = useState<LoanType>('personal')
  const [contractNumber, setContractNumber] = useState('')
  const [financedAmount, setFinancedAmount] = useState<string>('')
  const [tan, setTan] = useState<string>('')
  const [taeg, setTaeg] = useState<string>('')
  const [installmentsCount, setInstallmentsCount] = useState<string>('')
  const [monthlyInstallment, setMonthlyInstallment] = useState<string>('')
  const [monthlyFee, setMonthlyFee] = useState<string>('0')
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().slice(0, 10))
  const [paymentDay, setPaymentDay] = useState<string>('15')
  const [notes, setNotes] = useState('')
  const [extractedSchedule, setExtractedSchedule] = useState<Installment[] | undefined>(undefined)
  const [provenance, setProvenance] = useState<Record<string, FieldProvenance>>({})

  if (!isOpen) return null

  const resetForm = () => {
    setStep('upload')
    setIsLoading(false)
    setErrorMessage(null)
    setLoanName('')
    setLender('')
    setLoanType('personal')
    setContractNumber('')
    setFinancedAmount('')
    setTan('')
    setTaeg('')
    setInstallmentsCount('')
    setMonthlyInstallment('')
    setMonthlyFee('0')
    setStartDate(new Date().toISOString().slice(0, 10))
    setPaymentDay('15')
    setNotes('')
    setExtractedSchedule(undefined)
    setProvenance({})
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  const handleProcessFile = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      setErrorMessage('Seleziona un file in formato PDF valido.')
      return
    }

    try {
      setIsLoading(true)
      setErrorMessage(null)

      const arrayBuffer = await file.arrayBuffer()
      const extracted = await extractLoanFromPdfBuffer(arrayBuffer)

      const detectedLender = extracted.lender || 'Banca / Istituto'
      setLender(detectedLender)
      setLoanName(`Finanziamento ${detectedLender}`)
      if (extracted.contractNumber) setContractNumber(extracted.contractNumber)
      if (extracted.financedAmount) setFinancedAmount(extracted.financedAmount.toString())
      if (extracted.tan !== undefined) setTan(extracted.tan.toString())
      if (extracted.taeg !== undefined) setTaeg(extracted.taeg.toString())
      if (extracted.installmentsCount) setInstallmentsCount(extracted.installmentsCount.toString())
      if (extracted.monthlyInstallment) setMonthlyInstallment(extracted.monthlyInstallment.toString())
      if (extracted.monthlyFee !== undefined) setMonthlyFee(extracted.monthlyFee.toString())
      if (extracted.startDate) setStartDate(extracted.startDate)
      if (extracted.paymentDay) setPaymentDay(extracted.paymentDay.toString())

      setExtractedSchedule(extracted.schedule)
      setProvenance(extracted.provenance || {})
      setStep('review')
    } catch (err: unknown) {
      console.error('[PdfUploadModal] Extraction error:', err)
      setErrorMessage(
        'Impossibile estrarre automaticamente tutti i dati dal PDF. Puoi inserire o completare i campi manualmente.',
      )
      setStep('review')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleProcessFile(file)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleProcessFile(file)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const amount = parseFloat(financedAmount)
    const count = parseInt(installmentsCount, 10)
    const tanNum = parseFloat(tan || '0')
    const taegNum = taeg ? parseFloat(taeg) : undefined
    const feeNum = parseFloat(monthlyFee || '0')
    const pDay = parseInt(paymentDay || '15', 10)
    const mInst = monthlyInstallment ? parseFloat(monthlyInstallment) : undefined

    if (isNaN(amount) || amount <= 0) {
      setErrorMessage('Inserisci un importo finanziato valido.')
      return
    }
    if (isNaN(count) || count <= 0) {
      setErrorMessage('Inserisci un numero di rate valido.')
      return
    }
    if (!startDate) {
      setErrorMessage('Inserisci la data della prima rata.')
      return
    }

    try {
      setIsSaving(true)

      // If we have an exact extracted schedule from the bank (and installments count matches), use it!
      const schedule =
        extractedSchedule && extractedSchedule.length === count
          ? extractedSchedule
          : generateAmortizationSchedule({
              financedAmount: amount,
              tan: tanNum,
              installmentsCount: count,
              startDate,
              paymentDay: pDay,
              monthlyFee: feeNum,
              knownMonthlyInstallment: mInst,
            })

      const actualMonthly = mInst && mInst > 0 ? mInst : (schedule[0]?.totalAmount ?? 0)

      await onSaveLoan({
        name: loanName.trim() || `Finanziamento ${lender || 'Nuovo'}`,
        lender: lender.trim() || 'Istituto di Credito',
        type: loanType,
        contractNumber: contractNumber.trim() || undefined,
        financedAmount: amount,
        tan: tanNum,
        taeg: taegNum,
        installmentsCount: count,
        monthlyInstallment: actualMonthly,
        monthlyFee: feeNum,
        startDate,
        paymentDay: pDay,
        notes: notes.trim() || undefined,
        schedule,
        fieldProvenance: provenance,
      })

      handleClose()
    } catch (err: unknown) {
      console.error(err)
      setErrorMessage('Errore durante il salvataggio del finanziamento.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose()
      }}
    >
      <div className="relative w-full max-w-2xl rounded-2xl bg-surface border border-border/70 shadow-2xl overflow-hidden my-6">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-border/60 px-6 py-4 bg-surface-subtle/40">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-500">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-text">
                {step === 'upload' ? 'Carica Contratto o Piano PDF' : 'Verifica Dati Finanziamento'}
              </h2>
              <p className="text-xs text-text-subtle">
                {step === 'upload'
                  ? 'Estrai automaticamente creditori, rate, TAN, date e piano di ammortamento'
                  : 'I dati non presenti nel testo sono stati calcolati in automatico sommando la tabella'}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="rounded-lg p-1.5 text-text-muted hover:bg-surface-subtle hover:text-text transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6">
          {errorMessage && (
            <div className="mb-4 flex items-center gap-2 rounded-xl bg-red-500/10 border border-red-500/20 px-3.5 py-2.5 text-xs text-red-500">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {step === 'upload' && (
            <div className="flex flex-col items-center">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Loader2 className="h-10 w-10 animate-spin text-emerald-500 mb-4" />
                  <p className="text-sm font-semibold text-text">Analisi del PDF in corso...</p>
                  <p className="text-xs text-text-subtle mt-1 max-w-sm">
                    Riconoscimento istituto, parsing tabelle di ammortamento e calcolo quote
                    mancanti...
                  </p>
                </div>
              ) : (
                <>
                  <div
                    onDragOver={(e) => {
                      e.preventDefault()
                      setIsDragging(true)
                    }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={cn(
                      'group relative flex w-full cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed py-12 px-6 text-center transition-all',
                      isDragging
                        ? 'border-emerald-500 bg-emerald-500/10 scale-[1.01]'
                        : 'border-border/80 hover:border-emerald-500/60 hover:bg-surface-subtle/50',
                    )}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,application/pdf"
                      onChange={handleFileChange}
                      className="hidden"
                    />

                    <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-500 transition-transform group-hover:scale-110">
                      <Upload className="h-7 w-7" />
                    </div>

                    <p className="text-sm font-semibold text-text">
                      Trascina qui il file PDF del finanziamento
                    </p>
                    <p className="mt-1 text-xs text-text-muted">oppure clicca per sfogliare dal tuo computer</p>

                    <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
                      {[
                        'Deutsche Bank Easy',
                        'Findomestic',
                        'Compass',
                        'Agos',
                        'Santander',
                        'Intesa Sanpaolo',
                        'UniCredit',
                      ].map((b) => (
                        <span
                          key={b}
                          className="rounded-full bg-surface-subtle/80 border border-border/50 px-2.5 py-0.5 text-[10px] font-medium text-text-subtle"
                        >
                          {b}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="mt-6 flex w-full items-center justify-between border-t border-border/50 pt-4">
                    <p className="text-xs text-text-muted">Non hai un PDF a portata di mano?</p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setStep('review')}
                      className="text-xs"
                    >
                      Compila Manualmente
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}

          {step === 'review' && (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Info banner */}
              {Object.keys(provenance).length > 0 && (
                <div className="flex items-start gap-2.5 rounded-xl bg-surface-subtle p-3 border border-border/60 text-xs">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-text">Dati analizzati con successo.</span>
                    <p className="text-text-subtle mt-0.5">
                      I dati etichettati con{' '}
                      <span className="text-emerald-500 font-bold">Letto dal PDF</span> sono stati
                      estratti direttamente, mentre quelli con{' '}
                      <span className="text-purple-500 font-bold">Calcolato in automatico</span> sono
                      stati ricavati sommando le quote della tabella.
                    </p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Nome Finanziamento */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-text">Nome Finanziamento *</label>
                  </div>
                  <input
                    type="text"
                    required
                    value={loanName}
                    onChange={(e) => setLoanName(e.target.value)}
                    placeholder="es. Prestito Deutsche Bank"
                    className="w-full rounded-xl border border-border bg-surface-subtle/50 px-3 py-2 text-xs text-text focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                {/* Istituto / Creditore */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-text">Istituto / Creditore *</label>
                    <ProvenanceBadge prov={provenance['lender']} />
                  </div>
                  <input
                    type="text"
                    required
                    value={lender}
                    onChange={(e) => setLender(e.target.value)}
                    placeholder="es. Deutsche Bank Easy, Compass, Findomestic..."
                    className="w-full rounded-xl border border-border bg-surface-subtle/50 px-3 py-2 text-xs text-text focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                {/* Tipo Finanziamento */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-text">Categoria Prestito</label>
                  </div>
                  <select
                    value={loanType}
                    onChange={(e) => setLoanType(e.target.value as LoanType)}
                    className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-xs text-text focus:border-emerald-500 focus:outline-none [&>option]:bg-surface [&>option]:text-text"
                  >
                    {Object.entries(LOAN_TYPE_LABELS).map(([val, label]) => (
                      <option key={val} value={val}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Numero Pratica / Contratto */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-text">
                      Numero Pratica / Contratto
                    </label>
                    <ProvenanceBadge prov={provenance['contractNumber']} />
                  </div>
                  <input
                    type="text"
                    value={contractNumber}
                    onChange={(e) => setContractNumber(e.target.value)}
                    placeholder="es. 3187450301"
                    className="w-full rounded-xl border border-border bg-surface-subtle/50 px-3 py-2 text-xs text-text focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                {/* Capitale Finanziato */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-text">
                      Importo Finanziato (€) *
                    </label>
                    <ProvenanceBadge prov={provenance['financedAmount']} />
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    required
                    value={financedAmount}
                    onChange={(e) => setFinancedAmount(e.target.value)}
                    placeholder="es. 17450"
                    className="w-full rounded-xl border border-border bg-surface-subtle/50 px-3 py-2 text-xs font-bold text-text focus:border-emerald-500 focus:outline-none"
                  />
                  {provenance['financedAmount']?.note && (
                    <p className="text-[10px] text-text-subtle mt-1 leading-tight">
                      {provenance['financedAmount'].note}
                    </p>
                  )}
                </div>

                {/* Durata in Rate / Mesi */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-text">Numero Rate (Mesi) *</label>
                    <ProvenanceBadge prov={provenance['installmentsCount']} />
                  </div>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    required
                    value={installmentsCount}
                    onChange={(e) => setInstallmentsCount(e.target.value)}
                    placeholder="es. 60"
                    className="w-full rounded-xl border border-border bg-surface-subtle/50 px-3 py-2 text-xs text-text focus:border-emerald-500 focus:outline-none"
                  />
                  {provenance['installmentsCount']?.note && (
                    <p className="text-[10px] text-text-subtle mt-1 leading-tight">
                      {provenance['installmentsCount'].note}
                    </p>
                  )}
                </div>

                {/* TAN % */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-text">TAN (% Annuo)</label>
                    <ProvenanceBadge prov={provenance['tan']} />
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={tan}
                    onChange={(e) => setTan(e.target.value)}
                    placeholder="es. 7.84"
                    className="w-full rounded-xl border border-border bg-surface-subtle/50 px-3 py-2 text-xs text-text focus:border-emerald-500 focus:outline-none"
                  />
                  {provenance['tan']?.note && (
                    <p className="text-[10px] text-text-subtle mt-1 leading-tight">
                      {provenance['tan'].note}
                    </p>
                  )}
                </div>

                {/* TAEG % */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-text">TAEG (%)</label>
                    <ProvenanceBadge prov={provenance['taeg']} />
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={taeg}
                    onChange={(e) => setTaeg(e.target.value)}
                    placeholder="Opzionale"
                    className="w-full rounded-xl border border-border bg-surface-subtle/50 px-3 py-2 text-xs text-text focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                {/* Rata Mensile Contrattuale */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-text">Rata Mensile (€)</label>
                    <ProvenanceBadge prov={provenance['monthlyInstallment']} />
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={monthlyInstallment}
                    onChange={(e) => setMonthlyInstallment(e.target.value)}
                    placeholder="es. 359.00"
                    className="w-full rounded-xl border border-border bg-surface-subtle/50 px-3 py-2 text-xs text-text focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                {/* Spese Incasso Rata */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-text">Spese Incasso Rata (€)</label>
                    <ProvenanceBadge prov={provenance['monthlyFee']} />
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={monthlyFee}
                    onChange={(e) => setMonthlyFee(e.target.value)}
                    placeholder="es. 5.00"
                    className="w-full rounded-xl border border-border bg-surface-subtle/50 px-3 py-2 text-xs text-text focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                {/* Data Prima Rata */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-text">
                      Data Prima Rata (Decorrenza) *
                    </label>
                    <ProvenanceBadge prov={provenance['startDate']} />
                  </div>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full rounded-xl border border-border bg-surface-subtle/50 px-3 py-2 text-xs text-text focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                {/* Giorno Domiciliazione */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-text">
                      Giorno Domiciliazione SDD (1..31)
                    </label>
                    <ProvenanceBadge prov={provenance['paymentDay']} />
                  </div>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={paymentDay}
                    onChange={(e) => setPaymentDay(e.target.value)}
                    placeholder="es. 8"
                    className="w-full rounded-xl border border-border bg-surface-subtle/50 px-3 py-2 text-xs text-text focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Note opzionali */}
              <div>
                <label className="mb-1 block text-xs font-semibold text-text">
                  Note Personali (Opzionale)
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="IBAN addebito, note pratica, etc."
                  className="w-full rounded-xl border border-border bg-surface-subtle/50 px-3 py-2 text-xs text-text focus:border-emerald-500 focus:outline-none"
                />
              </div>

              {/* Form Buttons */}
              <div className="flex items-center justify-between border-t border-border/60 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setStep('upload')}
                  disabled={isSaving}
                  className="text-xs"
                >
                  ← Torna al caricamento
                </Button>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleClose}
                    disabled={isSaving}
                    className="text-xs"
                  >
                    Annulla
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={isSaving}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs gap-1.5"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Salvataggio...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Crea Spazio Finanziamento
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
