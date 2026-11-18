'use client'

import React, { useState } from 'react'
import {
  Flame,
  Dumbbell,
  HeartPulse,
  Users,
  Plus,
  Copy,
  Save,
  X,
  AlertCircle,
  Sparkles,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react'
import { cn } from '@dexhub/ui'
import type {
  BdfWorkoutSession,
  BdfSessionExercise,
  BdfSet,
  BdfSessionType,
  BdfArmTarget,
  BdfExerciseTemplate,
  BdfTendonZone,
} from '../types'
import { DEFAULT_BDF_EXERCISES, TENDON_ZONES_CONFIG } from '../config/bdf-exercises'
import { QuickSetRow } from './quick-set-row'
import { RestTimer } from './rest-timer'
import { createSessionFromPrevious } from '../services/bdf-service'

interface Props {
  initialSession?: BdfWorkoutSession | null
  onSave: (session: BdfWorkoutSession) => Promise<void>
  onCancel: () => void
  customExercises?: BdfExerciseTemplate[]
}

const SESSION_TYPE_CONFIG: Record<
  BdfSessionType,
  { label: string; icon: typeof Flame; color: string; border: string; bg: string }
> = {
  gara_prep: {
    label: 'Preparazione Gara',
    icon: Flame,
    color: 'text-rose-400',
    border: 'border-rose-500/30',
    bg: 'bg-rose-500/10',
  },
  ordinario: {
    label: 'Ordinario & Forza',
    icon: Dumbbell,
    color: 'text-sky-400',
    border: 'border-sky-500/30',
    bg: 'bg-sky-500/10',
  },
  rehab_scarico: {
    label: 'Rehab & Scarico',
    icon: HeartPulse,
    color: 'text-emerald-400',
    border: 'border-emerald-500/30',
    bg: 'bg-emerald-500/10',
  },
  tavolo: {
    label: 'Sparring Tavolo',
    icon: Users,
    color: 'text-amber-400',
    border: 'border-amber-500/30',
    bg: 'bg-amber-500/10',
  },
}

export function ActiveWorkoutSheet({
  initialSession,
  onSave,
  onCancel,
  customExercises = [],
}: Props) {
  const [session, setSession] = useState<BdfWorkoutSession>(() => {
    if (initialSession) return initialSession
    const now = new Date()
    return {
      id: `bdf-${Date.now()}`,
      date: now.toISOString().slice(0, 10),
      title: 'Sessione BDF',
      type: 'ordinario',
      targetArm: 'destro',
      exercises: [],
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    }
  })

  const [timerActive, setTimerActive] = useState(false)
  const [showExercisePicker, setShowExercisePicker] = useState(false)
  const [selectedVectorFilter, setSelectedVectorFilter] = useState<string>('tutti')
  const [searchExercise, setSearchExercise] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [tendonPain, setTendonPain] = useState<number>(session.tendonPainLevel ?? 0)
  const [tendonZone, setTendonZone] = useState<BdfTendonZone>('epitroclea_mediale')
  const [generalNotes, setGeneralNotes] = useState(session.notes ?? '')

  // Clonazione rapida da sessione precedente
  const handleClonePrevious = async () => {
    try {
      const cloned = await createSessionFromPrevious({ targetType: session.type })
      if (cloned.exercises.length > 0) {
        setSession((prev) => ({
          ...prev,
          title: cloned.title.replace(' (Copia)', ''),
          exercises: cloned.exercises,
          targetArm: cloned.targetArm,
        }))
      }
    } catch (err) {
      console.warn('Errore clonazione precedente:', err)
    }
  }

  // Aggiungi esercizio dal catalogo
  const handleSelectExercise = (tmpl: BdfExerciseTemplate) => {
    const newEx: BdfSessionExercise = {
      id: `ex-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      exerciseId: tmpl.id,
      name: tmpl.name,
      vector: tmpl.vector,
      equipment: tmpl.defaultEquipment,
      targetArm: session.targetArm,
      sets: [
        {
          id: `set-${Date.now()}-1`,
          setNumber: 1,
          mode: tmpl.defaultMode,
          weightKg: 20,
          reps: tmpl.defaultMode === 'reps' ? 6 : undefined,
          holdSeconds: tmpl.defaultMode === 'isometric_hold' ? 5 : undefined,
          completed: false,
        },
      ],
    }

    setSession((prev) => ({
      ...prev,
      exercises: [...prev.exercises, newEx],
    }))
    setShowExercisePicker(false)
  }

  // Aggiungi serie a un esercizio (duplica carico e reps dell'ultimo set)
  const handleAddSet = (exerciseId: string) => {
    setSession((prev) => ({
      ...prev,
      exercises: prev.exercises.map((ex) => {
        if (ex.id !== exerciseId) return ex
        const lastSet = ex.sets[ex.sets.length - 1]
        const newSetNumber = ex.sets.length + 1
        const newSet: BdfSet = {
          id: `set-${Date.now()}-${newSetNumber}`,
          setNumber: newSetNumber,
          mode: lastSet ? lastSet.mode : 'isometric_hold',
          weightKg: lastSet ? lastSet.weightKg : 20,
          reps: lastSet ? lastSet.reps : 6,
          holdSeconds: lastSet ? lastSet.holdSeconds : 5,
          completed: false,
        }
        return {
          ...ex,
          sets: [...ex.sets, newSet],
        }
      }),
    }))
  }

  // Aggiorna singola serie
  const handleUpdateSet = (exerciseId: string, updatedSet: BdfSet) => {
    setSession((prev) => ({
      ...prev,
      exercises: prev.exercises.map((ex) => {
        if (ex.id !== exerciseId) return ex
        return {
          ...ex,
          sets: ex.sets.map((s) => (s.id === updatedSet.id ? updatedSet : s)),
        }
      }),
    }))
  }

  // Completa serie & avvia timer
  const handleToggleSetComplete = (exerciseId: string, setId: string) => {
    setSession((prev) => ({
      ...prev,
      exercises: prev.exercises.map((ex) => {
        if (ex.id !== exerciseId) return ex
        return {
          ...ex,
          sets: ex.sets.map((s) => {
            if (s.id !== setId) return s
            const willBeCompleted = !s.completed
            if (willBeCompleted) {
              setTimerActive(true) // Avvia timer recupero
            }
            return { ...s, completed: willBeCompleted }
          }),
        }
      }),
    }))
  }

  // Rimuovi serie
  const handleDeleteSet = (exerciseId: string, setId: string) => {
    setSession((prev) => ({
      ...prev,
      exercises: prev.exercises.map((ex) => {
        if (ex.id !== exerciseId) return ex
        const remaining = ex.sets.filter((s) => s.id !== setId)
        return {
          ...ex,
          sets: remaining.map((s, idx) => ({ ...s, setNumber: idx + 1 })),
        }
      }),
    }))
  }

  // Rimuovi esercizio
  const handleDeleteExercise = (exerciseId: string) => {
    setSession((prev) => ({
      ...prev,
      exercises: prev.exercises.filter((ex) => ex.id !== exerciseId),
    }))
  }

  const allAvailableExercises = [...DEFAULT_BDF_EXERCISES, ...customExercises]
  const filteredExercises = allAvailableExercises.filter((e) => {
    const matchSearch =
      e.name.toLowerCase().includes(searchExercise.toLowerCase()) ||
      e.vector.toLowerCase().includes(searchExercise.toLowerCase())
    const matchVector =
      selectedVectorFilter === 'tutti' || e.vector === selectedVectorFilter
    return matchSearch && matchVector
  })

  const handleFinishWorkout = async () => {
    try {
      setSubmitting(true)
      const payload: BdfWorkoutSession = {
        ...session,
        tendonPainLevel: tendonPain,
        notes: generalNotes.trim() || undefined,
        tendonStatus:
          tendonPain > 0
            ? [
                {
                  id: `tlog-${Date.now()}`,
                  date: session.date,
                  sessionId: session.id,
                  zone: tendonZone,
                  painLevel: tendonPain,
                  arm: session.targetArm,
                },
              ]
            : undefined,
      }
      await onSave(payload)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in-50 pb-16">
      {/* Top Session Config Bar */}
      <div className="rounded-2xl border border-border bg-surface p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/60 pb-4">
          <div className="flex-1">
            <input
              type="text"
              value={session.title}
              onChange={(e) => setSession((p) => ({ ...p, title: e.target.value }))}
              placeholder="Nome allenamento (es. Toproll & Pronazione)"
              className="w-full text-lg sm:text-xl font-black text-text bg-transparent border-none focus:outline-hidden placeholder:text-zinc-600"
            />
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <input
                type="date"
                value={session.date}
                onChange={(e) => setSession((p) => ({ ...p, date: e.target.value }))}
                className="rounded-lg border border-border/60 bg-surface-raised px-2.5 py-1 text-xs text-text focus:outline-hidden"
              />
              <span className="text-xs text-text-subtle">•</span>
              {/* Braccio Target */}
              <div className="flex items-center gap-1 rounded-lg border border-border/60 bg-surface-raised p-0.5 text-xs">
                {(['destro', 'sinistro', 'entrambi'] as BdfArmTarget[]).map((arm) => (
                  <button
                    key={arm}
                    type="button"
                    onClick={() => setSession((p) => ({ ...p, targetArm: arm }))}
                    className={cn(
                      'rounded-md px-2 py-0.5 font-semibold capitalize transition-colors cursor-pointer',
                      session.targetArm === arm
                        ? 'bg-emerald-500 text-black'
                        : 'text-text-subtle hover:text-text'
                    )}
                  >
                    {arm === 'entrambi' ? 'Entrambe' : arm}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleClonePrevious}
              className="flex items-center gap-1.5 rounded-xl border border-border bg-surface-raised hover:bg-surface px-3 py-2 text-xs font-semibold text-text transition-colors cursor-pointer shadow-xs"
              title="Carica gli stessi esercizi e carichi dell'ultimo allenamento"
            >
              <Copy className="h-3.5 w-3.5 text-sky-400" />
              <span>Copia Ultima Volta</span>
            </button>

            <button
              type="button"
              onClick={onCancel}
              className="rounded-xl border border-border px-3 py-2 text-xs font-medium text-text-subtle hover:bg-surface-raised transition-colors cursor-pointer"
            >
              Annulla
            </button>

            <button
              type="button"
              onClick={handleFinishWorkout}
              disabled={submitting || session.exercises.length === 0}
              className="flex items-center gap-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black px-4 py-2 text-xs font-bold transition-colors cursor-pointer disabled:opacity-50 shadow-xs"
            >
              <Save className="h-4 w-4" />
              <span>{submitting ? 'Salvataggio...' : 'Concludi Allenamento'}</span>
            </button>
          </div>
        </div>

        {/* Focus Type Selector Pills */}
        <div className="pt-4 flex items-center gap-2 overflow-x-auto pb-1">
          <span className="text-xs font-medium text-text-subtle shrink-0">Tipo:</span>
          {(Object.keys(SESSION_TYPE_CONFIG) as BdfSessionType[]).map((type) => {
            const cfg = SESSION_TYPE_CONFIG[type]
            const Icon = cfg.icon
            const isSelected = session.type === type
            return (
              <button
                key={type}
                type="button"
                onClick={() => setSession((p) => ({ ...p, type }))}
                className={cn(
                  'flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold border transition-all cursor-pointer shrink-0',
                  isSelected
                    ? cn(cfg.bg, cfg.border, cfg.color, 'shadow-xs')
                    : 'border-border/60 bg-surface-raised/40 text-text-subtle hover:text-text'
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{cfg.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Exercises List */}
      <div className="space-y-4">
        {session.exercises.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-12 text-center bg-surface/40">
            <div className="mx-auto rounded-2xl bg-surface-raised p-4 w-fit text-zinc-500 mb-3 border border-border/40">
              <Dumbbell className="h-8 w-8 text-emerald-400" />
            </div>
            <h3 className="text-base font-bold text-text">Nessun esercizio inserito</h3>
            <p className="text-xs text-text-subtle max-w-sm mx-auto mt-1 mb-5">
              Aggiungi i tuoi vettori BDF (Pronazione, Rising, Cupping, Backpressure) oppure carica i pesi dell&apos;ultima volta.
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setShowExercisePicker(true)}
                className="flex items-center gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black px-4 py-2 text-xs font-bold transition-colors cursor-pointer shadow-xs"
              >
                <Plus className="h-4 w-4" />
                <span>Aggiungi Esercizio</span>
              </button>
              <button
                type="button"
                onClick={handleClonePrevious}
                className="flex items-center gap-2 rounded-xl border border-border bg-surface-raised hover:bg-surface px-4 py-2 text-xs font-semibold text-text transition-colors cursor-pointer"
              >
                <Copy className="h-4 w-4 text-sky-400" />
                <span>Copia Sessione Precedente</span>
              </button>
            </div>
          </div>
        ) : (
          session.exercises.map((ex, exIndex) => (
            <div
              key={ex.id}
              className="rounded-2xl border border-border bg-surface p-4 sm:p-5 shadow-xs space-y-3"
            >
              {/* Exercise Header */}
              <div className="flex items-center justify-between border-b border-border/50 pb-3">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-surface-raised font-mono text-xs font-black text-text-subtle">
                    #{exIndex + 1}
                  </span>
                  <div>
                    <h4 className="text-sm sm:text-base font-bold text-text">{ex.name}</h4>
                    <div className="flex items-center gap-2 text-[11px] text-text-subtle mt-0.5">
                      <span className="capitalize font-medium text-emerald-400">
                        {ex.vector}
                      </span>
                      <span>•</span>
                      <span className="capitalize text-zinc-400">
                        {ex.equipment.replace('_', ' ')}
                      </span>
                      <span>•</span>
                      <span className="capitalize text-zinc-500">
                        Braccio {ex.targetArm}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleAddSet(ex.id)}
                    className="flex items-center gap-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/25 px-2.5 py-1 text-xs font-bold transition-colors cursor-pointer"
                  >
                    <Plus className="h-3 w-3" />
                    <span>Serie</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDeleteExercise(ex.id)}
                    className="rounded-lg p-1 text-zinc-500 hover:text-rose-400 hover:bg-surface-raised transition-colors cursor-pointer"
                    title="Rimuovi esercizio"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Set rows */}
              <div className="space-y-2">
                {ex.sets.map((set) => (
                  <QuickSetRow
                    key={set.id}
                    set={set}
                    onUpdate={(updated) => handleUpdateSet(ex.id, updated)}
                    onDelete={() => handleDeleteSet(ex.id, set.id)}
                    onToggleComplete={() => handleToggleSetComplete(ex.id, set.id)}
                  />
                ))}
              </div>
            </div>
          ))
        )}

        {session.exercises.length > 0 && (
          <div className="pt-2">
            <button
              type="button"
              onClick={() => setShowExercisePicker(true)}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-border/80 bg-surface/30 hover:bg-surface-raised/60 py-3.5 text-xs font-bold text-text transition-colors cursor-pointer"
            >
              <Plus className="h-4 w-4 text-emerald-400" />
              <span>Aggiungi Altro Esercizio</span>
            </button>
          </div>
        )}
      </div>

      {/* Tendon Pain Tracker & Notes Section */}
      <div className="rounded-2xl border border-border bg-surface p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-amber-400" />
            <h4 className="text-sm font-bold text-text">Monitoraggio Tendini & Gomito</h4>
          </div>
          <span
            className={cn(
              'rounded-full px-2 py-0.5 text-[10px] font-bold font-mono',
              tendonPain === 0
                ? 'bg-emerald-500/15 text-emerald-400'
                : tendonPain <= 2
                ? 'bg-amber-500/15 text-amber-400'
                : 'bg-rose-500/15 text-rose-400 animate-pulse'
            )}
          >
            {tendonPain === 0
              ? 'Nessun dolore'
              : tendonPain <= 2
              ? `Lieve fastidio (${tendonPain}/5)`
              : `Allerta Dolore (${tendonPain}/5)`}
          </span>
        </div>

        {/* 0 to 5 Slider Buttons */}
        <div className="grid grid-cols-6 gap-2">
          {[0, 1, 2, 3, 4, 5].map((level) => (
            <button
              key={level}
              type="button"
              onClick={() => setTendonPain(level)}
              className={cn(
                'rounded-xl py-2 text-center text-xs font-black transition-all cursor-pointer border',
                tendonPain === level
                  ? level === 0
                    ? 'bg-emerald-500 text-black border-emerald-400 shadow-xs'
                    : level <= 2
                    ? 'bg-amber-500 text-black border-amber-400 shadow-xs'
                    : 'bg-rose-500 text-black border-rose-400 shadow-xs'
                  : 'bg-surface-raised border-border/50 text-text-subtle hover:text-text'
              )}
            >
              {level}
            </button>
          ))}
        </div>

        {tendonPain > 0 && (
          <div className="pt-2 border-t border-border/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <span className="text-xs text-text-subtle">Zona principale di fastidio:</span>
            <select
              value={tendonZone}
              onChange={(e) => setTendonZone(e.target.value as BdfTendonZone)}
              className="rounded-lg border border-border bg-surface-raised px-3 py-1.5 text-xs text-text focus:outline-hidden"
            >
              {TENDON_ZONES_CONFIG.map((z) => (
                <option key={z.zone} value={z.zone}>
                  {z.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Note generali */}
        <div className="pt-2 border-t border-border/40">
          <label className="block text-xs font-medium text-text-subtle mb-1">
            Note allenamento (sensazioni, riscaldamento, sparring al tavolo)
          </label>
          <input
            type="text"
            value={generalNotes}
            onChange={(e) => setGeneralNotes(e.target.value)}
            placeholder="es. Ottima chiusura di pronazione, nessun dolore all'inserzione"
            className="w-full rounded-xl border border-border bg-surface-raised px-3.5 py-2 text-xs text-text placeholder:text-zinc-600 focus:outline-hidden"
          />
        </div>
      </div>

      {/* Exercise Picker Modal */}
      {showExercisePicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 overflow-y-auto">
          <div className="relative w-full max-w-xl rounded-2xl border border-border bg-surface p-6 shadow-2xl animate-in zoom-in-95 my-6 max-h-[85vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border/60 pb-3 shrink-0">
              <div className="flex items-center gap-2">
                <Dumbbell className="h-5 w-5 text-emerald-400" />
                <h3 className="text-base font-bold text-text">Scegli Esercizio BDF</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowExercisePicker(false)}
                className="rounded-lg p-1 text-text-subtle hover:bg-surface-raised transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Search & Filter */}
            <div className="py-3 space-y-2 shrink-0">
              <input
                type="text"
                value={searchExercise}
                onChange={(e) => setSearchExercise(e.target.value)}
                placeholder="Cerca per nome o vettore (es. Judo belt, Rising, Cupping, Panca)..."
                className="w-full rounded-xl border border-border bg-surface-raised px-3.5 py-2 text-xs text-text placeholder:text-zinc-600 focus:outline-hidden focus:border-emerald-500"
              />

              {/* Vector filter pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                {[
                  'tutti',
                  'pronazione',
                  'rising',
                  'cupping',
                  'backpressure',
                  'sidepressure',
                  'supinazione',
                  'presa_dita',
                  'condizionamento',
                  'rehab',
                ].map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setSelectedVectorFilter(v)}
                    className={cn(
                      'rounded-lg px-2.5 py-1 text-[11px] font-semibold capitalize whitespace-nowrap transition-colors cursor-pointer',
                      selectedVectorFilter === v
                        ? 'bg-emerald-500 text-black'
                        : 'bg-surface-raised text-text-subtle hover:text-text'
                    )}
                  >
                    {v.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto divide-y divide-border/40 pr-1 space-y-1">
              {filteredExercises.map((tmpl) => (
                <button
                  key={tmpl.id}
                  type="button"
                  onClick={() => handleSelectExercise(tmpl)}
                  className="flex w-full items-center justify-between p-3 text-left hover:bg-surface-raised rounded-xl transition-colors cursor-pointer group"
                >
                  <div>
                    <span className="text-xs sm:text-sm font-bold text-text group-hover:text-emerald-400 transition-colors">
                      {tmpl.name}
                    </span>
                    <div className="flex items-center gap-2 text-[10px] text-text-subtle mt-0.5">
                      <span className="text-emerald-400 capitalize font-medium">
                        {tmpl.vector}
                      </span>
                      <span>•</span>
                      <span className="capitalize">{tmpl.defaultEquipment.replace('_', ' ')}</span>
                      <span>•</span>
                      <span className="text-zinc-400">
                        {tmpl.defaultMode === 'isometric_hold' ? 'Isometria (s)' : 'Ripetizioni'}
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-zinc-500 group-hover:text-emerald-400 transition-colors shrink-0" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Floating Rest Timer */}
      <RestTimer
        initialSeconds={90}
        active={timerActive}
        onClose={() => setTimerActive(false)}
      />
    </div>
  )
}
