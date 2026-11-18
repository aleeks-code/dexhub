import type { ModuleContext } from '@dexhub/sdk'
import type {
  BdfWorkoutSession,
  BdfExerciseTemplate,
  BdfTendonHealthLog,
  BdfStorageState,
  BdfDashboardSummary,
  BdfSessionType,
  BdfArmTarget,
} from '../types'
import { DEFAULT_BDF_EXERCISES } from '../config/bdf-exercises'
import { buildDashboardSummary } from '../engine/pr-calculator'

const STORAGE_KEY = 'dexhub:bdf:state:v1'
const KV_KEY = 'bdf_storage_state'

let _ctx: ModuleContext | null = null
let _memoryState: BdfStorageState | null = null

export function initBdfService(ctx: ModuleContext): void {
  _ctx = ctx
}

export function _clearStateForTesting(): void {
  _memoryState = null
  if (typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.removeItem(STORAGE_KEY)
  }
}

function getDefaultState(): BdfStorageState {
  return {
    schemaVersion: 1,
    sessions: [],
    customExercises: [],
    tendonLogs: [],
  }
}

export async function loadState(): Promise<BdfStorageState> {
  if (_memoryState) return _memoryState

  // 1. Try KV
  if (_ctx?.kv) {
    try {
      const remote = await _ctx.kv.get<BdfStorageState>(KV_KEY)
      if (remote && remote.schemaVersion === 1) {
        _memoryState = remote
        return remote
      }
    } catch (err) {
      console.warn('[BdfService] Failed to read from KV:', err)
    }
  }

  // 2. Try LocalStorage
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as BdfStorageState
        if (parsed.schemaVersion === 1) {
          _memoryState = parsed
          return parsed
        }
      }
    } catch (err) {
      console.warn('[BdfService] Failed to read from localStorage:', err)
    }
  }

  const fallback = getDefaultState()
  _memoryState = fallback
  return fallback
}

export async function saveState(state: BdfStorageState): Promise<void> {
  _memoryState = state

  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch (err) {
      console.warn('[BdfService] Failed to save to localStorage:', err)
    }
  }

  if (_ctx?.kv) {
    try {
      await _ctx.kv.set(KV_KEY, state)
    } catch (err) {
      console.warn('[BdfService] Failed to save to KV:', err)
    }
  }
}

// -----------------------------------------------------------------------------
// Sessions CRUD
// -----------------------------------------------------------------------------

export async function getSessions(): Promise<BdfWorkoutSession[]> {
  const state = await loadState()
  return [...state.sessions].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  )
}

export async function getSessionById(id: string): Promise<BdfWorkoutSession | null> {
  const state = await loadState()
  return state.sessions.find((s) => s.id === id) ?? null
}

export async function saveSession(session: BdfWorkoutSession): Promise<BdfWorkoutSession> {
  const state = await loadState()
  const nowIso = new Date().toISOString()
  const idx = state.sessions.findIndex((s) => s.id === session.id)

  const normalized: BdfWorkoutSession = {
    ...session,
    updatedAt: nowIso,
    createdAt: session.createdAt || nowIso,
  }

  if (idx >= 0) {
    state.sessions[idx] = normalized
  } else {
    state.sessions.push(normalized)
  }

  // Se la sessione ha status tendineo, registra anche il log globale
  if (session.tendonPainLevel !== undefined && session.tendonStatus) {
    for (const ts of session.tendonStatus) {
      state.tendonLogs.push({
        ...ts,
        id: ts.id || `tlog-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        sessionId: normalized.id,
        date: normalized.date,
      })
    }
  }

  await saveState(state)
  return normalized
}

export async function deleteSession(id: string): Promise<boolean> {
  const state = await loadState()
  const initCount = state.sessions.length
  state.sessions = state.sessions.filter((s) => s.id !== id)
  state.tendonLogs = state.tendonLogs.filter((t) => t.sessionId !== id)

  if (state.sessions.length !== initCount) {
    await saveState(state)
    return true
  }
  return false
}

/**
 * Clona velocemente l'ultima sessione effettuata (o una specifica)
 * azzerando lo stato di completamento dei set ma mantenendo esercizi e carichi,
 * permettendo di iniziare l'allenamento in 2 secondi.
 */
export async function createSessionFromPrevious(params: {
  targetType?: BdfSessionType
  baseSessionId?: string
}): Promise<BdfWorkoutSession> {
  const state = await loadState()
  let base: BdfWorkoutSession | undefined

  if (params.baseSessionId) {
    base = state.sessions.find((s) => s.id === params.baseSessionId)
  } else if (params.targetType) {
    base = state.sessions
      .filter((s) => s.type === params.targetType)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]
  }

  if (!base && state.sessions.length > 0) {
    base = state.sessions.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    )[0]
  }

  const now = new Date()
  const nowIso = now.toISOString()

  if (base) {
    return {
      id: `bdf-${Date.now()}`,
      date: now.toISOString().slice(0, 10),
      title: `${base.title} (Copia)`,
      type: params.targetType ?? base.type,
      targetArm: base.targetArm,
      exercises: base.exercises.map((ex) => ({
        ...ex,
        id: `ex-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        sets: ex.sets.map((st, i) => ({
          ...st,
          id: `set-${Date.now()}-${i}`,
          completed: false, // Reset stato serie
        })),
      })),
      createdAt: nowIso,
      updatedAt: nowIso,
    }
  }

  // Sessione vuota iniziale
  return {
    id: `bdf-${Date.now()}`,
    date: now.toISOString().slice(0, 10),
    title: params.targetType === 'gara_prep' ? 'Preparazione Gara - Vettori' : 'Sessione BDF',
    type: params.targetType ?? 'ordinario',
    targetArm: 'destro',
    exercises: [],
    createdAt: nowIso,
    updatedAt: nowIso,
  }
}

// -----------------------------------------------------------------------------
// Exercises Catalog
// -----------------------------------------------------------------------------

export async function getAllExercises(): Promise<BdfExerciseTemplate[]> {
  const state = await loadState()
  return [...DEFAULT_BDF_EXERCISES, ...state.customExercises]
}

export async function addCustomExercise(
  exercise: Omit<BdfExerciseTemplate, 'id' | 'isCustom'>
): Promise<BdfExerciseTemplate> {
  const state = await loadState()
  const newEx: BdfExerciseTemplate = {
    ...exercise,
    id: `custom-ex-${Date.now()}`,
    isCustom: true,
  }
  state.customExercises.push(newEx)
  await saveState(state)
  return newEx
}

// -----------------------------------------------------------------------------
// Tendon Health & Pain Logs
// -----------------------------------------------------------------------------

export async function logTendonPain(
  log: Omit<BdfTendonHealthLog, 'id'>
): Promise<BdfTendonHealthLog> {
  const state = await loadState()
  const newLog: BdfTendonHealthLog = {
    ...log,
    id: `tlog-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
  }
  state.tendonLogs.push(newLog)
  await saveState(state)
  return newLog
}

export async function getTendonLogs(): Promise<BdfTendonHealthLog[]> {
  const state = await loadState()
  return [...state.tendonLogs].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  )
}

// -----------------------------------------------------------------------------
// Dashboard Aggregate Summary
// -----------------------------------------------------------------------------

export async function getBdfDashboard(): Promise<BdfDashboardSummary> {
  const state = await loadState()
  return buildDashboardSummary(state.sessions, state.tendonLogs)
}
