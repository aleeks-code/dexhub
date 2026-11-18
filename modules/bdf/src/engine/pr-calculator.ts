import type {
  BdfWorkoutSession,
  BdfPersonalRecord,
  BdfDashboardSummary,
  BdfTendonHealthLog,
  BdfTendonZone,
} from '../types'

/**
 * Calcola i Record Personali (PR) aggregati da tutte le sessioni completate.
 * Supporta sia serie a ripetizioni che tenute isometriche a tempo (holdSeconds).
 */
export function calculatePersonalRecords(sessions: BdfWorkoutSession[]): BdfPersonalRecord[] {
  const prMap = new Map<string, BdfPersonalRecord>()

  // Ordina cronologicamente
  const sortedSessions = [...sessions].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  )

  for (const session of sortedSessions) {
    for (const ex of session.exercises) {
      for (const set of ex.sets) {
        if (!set.completed || set.weightKg <= 0) continue

        const mode = set.mode
        const repsOrSeconds = mode === 'isometric_hold' ? (set.holdSeconds ?? 0) : (set.reps ?? 0)
        if (repsOrSeconds <= 0) continue

        // Chiave unica per esercizio, modalità e braccio
        const key = `${ex.exerciseId}-${mode}-${ex.targetArm}`
        const existing = prMap.get(key)

        const isNewRecord =
          !existing ||
          set.weightKg > existing.maxWeightKg ||
          (set.weightKg === existing.maxWeightKg && repsOrSeconds > existing.repsOrSeconds)

        if (isNewRecord) {
          prMap.set(key, {
            exerciseId: ex.exerciseId,
            exerciseName: ex.name,
            vector: ex.vector,
            equipment: ex.equipment,
            mode,
            maxWeightKg: set.weightKg,
            repsOrSeconds,
            achievedAt: session.date,
            arm: ex.targetArm,
            sessionId: session.id,
          })
        }
      }
    }
  }

  // Ritorna la lista ordinata per carico decrescente
  return Array.from(prMap.values()).sort((a, b) => b.maxWeightKg - a.maxWeightKg)
}

/**
 * Calcola lo stato dei tendini basato sui log più recenti e le sessioni concluse.
 */
export function evaluateTendonHealth(
  sessions: BdfWorkoutSession[],
  tendonLogs: BdfTendonHealthLog[]
): {
  status: 'ottimo' | 'moderato' | 'allerta_scarico'
  avgPain: number
  activeZone?: BdfTendonZone
} {
  // Raccogli tutti i punteggi di dolore recenti (ultimi 14 giorni o ultime 5 sedute)
  const painScores: Array<{ level: number; zone: BdfTendonZone }> = []

  for (const log of tendonLogs.slice(-10)) {
    if (log.painLevel > 0) {
      painScores.push({ level: log.painLevel, zone: log.zone })
    }
  }

  for (const s of sessions.slice(-5)) {
    if (s.tendonPainLevel !== undefined && s.tendonPainLevel > 0) {
      // Se presente nel session log
      painScores.push({
        level: s.tendonPainLevel,
        zone: s.tendonStatus?.[0]?.zone ?? 'epitroclea_mediale',
      })
    }
  }

  if (painScores.length === 0) {
    return { status: 'ottimo', avgPain: 0 }
  }

  const sum = painScores.reduce((acc, p) => acc + p.level, 0)
  const avg = Math.round((sum / painScores.length) * 10) / 10

  // Trova la zona con dolore più frequente o più alto
  const zoneCounts: Record<string, { count: number; max: number }> = {}
  for (const p of painScores) {
    if (!zoneCounts[p.zone]) zoneCounts[p.zone] = { count: 0, max: 0 }
    zoneCounts[p.zone]!.count++
    if (p.level > zoneCounts[p.zone]!.max) {
      zoneCounts[p.zone]!.max = p.level
    }
  }

  let highestZone: BdfTendonZone = 'epitroclea_mediale'
  let highestScore = -1
  for (const [zone, val] of Object.entries(zoneCounts)) {
    const score = val.count * 2 + val.max * 3
    if (score > highestScore) {
      highestScore = score
      highestZone = zone as BdfTendonZone
    }
  }

  if (avg >= 3.5 || painScores.some((p) => p.level >= 4)) {
    return { status: 'allerta_scarico', avgPain: avg, activeZone: highestZone }
  }
  if (avg >= 1.5 || painScores.some((p) => p.level >= 2)) {
    return { status: 'moderato', avgPain: avg, activeZone: highestZone }
  }

  return { status: 'ottimo', avgPain: avg, activeZone: highestZone }
}

/**
 * Genera il riepilogo generale per la dashboard del modulo BDF.
 */
export function buildDashboardSummary(
  sessions: BdfWorkoutSession[],
  tendonLogs: BdfTendonHealthLog[]
): BdfDashboardSummary {
  const sorted = [...sessions].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  )

  const lastWorkout = sorted[0] ?? null
  const topPRs = calculatePersonalRecords(sessions).slice(0, 5)
  const tendonStatus = evaluateTendonHealth(sessions, tendonLogs)

  // Conteggio volumi dell'ultima settimana
  const now = new Date()
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

  const thisWeekSessions = sessions.filter((s) => new Date(s.date) >= oneWeekAgo)
  let totalSetsThisWeek = 0
  for (const s of thisWeekSessions) {
    for (const ex of s.exercises) {
      totalSetsThisWeek += ex.sets.filter((st) => st.completed).length
    }
  }

  return {
    totalWorkouts: sessions.length,
    lastWorkout,
    currentTendonStatus: tendonStatus,
    topPRs,
    weeklyVolume: {
      workoutsThisWeek: thisWeekSessions.length,
      totalSetsThisWeek,
    },
  }
}
