'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import {
  Pizza,
  RotateCcw,
  Copy,
  Check,
  Bookmark,
  BookmarkPlus,
  Trash2,
  Sliders,
  ChevronDown,
  ChevronUp,
  Square,
  Circle,
  Thermometer,
  Clock,
  Droplets,
  Layers,
  Sparkles,
  Info,
  Scale,
  Zap,
  Wrench,
} from 'lucide-react'
import { Button, cn } from '@dexhub/ui'
import {
  calculateDough,
  calculatePanWeight,
  formatRecipeShareText,
  type DoughInput,
} from '../engine/calculator'
import {
  listSavedRecipes,
  saveRecipe,
  deleteRecipe,
  PRESET_RECIPES,
  type SavedRecipe,
} from '../services/pizza-service'

const DEFAULT_INPUT: DoughInput = {
  doughsNumber: 3,
  doughsWeight: 250,
  hydration: 65,
  saltPerLiter: 50,
  fatsPerLiter: 0, // Default always 0
  roomTemp: 21,
  risingTime: 8,
  fridgeRisingTime: 0,
  isGrandmaPizza: false,
}

const EASY_TIME_PRESETS = [
  {
    id: 'rapida-6h',
    label: '6 ore (Rapida)',
    sublabel: 'Oggi a cena',
    totalHours: 6,
    fridgeHours: 0,
    icon: Zap,
    desc: 'Tutto a temperatura ambiente in giornata',
  },
  {
    id: 'classica-8h',
    label: '8 ore (Classica)',
    sublabel: 'Standard Verace',
    totalHours: 8,
    fridgeHours: 0,
    icon: Pizza,
    desc: 'Lievitazione classica napoletana a temperatura ambiente',
  },
  {
    id: 'frigo-24h',
    label: '24 ore (Frigo)',
    sublabel: 'Alta digeribilità',
    totalHours: 24,
    fridgeHours: 18,
    icon: Clock,
    desc: '18h in frigorifero a 4°C + 6h appretto a temperatura ambiente',
  },
  {
    id: 'lunga-48h',
    label: '48 ore (Lunga)',
    sublabel: 'Massima maturazione',
    totalHours: 48,
    fridgeHours: 40,
    icon: Layers,
    desc: '40h in frigorifero a 4°C + 8h appretto a temperatura ambiente',
  },
]

