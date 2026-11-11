'use client'

import React, { useState, useRef, useMemo } from 'react'
import {
  X,
  FileUp,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Calendar,
  DollarSign,
  Briefcase,
  Palmtree,
  Clock,
  Baby,
  Moon,
  Utensils,
  ChevronDown,
  Info,
  Layers,
  Receipt,
  Sliders,
  ShieldCheck,
  Building2,
  FileSpreadsheet,
  BadgePercent,
} from 'lucide-react'
import { Button } from '@dexhub/ui'
import type { WorklogTranslations } from '../i18n'
import type { WorklogDay } from '../services/worklog-api'
import {
  useFiscalConfig,
  useAddizionaliConfig,
  useSindacatoConfig,
  useCometaConfig,
  useMensaConfig,
} from '../services/worklog-api'
import {
  extractCedolinoFromPdfBuffer,
  type CedolinoParsedData,
  type CedolinoRetribuzione,
} from '../engine/cedolino-parser'
import {
  generateDaysFromCedolino,
  type CedolinoDayPreview,
} from '../engine/cedolino-importer'

export interface CedolinoCalibrationsToApply {
  inpsRate?: number | null
  addizionali?: {
    attivo: boolean
    addizionaleRegionale: number
    addizionaleComunale: number
    accontoComunale: number
    meseInizio: number
    meseFine: number
  } | null
  sindacato?: {
    iscritto: boolean
    coefficiente: number
    nome?: string | null
  } | null
  cometa?: {
    iscritto: boolean
    coefficiente: number | null
  } | null
  mensa?: {
    attivo: boolean
    importo: number
  } | null
}

interface Props {
  isOpen: boolean
  onClose: () => void
  t: WorklogTranslations
  existingDays?: WorklogDay[]
  standardDailyHours?: number
  workdays?: number[]
  onApplyDays: (
    month: string,
    days: ReturnType<typeof generateDaysFromCedolino>['daysToSave'],
    netto: number | null,
    retribuzione?: CedolinoRetribuzione | null,
    cedolinoSnapshot?: Record<string, unknown> | null,
    calibrations?: CedolinoCalibrationsToApply | null,
  ) => Promise<void>
}

