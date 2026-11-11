'use client'

import React, { useState } from 'react'
import {
  Briefcase,
  Check,
  Clock,
  Coins,
  Sparkles,
  Utensils,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Calendar,
  Layers,
  Award,
} from 'lucide-react'
import { Button } from '@dexhub/ui'
import {
  useCcnlList,
  useUpdateContract,
  useUpsertFiscalConfig,
  useCreateRetribuzione,
  useUpdateMensaConfig,
  type CcnlOption,
  type ContractConfig,
} from '../services/worklog-api'
import type { WorklogTranslations } from '../i18n'

interface Props {
  initialContract?: ContractConfig | null
  initialCcnlId?: string | null
  currentMonth: string // 'YYYY-MM'
  isConfigured?: boolean
  t: WorklogTranslations
  onComplete: () => void
  onCancel?: () => void
}

const WEEKDAYS = [
  { id: 1, label: 'Lun' },
  { id: 2, label: 'Mar' },
  { id: 3, label: 'Mer' },
  { id: 4, label: 'Gio' },
  { id: 5, label: 'Ven' },
  { id: 6, label: 'Sab' },
  { id: 7, label: 'Dom' },
]

export function WorklogSetupWizard({
  initialContract,
  initialCcnlId,
  currentMonth,
  isConfigured = false,
  t,
  onComplete,
  onCancel,
}: Props) {
  const { data: ccnlList = [], isLoading: isLoadingCcnl } = useCcnlList()

  const updateContract = useUpdateContract()
  const upsertFiscal = useUpsertFiscalConfig()
  const createRetribuzione = useCreateRetribuzione()
  const updateMensa = useUpdateMensaConfig()

  // ── Step 1: CCNL & Inquadramento ──
  const [ccnlId, setCcnlId] = useState<string>(() => {
    if (initialCcnlId) return initialCcnlId
    // Default to Metalmeccanico if present
    return 'metalmeccanica-industria'
  })
  const [tipoContratto, setTipoContratto] = useState<'ordinario' | 'apprendistato'>('ordinario')
  const [regimeOrario, setRegimeOrario] = useState<'giornaliero' | 'turnista'>('giornaliero')
  const [mensilita, setMensilita] = useState<13 | 14>(13)

  // ── Step 2: Orario di Lavoro ──
  const [oreGiornaliere, setOreGiornaliere] = useState<number>(
    initialContract?.oreGiornaliereStandard ?? 8,
  )
  const [oreSettimanali, setOreSettimanali] = useState<number>(
    initialContract?.oreLavorativeSettimanali ?? 40,
  )
  const [giorniLavorativi, setGiorniLavorativi] = useState<number[]>(
    initialContract?.giorniLavorativiSettimana ?? [1, 2, 3, 4, 5],
  )

  // ── Step 3: Retribuzione & Benefit ──
  const [retribuzioneTipo, setRetribuzioneTipo] = useState<'monthly' | 'hourly'>('monthly')
  const [importoStr, setImportoStr] = useState<string>('2200.00')
  const [decorrenza, setDecorrenza] = useState<string>(currentMonth)

  // Mensa / Buoni Pasto
  const [hasMensa, setHasMensa] = useState<boolean>(false)
  const [mensaImportoStr, setMensaImportoStr] = useState<string>('5.29')

  // Saldi Iniziali Ferie/ROL (Opzionale)
  const [showInitialBalances, setShowInitialBalances] = useState<boolean>(false)
  const [saldoAllaData, setSaldoAllaData] = useState<string>(`${currentMonth}-01`)
  const [ferieInizialiStr, setFerieInizialiStr] = useState<string>('')
  const [permessiInizialiStr, setPermessiInizialiStr] = useState<string>('')

  // Submission state
  const [saving, setSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  function toggleWeekday(id: number) {
    setGiorniLavorativi((prev) => {
      const exists = prev.includes(id)
      const next = exists ? prev.filter((d) => d !== id) : [...prev, id].sort()
      if (next.length === 0) return prev // prevent 0 workdays
      setOreSettimanali(Number((next.length * oreGiornaliere).toFixed(1)))
      return next
    })
  }

  function handleDailyHoursChange(hours: number) {
    const valid = Math.max(1, Math.min(24, hours))
    setOreGiornaliere(valid)
    setOreSettimanali(Number((giorniLavorativi.length * valid).toFixed(1)))
  }

  function handleCcnlSelect(selectedId: string) {
    setCcnlId(selectedId)
    if (selectedId === 'metalmeccanica-industria') {
      setMensilita(13)
      setOreSettimanali(40)
      setOreGiornaliere(8)
    } else if (selectedId === 'commercio-terziario') {
      setMensilita(14)
      setOreSettimanali(40)
      setOreGiornaliere(8)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!ccnlId) {
      setErrorMsg('Seleziona un contratto collettivo CCNL per proseguire.')
      return
    }

    const importoNum = parseFloat(importoStr)
    if (isNaN(importoNum) || importoNum <= 0) {
      setErrorMsg('Inserisci un importo retributivo valido maggiore di zero.')
      return
    }

    setSaving(true)
    setErrorMsg(null)

    try {
      // 1. Save Contract
      const contractBody: ContractConfig = {
        oreGiornaliereStandard: oreGiornaliere,
        oreLavorativeSettimanali: oreSettimanali,
        giorniLavorativiSettimana: giorniLavorativi,
        regimeOrario,
        saldoAllaData: showInitialBalances && saldoAllaData ? saldoAllaData : null,
        ferieResidueOreIniziali: showInitialBalances && ferieInizialiStr ? parseFloat(ferieInizialiStr) || null : null,
        permessiResiduiOreIniziali: showInitialBalances && permessiInizialiStr ? parseFloat(permessiInizialiStr) || null : null,
        rateoFerieMensile: null,
        rateoPermessiMensile: null,
      }
      await updateContract.mutateAsync(contractBody)

      // 2. Save Fiscal Config
      await upsertFiscal.mutateAsync({
        ccnlId,
        tipoContratto,
        mensilita,
        regione: null,
        comune: null,
        aliquotaAddRegionale: null,
        aliquotaAddComunale: null,
        contributiInpsOverride: null,
      })

      // 3. Save Retribuzione
      if (retribuzioneTipo === 'monthly') {
        await createRetribuzione.mutateAsync({
          decorrenza,
          tipo: 'monthly',
          importo: importoNum,
          minimoTabellare: importoNum,
          superminimo: 0,
          scattiAnzianita: 0,
          premioProduzioneFisso: 0,
          premioFisso: null,
          note: 'Configurazione iniziale cartellino',
        })
      } else {
        await createRetribuzione.mutateAsync({
          decorrenza,
          tipo: 'hourly',
          importo: importoNum,
          minimoTabellare: null,
          superminimo: null,
          scattiAnzianita: null,
          premioProduzioneFisso: null,
          premioFisso: null,
          note: 'Configurazione iniziale cartellino (oraria)',
        })
      }

      // 4. Save Mensa if enabled
      if (hasMensa) {
        const mensaNum = parseFloat(mensaImportoStr) || 5.29
        await updateMensa.mutateAsync({
          attivo: true,
          importo: mensaNum,
        })
      }

      // Done! Notify parent to unlock
      onComplete()
    } catch (err) {
      console.error('Worklog setup error:', err)
      setErrorMsg(err instanceof Error ? err.message : t.wizard.error)
    } finally {
      setSaving(false)
    }
  }

  const selectedCcnlObj = ccnlList.find((c) => c.id === ccnlId)

  return (
    <div className="mx-auto max-w-3xl py-6 px-4">
      {/* Hero Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-surface-raised to-surface p-6 shadow-xl mb-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              <Sparkles size={13} className="text-primary animate-spin-slow" />
              {t.wizard.badge}
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-text">
              {t.wizard.title}
            </h1>
            <p className="text-sm text-text-muted max-w-xl leading-relaxed">
              {t.wizard.subtitle}
            </p>
          </div>
          <div className="hidden sm:flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20 text-primary shadow-inner">
            <Briefcase size={32} />
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Step 1: CCNL & Inquadramento */}
        <div className="rounded-2xl border border-border bg-surface-raised/80 backdrop-blur p-6 shadow-sm space-y-5">
          <div className="flex items-center gap-3 border-b border-border/70 pb-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 text-primary font-bold text-sm">
              1
            </div>
            <div>
              <h2 className="text-base font-semibold text-text">{t.wizard.step1Title}</h2>
              <p className="text-xs text-text-muted">{t.wizard.step1Desc}</p>
            </div>
          </div>

          {/* CCNL Cards */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-text-muted uppercase tracking-wider">
              {t.wizard.ccnlLabel}
            </label>
            {isLoadingCcnl ? (
              <div className="h-20 animate-pulse rounded-xl bg-surface border border-border" />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {ccnlList.map((c) => {
                  const isSelected = ccnlId === c.id
                  const isMetal = c.id === 'metalmeccanica-industria'
                  return (
                    <div
                      key={c.id}
                      onClick={() => handleCcnlSelect(c.id)}
                      className={[
                        'cursor-pointer relative flex flex-col justify-between rounded-xl border p-4 transition-all',
                        isSelected
                          ? 'border-primary bg-primary/10 shadow-md ring-1 ring-primary'
                          : 'border-border bg-surface hover:border-primary/50 hover:bg-surface-raised',
                      ].join(' ')}
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-sm font-semibold text-text leading-snug">
                            {c.nome}
                          </span>
                          {isMetal && (
                            <span className="shrink-0 inline-flex items-center gap-1 rounded bg-amber-500/15 border border-amber-500/30 px-1.5 py-0.5 text-[10px] font-semibold text-amber-400">
                              <Award size={10} /> Consigliato
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-1.5 text-[11px] text-text-muted pt-1">
                          {c.divisoreOrario && (
                            <span className="rounded bg-surface px-1.5 py-0.5 border border-border/80">
                              Divisore: {c.divisoreOrario}h
                            </span>
                          )}
                          {c.orarioSettimanale && (
                            <span className="rounded bg-surface px-1.5 py-0.5 border border-border/80">
                              {c.orarioSettimanale}h settimanali
                            </span>
                          )}
                          {c.defaultRolOreAnno && (
                            <span className="rounded bg-surface px-1.5 py-0.5 border border-border/80">
                              ROL: {c.defaultRolOreAnno}h/anno
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="mt-3 flex items-center justify-between border-t border-border/60 pt-2 text-[11px] text-text-subtle">
                        <span>Straordinario feriale: +{((c.maggiorazioni?.straordinarioDiurnoFeriale ?? 0.25) * 100).toFixed(0)}%</span>
                        {isSelected && (
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-white">
                            <Check size={12} />
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            {/* Tipo contratto */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-text-muted">
                {t.wizard.tipoContratto}
              </label>
              <div className="grid grid-cols-2 gap-1 rounded-lg border border-border bg-surface p-1">
                <button
                  type="button"
                  onClick={() => setTipoContratto('ordinario')}
                  className={[
                    'rounded-md py-1.5 text-xs font-medium transition-colors',
                    tipoContratto === 'ordinario' ? 'bg-primary text-white shadow-sm' : 'text-text-muted hover:text-text',
                  ].join(' ')}
                >
                  {t.fiscalConfig.ordinario}
                </button>
                <button
                  type="button"
                  onClick={() => setTipoContratto('apprendistato')}
                  className={[
                    'rounded-md py-1.5 text-xs font-medium transition-colors',
                    tipoContratto === 'apprendistato' ? 'bg-primary text-white shadow-sm' : 'text-text-muted hover:text-text',
                  ].join(' ')}
                >
                  {t.fiscalConfig.apprendistato}
                </button>
              </div>
            </div>

            {/* Regime Orario */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-text-muted">
                {t.wizard.regime}
              </label>
              <div className="grid grid-cols-2 gap-1 rounded-lg border border-border bg-surface p-1">
                <button
                  type="button"
                  onClick={() => setRegimeOrario('giornaliero')}
                  className={[
                    'rounded-md py-1.5 text-xs font-medium transition-colors',
                    regimeOrario === 'giornaliero' ? 'bg-primary text-white shadow-sm' : 'text-text-muted hover:text-text',
                  ].join(' ')}
                >
                  Giornaliero
                </button>
                <button
                  type="button"
                  onClick={() => setRegimeOrario('turnista')}
                  className={[
                    'rounded-md py-1.5 text-xs font-medium transition-colors',
                    regimeOrario === 'turnista' ? 'bg-primary text-white shadow-sm' : 'text-text-muted hover:text-text',
                  ].join(' ')}
                >
                  Turnista
                </button>
              </div>
            </div>

            {/* Mensilità */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-text-muted">
                {t.wizard.mensilita}
              </label>
              <div className="grid grid-cols-2 gap-1 rounded-lg border border-border bg-surface p-1">
                <button
                  type="button"
                  onClick={() => setMensilita(13)}
                  className={[
                    'rounded-md py-1.5 text-xs font-medium transition-colors',
                    mensilita === 13 ? 'bg-primary text-white shadow-sm' : 'text-text-muted hover:text-text',
                  ].join(' ')}
                >
                  13 mensilità
                </button>
                <button
                  type="button"
                  onClick={() => setMensilita(14)}
                  className={[
                    'rounded-md py-1.5 text-xs font-medium transition-colors',
                    mensilita === 14 ? 'bg-primary text-white shadow-sm' : 'text-text-muted hover:text-text',
                  ].join(' ')}
                >
                  14 mensilità
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Step 2: Orario di Lavoro & Settimana Standard */}
        <div className="rounded-2xl border border-border bg-surface-raised/80 backdrop-blur p-6 shadow-sm space-y-5">
          <div className="flex items-center gap-3 border-b border-border/70 pb-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 text-primary font-bold text-sm">
              2
            </div>
            <div>
              <h2 className="text-base font-semibold text-text">{t.wizard.step2Title}</h2>
              <p className="text-xs text-text-muted">{t.wizard.step2Desc}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Ore giornaliere standard */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-text-muted">
                {t.wizard.standardDailyHours}
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={12}
                  step={0.5}
                  value={oreGiornaliere}
                  onChange={(e) => handleDailyHoursChange(parseFloat(e.target.value) || 8)}
                  className="w-24 rounded-lg border border-border bg-surface px-3 py-2 text-sm font-semibold text-text focus:border-primary focus:outline-none"
                />
                <span className="text-sm text-text-muted">ore al giorno</span>
                <div className="flex items-center gap-1 ml-auto">
                  {[8, 7.5, 6].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => handleDailyHoursChange(preset)}
                      className={[
                        'rounded-md border px-2 py-1 text-xs font-medium transition-colors',
                        oreGiornaliere === preset
                          ? 'border-primary bg-primary/10 text-primary font-bold'
                          : 'border-border bg-surface text-text-muted hover:bg-surface-raised',
                      ].join(' ')}
                    >
                      {preset}h
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Ore settimanali totali */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-text-muted">
                {t.wizard.standardWeeklyHours}
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={60}
                  step={0.5}
                  value={oreSettimanali}
                  onChange={(e) => setOreSettimanali(parseFloat(e.target.value) || 40)}
                  className="w-24 rounded-lg border border-border bg-surface px-3 py-2 text-sm font-semibold text-text focus:border-primary focus:outline-none"
                />
                <span className="text-sm text-text-muted">ore settimanali</span>
              </div>
            </div>
          </div>

          {/* Giorni lavorativi settimanali */}
          <div className="space-y-2 pt-1">
            <label className="text-xs font-semibold text-text-muted">
              {t.wizard.workingDays}
            </label>
            <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
              {WEEKDAYS.map((w) => {
                const isActive = giorniLavorativi.includes(w.id)
                const isWeekend = w.id >= 6
                return (
                  <button
                    key={w.id}
                    type="button"
                    onClick={() => toggleWeekday(w.id)}
                    className={[
                      'flex flex-col items-center justify-center rounded-xl border py-2.5 px-1 text-xs font-semibold transition-all',
                      isActive
                        ? 'border-primary bg-primary text-white shadow-sm'
                        : isWeekend
                          ? 'border-border/60 bg-surface/50 text-text-subtle hover:border-primary/40'
                          : 'border-border bg-surface text-text-muted hover:border-primary/40',
                    ].join(' ')}
                  >
                    <span>{w.label}</span>
                    <span className="text-[10px] opacity-80 mt-0.5">
                      {isActive ? `${oreGiornaliere}h` : 'Riposo'}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Step 3: Retribuzione & Benefit */}
        <div className="rounded-2xl border border-border bg-surface-raised/80 backdrop-blur p-6 shadow-sm space-y-5">
          <div className="flex items-center gap-3 border-b border-border/70 pb-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 text-primary font-bold text-sm">
              3
            </div>
            <div>
              <h2 className="text-base font-semibold text-text">{t.wizard.step3Title}</h2>
              <p className="text-xs text-text-muted">{t.wizard.step3Desc}</p>
            </div>
          </div>

          {/* Tipo e importo retribuzione */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-text-muted">
                {t.wizard.payType}
              </label>
              <div className="grid grid-cols-2 gap-1 rounded-lg border border-border bg-surface p-1">
                <button
                  type="button"
                  onClick={() => {
                    setRetribuzioneTipo('monthly')
                    if (importoStr === '12.50') setImportoStr('2200.00')
                  }}
                  className={[
                    'rounded-md py-1.5 text-xs font-medium transition-colors',
                    retribuzioneTipo === 'monthly' ? 'bg-primary text-white shadow-sm' : 'text-text-muted hover:text-text',
                  ].join(' ')}
                >
                  Mensile lorda
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRetribuzioneTipo('hourly')
                    if (importoStr === '2200.00') setImportoStr('12.50')
                  }}
                  className={[
                    'rounded-md py-1.5 text-xs font-medium transition-colors',
                    retribuzioneTipo === 'hourly' ? 'bg-primary text-white shadow-sm' : 'text-text-muted hover:text-text',
                  ].join(' ')}
                >
                  Paga oraria
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-text-muted">
                {t.wizard.amountLabel}
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-sm font-semibold text-text-muted">
                  €
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  required
                  value={importoStr}
                  onChange={(e) => setImportoStr(e.target.value)}
                  placeholder={retribuzioneTipo === 'monthly' ? '2200.00' : '12.50'}
                  className="w-full rounded-lg border border-border bg-surface pl-8 pr-3 py-2 text-sm font-bold text-text focus:border-primary focus:outline-none"
                />
              </div>
              <p className="text-[11px] text-text-subtle">
                {retribuzioneTipo === 'monthly'
                  ? 'Retribuzione mensile lorda di fatto (minimo tabellare + superminimo)'
                  : 'Tariffa oraria lorda'}
              </p>
            </div>
          </div>

          {/* Buoni Pasto / Mensa Toggle */}
          <div className="rounded-xl border border-border bg-surface p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Utensils size={16} />
                </div>
                <div>
                  <div className="text-sm font-semibold text-text">
                    {t.wizard.ticketRestaurant}
                  </div>
                  <div className="text-xs text-text-muted">
                    {t.wizard.ticketRestaurantDesc}
                  </div>
                </div>
              </div>
              <label className="relative inline-flex cursor-pointer items-center">
                <input
                  type="checkbox"
                  checked={hasMensa}
                  onChange={(e) => setHasMensa(e.target.checked)}
                  className="peer sr-only"
                />
                <div className="peer h-6 w-11 rounded-full bg-border after:absolute after:top-[2px] after:left-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:bg-primary peer-checked:after:translate-x-full peer-focus:outline-none" />
              </label>
            </div>

            {hasMensa && (
              <div className="pt-2 border-t border-border/60 flex items-center gap-3">
                <label className="text-xs text-text-muted shrink-0">
                  {t.wizard.ticketAmount}
                </label>
                <div className="relative w-32">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-2.5 text-xs text-text-muted">
                    €
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={mensaImportoStr}
                    onChange={(e) => setMensaImportoStr(e.target.value)}
                    className="w-full rounded-md border border-border bg-surface-raised pl-6 pr-2 py-1 text-xs font-semibold text-text focus:border-primary focus:outline-none"
                  />
                </div>
                <div className="flex gap-1.5">
                  {['5.29', '8.00'].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setMensaImportoStr(preset)}
                      className="rounded bg-surface-raised border border-border px-2 py-0.5 text-[11px] text-text-muted hover:text-text"
                    >
                      € {preset}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Saldi Iniziali Ferie/ROL Opzionale Accordion */}
          <div className="rounded-xl border border-border/80 bg-surface/50 overflow-hidden">
            <button
              type="button"
              onClick={() => setShowInitialBalances((v) => !v)}
              className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-surface-raised transition-colors"
            >
              <div className="flex items-center gap-2">
                <Calendar size={15} className="text-text-muted" />
                <span className="text-xs font-semibold text-text">
                  {t.wizard.initialBalancesTitle}
                </span>
              </div>
              {showInitialBalances ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
            </button>

            {showInitialBalances && (
              <div className="p-4 border-t border-border/70 space-y-3 bg-surface">
                <p className="text-xs text-text-muted">
                  {t.wizard.initialBalancesDesc}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-text-muted">
                      {t.wizard.initialDate}
                    </label>
                    <input
                      type="date"
                      value={saldoAllaData}
                      onChange={(e) => setSaldoAllaData(e.target.value)}
                      className="w-full rounded-md border border-border bg-surface px-2.5 py-1.5 text-xs text-text focus:border-primary focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-text-muted">
                      {t.wizard.initialVacation}
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      placeholder="es. 16"
                      value={ferieInizialiStr}
                      onChange={(e) => setFerieInizialiStr(e.target.value)}
                      className="w-full rounded-md border border-border bg-surface px-2.5 py-1.5 text-xs text-text focus:border-primary focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-text-muted">
                      {t.wizard.initialLeave}
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      placeholder="es. 24"
                      value={permessiInizialiStr}
                      onChange={(e) => setPermessiInizialiStr(e.target.value)}
                      className="w-full rounded-md border border-border bg-surface px-2.5 py-1.5 text-xs text-text focus:border-primary focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Error message */}
        {errorMsg && (
          <div className="flex items-center gap-2 rounded-xl border border-danger/40 bg-danger/10 p-4 text-xs font-medium text-danger">
            <AlertCircle size={16} className="shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Submit & Cancel Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
          <p className="text-xs text-text-subtle text-center sm:text-left">
            Potrai modificare tutti questi parametri in ogni momento dalle Impostazioni del Cartellino.
          </p>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            {isConfigured && onCancel && (
              <Button
                type="button"
                variant="secondary"
                size="lg"
                onClick={onCancel}
                disabled={saving}
                className="w-full sm:w-auto px-6 py-3 text-sm"
              >
                Annulla
              </Button>
            )}
            <Button
              type="submit"
              variant="primary"
              size="lg"
              disabled={saving}
              className="w-full sm:w-auto px-8 py-3 text-sm font-semibold shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all"
            >
              {saving ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  {t.wizard.saving}
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Sparkles size={16} />
                  {t.wizard.submitBtn}
                </span>
              )}
            </Button>
          </div>
        </div>
      </form>
    </div>
  )
}