export default function PizzaPage() {
  const [activeTab, setActiveTab] = useState<'calc' | 'saved' | 'presets'>('calc')
  const [calcMode, setCalcMode] = useState<'easy' | 'advanced'>('easy')
  const [input, setInput] = useState<DoughInput>(DEFAULT_INPUT)
  const [savedList, setSavedList] = useState<SavedRecipe[]>([])
  const [saveModalOpen, setSaveModalOpen] = useState(false)
  const [recipeName, setRecipeName] = useState('')
  const [recipeNotes, setRecipeNotes] = useState('')
  const [copied, setCopied] = useState(false)

  // Pan helper state (for advanced mode)
  const [panHelperOpen, setPanHelperOpen] = useState(false)
  const [panShape, setPanShape] = useState<'rectangular' | 'round'>('rectangular')
  const [panWidth, setPanWidth] = useState(30)
  const [panLength, setPanLength] = useState(40)
  const [panDiameter, setPanDiameter] = useState(32)
  const [panThickness, setPanThickness] = useState(0.55)

  // Load preferred mode from localStorage on mount
  useEffect(() => {
    try {
      const savedMode = localStorage.getItem('dexhub:pizza:calc_mode')
      if (savedMode === 'easy' || savedMode === 'advanced') {
        setCalcMode(savedMode)
      }
    } catch {
      // Ignore storage errors
    }
  }, [])

  function handleModeChange(mode: 'easy' | 'advanced') {
    setCalcMode(mode)
    try {
      localStorage.setItem('dexhub:pizza:calc_mode', mode)
    } catch {
      // Ignore
    }
  }

  const panWeightCalc = useMemo(() => {
    return calculatePanWeight({
      shape: panShape,
      width: panWidth,
      length: panLength,
      diameter: panDiameter,
      thicknessFactor: panThickness,
    })
  }, [panShape, panWidth, panLength, panDiameter, panThickness])

  // Core recipe calculation
  const recipe = useMemo(() => {
    return calculateDough(input)
  }, [input])

  // Load saved recipes on mount
  const refreshSaved = useCallback(async () => {
    const list = await listSavedRecipes()
    setSavedList(list)
  }, [])

  useEffect(() => {
    refreshSaved()
  }, [refreshSaved])

  function updateField<K extends keyof DoughInput>(key: K, value: DoughInput[K]) {
    setInput((prev) => {
      const next = { ...prev, [key]: value }
      if (key === 'risingTime' && (next.fridgeRisingTime ?? 0) > (value as number)) {
        next.fridgeRisingTime = value as number
      }
      return next
    })
  }

  // Toggle pizza type: always KEEP fats at 0 by default!
  function handleTypeToggle(isTeglia: boolean) {
    setInput((prev) => ({
      ...prev,
      isGrandmaPizza: isTeglia,
      fatsPerLiter: 0, // ALWAYS 0 by default as requested
      doughsWeight: isTeglia && prev.doughsWeight === 250 ? 550 : !isTeglia && prev.doughsWeight === 550 ? 250 : prev.doughsWeight,
      hydration: isTeglia && prev.hydration === 65 ? 75 : !isTeglia && prev.hydration === 75 ? 65 : prev.hydration,
    }))
  }

  function applyPanWeight() {
    updateField('doughsWeight', panWeightCalc)
    setPanHelperOpen(false)
  }

  async function handleCopy() {
    const text = formatRecipeShareText(recipeName || (input.isGrandmaPizza ? 'Pizza in Teglia' : 'Pizza Tonda'), recipe)
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      // Fallback
    }
  }

  async function handleSaveSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!recipeName.trim()) return
    await saveRecipe(recipeName.trim(), input, recipeNotes.trim() || undefined)
    setSaveModalOpen(false)
    setRecipeName('')
    setRecipeNotes('')
    await refreshSaved()
  }

  function handleLoadSaved(saved: SavedRecipe) {
    setInput(saved.input)
    setActiveTab('calc')
  }

  async function handleDeleteSaved(id: string) {
    await deleteRecipe(id)
    await refreshSaved()
  }

  function handleLoadPreset(presetInput: DoughInput) {
    setInput(presetInput)
    setActiveTab('calc')
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-5">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20">
            <Pizza className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-text">CalcolaPizza</h1>
            <p className="text-xs text-text-subtle">
              Calcolatore dosi impasto pizza tonda e in teglia · Algoritmo La Confraternita della Pizza
            </p>
          </div>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center rounded-lg border border-border bg-surface-raised p-1 text-xs font-medium">
          <button
            onClick={() => setActiveTab('calc')}
            className={cn(
              'flex items-center gap-1.5 rounded-md px-3 py-1.5 transition-all',
              activeTab === 'calc'
                ? 'bg-surface text-primary font-semibold shadow-xs'
                : 'text-text-subtle hover:text-text',
            )}
          >
            <Sliders className="h-3.5 w-3.5" />
            Calcolatore
          </button>
          <button
            onClick={() => setActiveTab('saved')}
            className={cn(
              'flex items-center gap-1.5 rounded-md px-3 py-1.5 transition-all',
              activeTab === 'saved'
                ? 'bg-surface text-primary font-semibold shadow-xs'
                : 'text-text-subtle hover:text-text',
            )}
          >
            <Bookmark className="h-3.5 w-3.5" />
            Ricette salvate
            {savedList.length > 0 && (
              <span className="ml-1 rounded-full bg-primary/20 px-1.5 py-0.2 text-[10px] text-primary">
                {savedList.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('presets')}
            className={cn(
              'flex items-center gap-1.5 rounded-md px-3 py-1.5 transition-all',
              activeTab === 'presets'
                ? 'bg-surface text-primary font-semibold shadow-xs'
                : 'text-text-subtle hover:text-text',
            )}
          >
            <Sparkles className="h-3.5 w-3.5" />
            Preset classici
          </button>
        </div>
      </div>

      {/* TAB 1: CALCULATOR */}
      {activeTab === 'calc' && (
        <div className="space-y-4">
          {/* Easy vs Advanced Mode Switcher Banner */}
          <div className="flex items-center justify-between rounded-xl border border-border bg-surface px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-text">Modalità di calcolo:</span>
              <span className="text-xs text-text-subtle">
                {calcMode === 'easy'
                  ? 'Semplice ed essenziale con parametri guidati'
                  : 'Controllo completo su tutti i parametri di fermentazione'}
              </span>
            </div>

            <div className="flex items-center rounded-lg border border-border bg-surface-raised p-0.5 text-xs font-medium">
              <button
                type="button"
                onClick={() => handleModeChange('easy')}
                className={cn(
                  'flex items-center gap-1.5 rounded-md px-3 py-1.5 transition-all',
                  calcMode === 'easy'
                    ? 'bg-primary text-primary-foreground font-bold shadow-xs'
                    : 'text-text-subtle hover:text-text',
                )}
              >
                <Zap className="h-3.5 w-3.5" />
                Semplice (Easy)
              </button>
              <button
                type="button"
                onClick={() => handleModeChange('advanced')}
                className={cn(
                  'flex items-center gap-1.5 rounded-md px-3 py-1.5 transition-all',
                  calcMode === 'advanced'
                    ? 'bg-primary text-primary-foreground font-bold shadow-xs'
                    : 'text-text-subtle hover:text-text',
                )}
              >
                <Wrench className="h-3.5 w-3.5" />
                Avanzata (Advanced)
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            {/* LEFT COLUMN: Controls (7 cols) */}
            <div className="space-y-5 lg:col-span-7">
              {/* Type Toggle: Tonda vs Teglia */}
              <div className="rounded-xl border border-border bg-surface p-4 space-y-3">
                <label className="text-xs font-semibold uppercase tracking-wider text-text-subtle">
                  Cosa vuoi preparare?
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => handleTypeToggle(false)}
                    className={cn(
                      'flex flex-col items-center justify-center gap-1.5 rounded-lg border p-3.5 text-center transition-all',
                      !input.isGrandmaPizza
                        ? 'border-primary bg-primary/10 text-primary font-semibold shadow-xs ring-1 ring-primary/30'
                        : 'border-border bg-surface-raised text-text-muted hover:border-border-strong hover:text-text',
                    )}
                  >
                    <Pizza className="h-5 w-5" />
                    <span className="text-sm font-medium">Pizza Tonda</span>
                    <span className="text-[11px] opacity-75">Napoletana / Classica da piatto</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleTypeToggle(true)}
                    className={cn(
                      'flex flex-col items-center justify-center gap-1.5 rounded-lg border p-3.5 text-center transition-all',
                      input.isGrandmaPizza
                        ? 'border-primary bg-primary/10 text-primary font-semibold shadow-xs ring-1 ring-primary/30'
                        : 'border-border bg-surface-raised text-text-muted hover:border-border-strong hover:text-text',
                    )}
                  >
                    <Square className="h-5 w-5" />
                    <span className="text-sm font-medium">Pizza in Teglia</span>
                    <span className="text-[11px] opacity-75">Romana / Al taglio / Padellino</span>
                  </button>
                </div>

                {/* Pan Dimension Helper Accordion (available in Advanced mode or when needed) */}
                {input.isGrandmaPizza && calcMode === 'advanced' && (
                  <div className="mt-3 rounded-lg border border-border-strong bg-surface-raised/70 p-3">
                    <button
                      type="button"
                      onClick={() => setPanHelperOpen((v) => !v)}
                      className="flex w-full items-center justify-between text-xs font-semibold text-text"
                    >
                      <span className="flex items-center gap-1.5 text-primary">
                        <Scale className="h-3.5 w-3.5" />
                        Calcola peso panetto dalle misure della teglia
                      </span>
                      {panHelperOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>

                    {panHelperOpen && (
                      <div className="mt-3 space-y-3 pt-2 border-t border-border text-xs">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setPanShape('rectangular')}
                            className={cn(
                              'flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md border text-xs',
                              panShape === 'rectangular'
                                ? 'border-primary bg-primary/10 text-primary font-semibold'
                                : 'border-border text-text-muted',
                            )}
                          >
                            <Square className="h-3.5 w-3.5" /> Rettangolare
                          </button>
                          <button
                            type="button"
                            onClick={() => setPanShape('round')}
                            className={cn(
                              'flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md border text-xs',
                              panShape === 'round'
                                ? 'border-primary bg-primary/10 text-primary font-semibold'
                                : 'border-border text-text-muted',
                            )}
                          >
                            <Circle className="h-3.5 w-3.5" /> Tonda
                          </button>
                        </div>

                        {panShape === 'rectangular' ? (
                          <div className="grid grid-cols-2 gap-2.5">
                            <div>
                              <label className="text-[11px] text-text-subtle">Larghezza (cm)</label>
                              <input
                                type="number"
                                min={10}
                                max={100}
                                value={panWidth}
                                onChange={(e) => setPanWidth(Number(e.target.value))}
                                className="mt-1 w-full rounded-md border border-border bg-surface px-2.5 py-1.5 text-text"
                              />
                            </div>
                            <div>
                              <label className="text-[11px] text-text-subtle">Lunghezza (cm)</label>
                              <input
                                type="number"
                                min={10}
                                max={100}
                                value={panLength}
                                onChange={(e) => setPanLength(Number(e.target.value))}
                                className="mt-1 w-full rounded-md border border-border bg-surface px-2.5 py-1.5 text-text"
                              />
                            </div>
                          </div>
                        ) : (
                          <div>
                            <label className="text-[11px] text-text-subtle">Diametro teglia (cm)</label>
                            <input
                              type="number"
                              min={10}
                              max={60}
                              value={panDiameter}
                              onChange={(e) => setPanDiameter(Number(e.target.value))}
                              className="mt-1 w-full rounded-md border border-border bg-surface px-2.5 py-1.5 text-text"
                            />
                          </div>
                        )}

                        <div>
                          <div className="flex justify-between text-[11px]">
                            <span className="text-text-subtle">Spessore impasto (fattore teglia)</span>
                            <span className="font-semibold text-text">{panThickness.toFixed(2)} g/cm²</span>
                          </div>
                          <input
                            type="range"
                            min={0.45}
                            max={0.7}
                            step={0.01}
                            value={panThickness}
                            onChange={(e) => setPanThickness(Number(e.target.value))}
                            className="mt-1 w-full accent-primary"
                          />
                          <div className="flex justify-between text-[10px] text-text-subtle">
                            <span>Sottile/Croccante (0.48)</span>
                            <span>Romana standard (0.55)</span>
                            <span>Alta/Soffice (0.65)</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-1">
                          <span className="text-xs text-text">
                            Peso stimato teglia: <strong className="text-primary font-bold">{panWeightCalc}g</strong>
                          </span>
                          <Button size="sm" onClick={applyPanWeight} className="text-xs">
                            Applica al panetto ({panWeightCalc}g)
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* MODE 1: EASY MODE VIEW */}
              {calcMode === 'easy' && (
                <div className="rounded-xl border border-border bg-surface p-5 space-y-5">
                  {/* Step 1: Quante pizze e peso panetto */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold uppercase tracking-wider text-text-subtle">
                        1. Quantità e Dimensione
                      </span>
                      <span className="text-xs text-text-muted">
                        Totale impasto: <strong className="text-primary font-bold font-mono">{recipe.totalWeight}g</strong>
                      </span>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {/* Panetti Stepper with quick shortcuts */}
                      <div className="rounded-lg border border-border bg-surface-raised p-3 space-y-2">
                        <label className="text-xs font-medium text-text">
                          {input.isGrandmaPizza ? 'Quante teglie?' : 'Quanti panetti?'}
                        </label>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => updateField('doughsNumber', Math.max(1, input.doughsNumber - 1))}
                            className="flex h-9 w-9 items-center justify-center rounded-md border border-border bg-surface text-base font-bold text-text hover:bg-surface-raised"
                          >
                            -
                          </button>
                          <div className="flex-1 text-center font-mono text-lg font-bold text-text">
                            {input.doughsNumber}
                          </div>
                          <button
                            type="button"
                            onClick={() => updateField('doughsNumber', input.doughsNumber + 1)}
                            className="flex h-9 w-9 items-center justify-center rounded-md border border-border bg-surface text-base font-bold text-text hover:bg-surface-raised"
                          >
                            +
                          </button>
                        </div>
                        {/* Quick numbers */}
                        <div className="flex justify-between gap-1 pt-1">
                          {[2, 3, 4, 6, 8].map((n) => (
                            <button
                              key={n}
                              type="button"
                              onClick={() => updateField('doughsNumber', n)}
                              className={cn(
                                'flex-1 py-1 rounded text-xs font-mono transition-colors',
                                input.doughsNumber === n
                                  ? 'bg-primary text-primary-foreground font-bold'
                                  : 'bg-surface text-text-subtle hover:text-text border border-border',
                              )}
                            >
                              {n}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Peso Panetto with smart presets */}
                      <div className="rounded-lg border border-border bg-surface-raised p-3 space-y-2">
                        <div className="flex justify-between items-center">
                          <label className="text-xs font-medium text-text">
                            {input.isGrandmaPizza ? 'Peso impasto per teglia' : 'Peso singolo panetto'}
                          </label>
                          <span className="font-mono text-xs font-bold text-text">{input.doughsWeight}g</span>
                        </div>

                        {!input.isGrandmaPizza ? (
                          <div className="grid grid-cols-3 gap-1.5 pt-0.5">
                            {[
                              { label: '250g', sub: 'Standard', w: 250 },
                              { label: '280g', sub: 'Pizzeria', w: 280 },
                              { label: '300g', sub: 'Grande', w: 300 },
                            ].map((preset) => (
                              <button
                                key={preset.w}
                                type="button"
                                onClick={() => updateField('doughsWeight', preset.w)}
                                className={cn(
                                  'py-2 px-1 rounded-md border text-center transition-all',
                                  input.doughsWeight === preset.w
                                    ? 'border-primary bg-primary/10 text-primary font-bold'
                                    : 'border-border bg-surface text-text-muted hover:text-text',
                                )}
                              >
                                <div className="text-xs font-mono">{preset.label}</div>
                                <div className="text-[10px] opacity-75">{preset.sub}</div>
                              </button>
                            ))}
                          </div>
                        ) : (
                          <div className="grid grid-cols-3 gap-1.5 pt-0.5">
                            {[
                              { label: '500g', sub: 'Casalinga', w: 500 },
                              { label: '550g', sub: '30×40 cm', w: 550 },
                              { label: '650g', sub: 'Forno std', w: 650 },
                            ].map((preset) => (
                              <button
                                key={preset.w}
                                type="button"
                                onClick={() => updateField('doughsWeight', preset.w)}
                                className={cn(
                                  'py-2 px-1 rounded-md border text-center transition-all',
                                  input.doughsWeight === preset.w
                                    ? 'border-primary bg-primary/10 text-primary font-bold'
                                    : 'border-border bg-surface text-text-muted hover:text-text',
                                )}
                              >
                                <div className="text-xs font-mono">{preset.label}</div>
                                <div className="text-[10px] opacity-75">{preset.sub}</div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Step 2: Quando vuoi infornare? (Lievitazione guidata) */}
                  <div className="space-y-3 pt-2 border-t border-border">
                    <label className="text-xs font-semibold uppercase tracking-wider text-text-subtle">
                      2. Quando vuoi infornare?
                    </label>

                    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                      {EASY_TIME_PRESETS.map((p) => {
                        const Icon = p.icon
                        const selected = input.risingTime === p.totalHours && input.fridgeRisingTime === p.fridgeHours
                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => {
                              updateField('risingTime', p.totalHours)
                              updateField('fridgeRisingTime', p.fridgeHours)
                            }}
                            className={cn(
                              'flex items-start gap-3 rounded-xl border p-3 text-left transition-all',
                              selected
                                ? 'border-primary bg-primary/10 text-primary shadow-xs ring-1 ring-primary/30'
                                : 'border-border bg-surface-raised text-text-muted hover:border-border-strong hover:text-text',
                            )}
                          >
                            <div
                              className={cn(
                                'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                                selected ? 'bg-primary text-primary-foreground' : 'bg-surface text-text-subtle',
                              )}
                            >
                              <Icon className="h-4 w-4" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-text">{p.label}</span>
                                <span className="text-[10px] font-semibold opacity-75">{p.sublabel}</span>
                              </div>
                              <p className="mt-0.5 text-[11px] text-text-subtle leading-tight">{p.desc}</p>
                            </div>
                          </button>
                        )
                      })}
                    </div>

                    {/* Room temperature slider in easy mode */}
                    <div className="rounded-lg border border-border bg-surface-raised p-3 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-2">
                        <Thermometer className="h-4 w-4 text-warning shrink-0" />
                        <div>
                          <div className="text-xs font-medium text-text">Temperatura in casa</div>
                          <div className="text-[10px] text-text-subtle">Influenza la velocità del lievito</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="range"
                          min={17}
                          max={28}
                          value={input.roomTemp}
                          onChange={(e) => updateField('roomTemp', Number(e.target.value))}
                          className="w-24 sm:w-32 accent-primary"
                        />
                        <span className="font-mono text-sm font-bold text-text min-w-[2.5rem] text-right">
                          {input.roomTemp}°C
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Step 3: Idratazione semplice */}
                  <div className="space-y-3 pt-2 border-t border-border">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold uppercase tracking-wider text-text-subtle">
                        3. Idratazione dell'impasto
                      </label>
                      <span className="font-mono text-sm font-bold text-primary">{input.hydration}%</span>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      {!input.isGrandmaPizza ? (
                        <>
                          <button
                            type="button"
                            onClick={() => updateField('hydration', 60)}
                            className={cn(
                              'py-2 px-2 rounded-lg border text-center transition-all',
                              input.hydration === 60
                                ? 'border-primary bg-primary/10 text-primary font-bold'
                                : 'border-border bg-surface-raised text-text-muted hover:text-text',
                            )}
                          >
                            <div className="text-xs font-mono">60%</div>
                            <div className="text-[10px] opacity-75">Facile da stendere</div>
                          </button>
                          <button
                            type="button"
                            onClick={() => updateField('hydration', 65)}
                            className={cn(
                              'py-2 px-2 rounded-lg border text-center transition-all',
                              input.hydration === 65
                                ? 'border-primary bg-primary/10 text-primary font-bold'
                                : 'border-border bg-surface-raised text-text-muted hover:text-text',
                            )}
                          >
                            <div className="text-xs font-mono">65%</div>
                            <div className="text-[10px] opacity-75">Consigliata (Morbida)</div>
                          </button>
                          <button
                            type="button"
                            onClick={() => updateField('hydration', 70)}
                            className={cn(
                              'py-2 px-2 rounded-lg border text-center transition-all',
                              input.hydration === 70
                                ? 'border-primary bg-primary/10 text-primary font-bold'
                                : 'border-border bg-surface-raised text-text-muted hover:text-text',
                            )}
                          >
                            <div className="text-xs font-mono">70%</div>
                            <div className="text-[10px] opacity-75">Canotto pronunciato</div>
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => updateField('hydration', 70)}
                            className={cn(
                              'py-2 px-2 rounded-lg border text-center transition-all',
                              input.hydration === 70
                                ? 'border-primary bg-primary/10 text-primary font-bold'
                                : 'border-border bg-surface-raised text-text-muted hover:text-text',
                            )}
                          >
                            <div className="text-xs font-mono">70%</div>
                            <div className="text-[10px] opacity-75">Gestione facile</div>
                          </button>
                          <button
                            type="button"
                            onClick={() => updateField('hydration', 75)}
                            className={cn(
                              'py-2 px-2 rounded-lg border text-center transition-all',
                              input.hydration === 75
                                ? 'border-primary bg-primary/10 text-primary font-bold'
                                : 'border-border bg-surface-raised text-text-muted hover:text-text',
                            )}
                          >
                            <div className="text-xs font-mono">75%</div>
                            <div className="text-[10px] opacity-75">Consigliata (Soffice)</div>
                          </button>
                          <button
                            type="button"
                            onClick={() => updateField('hydration', 80)}
                            className={cn(
                              'py-2 px-2 rounded-lg border text-center transition-all',
                              input.hydration === 80
                                ? 'border-primary bg-primary/10 text-primary font-bold'
                                : 'border-border bg-surface-raised text-text-muted hover:text-text',
                            )}
                          >
                            <div className="text-xs font-mono">80%</div>
                            <div className="text-[10px] opacity-75">Romana alveolata</div>
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Easy Mode Note on Defaults */}
                  <div className="flex items-center justify-between rounded-lg bg-surface-raised px-3.5 py-2.5 text-xs text-text-subtle border border-border">
                    <span className="flex items-center gap-1.5">
                      <Info className="h-3.5 w-3.5 text-primary shrink-0" />
                      Sale preimpostato a <strong>{input.saltPerLiter}g/L</strong> d'acqua · Olio/Strutto:{' '}
                      <strong>{input.fatsPerLiter}g</strong> (default zero)
                    </span>
                    <button
                      type="button"
                      onClick={() => handleModeChange('advanced')}
                      className="text-primary hover:underline font-medium text-[11px]"
                    >
                      Personalizza in Avanzata →
                    </button>
                  </div>
                </div>
              )}

              {/* MODE 2: ADVANCED MODE VIEW */}
              {calcMode === 'advanced' && (
                <div className="rounded-xl border border-border bg-surface p-4 space-y-4">
                  <div className="flex items-center justify-between border-b border-border pb-2.5">
                    <span className="text-xs font-semibold uppercase tracking-wider text-text-subtle">
                      Parametri Dettagliati
                    </span>
                    <span className="text-xs text-text-muted">
                      Peso complessivo: <strong className="text-text font-semibold">{recipe.totalWeight}g</strong>
                    </span>
                  </div>

                  {/* Quantità & Peso */}
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="rounded-lg border border-border bg-surface-raised p-3">
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-medium text-text">
                          {input.isGrandmaPizza ? 'Numero teglie' : 'Numero panetti'}
                        </label>
                        <span className="text-sm font-bold text-text font-mono">{input.doughsNumber}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => updateField('doughsNumber', Math.max(1, input.doughsNumber - 1))}
                          className="flex h-8 w-8 items-center justify-center rounded-md border border-border bg-surface text-text hover:bg-surface-raised"
                        >
                          -
                        </button>
                        <input
                          type="number"
                          min={1}
                          max={100}
                          value={input.doughsNumber}
                          onChange={(e) => updateField('doughsNumber', Math.max(1, Number(e.target.value)))}
                          className="h-8 flex-1 rounded-md border border-border bg-surface text-center font-mono text-sm text-text"
                        />
                        <button
                          type="button"
                          onClick={() => updateField('doughsNumber', input.doughsNumber + 1)}
                          className="flex h-8 w-8 items-center justify-center rounded-md border border-border bg-surface text-text hover:bg-surface-raised"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    <div className="rounded-lg border border-border bg-surface-raised p-3">
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-medium text-text">
                          {input.isGrandmaPizza ? 'Peso singolo panetto teglia' : 'Peso singolo panetto'}
                        </label>
                        <span className="text-sm font-bold text-text font-mono">{input.doughsWeight}g</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => updateField('doughsWeight', Math.max(50, input.doughsWeight - 10))}
                          className="flex h-8 w-8 items-center justify-center rounded-md border border-border bg-surface text-text hover:bg-surface-raised"
                        >
                          -
                        </button>
                        <input
                          type="number"
                          step={5}
                          min={50}
                          max={2000}
                          value={input.doughsWeight}
                          onChange={(e) => updateField('doughsWeight', Math.max(50, Number(e.target.value)))}
                          className="h-8 flex-1 rounded-md border border-border bg-surface text-center font-mono text-sm text-text"
                        />
                        <button
                          type="button"
                          onClick={() => updateField('doughsWeight', input.doughsWeight + 10)}
                          className="flex h-8 w-8 items-center justify-center rounded-md border border-border bg-surface text-text hover:bg-surface-raised"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Idratazione Slider */}
                  <div className="rounded-lg border border-border bg-surface-raised p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Droplets className="h-4 w-4 text-primary" />
                        <label className="text-xs font-medium text-text">Idratazione</label>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-base font-bold text-primary font-mono">{input.hydration}%</span>
                      </div>
                    </div>
                    <input
                      type="range"
                      min={50}
                      max={90}
                      step={1}
                      value={input.hydration}
                      onChange={(e) => updateField('hydration', Number(e.target.value))}
                      className="w-full accent-primary"
                    />
                    <div className="flex justify-between text-[10px] text-text-subtle font-mono">
                      <span>55% (Classica)</span>
                      <span>65% (Media)</span>
                      <span>75% (Alta)</span>
                      <span>85% (Teglia Romana)</span>
                    </div>
                  </div>

                  {/* Sale & Grassi (g/L d'acqua) */}
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="rounded-lg border border-border bg-surface-raised p-3 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-medium text-text">Sale (g / litro d'acqua)</label>
                        <span className="text-sm font-bold font-mono text-text">{input.saltPerLiter} g/L</span>
                      </div>
                      <input
                        type="range"
                        min={20}
                        max={65}
                        step={1}
                        value={input.saltPerLiter}
                        onChange={(e) => updateField('saltPerLiter', Number(e.target.value))}
                        className="w-full accent-primary"
                      />
                      <div className="flex justify-between text-[10px] text-text-subtle">
                        <span>30g/L (Basso)</span>
                        <span>50g/L (Standard Verace)</span>
                      </div>
                    </div>

                    <div className="rounded-lg border border-border bg-surface-raised p-3 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-medium text-text">Olio / Strutto (g / L d'acqua)</label>
                        <span className="text-sm font-bold font-mono text-text">{input.fatsPerLiter} g/L</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={60}
                        step={5}
                        value={input.fatsPerLiter}
                        onChange={(e) => updateField('fatsPerLiter', Number(e.target.value))}
                        className="w-full accent-primary"
                      />
                      <div className="flex justify-between text-[10px] text-text-subtle">
                        <span>0g (Default - Tonda/Leggera)</span>
                        <span>25-30g (Teglia friabile)</span>
                      </div>
                    </div>
                  </div>

                  {/* Lievitazione & Temperature */}
                  <div className="rounded-lg border border-border bg-surface-raised p-3 space-y-3">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                      <div>
                        <div className="flex items-center gap-1 text-xs text-text-muted mb-1">
                          <Thermometer className="h-3.5 w-3.5 text-warning" />
                          <span>Temp. Ambiente</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            min={10}
                            max={38}
                            value={input.roomTemp}
                            onChange={(e) => updateField('roomTemp', Number(e.target.value))}
                            className="h-8 w-full rounded-md border border-border bg-surface px-2.5 text-sm font-mono font-bold text-text"
                          />
                          <span className="text-xs font-semibold text-text-muted">°C</span>
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center gap-1 text-xs text-text-muted mb-1">
                          <Clock className="h-3.5 w-3.5 text-primary" />
                          <span>Lievitazione totale</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            min={2}
                            max={120}
                            value={input.risingTime}
                            onChange={(e) => updateField('risingTime', Number(e.target.value))}
                            className="h-8 w-full rounded-md border border-border bg-surface px-2.5 text-sm font-mono font-bold text-text"
                          />
                          <span className="text-xs font-semibold text-text-muted">ore</span>
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center gap-1 text-xs text-text-muted mb-1">
                          <Layers className="h-3.5 w-3.5 text-info" />
                          <span>Di cui in frigo (4°C)</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            min={0}
                            max={input.risingTime}
                            value={input.fridgeRisingTime}
                            onChange={(e) =>
                              updateField(
                                'fridgeRisingTime',
                                Math.min(input.risingTime, Math.max(0, Number(e.target.value))),
                              )
                            }
                            className="h-8 w-full rounded-md border border-border bg-surface px-2.5 text-sm font-mono font-bold text-text"
                          />
                          <span className="text-xs font-semibold text-text-muted">ore</span>
                        </div>
                      </div>
                    </div>

                    {input.fridgeRisingTime > 0 && (
                      <div className="rounded-md bg-info/10 border border-info/20 px-3 py-1.5 text-[11px] text-info flex items-center gap-2">
                        <Info className="h-3.5 w-3.5 shrink-0" />
                        <span>
                          Programma: <strong>{input.fridgeRisingTime}h</strong> in frigo a 4°C e{' '}
                          <strong>{input.risingTime - input.fridgeRisingTime}h</strong> a temperatura ambiente ({input.roomTemp}°C).
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* RIGHT COLUMN: Results Board (5 cols) */}
            <div className="space-y-4 lg:col-span-5">
              <div className="sticky top-6 rounded-xl border border-primary/30 bg-surface p-5 shadow-lg space-y-5">
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <div className="flex items-center gap-2">
                    <Pizza className="h-5 w-5 text-primary" />
                    <h2 className="text-base font-bold text-text">Dosi Calcolate</h2>
                  </div>
                  <span className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                    {input.isGrandmaPizza ? 'In Teglia' : 'Tonda'}
                  </span>
                </div>

                {/* Main Ingredients Cards */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between rounded-lg border border-border bg-surface-raised px-3.5 py-2.5">
                    <div className="flex items-center gap-2.5">
                      <span className="text-lg">🌾</span>
                      <div>
                        <div className="text-xs font-semibold text-text">Farina</div>
                        <div className="text-[10px] text-text-subtle font-mono">100% farina base</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="font-mono text-xl font-bold text-text">{recipe.flour}</span>
                      <span className="ml-1 text-xs font-semibold text-text-muted">g</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between rounded-lg border border-border bg-surface-raised px-3.5 py-2.5">
                    <div className="flex items-center gap-2.5">
                      <span className="text-lg">💧</span>
                      <div>
                        <div className="text-xs font-semibold text-text">Acqua</div>
                        <div className="text-[10px] text-text-subtle font-mono">{recipe.bakersPercentages.water}% su farina</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="font-mono text-xl font-bold text-primary">{recipe.water}</span>
                      <span className="ml-1 text-xs font-semibold text-text-muted">g (ml)</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between rounded-lg border border-border bg-surface-raised px-3.5 py-2.5">
                    <div className="flex items-center gap-2.5">
                      <span className="text-lg">🧂</span>
                      <div>
                        <div className="text-xs font-semibold text-text">Sale</div>
                        <div className="text-[10px] text-text-subtle font-mono">{recipe.bakersPercentages.salt}% su farina</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="font-mono text-lg font-bold text-text">{recipe.salt}</span>
                      <span className="ml-1 text-xs font-semibold text-text-muted">g</span>
                    </div>
                  </div>

                  {recipe.fats > 0 && (
                    <div className="flex items-center justify-between rounded-lg border border-border bg-surface-raised px-3.5 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <span className="text-lg">🫒</span>
                        <div>
                          <div className="text-xs font-semibold text-text">Olio / Strutto</div>
                          <div className="text-[10px] text-text-subtle font-mono">{recipe.bakersPercentages.fats}% su farina</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="font-mono text-lg font-bold text-text">{recipe.fats}</span>
                        <span className="ml-1 text-xs font-semibold text-text-muted">g</span>
                      </div>
                    </div>
                  )}

                  {/* Yeast Block */}
                  <div className="rounded-lg border border-primary/25 bg-primary/5 p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                        Lievito di Birra
                      </span>
                      <span className="text-[11px] text-text-muted">
                        {input.risingTime}h a {input.roomTemp}°C
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 pt-1 border-t border-primary/15">
                      <div>
                        <div className="text-[11px] text-text-subtle">Fresco (cubetto)</div>
                        <div className="font-mono text-lg font-bold text-text">
                          {recipe.freshYeast} <span className="text-xs font-normal text-text-muted">g</span>
                        </div>
                      </div>
                      <div className="border-l border-primary/15 pl-2.5">
                        <div className="text-[11px] text-text-subtle">Secco (istantaneo)</div>
                        <div className="font-mono text-lg font-bold text-text">
                          {recipe.dryYeast} <span className="text-xs font-normal text-text-muted">g</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="space-y-2 pt-2 border-t border-border">
                  <Button onClick={handleCopy} className="w-full justify-center gap-2" variant="primary">
                    {copied ? (
                      <>
                        <Check className="h-4 w-4" /> Ricetta copiata negli appunti!
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4" /> Copia ricetta completa
                      </>
                    )}
                  </Button>

                  <div className="flex gap-2">
                    <Button
                      onClick={() => {
                        setRecipeName(input.isGrandmaPizza ? 'Pizza in Teglia' : 'Pizza Tonda')
                        setSaveModalOpen(true)
                      }}
                      variant="outline"
                      className="flex-1 justify-center gap-1.5 text-xs"
                    >
                      <BookmarkPlus className="h-3.5 w-3.5" /> Salva nel ricettario
                    </Button>
                    <Button
                      onClick={() => setInput(DEFAULT_INPUT)}
                      variant="outline"
                      className="justify-center text-xs px-3"
                      title="Reimposta valori predefiniti"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: SAVED RECIPES */}
      {activeTab === 'saved' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div>
              <h2 className="text-base font-bold text-text">I tuoi impasti salvati</h2>
              <p className="text-xs text-text-subtle">
                Archivio delle tue ricette personali pronte da ricaricare nel calcolatore.
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => {
                setRecipeName('Nuovo Impasto')
                setSaveModalOpen(true)
              }}
              className="gap-1.5 text-xs"
            >
              <BookmarkPlus className="h-3.5 w-3.5" /> Salva ricetta corrente
            </Button>
          </div>

          {savedList.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-surface p-12 text-center">
              <Pizza className="mx-auto h-12 w-12 text-text-subtle/50 mb-3" />
              <p className="text-sm font-semibold text-text">Nessun impasto salvato</p>
              <p className="mt-1 text-xs text-text-subtle max-w-sm mx-auto">
                Configura le dosi nel calcolatore e premi "Salva nel ricettario" per memorizzare le tue creazioni preferite.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {savedList.map((item) => {
                const rec = calculateDough(item.input)
                return (
                  <div
                    key={item.id}
                    className="rounded-xl border border-border bg-surface p-4.5 space-y-3.5 hover:border-border-strong transition-all"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-text text-sm">{item.name}</h3>
                          <span
                            className={cn(
                              'rounded-full px-2 py-0.5 text-[10px] font-semibold',
                              item.input.isGrandmaPizza
                                ? 'bg-warning/15 text-warning'
                                : 'bg-primary/15 text-primary',
                            )}
                          >
                            {item.input.isGrandmaPizza ? 'Teglia' : 'Tonda'}
                          </span>
                        </div>
                        <span className="text-[11px] text-text-subtle">
                          {item.input.doughsNumber} panetti da {item.input.doughsWeight}g · {item.input.hydration}% idratazione
                        </span>
                      </div>
                      <button
                        onClick={() => handleDeleteSaved(item.id)}
                        className="text-text-subtle hover:text-danger p-1 rounded-md transition-colors"
                        title="Elimina ricetta"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    {/* Quick ingredients pill */}
                    <div className="grid grid-cols-4 gap-1.5 rounded-lg border border-border bg-surface-raised p-2 text-center text-xs font-mono">
                      <div>
                        <div className="text-[10px] text-text-subtle font-sans">Farina</div>
                        <div className="font-bold text-text">{rec.flour}g</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-text-subtle font-sans">Acqua</div>
                        <div className="font-bold text-primary">{rec.water}g</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-text-subtle font-sans">Sale</div>
                        <div className="font-bold text-text">{rec.salt}g</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-text-subtle font-sans">Lievito</div>
                        <div className="font-bold text-text">{rec.freshYeast}g</div>
                      </div>
                    </div>

                    {item.notes && (
                      <p className="text-xs text-text-muted italic bg-surface-raised/40 p-2 rounded-md">
                        "{item.notes}"
                      </p>
                    )}

                    <div className="flex justify-between items-center pt-1 border-t border-border">
                      <span className="text-[10px] text-text-subtle">
                        {new Date(item.createdAt).toLocaleDateString('it-IT')}
                      </span>
                      <Button size="sm" onClick={() => handleLoadSaved(item)} className="text-xs gap-1.5">
                        <Sliders className="h-3 w-3" /> Carica nel calcolatore
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: PRESETS */}
      {activeTab === 'presets' && (
        <div className="space-y-4">
          <div className="border-b border-border pb-3">
            <h2 className="text-base font-bold text-text">Preset consigliati della tradizione</h2>
            <p className="text-xs text-text-subtle">
              Ricette pronte e collaudate basate sui disciplinari e sulla community de La Confraternita della Pizza.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {PRESET_RECIPES.map((preset) => {
              const rec = calculateDough(preset.input)
              return (
                <div
                  key={preset.id}
                  className="rounded-xl border border-border bg-surface p-5 space-y-3.5 hover:border-primary/40 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-text text-sm">{preset.name}</span>
                    <span className="rounded-full bg-primary/10 border border-primary/20 px-2.5 py-0.5 text-[11px] font-semibold text-primary">
                      {preset.badge}
                    </span>
                  </div>

                  <p className="text-xs text-text-muted leading-relaxed">{preset.description}</p>

                  <div className="grid grid-cols-4 gap-1.5 rounded-lg border border-border bg-surface-raised p-2 text-center text-xs font-mono">
                    <div>
                      <div className="text-[10px] text-text-subtle font-sans">Panetti</div>
                      <div className="font-bold text-text">{preset.input.doughsNumber}×{preset.input.doughsWeight}g</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-text-subtle font-sans">Idratazione</div>
                      <div className="font-bold text-primary">{preset.input.hydration}%</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-text-subtle font-sans">Lievitazione</div>
                      <div className="font-bold text-text">{preset.input.risingTime}h</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-text-subtle font-sans">Lievito F.</div>
                      <div className="font-bold text-text">{rec.freshYeast}g</div>
                    </div>
                  </div>

                  <Button
                    onClick={() => handleLoadPreset(preset.input)}
                    variant="outline"
                    className="w-full justify-center gap-1.5 text-xs"
                  >
                    <Sliders className="h-3 w-3" /> Usa questa ricetta
                  </Button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Save Modal Dialog */}
      {saveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-xl border border-border bg-surface p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-2.5">
              <div className="flex items-center gap-2">
                <BookmarkPlus className="h-5 w-5 text-primary" />
                <h3 className="text-base font-bold text-text">Salva Ricetta nel Ricettario</h3>
              </div>
              <button
                onClick={() => setSaveModalOpen(false)}
                className="text-text-subtle hover:text-text text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveSubmit} className="space-y-3.5">
              <div>
                <label className="text-xs font-semibold text-text">Nome dell'impasto *</label>
                <input
                  type="text"
                  required
                  placeholder="Es. Napoletana canotto 24h"
                  value={recipeName}
                  onChange={(e) => setRecipeName(e.target.value)}
                  className="mt-1 w-full rounded-md border border-border bg-surface-raised px-3 py-2 text-sm text-text focus:border-primary focus:outline-hidden"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-text">Note personali (opzionale)</label>
                <textarea
                  rows={2}
                  placeholder="Tipo di farina usata (es. Caputo Nuvola W300), tempi appretto..."
                  value={recipeNotes}
                  onChange={(e) => setRecipeNotes(e.target.value)}
                  className="mt-1 w-full rounded-md border border-border bg-surface-raised px-3 py-2 text-sm text-text focus:border-primary focus:outline-hidden"
                />
              </div>

              <div className="rounded-md bg-surface-raised p-2.5 text-[11px] text-text-subtle space-y-1 font-mono">
                <div>
                  • {input.isGrandmaPizza ? 'Pizza in Teglia' : 'Pizza Tonda'} · {input.doughsNumber} panetti da {input.doughsWeight}g
                </div>
                <div>
                  • {input.hydration}% idratazione · {input.risingTime}h lievitazione ({input.fridgeRisingTime}h frigo)
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <Button type="button" variant="outline" onClick={() => setSaveModalOpen(false)}>
                  Annulla
                </Button>
                <Button type="submit" variant="primary">
                  Salva Ricetta
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