export function CedolinoImportModal({
  isOpen,
  onClose,
  t,
  existingDays = [],
  standardDailyHours = 8,
  workdays = [1, 2, 3, 4, 5],
  onApplyDays,
}: Props) {
  const [step, setStep] = useState<'upload' | 'review'>('upload')
  const [isDragging, setIsDragging] = useState(false)
  const [isParsing, setIsParsing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Extracted raw and editable state
  const [fileName, setFileName] = useState('')
  const [month, setMonth] = useState('')
  const [netto, setNetto] = useState<string>('')
  const [oreOrdinarie, setOreOrdinarie] = useState<string>('0')
  const [oreFerie, setOreFerie] = useState<string>('0')
  const [orePermessi, setOrePermessi] = useState<string>('0')
  const [oreCongedo80, setOreCongedo80] = useState<string>('0')
  const [oreCongedo30, setOreCongedo30] = useState<string>('0')
  const [oreMalattia, setOreMalattia] = useState<string>('0')
  const [oreCig, setOreCig] = useState<string>('0')
  const [oreNotturno, setOreNotturno] = useState<string>('0')
  const [pastiMensa, setPastiMensa] = useState<string>('0')
  const [overwriteExisting, setOverwriteExisting] = useState(true)
  const [residui, setResidui] = useState<CedolinoParsedData['residui']>({
    ferie: null,
    permessi: null,
    rol: null,
  })
  const [datiDipendente, setDatiDipendente] = useState<CedolinoParsedData['datiDipendente']>()
  const [retribuzione, setRetribuzione] = useState<CedolinoRetribuzione | null>(null)
  const [showPreviewList, setShowPreviewList] = useState(false)

  const [activeReviewTab, setActiveReviewTab] = useState<'ore' | 'busta' | 'calibrazione'>('ore')
  const [parsedData, setParsedData] = useState<CedolinoParsedData | null>(null)

  // Calibration checkboxes
  const [applyInpsRate, setApplyInpsRate] = useState(false)
  const [applyAddizionali, setApplyAddizionali] = useState(false)
  const [applySindacato, setApplySindacato] = useState(false)
  const [applyCometa, setApplyCometa] = useState(false)
  const [applyMensa, setApplyMensa] = useState(false)

  // Active configurations from DB
  const { data: fiscalRes } = useFiscalConfig()
  const { data: currentAddizionali } = useAddizionaliConfig()
  const { data: currentSindacato } = useSindacatoConfig()
  const { data: currentCometa } = useCometaConfig()
  const { data: currentMensa } = useMensaConfig()

  const suggestedCalibrationsCount = useMemo(() => {
    if (!parsedData) return 0
    let count = 0
    if (parsedData.previdenza.aliquotaInpsCalcolata) count++
    if (parsedData.addizionali.totale > 0) count++
    if (parsedData.trattenute.sindacato) count++
    if (parsedData.trattenute.cometa) count++
    if (parsedData.trattenute.mensaUnitario) count++
    return count
  }, [parsedData])

  // Computed generated schedule based on currently edited values - always called at top level
  const importResult = useMemo(() => {
    if (!month || !/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) return null

    const ord = parseFloat(oreOrdinarie) || 0
    const fer = parseFloat(oreFerie) || 0
    const per = parseFloat(orePermessi) || 0
    const cong80 = parseFloat(oreCongedo80) || 0
    const cong30 = parseFloat(oreCongedo30) || 0
    const mal = parseFloat(oreMalattia) || 0
    const cig = parseFloat(oreCig) || 0
    const nott = parseFloat(oreNotturno) || 0
    const pasti = parseInt(pastiMensa, 10) || 0

    return generateDaysFromCedolino({
      month,
      ore: {
        ordinarie: ord,
        ferie: fer,
        permessi: per,
        congedo: cong80 + cong30,
        congedo80: cong80,
        congedo30: cong30,
        malattia: mal,
        cig: cig,
        straordinario: 0,
        notturno: nott,
        pomeridiano: 0,
        altreAssenze: 0,
      },
      pastiMensa: pasti,
      standardDailyHours,
      workdays,
      existingDays,
      overwriteExisting,
    })
  }, [
    month,
    oreOrdinarie,
    oreFerie,
    orePermessi,
    oreCongedo80,
    oreCongedo30,
    oreMalattia,
    oreCig,
    oreNotturno,
    pastiMensa,
    standardDailyHours,
    workdays,
    existingDays,
    overwriteExisting,
  ])

  if (!isOpen) return null

  function resetState() {
    setStep('upload')
    setIsDragging(false)
    setIsParsing(false)
    setIsSaving(false)
    setError(null)
    setFileName('')
    setMonth('')
    setNetto('')
    setOreOrdinarie('0')
    setOreFerie('0')
    setOrePermessi('0')
    setOreCongedo80('0')
    setOreCongedo30('0')
    setOreMalattia('0')
    setOreCig('0')
    setOreNotturno('0')
    setPastiMensa('0')
    setOverwriteExisting(true)
    setRetribuzione(null)
    setShowPreviewList(false)
    setActiveReviewTab('ore')
    setParsedData(null)
    setApplyInpsRate(false)
    setApplyAddizionali(false)
    setApplySindacato(false)
    setApplyCometa(false)
    setApplyMensa(false)
  }

  function handleClose() {
    resetState()
    onClose()
  }

  async function handleFile(file: File) {
    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      setError('Seleziona un file in formato PDF.')
      return
    }

    try {
      setIsParsing(true)
      setError(null)
      setFileName(file.name)

      const arrayBuffer = await file.arrayBuffer()
      const parsed = await extractCedolinoFromPdfBuffer(arrayBuffer)
      setParsedData(parsed)

      if (parsed.mese) {
        setMonth(parsed.mese)
      } else {
        // Fallback to current month if not detected
        const now = new Date()
        const curM = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
        setMonth(curM)
      }

      setNetto(parsed.netto !== null ? parsed.netto.toFixed(2) : '')
      setOreOrdinarie(String(parsed.ore.ordinarie))
      setOreFerie(String(parsed.ore.ferie))
      setOrePermessi(String(parsed.ore.permessi))
      setOreCongedo80(String(parsed.ore.congedo80))
      setOreCongedo30(String(parsed.ore.congedo30))
      setOreMalattia(String(parsed.ore.malattia))
      setOreCig(String(parsed.ore.cig))
      setOreNotturno(String(parsed.ore.notturno))
      setPastiMensa(String(parsed.pastiMensa))
      setResidui(parsed.residui)
      setDatiDipendente(parsed.datiDipendente)
      setRetribuzione(parsed.retribuzione ?? null)

      // Set initial calibration checkboxes based on what was detected
      setApplyInpsRate(parsed.previdenza.aliquotaInpsCalcolata !== null)
      setApplyAddizionali(parsed.addizionali.totale > 0)
      setApplySindacato(parsed.trattenute.sindacato !== null)
      setApplyCometa(parsed.trattenute.cometa !== null)
      setApplyMensa(parsed.trattenute.mensaUnitario !== null)

      setStep('review')
    } catch (err: unknown) {
      console.error('[CedolinoImportModal] Parsing error:', err)
      setError('Impossibile analizzare il file PDF. Assicurati che sia un cedolino valido.')
    } finally {
      setIsParsing(false)
    }
  }

  async function handleConfirmApply() {
    if (!importResult || importResult.daysToSave.length === 0) return

    try {
      setIsSaving(true)
      setError(null)
      const parsedNetto = netto ? parseFloat(netto.replace(',', '.')) : null

      const cedolinoSnapshot: Record<string, unknown> | null = parsedData
        ? {
            mese: month,
            netto: parsedNetto,
            fiscale: parsedData.fiscale,
            previdenza: parsedData.previdenza,
            addizionali: parsedData.addizionali,
            trattenute: parsedData.trattenute,
            congedo: parsedData.congedo,
            residui,
            retribuzione,
            ore: {
              ordinarie: parseFloat(oreOrdinarie) || 0,
              ferie: parseFloat(oreFerie) || 0,
              permessi: parseFloat(orePermessi) || 0,
              congedo80: parseFloat(oreCongedo80) || 0,
              congedo30: parseFloat(oreCongedo30) || 0,
              malattia: parseFloat(oreMalattia) || 0,
              cig: parseFloat(oreCig) || 0,
              notturno: parseFloat(oreNotturno) || 0,
            },
            pastiMensa: parseInt(pastiMensa, 10) || 0,
            importedAt: new Date().toISOString(),
          }
        : null

      const calibrations: CedolinoCalibrationsToApply = {}
      if (applyInpsRate && parsedData?.previdenza.aliquotaInpsCalcolata) {
        calibrations.inpsRate = parsedData.previdenza.aliquotaInpsCalcolata
      }
      if (applyAddizionali && parsedData?.addizionali && parsedData.addizionali.totale > 0) {
        calibrations.addizionali = {
          attivo: true,
          addizionaleRegionale: parsedData.addizionali.rataRegionale,
          addizionaleComunale: parsedData.addizionali.rataComunale,
          accontoComunale: parsedData.addizionali.accontoComunale,
          meseInizio: 3,
          meseFine: 11,
        }
      }
      if (applySindacato && parsedData?.trattenute.sindacato) {
        calibrations.sindacato = {
          iscritto: true,
          coefficiente: 0.01,
          nome: currentSindacato?.nome ?? 'Sindacato',
        }
      }
      if (applyCometa && parsedData?.trattenute.cometa) {
        calibrations.cometa = {
          iscritto: true,
          coefficiente: 0.012,
        }
      }
      if (applyMensa && parsedData?.trattenute.mensaUnitario) {
        calibrations.mensa = {
          attivo: true,
          importo: parsedData.trattenute.mensaUnitario,
        }
      }

      await onApplyDays(
        month,
        importResult.daysToSave,
        parsedNetto !== null && !isNaN(parsedNetto) ? parsedNetto : null,
        retribuzione,
        cedolinoSnapshot,
        calibrations,
      )
      handleClose()
    } catch (err: unknown) {
      console.error('[CedolinoImportModal] Save error:', err)
      setError(err instanceof Error ? err.message : 'Errore durante il salvataggio dei giorni.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
        onClick={handleClose}
      />

      {/* Dialog container */}
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-border bg-surface p-5 sm:p-6 shadow-2xl z-10 space-y-5">
        {/* Close Button */}
        <button
          type="button"
          onClick={handleClose}
          className="absolute right-4 top-4 rounded-lg p-1.5 text-text-muted hover:bg-surface-raised hover:text-text transition-colors cursor-pointer"
          aria-label="Chiudi"
        >
          <X size={18} />
        </button>

        {/* Modal Header */}
        <div className="flex items-start gap-3 pr-8">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary border border-primary/25">
            <FileUp size={20} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-text">Importa Cedolino Busta Paga</h2>
            <p className="text-xs text-text-muted mt-0.5">
              Carica il PDF del tuo cedolino per rilevare automaticamente mese, netto reale, ore lavorate e assenze.
            </p>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-xl border border-error/30 bg-error/10 p-3 text-xs text-error">
            <AlertCircle size={15} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* ── STEP 1: UPLOAD ── */}
        {step === 'upload' && (
          <div className="space-y-4">
            <div
              onDragOver={(e) => {
                e.preventDefault()
                setIsDragging(true)
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault()
                setIsDragging(false)
                const file = e.dataTransfer.files[0]
                if (file) handleFile(file)
              }}
              onClick={() => fileInputRef.current?.click()}
              className={`flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 sm:p-10 text-center transition-all cursor-pointer ${
                isDragging
                  ? 'border-primary bg-primary/10'
                  : 'border-border hover:border-primary/50 hover:bg-surface-raised/50'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,application/pdf"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) handleFile(file)
                }}
              />

              {isParsing ? (
                <div className="flex flex-col items-center gap-3">
                  <Loader2 size={36} className="animate-spin text-primary" />
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-text">Analisi del cedolino in corso...</p>
                    <p className="text-xs text-text-muted">
                      Estrazione di mese, netto, voci paga, ferie, permessi e pasti.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-raised border border-border text-primary shadow-xs">
                    <UploadCloud size={28} />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-text">
                      Trascina qui il tuo cedolino PDF, oppure{' '}
                      <span className="text-primary hover:underline">sfoglia</span>
                    </p>
                    <p className="text-xs text-text-muted">Supporta cedolini TeamSystem, Zucchetti e formati PDF standard.</p>
                  </div>
                </div>
              )}
            </div>

            <div className="rounded-xl border border-border/60 bg-surface-raised/40 p-3 flex items-start gap-2.5 text-xs text-text-muted">
              <Info size={16} className="text-primary shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-text">Compilazione intelligente del mese</p>
                <p className="mt-0.5 leading-relaxed">
                  Il motore rileva il totale delle ore ordinarie, ferie, permessi (PAR/ROL), congedi e pasti, distribuendoli automaticamente nei giorni feriali del mese. Potrai verificare e modificare qualsiasi dato prima di confermare.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 2: REVIEW & CONFIRM ── */}
        {step === 'review' && (
          <div className="space-y-4">
            {/* File & Dipendente Badge */}
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-surface-raised/60 px-3.5 py-2.5 text-xs">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-success shrink-0" />
                <span className="font-semibold text-text truncate max-w-[200px] sm:max-w-xs">{fileName}</span>
              </div>
              {datiDipendente?.nome && (
                <span className="text-text-muted">
                  {datiDipendente.nome} {datiDipendente.azienda ? `• ${datiDipendente.azienda}` : ''}
                </span>
              )}
            </div>

            {/* Mese & Netto Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Mese */}
              <div className="rounded-xl border border-border bg-surface-raised/40 p-3 space-y-1.5">
                <label className="text-xs font-semibold text-text flex items-center gap-1.5">
                  <Calendar size={14} className="text-primary" />
                  Mese di competenza
                </label>
                <input
                  type="month"
                  value={month}
                  onChange={(e) => setMonth(e.target.value)}
                  className="w-full h-9 rounded-lg border border-border bg-surface px-3 text-sm font-medium text-text focus:border-primary focus:outline-none"
                />
              </div>

              {/* Netto Reale */}
              <div className="rounded-xl border border-border bg-surface-raised/40 p-3 space-y-1.5">
                <label className="text-xs font-semibold text-text flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <DollarSign size={14} className="text-primary" />
                    Netto Busta Rilevato
                  </span>
                  <span className="text-[10px] font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded-full border border-primary/20">
                    Storico buste
                  </span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    value={netto}
                    onChange={(e) => setNetto(e.target.value)}
                    placeholder="0.00"
                    className="w-full h-9 rounded-lg border border-border bg-surface pl-3 pr-8 text-sm font-semibold text-text focus:border-primary focus:outline-none"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-text-muted">
                    €
                  </span>
                </div>
              </div>
            </div>

            {/* Segmented Navigation Tabs */}
            <div className="flex items-center gap-1 border-b border-border pb-1">
              <button
                type="button"
                onClick={() => setActiveReviewTab('ore')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeReviewTab === 'ore'
                    ? 'bg-primary/15 text-primary border border-primary/25'
                    : 'text-text-muted hover:text-text hover:bg-surface-raised'
                }`}
              >
                <Clock size={13} />
                <span>1. Ore & Cartellino</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveReviewTab('busta')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeReviewTab === 'busta'
                    ? 'bg-primary/15 text-primary border border-primary/25'
                    : 'text-text-muted hover:text-text hover:bg-surface-raised'
                }`}
              >
                <Receipt size={13} />
                <span>2. Dati Cedolino ({month})</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveReviewTab('calibrazione')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeReviewTab === 'calibrazione'
                    ? 'bg-primary/15 text-primary border border-primary/25'
                    : 'text-text-muted hover:text-text hover:bg-surface-raised'
                }`}
              >
                <Sliders size={13} />
                <span>3. Calibrazione Previsionale</span>
                {suggestedCalibrationsCount > 0 && (
                  <span className="text-[10px] bg-primary text-bg font-bold px-1.5 py-0.2 rounded-full">
                    {suggestedCalibrationsCount}
                  </span>
                )}
              </button>
            </div>

            {/* ── TAB 1: ORE & CARTELLINO ── */}
            {activeReviewTab === 'ore' && (
              <div className="space-y-4">
                {/* Breakdown Ore Rilevate */}
                <div className="space-y-2">
                  <span className="text-xs font-semibold text-text uppercase tracking-wider text-text-muted">
                    Ore e presenze estratte dal cedolino
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {/* Ordinarie */}
                    <div className="rounded-xl border border-border bg-surface-raised/30 p-2.5 space-y-1">
                      <span className="text-[11px] text-text-muted flex items-center gap-1">
                        <Briefcase size={12} className="text-primary" /> Lavoro ordinario
                      </span>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          step="0.5"
                          value={oreOrdinarie}
                          onChange={(e) => setOreOrdinarie(e.target.value)}
                          className="w-full h-7 rounded border border-border bg-surface px-2 text-xs font-semibold text-text focus:border-primary focus:outline-none"
                        />
                        <span className="text-xs text-text-muted">h</span>
                      </div>
                    </div>

                    {/* Ferie */}
                    <div className="rounded-xl border border-border bg-surface-raised/30 p-2.5 space-y-1">
                      <span className="text-[11px] text-text-muted flex items-center gap-1">
                        <Palmtree size={12} className="text-emerald-400" /> Ferie
                      </span>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          step="1"
                          value={oreFerie}
                          onChange={(e) => setOreFerie(e.target.value)}
                          className="w-full h-7 rounded border border-border bg-surface px-2 text-xs font-semibold text-text focus:border-primary focus:outline-none"
                        />
                        <span className="text-xs text-text-muted">h</span>
                      </div>
                    </div>

                    {/* Permessi / PAR */}
                    <div className="rounded-xl border border-border bg-surface-raised/30 p-2.5 space-y-1">
                      <span className="text-[11px] text-text-muted flex items-center gap-1">
                        <Clock size={12} className="text-amber-400" /> Permessi / PAR
                      </span>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          step="1"
                          value={orePermessi}
                          onChange={(e) => setOrePermessi(e.target.value)}
                          className="w-full h-7 rounded border border-border bg-surface px-2 text-xs font-semibold text-text focus:border-primary focus:outline-none"
                        />
                        <span className="text-xs text-text-muted">h</span>
                      </div>
                    </div>

                    {/* Congedo 80% */}
                    <div className="rounded-xl border border-border bg-surface-raised/30 p-2.5 space-y-1">
                      <span className="text-[11px] text-text-muted flex items-center gap-1">
                        <Baby size={12} className="text-teal-400" /> Congedo 80%
                      </span>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          step="1"
                          value={oreCongedo80}
                          onChange={(e) => setOreCongedo80(e.target.value)}
                          className="w-full h-7 rounded border border-border bg-surface px-2 text-xs font-semibold text-text focus:border-primary focus:outline-none"
                        />
                        <span className="text-xs text-text-muted">h</span>
                      </div>
                    </div>

                    {/* Congedo 30% */}
                    <div className="rounded-xl border border-border bg-surface-raised/30 p-2.5 space-y-1">
                      <span className="text-[11px] text-text-muted flex items-center gap-1">
                        <Baby size={12} className="text-indigo-400" /> Congedo 30%
                      </span>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          step="1"
                          value={oreCongedo30}
                          onChange={(e) => setOreCongedo30(e.target.value)}
                          className="w-full h-7 rounded border border-border bg-surface px-2 text-xs font-semibold text-text focus:border-primary focus:outline-none"
                        />
                        <span className="text-xs text-text-muted">h</span>
                      </div>
                    </div>

                    {/* Notturno */}
                    <div className="rounded-xl border border-border bg-surface-raised/30 p-2.5 space-y-1">
                      <span className="text-[11px] text-text-muted flex items-center gap-1">
                        <Moon size={12} className="text-violet-400" /> Magg. Notturno
                      </span>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          step="1"
                          value={oreNotturno}
                          onChange={(e) => setOreNotturno(e.target.value)}
                          className="w-full h-7 rounded border border-border bg-surface px-2 text-xs font-semibold text-text focus:border-primary focus:outline-none"
                        />
                        <span className="text-xs text-text-muted">h</span>
                      </div>
                    </div>

                    {/* Pasti Mensa */}
                    <div className="rounded-xl border border-border bg-surface-raised/30 p-2.5 space-y-1">
                      <span className="text-[11px] text-text-muted flex items-center gap-1">
                        <Utensils size={12} className="text-orange-400" /> Pasti Mensa
                      </span>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          step="1"
                          value={pastiMensa}
                          onChange={(e) => setPastiMensa(e.target.value)}
                          className="w-full h-7 rounded border border-border bg-surface px-2 text-xs font-semibold text-text focus:border-primary focus:outline-none"
                        />
                        <span className="text-xs text-text-muted">gg</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Residui estratti dal cedolino (se disponibili) */}
                {(residui.ferie !== null || residui.permessi !== null || residui.rol !== null) && (
                  <div className="rounded-xl border border-border/80 bg-surface-raised/20 p-3 space-y-1.5">
                    <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">
                      Residui a fine mese rilevati nel cedolino
                    </span>
                    <div className="flex items-center gap-4 text-xs">
                      {residui.ferie !== null && (
                        <span>
                          Ferie: <strong className={residui.ferie < 0 ? 'text-amber-400' : 'text-text'}>{residui.ferie.toFixed(2)} h</strong>
                        </span>
                      )}
                      {residui.permessi !== null && (
                        <span>
                          Permessi: <strong className="text-text">{residui.permessi.toFixed(2)} h</strong>
                        </span>
                      )}
                      {residui.rol !== null && (
                        <span>
                          ROL: <strong className="text-text">{residui.rol.toFixed(2)} h</strong>
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Retribuzione fissa rilevata nel cedolino */}
                {retribuzione && (
                  <div className="rounded-xl border border-primary/30 bg-primary/10 p-3 flex items-start gap-2.5 text-xs">
                    <Briefcase size={16} className="text-primary shrink-0 mt-0.5" />
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-text">
                          Retribuzione di fatto rilevata: {retribuzione.importo.toFixed(2)} €
                        </p>
                        <span className="text-[10px] font-medium text-primary bg-primary/20 px-1.5 py-0.2 rounded">
                          Configura stima
                        </span>
                      </div>
                      <p className="text-text-muted text-[11px]">
                        Paga base: {retribuzione.minimoTabellare?.toFixed(2) ?? '—'} €
                        {retribuzione.premioProduzioneFisso ? ` • Premio prod.: ${retribuzione.premioProduzioneFisso.toFixed(2)} €` : ''}
                        {retribuzione.scattiAnzianita ? ` • Scatti anz.: ${retribuzione.scattiAnzianita.toFixed(2)} €` : ''}
                      </p>
                    </div>
                  </div>
                )}

                {/* Riepilogo Generazione & Preview */}
                {importResult && (
                  <div className="rounded-xl border border-border bg-surface-raised/40 p-3 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-text">
                        Pianificazione automatica: {importResult.daysToSave.length} giornate
                      </span>
                      <span className="text-text-muted">
                        Totale ore: <strong className="text-primary">{importResult.stats.totaleOreRegistrate}h</strong>
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-text-muted">
                      <span className="inline-flex items-center gap-1 rounded bg-surface px-1.5 py-0.5 border border-border">
                        💼 {importResult.stats.giorniLavorati} Lavoro
                      </span>
                      {importResult.stats.giorniCongedo80 > 0 && (
                        <span className="inline-flex items-center gap-1 rounded bg-surface px-1.5 py-0.5 border border-border">
                          👶 {importResult.stats.giorniCongedo80} Congedo 80%
                        </span>
                      )}
                      {importResult.stats.giorniCongedo30 > 0 && (
                        <span className="inline-flex items-center gap-1 rounded bg-surface px-1.5 py-0.5 border border-border">
                          👶 {importResult.stats.giorniCongedo30} Congedo 30%
                        </span>
                      )}
                      {importResult.stats.giorniPermesso > 0 && (
                        <span className="inline-flex items-center gap-1 rounded bg-surface px-1.5 py-0.5 border border-border">
                          ⏱️ {importResult.stats.giorniPermesso} Permesso
                        </span>
                      )}
                      {importResult.stats.giorniFerie > 0 && (
                        <span className="inline-flex items-center gap-1 rounded bg-surface px-1.5 py-0.5 border border-border">
                          🏖️ {importResult.stats.giorniFerie} Ferie
                        </span>
                      )}
                      {importResult.stats.pastiAssegnati > 0 && (
                        <span className="inline-flex items-center gap-1 rounded bg-surface px-1.5 py-0.5 border border-border">
                          🍽️ {importResult.stats.pastiAssegnati} Pasti
                        </span>
                      )}
                    </div>

                    {/* Toggle anteprima dettagliata */}
                    <button
                      type="button"
                      onClick={() => setShowPreviewList((v) => !v)}
                      className="text-xs text-primary hover:underline flex items-center gap-1 pt-1 cursor-pointer"
                    >
                      <Layers size={13} />
                      <span>{showPreviewList ? 'Nascondi dettaglio giorni' : 'Mostra dettaglio dei giorni pianificati'}</span>
                      <ChevronDown size={13} className={`transition-transform ${showPreviewList ? 'rotate-180' : ''}`} />
                    </button>

                    {showPreviewList && (
                      <div className="max-h-48 overflow-y-auto rounded-lg border border-border bg-bg/80 p-2 space-y-1 divide-y divide-border/40 text-xs">
                        {importResult.previewDays.map((d) => (
                          <div key={d.date} className="flex items-center justify-between py-1 px-1">
                            <span className="font-mono text-text-muted text-[11px] w-20">
                              {d.dayNum.toString().padStart(2, '0')} {d.dow}
                            </span>
                            <div className="flex items-center gap-1.5 flex-1">
                              <span
                                className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                                  d.kind === 'vacation'
                                    ? 'bg-emerald-500/15 text-emerald-400'
                                    : d.kind === 'leave'
                                      ? 'bg-amber-500/15 text-amber-400'
                                      : d.kind === 'sick'
                                        ? 'bg-red-500/15 text-red-400'
                                        : d.kind === 'cig'
                                          ? 'bg-orange-500/15 text-orange-400'
                                          : 'bg-primary/15 text-primary'
                                }`}
                              >
                                {d.label}
                              </span>
                              {d.notturno && (
                                <span title="Notturno" className="inline-flex">
                                  <Moon size={11} className="text-violet-400" />
                                </span>
                              )}
                              {d.meal && (
                                <span title="Mensa" className="inline-flex">
                                  <Utensils size={11} className="text-orange-400" />
                                </span>
                              )}
                            </div>
                            <span className="font-semibold text-text">{d.hours}h</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Checkbox Sovrascrivi */}
                <label className="flex items-center gap-2 text-xs text-text cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={overwriteExisting}
                    onChange={(e) => setOverwriteExisting(e.target.checked)}
                    className="rounded border-border text-primary focus:ring-primary"
                  />
                  <span>Sovrascrivi le giornate già presenti per questo mese</span>
                </label>
              </div>
            )}

            {/* ── TAB 2: DATI BUSTA DEL MESE (STORICO) ── */}
            {activeReviewTab === 'busta' && (
              <div className="space-y-3.5">
                <div className="rounded-xl border border-border bg-surface-raised/30 p-3 space-y-2">
                  <span className="text-xs font-semibold text-text flex items-center gap-1.5">
                    <Building2 size={14} className="text-primary" />
                    Retribuzione e Imponibili rilevati ({month})
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                    <div className="rounded-lg border border-border/60 bg-surface p-2">
                      <span className="text-[11px] text-text-muted block">Totale Lordo</span>
                      <span className="font-semibold text-text">
                        {parsedData?.fiscale.totaleLordo != null ? `${parsedData.fiscale.totaleLordo.toFixed(2)} €` : '—'}
                      </span>
                    </div>
                    <div className="rounded-lg border border-border/60 bg-surface p-2">
                      <span className="text-[11px] text-text-muted block">Imponibile INPS</span>
                      <span className="font-semibold text-text">
                        {parsedData?.previdenza.imponibileInps != null ? `${parsedData.previdenza.imponibileInps.toFixed(2)} €` : '—'}
                      </span>
                    </div>
                    <div className="rounded-lg border border-border/60 bg-surface p-2">
                      <span className="text-[11px] text-text-muted block">
                        Contributi INPS {parsedData?.previdenza.aliquotaInpsCalcolata != null ? `(${((parsedData.previdenza.aliquotaInpsCalcolata) * 100).toFixed(2)}%)` : ''}
                      </span>
                      <span className="font-semibold text-text">
                        {parsedData?.previdenza.contributiInps != null ? `− ${parsedData.previdenza.contributiInps.toFixed(2)} €` : '—'}
                      </span>
                    </div>
                    <div className="rounded-lg border border-border/60 bg-surface p-2">
                      <span className="text-[11px] text-text-muted block">Imponibile IRPEF</span>
                      <span className="font-semibold text-text">
                        {parsedData?.fiscale.imponibileIrpef != null ? `${parsedData.fiscale.imponibileIrpef.toFixed(2)} €` : '—'}
                      </span>
                    </div>
                    <div className="rounded-lg border border-border/60 bg-surface p-2">
                      <span className="text-[11px] text-text-muted block">Detrazioni Lavoro</span>
                      <span className="font-semibold text-emerald-400">
                        {parsedData?.fiscale.detrazioniLavoro != null ? `+ ${parsedData.fiscale.detrazioniLavoro.toFixed(2)} €` : '—'}
                      </span>
                    </div>
                    <div className="rounded-lg border border-border/60 bg-surface p-2">
                      <span className="text-[11px] text-text-muted block">IRPEF Pagata / Netta</span>
                      <span className="font-semibold text-text">
                        {parsedData?.fiscale.irpefNetta != null ? `− ${parsedData.fiscale.irpefNetta.toFixed(2)} €` : '—'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Addizionali rilevate */}
                <div className="rounded-xl border border-border bg-surface-raised/30 p-3 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-text flex items-center gap-1.5">
                      <Receipt size={14} className="text-primary" />
                      Addizionali IRPEF Trattenute a Rate
                    </span>
                    <span className="font-bold text-text">
                      Totale: {parsedData?.addizionali.totale.toFixed(2)} €
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                    <div className="rounded-lg border border-border/60 bg-surface p-2">
                      <span className="text-[11px] text-text-muted block">Rata Regionale A.P.</span>
                      <span className="font-semibold text-text">
                        {parsedData?.addizionali.rataRegionale ? `${parsedData.addizionali.rataRegionale.toFixed(2)} €` : '0,00 €'}
                      </span>
                      {parsedData?.addizionali.residuoRegionale != null && (
                        <span className="text-[10px] text-text-muted block mt-0.5">
                          Residuo: {parsedData.addizionali.residuoRegionale.toFixed(2)} €
                        </span>
                      )}
                    </div>
                    <div className="rounded-lg border border-border/60 bg-surface p-2">
                      <span className="text-[11px] text-text-muted block">Rata Comunale A.P.</span>
                      <span className="font-semibold text-text">
                        {parsedData?.addizionali.rataComunale ? `${parsedData.addizionali.rataComunale.toFixed(2)} €` : '0,00 €'}
                      </span>
                      {parsedData?.addizionali.residuoComunale != null && (
                        <span className="text-[10px] text-text-muted block mt-0.5">
                          Residuo: {parsedData.addizionali.residuoComunale.toFixed(2)} €
                        </span>
                      )}
                    </div>
                    <div className="rounded-lg border border-border/60 bg-surface p-2">
                      <span className="text-[11px] text-text-muted block">Acconto Comunale</span>
                      <span className="font-semibold text-text">
                        {parsedData?.addizionali.accontoComunale ? `${parsedData.addizionali.accontoComunale.toFixed(2)} €` : '0,00 €'}
                      </span>
                      {parsedData?.addizionali.residuoAcconto != null && (
                        <span className="text-[10px] text-text-muted block mt-0.5">
                          Residuo: {parsedData.addizionali.residuoAcconto.toFixed(2)} €
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Trattenute accessorie & Congedo */}
                <div className="rounded-xl border border-border bg-surface-raised/30 p-3 space-y-2">
                  <span className="text-xs font-semibold text-text flex items-center gap-1.5">
                    <BadgePercent size={14} className="text-primary" />
                    Trattenute Accessorie & Congedo Effettivo
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <div className="rounded-lg border border-border/60 bg-surface p-2">
                      <span className="text-[11px] text-text-muted block">Fondo Cometa</span>
                      <span className="font-semibold text-text">
                        {parsedData?.trattenute.cometa ? `− ${parsedData.trattenute.cometa.toFixed(2)} €` : '—'}
                      </span>
                    </div>
                    <div className="rounded-lg border border-border/60 bg-surface p-2">
                      <span className="text-[11px] text-text-muted block">Quota Sindacale</span>
                      <span className="font-semibold text-text">
                        {parsedData?.trattenute.sindacato ? `− ${parsedData.trattenute.sindacato.toFixed(2)} €` : '—'}
                      </span>
                    </div>
                    <div className="rounded-lg border border-border/60 bg-surface p-2">
                      <span className="text-[11px] text-text-muted block">Trattenuta Mensa</span>
                      <span className="font-semibold text-text">
                        {parsedData?.trattenute.mensaTotale ? `− ${parsedData.trattenute.mensaTotale.toFixed(2)} €` : '—'}
                      </span>
                    </div>
                    <div className="rounded-lg border border-border/60 bg-surface p-2">
                      <span className="text-[11px] text-text-muted block">Detassazione Premi</span>
                      <span className="font-semibold text-text">
                        {parsedData?.trattenute.impostaSostitutivaPremi ? `− ${parsedData.trattenute.impostaSostitutivaPremi.toFixed(2)} €` : '—'}
                      </span>
                    </div>
                  </div>
                  {parsedData?.congedo.indennitaInps != null && (
                    <div className="rounded-lg border border-teal-500/30 bg-teal-500/10 p-2.5 flex items-center justify-between text-xs mt-1">
                      <div className="space-y-0.5">
                        <span className="font-semibold text-text flex items-center gap-1 text-teal-400">
                          <Baby size={13} /> Congedo Parentale 80% ({parsedData.congedo.ore ?? 0}h / {parsedData.congedo.giorni ?? 0} gg)
                        </span>
                        <span className="text-[11px] text-text-muted block">
                          Storno retribuzione azienda: −{parsedData.congedo.stornoAzienda?.toFixed(2) ?? '—'} € • Indennità pagata da INPS: +{parsedData.congedo.indennitaInps.toFixed(2)} €
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-text-muted block">Costo netto assenza</span>
                        <span className="font-bold text-text">
                          {parsedData.congedo.stornoAzienda != null
                            ? `${(parsedData.congedo.indennitaInps - parsedData.congedo.stornoAzienda).toFixed(2)} €`
                            : '—'}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── TAB 3: CALIBRAZIONE PREVISIONALE ── */}
            {activeReviewTab === 'calibrazione' && (
              <div className="space-y-3">
                <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-xs text-text-muted leading-relaxed">
                  <p className="font-semibold text-text mb-0.5">Apprendimento parametri retributivi effettivi</p>
                  DexHub confronta i dati del cedolino con le tue impostazioni correnti. Seleziona quali parametri desideri aggiornare per le previsioni dei mesi futuri:
                </div>

                {/* Aliquota INPS */}
                {parsedData?.previdenza.aliquotaInpsCalcolata && (
                  <label className="flex items-start gap-3 rounded-xl border border-border bg-surface-raised/40 p-3 text-xs cursor-pointer hover:border-primary/40 transition-colors">
                    <input
                      type="checkbox"
                      checked={applyInpsRate}
                      onChange={(e) => setApplyInpsRate(e.target.checked)}
                      className="mt-0.5 accent-primary rounded cursor-pointer"
                    />
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-text">Aliquota Contributiva INPS</span>
                        <div className="flex items-center gap-2">
                          <span className="text-text-muted">
                            Attuale: {fiscalRes?.config?.contributiInpsOverride != null ? `${(fiscalRes.config.contributiInpsOverride * 100).toFixed(2)}%` : '9,19%'}
                          </span>
                          <span>→</span>
                          <span className="font-bold text-primary">
                            {(parsedData.previdenza.aliquotaInpsCalcolata * 100).toFixed(2)}%
                          </span>
                        </div>
                      </div>
                      <p className="text-[11px] text-text-muted">
                        Rilevata dalla proporzione tra contributi sociali ({parsedData.previdenza.contributiInps?.toFixed(2)} €) e imponibile ({parsedData.previdenza.imponibileInps?.toFixed(2)} €). Include CIGS e fondi solidarietà aziendali.
                      </p>
                    </div>
                  </label>
                )}

                {/* Addizionali IRPEF */}
                {parsedData && parsedData.addizionali.totale > 0 && (
                  <label className="flex items-start gap-3 rounded-xl border border-border bg-surface-raised/40 p-3 text-xs cursor-pointer hover:border-primary/40 transition-colors">
                    <input
                      type="checkbox"
                      checked={applyAddizionali}
                      onChange={(e) => setApplyAddizionali(e.target.checked)}
                      className="mt-0.5 accent-primary rounded cursor-pointer"
                    />
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-text">Rate Addizionali IRPEF (Marzo – Novembre)</span>
                        <div className="flex items-center gap-2">
                          <span className="text-text-muted">
                            Attuale: {currentAddizionali?.attivo ? `${(currentAddizionali.addizionaleRegionale + currentAddizionali.addizionaleComunale + currentAddizionali.accontoComunale).toFixed(2)} €` : 'Non attiva'}
                          </span>
                          <span>→</span>
                          <span className="font-bold text-primary">
                            {parsedData.addizionali.totale.toFixed(2)} €/mese
                          </span>
                        </div>
                      </div>
                      <p className="text-[11px] text-text-muted">
                        Rilevate in busta: Regionale {parsedData.addizionali.rataRegionale.toFixed(2)} € + Comunale {parsedData.addizionali.rataComunale.toFixed(2)} € + Acconto {parsedData.addizionali.accontoComunale.toFixed(2)} €. Applicate da marzo a novembre (non a dicembre).
                      </p>
                    </div>
                  </label>
                )}

                {/* Quota Sindacale */}
                {parsedData?.trattenute.sindacato && (
                  <label className="flex items-start gap-3 rounded-xl border border-border bg-surface-raised/40 p-3 text-xs cursor-pointer hover:border-primary/40 transition-colors">
                    <input
                      type="checkbox"
                      checked={applySindacato}
                      onChange={(e) => setApplySindacato(e.target.checked)}
                      className="mt-0.5 accent-primary rounded cursor-pointer"
                    />
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-text">Trattenuta Sindacale</span>
                        <div className="flex items-center gap-2">
                          <span className="text-text-muted">
                            Attuale: {currentSindacato?.iscritto ? `${(currentSindacato.coefficiente * 100).toFixed(1)}%` : 'Non attiva'}
                          </span>
                          <span>→</span>
                          <span className="font-bold text-primary">
                            {parsedData.trattenute.sindacato.toFixed(2)} €
                          </span>
                        </div>
                      </div>
                      <p className="text-[11px] text-text-muted">
                        Quota mensile rilevata dal corpo del cedolino (tipicamente 1% del minimo tabellare contrattuale).
                      </p>
                    </div>
                  </label>
                )}

                {/* Fondo Cometa */}
                {parsedData?.trattenute.cometa && (
                  <label className="flex items-start gap-3 rounded-xl border border-border bg-surface-raised/40 p-3 text-xs cursor-pointer hover:border-primary/40 transition-colors">
                    <input
                      type="checkbox"
                      checked={applyCometa}
                      onChange={(e) => setApplyCometa(e.target.checked)}
                      className="mt-0.5 accent-primary rounded cursor-pointer"
                    />
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-text">Previdenza Complementare (Fondo Cometa)</span>
                        <div className="flex items-center gap-2">
                          <span className="text-text-muted">
                            Attuale: {currentCometa?.iscritto ? `${((currentCometa.coefficiente ?? 0) * 100).toFixed(1)}%` : 'Non attivo'}
                          </span>
                          <span>→</span>
                          <span className="font-bold text-primary">
                            {parsedData.trattenute.cometa.toFixed(2)} €
                          </span>
                        </div>
                      </div>
                      <p className="text-[11px] text-text-muted">
                        Contributo dipendente deducibile dall'imponibile IRPEF rilevato nel cedolino.
                      </p>
                    </div>
                  </label>
                )}

                {/* Costo Pasto Mensa */}
                {parsedData?.trattenute.mensaUnitario && (
                  <label className="flex items-start gap-3 rounded-xl border border-border bg-surface-raised/40 p-3 text-xs cursor-pointer hover:border-primary/40 transition-colors">
                    <input
                      type="checkbox"
                      checked={applyMensa}
                      onChange={(e) => setApplyMensa(e.target.checked)}
                      className="mt-0.5 accent-primary rounded cursor-pointer"
                    />
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-text">Tariffa Quota Pasto Mensa</span>
                        <div className="flex items-center gap-2">
                          <span className="text-text-muted">
                            Attuale: {currentMensa?.attivo ? `${currentMensa.importo.toFixed(2)} €/pasto` : '0,00 €'}
                          </span>
                          <span>→</span>
                          <span className="font-bold text-primary">
                            {parsedData.trattenute.mensaUnitario.toFixed(2)} €/pasto
                          </span>
                        </div>
                      </div>
                      <p className="text-[11px] text-text-muted">
                        Costo unitario a pasto trattenuto in busta paga ({parsedData.trattenute.mensaPasti ?? 0} pasti per un totale di {parsedData.trattenute.mensaTotale?.toFixed(2)} €).
                      </p>
                    </div>
                  </label>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-between gap-3 pt-2 border-t border-border/50">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setStep('upload')}
                disabled={isSaving}
                className="text-xs text-text-muted hover:text-text cursor-pointer"
              >
                Carica un altro cedolino
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClose}
                  disabled={isSaving}
                  className="text-xs cursor-pointer"
                >
                  Annulla
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleConfirmApply}
                  disabled={isSaving || !importResult || importResult.daysToSave.length === 0}
                  className="text-xs font-semibold bg-primary hover:bg-primary/90 text-bg shadow-xs cursor-pointer gap-1.5"
                >
                  {isSaving ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>Applicazione in corso...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={14} />
                      <span>Applica al Cartellino ({importResult?.daysToSave.length ?? 0} gg)</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
