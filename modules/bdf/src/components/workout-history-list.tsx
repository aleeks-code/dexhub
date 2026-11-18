'use client'

import React, { useState } from 'react'
import {
  Calendar,
  Dumbbell,
  Clock,
  Trash2,
  Edit2,
  Copy,
  ChevronDown,
  ChevronUp,
  Flame,
  HeartPulse,
  Users,
} from 'lucide-react'
import { cn } from '@dexhub/ui'
import type { BdfWorkoutSession, BdfSessionType } from '../types'

interface Props {
  sessions: BdfWorkoutSession[]
  onRepeatSession: (session: BdfWorkoutSession) => void
  onEditSession: (session: BdfWorkoutSession) => void
  onDeleteSession: (id: string) => Promise<void>
}

const TYPE_BADGE: Record<
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

export function WorkoutHistoryList({
  sessions,
  onRepeatSession,
  onEditSession,
  onDeleteSession,
}: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  if (sessions.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-surface p-8 text-center shadow-xs">
        <Dumbbell className="mx-auto h-8 w-8 text-zinc-600 mb-2" />
        <h3 className="text-sm font-bold text-text">Nessun allenamento nello storico</h3>
        <p className="text-xs text-text-subtle mt-1 max-w-sm mx-auto">
          Avvia la tua prima seduta per tracciare volumi, carichi e salute delle articolazioni.
        </p>
      </div>
    )
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Sei sicuro di voler eliminare questa sessione?')) return
    try {
      setDeletingId(id)
      await onDeleteSession(id)
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="space-y-3">
      {sessions.map((s) => {
        const isExpanded = expandedId === s.id
        const badge = TYPE_BADGE[s.type]
        const BadgeIcon = badge.icon
        const totalSets = s.exercises.reduce((sum, ex) => sum + ex.sets.length, 0)
        const completedSets = s.exercises.reduce(
          (sum, ex) => sum + ex.sets.filter((st) => st.completed).length,
          0
        )

        return (
          <div
            key={s.id}
            className="rounded-2xl border border-border bg-surface p-4 sm:p-5 shadow-xs space-y-3 hover:border-border/90 transition-colors"
          >
            {/* Header riga */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <div
                  className={cn(
                    'rounded-xl p-2.5 shrink-0 border mt-0.5',
                    badge.bg,
                    badge.border,
                    badge.color
                  )}
                >
                  <BadgeIcon className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-sm sm:text-base font-bold text-text">{s.title}</h4>
                    <span
                      className={cn(
                        'rounded-full px-2 py-0.5 text-[10px] font-bold border',
                        badge.bg,
                        badge.border,
                        badge.color
                      )}
                    >
                      {badge.label}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-text-subtle mt-1 flex-wrap">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3 text-zinc-500" />
                      {s.date}
                    </span>
                    <span>•</span>
                    <span className="capitalize font-medium text-zinc-300">
                      Braccio {s.targetArm}
                    </span>
                    <span>•</span>
                    <span>
                      {completedSets}/{totalSets} serie completate
                    </span>
                    {s.tendonPainLevel !== undefined && s.tendonPainLevel > 0 && (
                      <>
                        <span>•</span>
                        <span className="text-rose-400 font-bold">
                          Dolore gomito: {s.tendonPainLevel}/5
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-1.5 self-end sm:self-auto">
                <button
                  type="button"
                  onClick={() => onRepeatSession(s)}
                  className="flex items-center gap-1 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/25 px-2.5 py-1.5 text-xs font-bold transition-colors cursor-pointer"
                  title="Inizia una nuova sessione clonando esercizi e pesi di questa seduta"
                >
                  <Copy className="h-3.5 w-3.5" />
                  <span>Ripeti</span>
                </button>

                <button
                  type="button"
                  onClick={() => onEditSession(s)}
                  className="rounded-xl border border-border p-1.5 text-zinc-400 hover:text-text hover:bg-surface-raised transition-colors cursor-pointer"
                  title="Modifica allenamento"
                >
                  <Edit2 className="h-4 w-4" />
                </button>

                <button
                  type="button"
                  onClick={() => handleDelete(s.id)}
                  disabled={deletingId === s.id}
                  className="rounded-xl border border-border p-1.5 text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                  title="Elimina allenamento"
                >
                  <Trash2 className="h-4 w-4" />
                </button>

                <button
                  type="button"
                  onClick={() => setExpandedId((cur) => (cur === s.id ? null : s.id))}
                  className="rounded-xl border border-border p-1.5 text-zinc-400 hover:text-text hover:bg-surface-raised transition-colors cursor-pointer ml-1"
                  title={isExpanded ? 'Comprimi' : 'Mostra dettagli serie'}
                >
                  {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Note generali se presenti */}
            {s.notes && (
              <p className="text-xs text-text-subtle italic bg-surface-raised/40 p-2 rounded-lg border border-border/40">
                &ldquo;{s.notes}&rdquo;
              </p>
            )}

            {/* Dettagli espansi */}
            {isExpanded && (
              <div className="pt-2 border-t border-border/50 space-y-2.5 animate-in fade-in-50">
                {s.exercises.map((ex) => (
                  <div key={ex.id} className="rounded-xl bg-surface-raised/50 p-3 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-text">{ex.name}</span>
                      <span className="text-[10px] text-emerald-400 font-semibold uppercase">
                        {ex.vector}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap pt-1">
                      {ex.sets.map((st) => (
                        <span
                          key={st.id}
                          className={cn(
                            'rounded-md px-2 py-0.5 text-[11px] font-mono font-bold border',
                            st.completed
                              ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                              : 'bg-surface border-border text-text-subtle'
                          )}
                        >
                          {st.weightKg}kg × {st.mode === 'isometric_hold' ? `${st.holdSeconds ?? 5}s` : `${st.reps ?? 5}r`}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
