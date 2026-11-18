'use client'

import React, { useState } from 'react'
import { ShieldAlert, HeartPulse, Plus, CheckCircle2, AlertTriangle, X, Activity } from 'lucide-react'
import { cn } from '@dexhub/ui'
import type { BdfTendonHealthLog, BdfTendonZone, BdfArmTarget } from '../types'
import { TENDON_ZONES_CONFIG } from '../config/bdf-exercises'

interface Props {
  currentStatus: {
    status: 'ottimo' | 'moderato' | 'allerta_scarico'
    avgPain: number
    activeZone?: BdfTendonZone
  }
  logs: BdfTendonHealthLog[]
  onLogPain: (log: Omit<BdfTendonHealthLog, 'id'>) => Promise<void>
}

export function TendonStatusCard({ currentStatus, logs, onLogPain }: Props) {
  const [modalOpen, setModalOpen] = useState(false)
  const [zone, setZone] = useState<BdfTendonZone>('epitroclea_mediale')
  const [painLevel, setPainLevel] = useState(2)
  const [arm, setArm] = useState<BdfArmTarget>('destro')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setSubmitting(true)
      await onLogPain({
        date: new Date().toISOString(),
        zone,
        painLevel,
        arm,
        notes: notes.trim() || undefined,
      })
      setModalOpen(false)
      setNotes('')
    } finally {
      setSubmitting(false)
    }
  }

  const isAlert = currentStatus.status === 'allerta_scarico'
  const isModerate = currentStatus.status === 'moderato'

  return (
    <div className="rounded-2xl border border-border bg-surface p-5 shadow-xs space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-3">
        <div className="flex items-center gap-2.5">
          <div
            className={cn(
              'rounded-xl p-2 shrink-0',
              isAlert
                ? 'bg-rose-500/15 text-rose-400'
                : isModerate
                ? 'bg-amber-500/15 text-amber-400'
                : 'bg-emerald-500/15 text-emerald-400'
            )}
          >
            {isAlert ? (
              <ShieldAlert className="h-5 w-5 animate-pulse" />
            ) : isModerate ? (
              <AlertTriangle className="h-5 w-5" />
            ) : (
              <CheckCircle2 className="h-5 w-5" />
            )}
          </div>
          <div>
            <h3 className="text-base font-bold text-text">Salute Tendinea & Gomito</h3>
            <p className="text-xs text-text-subtle">
              Monitoraggio epitroclea, epicondilo e inserzioni bicipitali
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-1.5 rounded-xl border border-border bg-surface-raised hover:bg-surface px-3 py-1.5 text-xs font-semibold text-text transition-colors cursor-pointer self-start sm:self-auto"
        >
          <Plus className="h-3.5 w-3.5 text-emerald-400" />
          <span>Registra Dolore Tendini</span>
        </button>
      </div>

      {/* Main Status Display */}
      <div
        className={cn(
          'rounded-xl border p-4 flex flex-col md:flex-row md:items-center justify-between gap-4',
          isAlert
            ? 'border-rose-500/30 bg-rose-500/10'
            : isModerate
            ? 'border-amber-500/30 bg-amber-500/10'
            : 'border-emerald-500/30 bg-emerald-500/10'
        )}
      >
        <div>
          <div className="flex items-center gap-2">
            <span
              className={cn(
                'text-sm font-black uppercase tracking-wide',
                isAlert ? 'text-rose-400' : isModerate ? 'text-amber-400' : 'text-emerald-400'
              )}
            >
              Stato Gomito:{' '}
              {isAlert ? 'Allerta Scarico' : isModerate ? 'Affaticamento Moderato' : 'Ottimo'}
            </span>
            {currentStatus.avgPain > 0 && (
              <span className="rounded bg-surface/80 px-2 py-0.5 text-[10px] font-bold font-mono text-text border border-border/40">
                Dolore medio: {currentStatus.avgPain}/5
              </span>
            )}
          </div>

          <p className="text-xs text-text-subtle mt-1 max-w-xl leading-relaxed">
            {isAlert
              ? 'Rilevato dolore acuto nei tendini del braccio. Evita massimali a braccio rigido e toproll pesante. Dedica le prossime 2 sessioni a scarico attivo con elastico leggero (30-50 reps).'
              : isModerate
              ? 'Tensione tendinea presente. Allunga il riscaldamento e riduci le serie con carichi massimali statici.'
              : 'Nessuna infiammazione rilevante segnalata. Le inserzioni sono pronte per la preparazione gara o volume ordinario.'}
          </p>
        </div>

        {currentStatus.activeZone && (
          <div className="rounded-lg bg-surface/80 border border-border/40 px-3 py-2 text-xs shrink-0">
            <span className="block text-[10px] font-semibold text-text-subtle uppercase">
              Zona più sollecitata:
            </span>
            <span className="font-bold text-text capitalize">
              {currentStatus.activeZone.replace('_', ' ')}
            </span>
          </div>
        )}
      </div>

      {/* Reference Card Zone */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1">
        {TENDON_ZONES_CONFIG.map((z) => (
          <div
            key={z.zone}
            className="rounded-xl border border-border/60 bg-surface-raised/40 p-3 text-xs space-y-1"
          >
            <span className="font-bold text-text block">{z.label}</span>
            <span className="text-[10px] font-medium text-emerald-400 block">{z.vulgo}</span>
            <p className="text-[11px] text-text-subtle leading-tight pt-1 border-t border-border/30">
              {z.description}
            </p>
          </div>
        ))}
      </div>

      {/* Log Tendon Pain Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 overflow-y-auto">
          <div className="relative w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-2xl animate-in zoom-in-95 my-6">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div className="flex items-center gap-2">
                <HeartPulse className="h-5 w-5 text-rose-400" />
                <h3 className="text-base font-bold text-text">Registra Fastidio Tendineo</h3>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-lg p-1 text-text-subtle hover:bg-surface-raised transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              {/* Zona */}
              <div>
                <label className="block text-xs font-medium text-text-subtle mb-1">
                  Zona Articolare / Tendine
                </label>
                <select
                  value={zone}
                  onChange={(e) => setZone(e.target.value as BdfTendonZone)}
                  className="w-full rounded-xl border border-border bg-surface-raised px-3 py-2 text-xs text-text focus:outline-hidden"
                >
                  {TENDON_ZONES_CONFIG.map((z) => (
                    <option key={z.zone} value={z.zone}>
                      {z.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Braccio */}
              <div>
                <label className="block text-xs font-medium text-text-subtle mb-1">Braccio</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['destro', 'sinistro', 'entrambi'] as BdfArmTarget[]).map((a) => (
                    <button
                      key={a}
                      type="button"
                      onClick={() => setArm(a)}
                      className={cn(
                        'rounded-xl py-1.5 text-xs font-bold capitalize transition-colors cursor-pointer border',
                        arm === a
                          ? 'bg-emerald-500 text-black border-emerald-400'
                          : 'bg-surface-raised border-border text-text-subtle hover:text-text'
                      )}
                    >
                      {a === 'entrambi' ? 'Entrambe' : a}
                    </button>
                  ))}
                </div>
              </div>

              {/* Livello di Dolore (1-5) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-text-subtle">
                    Intensità Dolore (1: Lieve, 5: Acuto)
                  </label>
                  <span className="text-xs font-bold text-emerald-400 font-mono">
                    {painLevel} / 5
                  </span>
                </div>
                <div className="grid grid-cols-5 gap-1.5">
                  {[1, 2, 3, 4, 5].map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setPainLevel(lvl)}
                      className={cn(
                        'rounded-xl py-2 text-xs font-black transition-colors cursor-pointer border',
                        painLevel === lvl
                          ? lvl <= 2
                            ? 'bg-amber-500 text-black border-amber-400'
                            : 'bg-rose-500 text-black border-rose-400'
                          : 'bg-surface-raised border-border text-text-subtle hover:text-text'
                      )}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
              </div>

              {/* Note */}
              <div>
                <label className="block text-xs font-medium text-text-subtle mb-1">
                  Note (es. post-tavolo, scricchiolio, risveglio)
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="es. Dolore marcato alla trazione a martello"
                  className="w-full rounded-xl border border-border bg-surface-raised px-3 py-2 text-xs text-text placeholder:text-zinc-600 focus:outline-hidden"
                />
              </div>

              {/* Bottoni */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-xl border border-border px-3.5 py-2 text-xs text-text-subtle hover:bg-surface-raised cursor-pointer"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold px-4 py-2 text-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  {submitting ? 'Salvataggio...' : 'Registra Dolore'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
