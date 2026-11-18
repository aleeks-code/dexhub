'use client'

import React, { useState, useEffect, useCallback } from 'react'
import {
  Flame,
  Plus,
  Trophy,
  HeartPulse,
  Dumbbell,
  Calendar,
  Zap,
  Activity,
  Copy,
} from 'lucide-react'
import { cn } from '@dexhub/ui'
import {
  getSessions,
  saveSession,
  deleteSession,
  getBdfDashboard,
  getAllExercises,
  logTendonPain,
  getTendonLogs,
  createSessionFromPrevious,
} from '../services/bdf-service'
import type {
  BdfWorkoutSession,
  BdfDashboardSummary,
  BdfExerciseTemplate,
  BdfTendonHealthLog,
} from '../types'
import { ActiveWorkoutSheet } from '../components/active-workout-sheet'
import { WorkoutHistoryList } from '../components/workout-history-list'
import { PrShowcaseCard } from '../components/pr-showcase-card'
import { TendonStatusCard } from '../components/tendon-status-card'

type BdfTab = 'allenamento' | 'pr' | 'tendini'

export default function BdfPage() {
  const [tab, setTab] = useState<BdfTab>('allenamento')
  const [sessions, setSessions] = useState<BdfWorkoutSession[]>([])
  const [dashboard, setDashboard] = useState<BdfDashboardSummary | null>(null)
  const [customExercises, setCustomExercises] = useState<BdfExerciseTemplate[]>([])
  const [tendonLogs, setTendonLogs] = useState<BdfTendonHealthLog[]>([])
  const [loading, setLoading] = useState(true)

  // Live Workout Sheet state
  const [isWorkingOut, setIsWorkingOut] = useState(false)
  const [editingSession, setEditingSession] = useState<BdfWorkoutSession | null>(null)

  const reloadData = useCallback(async () => {
    try {
      const [sessList, dash, exercises, tLogs] = await Promise.all([
        getSessions(),
        getBdfDashboard(),
        getAllExercises(),
        getTendonLogs(),
      ])
      setSessions(sessList)
      setDashboard(dash)
      setCustomExercises(exercises.filter((e) => e.isCustom))
      setTendonLogs(tLogs)
    } catch (err) {
      console.error('[BDF Page] Errore caricamento:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void reloadData()
  }, [reloadData])

  // Avvia nuova sessione
  const handleStartNewSession = () => {
    setEditingSession(null)
    setIsWorkingOut(true)
  }

  // Clona e avvia subito
  const handleRepeatSession = async (session: BdfWorkoutSession) => {
    const cloned = await createSessionFromPrevious({ baseSessionId: session.id })
    setEditingSession(cloned)
    setIsWorkingOut(true)
  }

  // Modifica sessione esistente
  const handleEditSession = (session: BdfWorkoutSession) => {
    setEditingSession(session)
    setIsWorkingOut(true)
  }

  // Salva sessione completata
  const handleSaveSession = async (saved: BdfWorkoutSession) => {
    await saveSession(saved)
    setIsWorkingOut(false)
    setEditingSession(null)
    await reloadData()
  }

  // Elimina sessione
  const handleDeleteSession = async (id: string) => {
    await deleteSession(id)
    await reloadData()
  }

  // Logga dolore tendini
  const handleLogPain = async (log: Omit<BdfTendonHealthLog, 'id'>) => {
    await logTendonPain(log)
    await reloadData()
  }

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="flex flex-col items-center gap-2 text-text-subtle text-xs">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
          <span>Caricamento BDF Training...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-12 animate-in fade-in-50">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-text flex items-center gap-2.5">
            <span className="p-1.5 rounded-xl bg-rose-500/15 text-rose-400">
              <Flame className="h-6 w-6" />
            </span>
            BDF Training
          </h1>
          <p className="text-xs text-text-subtle mt-1">
            Armwrestling Workout Tracker: tracciamento rapido vettori, isometriche, preparazione gara e salute tendinea.
          </p>
        </div>

        {!isWorkingOut && (
          <button
            type="button"
            onClick={handleStartNewSession}
            className="flex items-center gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black px-4 py-2 text-xs font-bold transition-colors cursor-pointer self-start sm:self-auto shadow-xs"
          >
            <Plus className="h-4 w-4" />
            <span>Nuovo Allenamento</span>
          </button>
        )}
      </div>

      {/* Se siamo in modalità Allenamento Live, mostra la sheet attiva */}
      {isWorkingOut ? (
        <ActiveWorkoutSheet
          initialSession={editingSession}
          onSave={handleSaveSession}
          onCancel={() => {
            setIsWorkingOut(false)
            setEditingSession(null)
          }}
          customExercises={customExercises}
        />
      ) : (
        <>
          {/* Dashboard Summary Quick Stats */}
          {dashboard && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {/* Stat 1: Totale Allenamenti */}
              <div className="rounded-2xl border border-border bg-surface p-4 shadow-xs">
                <span className="text-xs text-text-subtle">Allenamenti Svolti</span>
                <p className="text-2xl font-black text-text font-mono mt-1">
                  {dashboard.totalWorkouts}
                </p>
                <span className="text-[10px] text-emerald-400 font-semibold">
                  {dashboard.weeklyVolume.workoutsThisWeek} questa settimana
                </span>
              </div>

              {/* Stat 2: Stato Gomito */}
              <div className="rounded-2xl border border-border bg-surface p-4 shadow-xs">
                <span className="text-xs text-text-subtle">Stato Tendini & Gomito</span>
                <p
                  className={cn(
                    'text-base font-black font-mono mt-1 uppercase',
                    dashboard.currentTendonStatus.status === 'ottimo'
                      ? 'text-emerald-400'
                      : dashboard.currentTendonStatus.status === 'moderato'
                      ? 'text-amber-400'
                      : 'text-rose-400'
                  )}
                >
                  {dashboard.currentTendonStatus.status.replace('_', ' ')}
                </p>
                <span className="text-[10px] text-text-subtle">
                  {dashboard.currentTendonStatus.avgPain > 0
                    ? `Dolore medio: ${dashboard.currentTendonStatus.avgPain}/5`
                    : 'Nessun dolore attivo'}
                </span>
              </div>

              {/* Stat 3: Volume Serie Settimanali */}
              <div className="rounded-2xl border border-border bg-surface p-4 shadow-xs">
                <span className="text-xs text-text-subtle">Serie Settimana</span>
                <p className="text-2xl font-black text-sky-400 font-mono mt-1">
                  {dashboard.weeklyVolume.totalSetsThisWeek}
                </p>
                <span className="text-[10px] text-text-subtle">Serie totali completate</span>
              </div>

              {/* Stat 4: Top PR */}
              <div className="rounded-2xl border border-border bg-surface p-4 shadow-xs">
                <span className="text-xs text-text-subtle">Record Top (PR)</span>
                {dashboard.topPRs.length > 0 && dashboard.topPRs[0] ? (
                  <div>
                    <p className="text-2xl font-black text-amber-400 font-mono mt-1">
                      {dashboard.topPRs[0].maxWeightKg} kg
                    </p>
                    <span className="text-[10px] text-text-subtle truncate block">
                      {dashboard.topPRs[0].exerciseName}
                    </span>
                  </div>
                ) : (
                  <p className="text-sm font-semibold text-text-subtle mt-1">Nessun PR</p>
                )}
              </div>
            </div>
          )}

          {/* Navigation Tabs */}
          <div className="flex items-center gap-2 border-b border-border/60 pb-1">
            <button
              type="button"
              onClick={() => setTab('allenamento')}
              className={cn(
                'flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition-colors cursor-pointer',
                tab === 'allenamento'
                  ? 'bg-surface-raised text-emerald-400 border border-border'
                  : 'text-text-subtle hover:text-text'
              )}
            >
              <Dumbbell className="h-4 w-4" />
              <span>Storico Allenamenti</span>
            </button>

            <button
              type="button"
              onClick={() => setTab('pr')}
              className={cn(
                'flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition-colors cursor-pointer',
                tab === 'pr'
                  ? 'bg-surface-raised text-amber-400 border border-border'
                  : 'text-text-subtle hover:text-text'
              )}
            >
              <Trophy className="h-4 w-4" />
              <span>Bacheca PR & Vettori</span>
            </button>

            <button
              type="button"
              onClick={() => setTab('tendini')}
              className={cn(
                'flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition-colors cursor-pointer',
                tab === 'tendini'
                  ? 'bg-surface-raised text-rose-400 border border-border'
                  : 'text-text-subtle hover:text-text'
              )}
            >
              <HeartPulse className="h-4 w-4" />
              <span>Salute Tendini & Rehab</span>
            </button>
          </div>

          {/* Tab Contents */}
          {tab === 'allenamento' && (
            <WorkoutHistoryList
              sessions={sessions}
              onRepeatSession={handleRepeatSession}
              onEditSession={handleEditSession}
              onDeleteSession={handleDeleteSession}
            />
          )}

          {tab === 'pr' && dashboard && <PrShowcaseCard prs={dashboard.topPRs} />}

          {tab === 'tendini' && dashboard && (
            <TendonStatusCard
              currentStatus={dashboard.currentTendonStatus}
              logs={tendonLogs}
              onLogPain={handleLogPain}
            />
          )}
        </>
      )}
    </div>
  )
}
