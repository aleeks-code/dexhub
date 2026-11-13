'use client'

import React, { useState, useEffect, useRef } from 'react'
import {
  Briefcase,
  Check,
  Clock,
  Coins,
  Sparkles,
  Utensils,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Calendar,
  Award,
  Landmark,
  Users,
  ShieldCheck,
  CheckCircle2,
  Percent,
} from 'lucide-react'
import { Button } from '@dexhub/ui'
import { useQueryClient } from '@tanstack/react-query'
import {
  useCcnlList,
  useWorklogContract,
  useFiscalConfig,
  useRetribuzione,
  useMensaConfig,
  useCometaConfig,
  useSindacatoConfig,
  useUpdateContract,
  useUpsertFiscalConfig,
  useCreateRetribuzione,
  useUpdateRetribuzione,
  useUpdateMensaConfig,
  useUpdateCometaConfig,
  useUpsertSindacatoConfig,
  worklogKeys,
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

const ITALIAN_REGIONS = [
  'Abruzzo',
  'Basilicata',
  'Calabria',
  'Campania',
  'Emilia-Romagna',
  'Friuli-Venezia Giulia',
  'Lazio',
  'Liguria',
  'Lombardia',
  'Marche',
  'Molise',
  'Piemonte',
  'Puglia',
  'Sardegna',
  'Sicilia',
  'Toscana',
  'Trentino-Alto Adige',
  'Umbria',
  'Valle d\'Aosta',
  'Veneto',
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
  const queryClient = useQueryClient()
  const { data: ccnlList = [], isLoading: isLoadingCcnl } = useCcnlList()

  // Queries for existing configuration
  const { data: contractData } = useWorklogContract()
  const { data: fiscalData } = useFiscalConfig()
  const { data: retribuzioni = [] } = useRetribuzione()
  const { data: mensaData } = useMensaConfig()
  const { data: cometaData } = useCometaConfig()
  const { data: sindacatoData } = useSindacatoConfig()

  // Mutations
  const updateContract = useUpdateContract()
  const upsertFiscal = useUpsertFiscalConfig()
  const createRetribuzione = useCreateRetribuzione()
  const updateRetribuzione = useUpdateRetribuzione()
  const updateMensa = useUpdateMensaConfig()
  const updateCometa = useUpdateCometaConfig()
  const upsertSindacato = useUpsertSindacatoConfig()

  // Active step (1 to 4)
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1)

  // ── Step 1: CCNL & Inquadramento ──
  const [ccnlId, setCcnlId] = useState<string>(() => initialCcnlId ?? 'metalmeccanica-industria')
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

  // ── Step 3: Retribuzione & Busta Paga ──
  // Default decorrenza to start of current year (e.g. 2026-01) to support timesheets recorded from Jan onwards
  const currentYear = currentMonth.slice(0, 4)
  const startOfYear = `${currentYear}-01`
  const [decorrenza, setDecorrenza] = useState<string>(startOfYear)
  const [retribuzioneTipo, setRetribuzioneTipo] = useState<'monthly' | 'hourly'>('monthly')
  const [retribuzioneMode, setRetribuzioneMode] = useState<'quick' | 'breakdown'>('quick')
  const [importoStr, setImportoStr] = useState<string>('2200.00')

  // Cedolino breakdown components
  const [minimoTabellareStr, setMinimoTabellareStr] = useState<string>('1900.00')
  const [superminimoStr, setSuperminimoStr] = useState<string>('200.00')
  const [scattiAnzianitaStr, setScattiAnzianitaStr] = useState<string>('50.00')
  const [premioProduzioneFissoStr, setPremioProduzioneFissoStr] = useState<string>('50.00')

  // ── Step 4: Fisco, Benefit & Previdenza ──
  // Domicilio Fiscale
  const [regione, setRegione] = useState<string>('')
  const [comune, setComune] = useState<string>('')

  // Mensa / Buoni Pasto
  const [hasMensa, setHasMensa] = useState<boolean>(false)
  const [mensaImportoStr, setMensaImportoStr] = useState<string>('5.29')

  // Previdenza Complementare (es. Fondo Cometa)
  const [hasCometa, setHasCometa] = useState<boolean>(false)
  const [cometaAliquotaStr, setCometaAliquotaStr] = useState<string>('1.20')

  // Trattenuta Sindacale
  const [hasSindacato, setHasSindacato] = useState<boolean>(false)
  const [sindacatoNome, setSindacatoNome] = useState<string>('CGIL')
  const [sindacatoAliquotaStr, setSindacatoAliquotaStr] = useState<string>('1.00')

  // Saldi Iniziali Ferie/ROL (Opzionale)
  const [showInitialBalances, setShowInitialBalances] = useState<boolean>(false)
  const [saldoAllaData, setSaldoAllaData] = useState<string>(`${startOfYear}-01`)
  const [ferieInizialiStr, setFerieInizialiStr] = useState<string>('')
  const [permessiInizialiStr, setPermessiInizialiStr] = useState<string>('')
  const [rateoFerieStr, setRateoFerieStr] = useState<string>('13.33')
  const [rateoPermessiStr, setRateoPermessiStr] = useState<string>('6.00')

  // Submission & validation state
  const [saving, setSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Track if existing data has been initialized into state
  const isInitializedRef = useRef(false)

  // Synchronize state once existing queries resolve (if user already had data)
  useEffect(() => {
    if (isInitializedRef.current) return

    let loadedSomething = false

    // Fiscal
    if (fiscalData?.config) {
      loadedSomething = true
      if (fiscalData.config.ccnlId) setCcnlId(fiscalData.config.ccnlId)
      if (fiscalData.config.tipoContratto) setTipoContratto(fiscalData.config.tipoContratto)
      if (fiscalData.config.mensilita === 14) setMensilita(14)
      if (fiscalData.config.regione) setRegione(fiscalData.config.regione)
      if (fiscalData.config.comune) setComune(fiscalData.config.comune)
    }

    // Contract
    const effectiveContract = contractData ?? initialContract
    if (effectiveContract) {
      loadedSomething = true
      if (effectiveContract.oreGiornaliereStandard) setOreGiornaliere(effectiveContract.oreGiornaliereStandard)
      if (effectiveContract.oreLavorativeSettimanali) setOreSettimanali(effectiveContract.oreLavorativeSettimanali)
      if (effectiveContract.giorniLavorativiSettimana?.length) setGiorniLavorativi(effectiveContract.giorniLavorativiSettimana)
      if (effectiveContract.regimeOrario) setRegimeOrario(effectiveContract.regimeOrario)
      if (effectiveContract.saldoAllaData) {
        setSaldoAllaData(effectiveContract.saldoAllaData)
        setShowInitialBalances(true)
      }
      if (effectiveContract.ferieResidueOreIniziali != null) {
        setFerieInizialiStr(String(effectiveContract.ferieResidueOreIniziali))
        setShowInitialBalances(true)
      }
      if (effectiveContract.permessiResiduiOreIniziali != null) {
        setPermessiInizialiStr(String(effectiveContract.permessiResiduiOreIniziali))
        setShowInitialBalances(true)
      }
      if (effectiveContract.rateoFerieMensile != null) {
        setRateoFerieStr(String(effectiveContract.rateoFerieMensile))
      }
      if (effectiveContract.rateoPermessiMensile != null) {
        setRateoPermessiStr(String(effectiveContract.rateoPermessiMensile))
      }
    }

    // Retribuzione (find matching currentMonth or latest)
    if (retribuzioni && retribuzioni.length > 0) {
      loadedSomething = true
      const active = retribuzioni.find((r) => r.decorrenza === currentMonth) ?? retribuzioni[0]
      if (active) {
        setDecorrenza(active.decorrenza)
        setRetribuzioneTipo(active.tipo)
        setImportoStr(String(active.importo))

        if (active.minimoTabellare != null) {
          setRetribuzioneMode('breakdown')
          setMinimoTabellareStr(String(active.minimoTabellare))
          setSuperminimoStr(active.superminimo != null ? String(active.superminimo) : '0')
          setScattiAnzianitaStr(active.scattiAnzianita != null ? String(active.scattiAnzianita) : '0')
          setPremioProduzioneFissoStr(active.premioProduzioneFisso != null ? String(active.premioProduzioneFisso) : '0')
        } else {
          setRetribuzioneMode('quick')
        }
      }
    }

    // Mensa
    if (mensaData) {
      loadedSomething = true
      setHasMensa(mensaData.attivo)
      if (mensaData.importo) setMensaImportoStr(String(mensaData.importo))
    }

    // Cometa
    if (cometaData) {
      loadedSomething = true
      setHasCometa(cometaData.iscritto)
      if (cometaData.coefficiente != null) {
        setCometaAliquotaStr((cometaData.coefficiente * 100).toFixed(2))
      }
    }

    // Sindacato
    if (sindacatoData) {
      loadedSomething = true
      setHasSindacato(sindacatoData.iscritto)
      if (sindacatoData.nome) setSindacatoNome(sindacatoData.nome)
      if (sindacatoData.coefficiente != null) {
        setSindacatoAliquotaStr((sindacatoData.coefficiente * 100).toFixed(2))
      }
    }

    if (loadedSomething) {
      isInitializedRef.current = true
    }
  }, [contractData, initialContract, fiscalData, retribuzioni, mensaData, cometaData, sindacatoData, currentMonth])

  // Calculated breakdown total
  const breakdownSum = Number(
    (
      (parseFloat(minimoTabellareStr) || 0) +
      (parseFloat(superminimoStr) || 0) +
      (parseFloat(scattiAnzianitaStr) || 0) +
      (parseFloat(premioProduzioneFissoStr) || 0)
    ).toFixed(2)
  )

  // Effective monthly gross depending on mode
  const effectiveMonthlyGross = retribuzioneMode === 'breakdown' ? breakdownSum : parseFloat(importoStr) || 0

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
      setRateoFerieStr('13.33')
      setRateoPermessiStr('6.00')
    } else if (selectedId === 'commercio-terziario') {
      setMensilita(14)
      setOreSettimanali(40)
      setOreGiornaliere(8)
      setRateoFerieStr('14.00')
      setRateoPermessiStr('4.67')
    }
  }

  function validateStep(step: number): boolean {
    setErrorMsg(null)
    if (step === 1) {
      if (!ccnlId) {
        setErrorMsg('Seleziona un contratto collettivo CCNL per proseguire.')
        return false
      }
    }
    if (step === 2) {
      if (oreGiornaliere <= 0 || oreSettimanali <= 0) {
        setErrorMsg('Inserisci un orario di lavoro giornaliero e settimanale valido.')
        return false
      }
      if (giorniLavorativi.length === 0) {
        setErrorMsg('Seleziona almeno un giorno lavorativo a settimana.')
        return false
      }
    }
    if (step === 3) {
      if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(decorrenza)) {
        setErrorMsg('Inserisci un mese di decorrenza valido nel formato AAAA-MM (es. 2026-01).')
        return false
      }
      if (retribuzioneTipo === 'monthly') {
        const val = effectiveMonthlyGross
        if (isNaN(val) || val <= 0) {
          setErrorMsg('Inserisci un importo retributivo mensile lordo valido maggiore di zero.')
          return false
        }
      } else {
        const hVal = parseFloat(importoStr)
        if (isNaN(hVal) || hVal <= 0) {
          setErrorMsg('Inserisci una tariffa oraria valida maggiore di zero.')
          return false
        }
      }
    }
    return true
  }

  function handleNextStep() {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(4, prev + 1) as 1 | 2 | 3 | 4)
    }
  }

  function handlePrevStep() {
    setErrorMsg(null)
    setCurrentStep((prev) => Math.max(1, prev - 1) as 1 | 2 | 3 | 4)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validateStep(1) || !validateStep(2) || !validateStep(3)) {
      return
    }

    setSaving(true)
    setErrorMsg(null)

    try {
      // 1. Save Contract configuration
      const contractBody: ContractConfig = {
        oreGiornaliereStandard: oreGiornaliere,
        oreLavorativeSettimanali: oreSettimanali,
        giorniLavorativiSettimana: giorniLavorativi,
        regimeOrario,
        saldoAllaData: showInitialBalances && saldoAllaData ? saldoAllaData : null,
        ferieResidueOreIniziali: showInitialBalances && ferieInizialiStr ? parseFloat(ferieInizialiStr) || null : null,
        permessiResiduiOreIniziali: showInitialBalances && permessiInizialiStr ? parseFloat(permessiInizialiStr) || null : null,
        rateoFerieMensile: rateoFerieStr ? parseFloat(rateoFerieStr) || null : null,
        rateoPermessiMensile: rateoPermessiStr ? parseFloat(rateoPermessiStr) || null : null,
      }
      await updateContract.mutateAsync(contractBody)

      // 2. Save Fiscal configuration
      await upsertFiscal.mutateAsync({
        ccnlId,
        tipoContratto,
        mensilita,
        regione: regione.trim() || null,
        comune: comune.trim() || null,
        aliquotaAddRegionale: null,
        aliquotaAddComunale: null,
        contributiInpsOverride: null,
      })

      // 3. Save Retribuzione (update if decorrenza exists, create if not)
      const existingEntry = retribuzioni.find((r) => r.decorrenza === decorrenza)

      if (retribuzioneTipo === 'monthly') {
        const isBreakdown = retribuzioneMode === 'breakdown'
        const minimo = isBreakdown ? parseFloat(minimoTabellareStr) || 0 : parseFloat(importoStr) || 0
        const superm = isBreakdown ? parseFloat(superminimoStr) || 0 : 0
        const scatti = isBreakdown ? parseFloat(scattiAnzianitaStr) || 0 : 0
        const premio = isBreakdown ? parseFloat(premioProduzioneFissoStr) || 0 : 0
        const total = isBreakdown ? breakdownSum : parseFloat(importoStr) || 0

        const retribuzionePayload = {
          decorrenza,
          tipo: 'monthly' as const,
          importo: total,
          minimoTabellare: minimo,
          superminimo: superm,
          scattiAnzianita: scatti,
          premioProduzioneFisso: premio,
          premioFisso: null,
          note: isBreakdown ? 'Configurazione guidata cartellino (scomposizione cedolino)' : 'Configurazione guidata cartellino (lordo totale)',
        }

        if (existingEntry) {
          await updateRetribuzione.mutateAsync({ id: existingEntry.id, ...retribuzionePayload })
        } else {
          await createRetribuzione.mutateAsync(retribuzionePayload)
        }
      } else {
        const hourlyVal = parseFloat(importoStr) || 0
        const retribuzionePayload = {
          decorrenza,
          tipo: 'hourly' as const,
          importo: hourlyVal,
          minimoTabellare: null,
          superminimo: null,
          scattiAnzianita: null,
          premioProduzioneFisso: null,
          premioFisso: null,
          note: 'Configurazione guidata cartellino (oraria)',
        }

        if (existingEntry) {
          await updateRetribuzione.mutateAsync({ id: existingEntry.id, ...retribuzionePayload })
        } else {
          await createRetribuzione.mutateAsync(retribuzionePayload)
        }
      }

      // 4. Save Mensa / Buoni Pasto
      if (hasMensa) {
        const mensaNum = parseFloat(mensaImportoStr) || 5.29
        await updateMensa.mutateAsync({
          attivo: true,
          importo: mensaNum,
        })
      } else {
        await updateMensa.mutateAsync({
          attivo: false,
          importo: 0,
        })
      }

      // 5. Save Previdenza Complementare (es. Fondo Cometa)
      if (hasCometa) {
        const coeff = (parseFloat(cometaAliquotaStr) || 1.2) / 100
        await updateCometa.mutateAsync({
          iscritto: true,
          coefficiente: coeff,
        })
      } else {
        await updateCometa.mutateAsync({
          iscritto: false,
          coefficiente: null,
        })
      }

      // 6. Save Trattenuta Sindacale
      if (hasSindacato) {
        const coeff = (parseFloat(sindacatoAliquotaStr) || 1.0) / 100
        await upsertSindacato.mutateAsync({
          iscritto: true,
          coefficiente: coeff,
          nome: sindacatoNome.trim() || 'CGIL',
        })
      } else {
        await upsertSindacato.mutateAsync({
          iscritto: false,
          coefficiente: 0.01,
          nome: null,
        })
      }

      // 7. Refresh all queries so cartellino is immediately fully unlocked
      await queryClient.invalidateQueries({ queryKey: worklogKeys.all })

      // Done! Notify parent component
      onComplete()
    } catch (err) {
      console.error('Worklog setup error:', err)
      setErrorMsg(err instanceof Error ? err.message : t.wizard.error)
    } finally {
      setSaving(false)
    }
  }

  // Steps definition for top stepper
  const STEPS_NAV = [
    { num: 1, title: 'Inquadramento', desc: 'CCNL e Contratto', icon: Briefcase },
    { num: 2, title: 'Orario', desc: 'Ore e Giorni', icon: Clock },
    { num: 3, title: 'Retribuzione', desc: 'Lordo e Cedolino', icon: Coins },
    { num: 4, title: 'Fisco & Benefit', desc: 'Addizionali e Fondi', icon: ShieldCheck },
  ]

  return (
    <div className="mx-auto max-w-3xl py-4 sm:py-6 px-3 sm:px-4">
      {/* Hero Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-surface-raised to-surface p-5 sm:p-6 shadow-xl mb-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              <Sparkles size={13} className="text-primary animate-spin-slow" />
              {t.wizard.badge}
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-text">
              {t.wizard.title}
            </h1>
            <p className="text-xs sm:text-sm text-text-muted max-w-xl leading-relaxed">
              {t.wizard.subtitle}
            </p>
          </div>
          <div className="hidden sm:flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20 text-primary shadow-inner">
            <Briefcase size={28} />
          </div>
        </div>
      </div>

      {/* Stepper Header */}
      <div className="mb-6 rounded-2xl border border-border bg-surface-raised p-3 sm:p-4 shadow-sm">
        <div className="grid grid-cols-4 gap-2">
          {STEPS_NAV.map((step) => {
            const isCurrent = currentStep === step.num
            const isCompleted = currentStep > step.num
            const StepIcon = step.icon

            return (
              <button
                key={step.num}
                type="button"
                onClick={() => {
                  if (step.num < currentStep || validateStep(currentStep)) {
                    setCurrentStep(step.num as 1 | 2 | 3 | 4)
                  }
                }}
                className={[
                  'flex flex-col sm:flex-row items-center gap-2 p-2 sm:p-2.5 rounded-xl transition-all text-left',
                  isCurrent
                    ? 'bg-primary/15 border border-primary/30 shadow-sm'
                    : isCompleted
                      ? 'bg-surface hover:bg-surface/80 border border-border/80'
                      : 'hover:bg-surface/40 opacity-70 border border-transparent',
                ].join(' ')}
              >
                <div
                  className={[
                    'flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold transition-all',
                    isCurrent
                      ? 'bg-primary text-white shadow-sm ring-2 ring-primary/30'
                      : isCompleted
                        ? 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/30'
                        : 'bg-surface text-text-muted border border-border',
                  ].join(' ')}
                >
                  {isCompleted ? <Check size={14} className="stroke-[3]" /> : <StepIcon size={14} />}
                </div>
                <div className="min-w-0 text-center sm:text-left">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                    {t.wizard.step} {step.num}
                  </div>
                  <div className="truncate text-xs font-semibold text-text">
                    {step.title}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* ── STEP 1: CCNL & INQUADRAMENTO ── */}
        {currentStep === 1 && (
          <div className="rounded-2xl border border-border bg-surface-raised/80 backdrop-blur p-5 sm:p-6 shadow-sm space-y-5 animate-in fade-in duration-200">
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
                <div className="h-24 animate-pulse rounded-xl bg-surface border border-border" />
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
                              <span className="shrink-0 inline-flex items-center gap-1 rounded bg-primary/15 border border-primary/30 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
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
                          <span>
                            Straordinario feriale: +{((c.maggiorazioni?.straordinarioDiurnoFeriale ?? 0.25) * 100).toFixed(0)}%
                          </span>
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
        )}

        {/* ── STEP 2: ORARIO DI LAVORO ── */}
        {currentStep === 2 && (
          <div className="rounded-2xl border border-border bg-surface-raised/80 backdrop-blur p-5 sm:p-6 shadow-sm space-y-5 animate-in fade-in duration-200">
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
        )}

        {/* ── STEP 3: RETRIBUZIONE & CEDOLINO ── */}
        {currentStep === 3 && (
          <div className="rounded-2xl border border-border bg-surface-raised/80 backdrop-blur p-5 sm:p-6 shadow-sm space-y-5 animate-in fade-in duration-200">
            <div className="flex items-center gap-3 border-b border-border/70 pb-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 text-primary font-bold text-sm">
                3
              </div>
              <div>
                <h2 className="text-base font-semibold text-text">{t.wizard.step3Title}</h2>
                <p className="text-xs text-text-muted">{t.wizard.step3Desc}</p>
              </div>
            </div>

            {/* Decorrenza Selector */}
            <div className="rounded-xl border border-border bg-surface p-4 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <label className="text-xs font-semibold text-text">
                    {t.wizard.effectiveFrom}
                  </label>
                  <p className="text-[11px] text-text-muted">
                    Mese a partire dal quale questa retribuzione è attiva per i tuoi cartellini.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="month"
                    value={decorrenza}
                    onChange={(e) => setDecorrenza(e.target.value)}
                    className="rounded-lg border border-border bg-surface-raised px-3 py-1.5 text-xs font-semibold text-text focus:border-primary focus:outline-none"
                  />
                </div>
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setDecorrenza(startOfYear)}
                  className={[
                    'rounded-md border px-2.5 py-1 text-xs font-medium transition-colors',
                    decorrenza === startOfYear
                      ? 'border-primary bg-primary/10 text-primary font-bold'
                      : 'border-border bg-surface-raised text-text-muted hover:text-text',
                  ].join(' ')}
                >
                  Inizio anno ({startOfYear})
                </button>
                <button
                  type="button"
                  onClick={() => setDecorrenza(currentMonth)}
                  className={[
                    'rounded-md border px-2.5 py-1 text-xs font-medium transition-colors',
                    decorrenza === currentMonth
                      ? 'border-primary bg-primary/10 text-primary font-bold'
                      : 'border-border bg-surface-raised text-text-muted hover:text-text',
                  ].join(' ')}
                >
                  Mese corrente ({currentMonth})
                </button>
              </div>
            </div>

            {/* Tipo retribuzione (Mensile vs Oraria) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-text-muted">
                  {t.wizard.payType}
                </label>
                <div className="grid grid-cols-2 gap-1 rounded-lg border border-border bg-surface p-1">
                  <button
                    type="button"
                    onClick={() => setRetribuzioneTipo('monthly')}
                    className={[
                      'rounded-md py-1.5 text-xs font-medium transition-colors',
                      retribuzioneTipo === 'monthly' ? 'bg-primary text-white shadow-sm' : 'text-text-muted hover:text-text',
                    ].join(' ')}
                  >
                    Mensile lorda
                  </button>
                  <button
                    type="button"
                    onClick={() => setRetribuzioneTipo('hourly')}
                    className={[
                      'rounded-md py-1.5 text-xs font-medium transition-colors',
                      retribuzioneTipo === 'hourly' ? 'bg-primary text-white shadow-sm' : 'text-text-muted hover:text-text',
                    ].join(' ')}
                  >
                    Paga oraria
                  </button>
                </div>
              </div>

              {retribuzioneTipo === 'monthly' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-text-muted">
                    Modalità di inserimento
                  </label>
                  <div className="grid grid-cols-2 gap-1 rounded-lg border border-border bg-surface p-1">
                    <button
                      type="button"
                      onClick={() => setRetribuzioneMode('quick')}
                      className={[
                        'rounded-md py-1.5 text-xs font-medium transition-colors',
                        retribuzioneMode === 'quick' ? 'bg-primary text-white shadow-sm' : 'text-text-muted hover:text-text',
                      ].join(' ')}
                    >
                      {t.wizard.quickMode}
                    </button>
                    <button
                      type="button"
                      onClick={() => setRetribuzioneMode('breakdown')}
                      className={[
                        'rounded-md py-1.5 text-xs font-medium transition-colors',
                        retribuzioneMode === 'breakdown' ? 'bg-primary text-white shadow-sm' : 'text-text-muted hover:text-text',
                      ].join(' ')}
                    >
                      {t.wizard.breakdownMode}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Case A: Hourly */}
            {retribuzioneTipo === 'hourly' && (
              <div className="rounded-xl border border-border bg-surface p-4 space-y-2">
                <label className="text-xs font-semibold text-text">
                  Tariffa oraria lorda (€)
                </label>
                <div className="relative w-full sm:w-64">
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
                    placeholder="12.50"
                    className="w-full rounded-lg border border-border bg-surface-raised pl-8 pr-3 py-2 text-sm font-bold text-text focus:border-primary focus:outline-none"
                  />
                </div>
                <p className="text-[11px] text-text-subtle">
                  Ogni ora ordinaria registrata nel mese verrà moltiplicata per questa tariffa oraria.
                </p>
              </div>
            )}

            {/* Case B: Monthly Quick */}
            {retribuzioneTipo === 'monthly' && retribuzioneMode === 'quick' && (
              <div className="rounded-xl border border-border bg-surface p-4 space-y-2">
                <label className="text-xs font-semibold text-text">
                  Stipendio mensile lordo di fatto (€)
                </label>
                <div className="relative w-full sm:w-72">
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
                    placeholder="2200.00"
                    className="w-full rounded-lg border border-border bg-surface-raised pl-8 pr-3 py-2 text-sm font-bold text-text focus:border-primary focus:outline-none"
                  />
                </div>
                <p className="text-[11px] text-text-subtle">
                  Verrà impostato come Minimo Tabellare di riferimento per le stime del netto e del costo orario.
                </p>
              </div>
            )}

            {/* Case C: Monthly Breakdown */}
            {retribuzioneTipo === 'monthly' && retribuzioneMode === 'breakdown' && (
              <div className="rounded-xl border border-border bg-surface p-4 space-y-4">
                <div className="flex items-center justify-between border-b border-border/70 pb-2">
                  <div>
                    <h3 className="text-xs font-semibold text-text uppercase tracking-wider">
                      Voci del Cedolino Paga
                    </h3>
                    <p className="text-[11px] text-text-muted">
                      Inserisci le voci fisse presenti nella testata del tuo cedolino paga.
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-semibold text-text-muted block">
                      Totale Lordo Calcolato
                    </span>
                    <span className="text-base font-bold text-primary">
                      € {breakdownSum.toFixed(2)}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-text">
                      {t.wizard.minimoTabellare}
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-2.5 text-xs font-medium text-text-muted">€</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={minimoTabellareStr}
                        onChange={(e) => setMinimoTabellareStr(e.target.value)}
                        placeholder="1900.00"
                        className="w-full rounded-md border border-border bg-surface-raised pl-7 pr-2.5 py-1.5 text-xs font-semibold text-text focus:border-primary focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-text">
                      {t.wizard.superminimo}
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-2.5 text-xs font-medium text-text-muted">€</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={superminimoStr}
                        onChange={(e) => setSuperminimoStr(e.target.value)}
                        placeholder="0.00"
                        className="w-full rounded-md border border-border bg-surface-raised pl-7 pr-2.5 py-1.5 text-xs font-semibold text-text focus:border-primary focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-text">
                      {t.wizard.scattiAnzianita}
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-2.5 text-xs font-medium text-text-muted">€</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={scattiAnzianitaStr}
                        onChange={(e) => setScattiAnzianitaStr(e.target.value)}
                        placeholder="0.00"
                        className="w-full rounded-md border border-border bg-surface-raised pl-7 pr-2.5 py-1.5 text-xs font-semibold text-text focus:border-primary focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-text">
                      {t.wizard.premioProduzione}
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-2.5 text-xs font-medium text-text-muted">€</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={premioProduzioneFissoStr}
                        onChange={(e) => setPremioProduzioneFissoStr(e.target.value)}
                        placeholder="0.00"
                        className="w-full rounded-md border border-border bg-surface-raised pl-7 pr-2.5 py-1.5 text-xs font-semibold text-text focus:border-primary focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="rounded-lg bg-surface-raised border border-border/80 p-2.5 flex items-center justify-between text-xs">
                  <span className="text-text-muted">
                    Somma voci: Minimo (€{minimoTabellareStr || '0'}) + Superminimo (€{superminimoStr || '0'}) + Scatti (€{scattiAnzianitaStr || '0'}) + Premio (€{premioProduzioneFissoStr || '0'})
                  </span>
                  <span className="font-bold text-text shrink-0 ml-2">
                    = € {breakdownSum.toFixed(2)}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── STEP 4: FISCO, BENEFIT & PREVIDENZA ── */}
        {currentStep === 4 && (
          <div className="rounded-2xl border border-border bg-surface-raised/80 backdrop-blur p-5 sm:p-6 shadow-sm space-y-5 animate-in fade-in duration-200">
            <div className="flex items-center gap-3 border-b border-border/70 pb-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 text-primary font-bold text-sm">
                4
              </div>
              <div>
                <h2 className="text-base font-semibold text-text">{t.wizard.step4Title}</h2>
                <p className="text-xs text-text-muted">{t.wizard.step4Desc}</p>
              </div>
            </div>

            {/* Domicilio Fiscale */}
            <div className="rounded-xl border border-border bg-surface p-4 space-y-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Landmark size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-text">{t.wizard.domicilioFiscale}</h3>
                  <p className="text-xs text-text-muted">{t.wizard.domicilioFiscaleDesc}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-text-muted">
                    {t.wizard.regione}
                  </label>
                  <select
                    value={regione}
                    onChange={(e) => setRegione(e.target.value)}
                    className="w-full rounded-md border border-border bg-surface-raised px-3 py-1.5 text-xs font-medium text-text focus:border-primary focus:outline-none"
                  >
                    <option value="">{t.wizard.regionePlaceholder}</option>
                    {ITALIAN_REGIONS.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-text-muted">
                    {t.wizard.comune}
                  </label>
                  <input
                    type="text"
                    value={comune}
                    onChange={(e) => setComune(e.target.value)}
                    placeholder={t.wizard.comunePlaceholder}
                    className="w-full rounded-md border border-border bg-surface-raised px-3 py-1.5 text-xs text-text focus:border-primary focus:outline-none"
                  />
                </div>
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
                <div className="pt-2 border-t border-border/60 flex flex-wrap items-center gap-3 animate-in fade-in duration-150">
                  <label className="text-xs text-text-muted shrink-0">
                    {t.wizard.ticketAmount}
                  </label>
                  <div className="relative w-28">
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
                    {['5.29', '7.00', '8.00'].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setMensaImportoStr(preset)}
                        className={[
                          'rounded bg-surface-raised border px-2 py-0.5 text-[11px] transition-colors',
                          mensaImportoStr === preset
                            ? 'border-primary bg-primary/10 text-primary font-bold'
                            : 'border-border text-text-muted hover:text-text',
                        ].join(' ')}
                      >
                        € {preset}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Previdenza Complementare (Fondo Cometa) */}
            <div className="rounded-xl border border-border bg-surface p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <ShieldCheck size={16} />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-text">
                      {t.wizard.cometaTitle}
                    </div>
                    <div className="text-xs text-text-muted">
                      {t.wizard.cometaDesc}
                    </div>
                  </div>
                </div>
                <label className="relative inline-flex cursor-pointer items-center">
                  <input
                    type="checkbox"
                    checked={hasCometa}
                    onChange={(e) => setHasCometa(e.target.checked)}
                    className="peer sr-only"
                  />
                  <div className="peer h-6 w-11 rounded-full bg-border after:absolute after:top-[2px] after:left-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:bg-primary peer-checked:after:translate-x-full peer-focus:outline-none" />
                </label>
              </div>

              {hasCometa && (
                <div className="pt-2 border-t border-border/60 flex flex-wrap items-center gap-3 animate-in fade-in duration-150">
                  <label className="text-xs text-text-muted shrink-0">
                    {t.wizard.cometaRate}
                  </label>
                  <div className="relative w-28">
                    <input
                      type="number"
                      step="0.05"
                      min="0"
                      max="100"
                      value={cometaAliquotaStr}
                      onChange={(e) => setCometaAliquotaStr(e.target.value)}
                      className="w-full rounded-md border border-border bg-surface-raised pl-2.5 pr-6 py-1 text-xs font-semibold text-text focus:border-primary focus:outline-none"
                    />
                    <span className="absolute inset-y-0 right-0 flex items-center pr-2 text-xs text-text-muted">
                      %
                    </span>
                  </div>
                  <div className="flex gap-1.5">
                    {['1.20', '2.00'].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setCometaAliquotaStr(preset)}
                        className={[
                          'rounded bg-surface-raised border px-2 py-0.5 text-[11px] transition-colors',
                          cometaAliquotaStr === preset
                            ? 'border-primary bg-primary/10 text-primary font-bold'
                            : 'border-border text-text-muted hover:text-text',
                        ].join(' ')}
                      >
                        {preset}%
                      </button>
                    ))}
                  </div>
                  <span className="text-[11px] text-text-subtle">
                    (Standard CCNL Metalmeccanico: 1.20%)
                  </span>
                </div>
              )}
            </div>

            {/* Trattenuta Sindacale */}
            <div className="rounded-xl border border-border bg-surface p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Users size={16} />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-text">
                      {t.wizard.sindacatoTitle}
                    </div>
                    <div className="text-xs text-text-muted">
                      {t.wizard.sindacatoDesc}
                    </div>
                  </div>
                </div>
                <label className="relative inline-flex cursor-pointer items-center">
                  <input
                    type="checkbox"
                    checked={hasSindacato}
                    onChange={(e) => setHasSindacato(e.target.checked)}
                    className="peer sr-only"
                  />
                  <div className="peer h-6 w-11 rounded-full bg-border after:absolute after:top-[2px] after:left-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:bg-primary peer-checked:after:translate-x-full peer-focus:outline-none" />
                </label>
              </div>

              {hasSindacato && (
                <div className="pt-2 border-t border-border/60 grid grid-cols-1 sm:grid-cols-2 gap-3 animate-in fade-in duration-150">
                  <div className="space-y-1">
                    <label className="text-xs text-text-muted">
                      {t.wizard.sindacatoNome}
                    </label>
                    <input
                      type="text"
                      value={sindacatoNome}
                      onChange={(e) => setSindacatoNome(e.target.value)}
                      placeholder="CGIL / FIOM"
                      className="w-full rounded-md border border-border bg-surface-raised px-2.5 py-1 text-xs text-text focus:border-primary focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-text-muted">
                      {t.wizard.sindacatoRate}
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.05"
                        min="0"
                        max="10"
                        value={sindacatoAliquotaStr}
                        onChange={(e) => setSindacatoAliquotaStr(e.target.value)}
                        placeholder="1.00"
                        className="w-full rounded-md border border-border bg-surface-raised pl-2.5 pr-6 py-1 text-xs font-semibold text-text focus:border-primary focus:outline-none"
                      />
                      <span className="absolute inset-y-0 right-0 flex items-center pr-2 text-xs text-text-muted">%</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Saldi & Ratei Ferie/ROL (Accordion) */}
            <div className="rounded-xl border border-border/80 bg-surface/50 overflow-hidden">
              <button
                type="button"
                onClick={() => setShowInitialBalances((v) => !v)}
                className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-surface-raised transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Calendar size={15} className="text-text-muted" />
                  <span className="text-xs font-semibold text-text">
                    {t.wizard.initialBalancesTitle} & Ratei
                  </span>
                </div>
                {showInitialBalances ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
              </button>

              {showInitialBalances && (
                <div className="p-4 border-t border-border/70 space-y-4 bg-surface animate-in fade-in duration-150">
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold text-text">Saldi Iniziali Precedenti</h4>
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
                          className="w-full rounded-md border border-border bg-surface-raised px-2.5 py-1.5 text-xs text-text focus:border-primary focus:outline-none"
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
                          className="w-full rounded-md border border-border bg-surface-raised px-2.5 py-1.5 text-xs text-text focus:border-primary focus:outline-none"
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
                          className="w-full rounded-md border border-border bg-surface-raised px-2.5 py-1.5 text-xs text-text focus:border-primary focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-border/60 pt-3 space-y-2">
                    <h4 className="text-xs font-semibold text-text">{t.wizard.rateiTitle}</h4>
                    <p className="text-xs text-text-muted">
                      {t.wizard.rateiDesc}
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[11px] font-medium text-text-muted">
                          {t.wizard.rateoFerie}
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={rateoFerieStr}
                          onChange={(e) => setRateoFerieStr(e.target.value)}
                          placeholder="13.33"
                          className="w-full rounded-md border border-border bg-surface-raised px-2.5 py-1.5 text-xs font-semibold text-text focus:border-primary focus:outline-none"
                        />
                        <span className="text-[10px] text-text-subtle block">Standard 160h annue: 13.33h/mese</span>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-medium text-text-muted">
                          {t.wizard.rateoPermessi}
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={rateoPermessiStr}
                          onChange={(e) => setRateoPermessiStr(e.target.value)}
                          placeholder="6.00"
                          className="w-full rounded-md border border-border bg-surface-raised px-2.5 py-1.5 text-xs font-semibold text-text focus:border-primary focus:outline-none"
                        />
                        <span className="text-[10px] text-text-subtle block">Standard 72h annue: 6.00h/mese (o 8.67h per 104h)</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Error message */}
        {errorMsg && (
          <div className="flex items-center gap-2 rounded-xl border border-danger/40 bg-danger/10 p-4 text-xs font-medium text-danger animate-in fade-in duration-150">
            <AlertCircle size={16} className="shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Footer Navigation Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
          <p className="text-xs text-text-subtle text-center sm:text-left">
            {t.wizard.modifyAnytime}
          </p>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            {isConfigured && onCancel && (
              <Button
                type="button"
                variant="secondary"
                size="md"
                onClick={onCancel}
                disabled={saving}
                className="px-4 py-2 text-xs"
              >
                {t.wizard.cancel}
              </Button>
            )}

            {currentStep > 1 && (
              <Button
                type="button"
                variant="secondary"
                size="md"
                onClick={handlePrevStep}
                disabled={saving}
                className="flex items-center gap-1.5 px-4 py-2 text-xs"
              >
                <ChevronLeft size={14} />
                {t.wizard.back}
              </Button>
            )}

            {currentStep < 4 ? (
              <Button
                type="button"
                variant="primary"
                size="md"
                onClick={handleNextStep}
                disabled={saving}
                className="flex items-center gap-1.5 px-5 py-2 text-xs font-semibold shadow-md shadow-primary/20"
              >
                {t.wizard.next}
                <ChevronRight size={14} />
              </Button>
            ) : (
              <Button
                type="submit"
                variant="primary"
                size="lg"
                disabled={saving}
                className="w-full sm:w-auto px-6 py-2.5 text-xs font-semibold shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all"
              >
                {saving ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    {t.wizard.saving}
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Sparkles size={15} />
                    {t.wizard.submitBtn}
                  </span>
                )}
              </Button>
            )}
          </div>
        </div>
      </form>
    </div>
  )
}
