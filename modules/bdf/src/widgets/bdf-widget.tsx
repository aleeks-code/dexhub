'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { Flame, ArrowRight, Trophy, HeartPulse, Plus } from 'lucide-react'
import { cn } from '@dexhub/ui'
import { getBdfDashboard } from '../services/bdf-service'
import type { BdfDashboardSummary } from '../types'

export default function BdfWidget() {
  const [dashboard, setDashboard] = useState<BdfDashboardSummary | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const d = await getBdfDashboard()
        setDashboard(d)
      } catch (err) {
        console.error('[BdfWidget] Failed to load:', err)
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [])

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-3 text-xs text-text-subtle">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-rose-500 border-t-transparent" />
      </div>
    )
  }

  const hasWorkouts = Boolean(dashboard && dashboard.totalWorkouts > 0)
  const tendon = dashboard?.currentTendonStatus
  const isAlert = tendon?.status === 'allerta_scarico'
  const isModerate = tendon?.status === 'moderato'

  return (
    <div className="flex h-full flex-col justify-between gap-2 p-1">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-border/60 pb-1.5">
        <div className="flex items-center gap-1.5">
          <Flame className="h-4 w-4 text-rose-400" />
          <span className="text-xs font-semibold text-text">BDF Training</span>
        </div>
        <Link
          href="/bdf"
          className="flex items-center gap-0.5 text-[11px] text-text-subtle hover:text-rose-400 transition-colors"
        >
          Apri <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      {/* Content */}
      {!hasWorkouts ? (
        <div className="py-2 text-center">
          <p className="text-xs font-medium text-text">Nessun allenamento registrato</p>
          <p className="text-[10px] text-text-subtle mt-0.5">
            Traccia pronazione, rising, cupping e salute gomito
          </p>
          <div className="pt-2">
            <Link
              href="/bdf"
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-400 hover:text-rose-300"
            >
              <Plus className="h-3 w-3" /> Inizia Sessione
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-2 py-0.5">
          {/* Ultimo allenamento */}
          <div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-text-subtle">Ultima seduta:</span>
              <span className="font-semibold text-text">{dashboard?.lastWorkout?.date}</span>
            </div>
            <p className="text-xs font-bold text-text truncate">
              {dashboard?.lastWorkout?.title}
            </p>
          </div>

          {/* Tendini & Top PR */}
          <div className="flex items-center justify-between gap-1 pt-1 border-t border-border/40 text-[11px]">
            <div className="flex items-center gap-1">
              <HeartPulse
                className={cn(
                  'h-3.5 w-3.5',
                  isAlert ? 'text-rose-400' : isModerate ? 'text-amber-400' : 'text-emerald-400'
                )}
              />
              <span
                className={cn(
                  'font-semibold capitalize text-[10px]',
                  isAlert ? 'text-rose-400' : isModerate ? 'text-amber-400' : 'text-emerald-400'
                )}
              >
                Gomito: {tendon?.status.replace('_', ' ')}
              </span>
            </div>

            {dashboard?.topPRs[0] && (
              <div className="flex items-center gap-1 font-mono text-[10px] font-bold text-amber-400">
                <Trophy className="h-3 w-3" />
                <span>{dashboard.topPRs[0].maxWeightKg} kg</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Footer link */}
      <div className="border-t border-border/40 pt-1 text-center">
        <Link
          href="/bdf"
          className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-400 hover:text-rose-300"
        >
          <Plus className="h-3 w-3" /> Nuovo Allenamento
        </Link>
      </div>
    </div>
  )
}
