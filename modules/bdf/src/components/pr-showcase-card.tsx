'use client'

import React from 'react'
import { Trophy, Flame, Clock, Dumbbell, ShieldCheck } from 'lucide-react'
import { cn } from '@dexhub/ui'
import type { BdfPersonalRecord } from '../types'

interface Props {
  prs: BdfPersonalRecord[]
}

export function PrShowcaseCard({ prs }: Props) {
  if (prs.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-surface p-6 text-center shadow-xs">
        <Trophy className="mx-auto h-8 w-8 text-zinc-600 mb-2" />
        <h3 className="text-sm font-bold text-text">Nessun Record Personale registrato</h3>
        <p className="text-xs text-text-subtle mt-1 max-w-sm mx-auto">
          Completa le serie nei tuoi allenamenti per tracciare automaticamente i tuoi massimali di pronazione, rising e cupping.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-border bg-surface p-5 shadow-xs space-y-4">
      <div className="flex items-center justify-between border-b border-border/60 pb-3">
        <div className="flex items-center gap-2">
          <div className="rounded-xl bg-amber-500/15 p-2 text-amber-400">
            <Trophy className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-text">Record Personali (PR)</h3>
            <p className="text-xs text-text-subtle">
              I carichi più pesanti raggiunti nei vettori di forza BDF
            </p>
          </div>
        </div>
        <span className="rounded-full bg-surface-raised px-2.5 py-1 text-[11px] font-mono text-zinc-400 border border-border/40">
          {prs.length} {prs.length === 1 ? 'Record' : 'Record'}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {prs.map((pr) => {
          const isHold = pr.mode === 'isometric_hold'
          return (
            <div
              key={`${pr.exerciseId}-${pr.mode}-${pr.arm}`}
              className="rounded-xl border border-border/70 bg-surface-raised/60 p-3.5 space-y-2 hover:border-amber-500/30 transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="text-xs font-bold text-text line-clamp-1">
                  {pr.exerciseName}
                </span>
                <span className="rounded bg-surface px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-400 border border-emerald-500/20 shrink-0">
                  {pr.vector}
                </span>
              </div>

              <div className="flex items-baseline justify-between pt-1">
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-black font-mono text-amber-400">
                    {pr.maxWeightKg}
                  </span>
                  <span className="text-xs font-bold text-text-subtle">kg</span>
                </div>

                <div className="flex items-center gap-1 text-xs text-text font-mono font-semibold">
                  {isHold ? (
                    <>
                      <Clock className="h-3.5 w-3.5 text-sky-400" />
                      <span>{pr.repsOrSeconds}s hold</span>
                    </>
                  ) : (
                    <>
                      <Dumbbell className="h-3.5 w-3.5 text-amber-400" />
                      <span>{pr.repsOrSeconds} reps</span>
                    </>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between text-[10px] text-text-subtle border-t border-border/40 pt-2">
                <span className="capitalize text-zinc-400">Braccio {pr.arm}</span>
                <span>{pr.achievedAt.slice(0, 10)}</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
