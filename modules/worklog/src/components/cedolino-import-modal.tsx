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
} from 'lucide-react'
import { Button } from '@dexhub/ui'
import type { WorklogTranslations } from '../i18n'
import type { WorklogDay } from '../services/worklog-api'
import {
  extractCedolinoFromPdfBuffer,
  type CedolinoParsedData,
  type CedolinoRetribuzione,
} from '../engine/cedolino-parser'
import {
  generateDaysFromCedolino,
  type CedolinoDayPreview,
} from '../engine/cedolino-importer'

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
      await onApplyDays(
        month,
        importResult.daysToSave,
        parsedNetto !== null && !isNaN(parsedNetto) ? parsedNetto : null,
        retribuzione,
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
