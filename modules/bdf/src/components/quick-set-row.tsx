'use client'

import React from 'react'
import { Check, Trash2, Clock, Dumbbell } from 'lucide-react'
import { cn } from '@dexhub/ui'
import type { BdfSet } from '../types'

interface Props {
  set: BdfSet
  onUpdate: (updated: BdfSet) => void
  onDelete: () => void
  onToggleComplete: () => void
}

export function QuickSetRow({ set, onUpdate, onDelete, onToggleComplete }: Props) {
  const isHold = set.mode === 'isometric_hold'

  const adjustWeight = (delta: number) => {
    const next = Math.max(0, Math.round((set.weightKg + delta) * 100) / 100)
    onUpdate({ ...set, weightKg: next })
  }

  const adjustRepsOrSeconds = (delta: number) => {
    if (isHold) {
      const cur = set.holdSeconds ?? 5
      const next = Math.max(1, cur + delta)
      onUpdate({ ...set, holdSeconds: next })
    } else {
      const cur = set.reps ?? 5
      const next = Math.max(1, cur + delta)
      onUpdate({ ...set, reps: next })
    }
  }

  const toggleMode = () => {
    if (isHold) {
      onUpdate({
        ...set,
        mode: 'reps',
        reps: set.reps ?? (set.holdSeconds ? Math.min(12, set.holdSeconds) : 6),
      })
    } else {
      onUpdate({
        ...set,
        mode: 'isometric_hold',
        holdSeconds: set.holdSeconds ?? 5,
      })
    }
  }

  return (
    <div
      className={cn(
        'flex items-center justify-between gap-2 rounded-xl border p-2.5 transition-all',
        set.completed
          ? 'border-emerald-500/30 bg-emerald-500/5'
          : 'border-border/60 bg-surface-raised/60 hover:bg-surface-raised'
      )}
    >
      {/* Set Number & Mode Toggle */}
      <div className="flex items-center gap-2 shrink-0">
        <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-surface font-mono text-xs font-bold text-text-subtle border border-border/40">
          {set.setNumber}
        </span>

        <button
          type="button"
          onClick={toggleMode}
          className={cn(
            'flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold transition-colors cursor-pointer border',
            isHold
              ? 'bg-sky-500/15 border-sky-500/30 text-sky-400'
              : 'bg-amber-500/15 border-amber-500/30 text-amber-400'
          )}
          title={isHold ? 'Modalità: Tenuta Isometrica a tempo' : 'Modalità: Ripetizioni'}
        >
          {isHold ? (
            <>
              <Clock className="h-3 w-3" />
              <span>Hold</span>
            </>
          ) : (
            <>
              <Dumbbell className="h-3 w-3" />
              <span>Reps</span>
            </>
          )}
        </button>
      </div>

      {/* Carico con Tasti Rapidi */}
      <div className="flex items-center gap-1">
        <div className="hidden sm:flex items-center gap-0.5">
          <button
            type="button"
            onClick={() => adjustWeight(-2.5)}
            className="rounded bg-surface px-1.5 py-1 text-[10px] font-bold text-text-subtle hover:text-text hover:bg-surface-raised transition-colors cursor-pointer border border-border/40"
          >
            -2.5
          </button>
          <button
            type="button"
            onClick={() => adjustWeight(-1.25)}
            className="rounded bg-surface px-1.5 py-1 text-[10px] font-bold text-text-subtle hover:text-text hover:bg-surface-raised transition-colors cursor-pointer border border-border/40"
          >
            -1.25
          </button>
        </div>

        {/* Input Peso */}
        <div className="relative flex items-center">
          <input
            type="number"
            step="0.25"
            min="0"
            value={set.weightKg === 0 ? '' : set.weightKg}
            onChange={(e) => {
              const val = parseFloat(e.target.value.replace(',', '.'))
              onUpdate({ ...set, weightKg: isNaN(val) ? 0 : val })
            }}
            placeholder="0"
            className="w-16 rounded-lg border border-border bg-surface px-1.5 py-1 text-center font-mono text-sm font-bold text-text focus:outline-hidden focus:border-emerald-500"
          />
          <span className="ml-1 text-[10px] font-semibold text-text-subtle">kg</span>
        </div>

        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={() => adjustWeight(1.25)}
            className="rounded bg-surface px-1.5 py-1 text-[10px] font-bold text-emerald-400 hover:bg-emerald-500/10 transition-colors cursor-pointer border border-border/40"
          >
            +1.25
          </button>
          <button
            type="button"
            onClick={() => adjustWeight(2.5)}
            className="rounded bg-surface px-1.5 py-1 text-[10px] font-bold text-emerald-400 hover:bg-emerald-500/10 transition-colors cursor-pointer border border-border/40"
          >
            +2.5
          </button>
          <button
            type="button"
            onClick={() => adjustWeight(5)}
            className="hidden sm:inline-block rounded bg-surface px-1.5 py-1 text-[10px] font-bold text-emerald-400 hover:bg-emerald-500/10 transition-colors cursor-pointer border border-border/40"
          >
            +5
          </button>
        </div>
      </div>

      {/* Ripetizioni o Secondi Hold */}
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => adjustRepsOrSeconds(isHold ? -1 : -1)}
          className="rounded bg-surface px-1.5 py-1 text-[10px] font-bold text-text-subtle hover:text-text cursor-pointer border border-border/40"
        >
          -1
        </button>

        <div className="relative flex items-center">
          <input
            type="number"
            min="1"
            value={isHold ? (set.holdSeconds ?? 5) : (set.reps ?? 5)}
            onChange={(e) => {
              const val = parseInt(e.target.value, 10)
              if (isHold) {
                onUpdate({ ...set, holdSeconds: isNaN(val) ? 1 : val })
              } else {
                onUpdate({ ...set, reps: isNaN(val) ? 1 : val })
              }
            }}
            className="w-12 rounded-lg border border-border bg-surface px-1 py-1 text-center font-mono text-sm font-bold text-text focus:outline-hidden focus:border-emerald-500"
          />
          <span className="ml-1 text-[10px] font-semibold text-text-subtle">
            {isHold ? 's' : 'rep'}
          </span>
        </div>

        <button
          type="button"
          onClick={() => adjustRepsOrSeconds(isHold ? 1 : 1)}
          className="rounded bg-surface px-1.5 py-1 text-[10px] font-bold text-sky-400 hover:bg-sky-500/10 cursor-pointer border border-border/40"
        >
          +1
        </button>

        {isHold && (
          <button
            type="button"
            onClick={() => adjustRepsOrSeconds(5)}
            className="rounded bg-surface px-1.5 py-1 text-[10px] font-bold text-sky-400 hover:bg-sky-500/10 cursor-pointer border border-border/40"
          >
            +5s
          </button>
        )}
      </div>

      {/* Completato & Cancella */}
      <div className="flex items-center gap-1.5 shrink-0 pl-1 border-l border-border/40">
        <button
          type="button"
          onClick={onToggleComplete}
          className={cn(
            'flex h-8 w-8 items-center justify-center rounded-lg transition-all cursor-pointer',
            set.completed
              ? 'bg-emerald-500 text-black shadow-xs'
              : 'border border-border bg-surface text-text-subtle hover:border-emerald-500/50 hover:text-emerald-400'
          )}
          title={set.completed ? 'Set completato (clicca per deselezionare)' : 'Segna set completato e avvia timer'}
        >
          <Check className="h-4 w-4 stroke-[3]" />
        </button>

        <button
          type="button"
          onClick={onDelete}
          className="rounded-lg p-1.5 text-zinc-500 hover:text-rose-400 hover:bg-surface transition-colors cursor-pointer"
          title="Elimina serie"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}
