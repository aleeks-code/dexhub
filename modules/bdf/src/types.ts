// Tipologia di sessione BDF
export type BdfSessionType =
  | 'gara_prep'     // Preparazione gara: alta intensità, peaking, massimali, stop all'eccentrico
  | 'ordinario'     // Allenamento ordinario: volume, forza strutturale, complementari
  | 'rehab_scarico' // Riabilitazione / scarico: elastici, alte ripetizioni, drenaggio tendineo
  | 'tavolo'        // Sparring al tavolo: round, partner, cinghie, prove tecniche

// Vettori di forza biomeccanici del Braccio di Ferro
export type BdfVector =
  | 'pronazione'
  | 'rising'
  | 'cupping'
  | 'backpressure'
  | 'sidepressure'
  | 'supinazione'
  | 'presa_dita'
  | 'condizionamento'
  | 'rehab'

// Attrezzatura usata
export type BdfEquipment =
  | 'judo_belt'     // Cintura da judo con dischi o agganciata al manubrio/cavo
  | 'manubrio'
  | 'ez_bar'
  | 'elastico'      // Loop band / bande elastiche per rehab e riscaldamento
  | 'corpo_libero'  // Trazioni, dips (con o senza zavorra)
  | 'bilanciere'    // Panca piana, curl
  | 'tavolo'        // Tavolo da armwrestling

// Braccio target
export type BdfArmTarget = 'destro' | 'sinistro' | 'entrambi'

// Modalità di esecuzione della serie
export type BdfSetMode = 'reps' | 'isometric_hold'

// Singola serie (Set)
export interface BdfSet {
  id: string
  setNumber: number
  mode: BdfSetMode
  weightKg: number
  reps?: number          // Se mode === 'reps' (es. 6)
  holdSeconds?: number   // Se mode === 'isometric_hold' (es. 5s)
  bandLevel?: 'leggero' | 'medio' | 'forte' // Per esercizi con elastico
  rpe?: number           // Scala di sforzo percepito 6-10 (opzionale)
  completed: boolean
}

// Esercizio all'interno della sessione attiva
export interface BdfSessionExercise {
  id: string
  exerciseId: string
  name: string
  vector: BdfVector
  equipment: BdfEquipment
  targetArm: BdfArmTarget
  sets: BdfSet[]
  notes?: string
}

// Zone tendinee e articolari a rischio sovraccarico
export type BdfTendonZone =
  | 'epitroclea_mediale'  // Gomito interno (tendinite del golfista, pronatore teres)
  | 'epicondilo_laterale' // Gomito esterno (estensori dita, rising estremo)
  | 'bicipite_distale'    // Inserzione bicipite / piega del gomito (backpressure pesante)
  | 'brachioradiale'      // Avambraccio superiore
  | 'polso'               // Articolazione radio-carpica e legamenti triangolari

// Rilevazione stato dolore / infiammazione
export interface BdfTendonHealthLog {
  id: string
  date: string            // ISO string
  sessionId?: string
  zone: BdfTendonZone
  painLevel: number       // 0 (nessun dolore) a 5 (dolore acuto / stop)
  arm: BdfArmTarget
  notes?: string
}

// Sessione di allenamento salvata
export interface BdfWorkoutSession {
  id: string
  date: string            // Data della sessione (ISO o YYYY-MM-DD)
  title: string           // es. "Toproll & Pronazione Pre-Gara", "Rehab Gomito & Elastici"
  type: BdfSessionType
  targetArm: BdfArmTarget
  durationMinutes?: number
  exercises: BdfSessionExercise[]
  tendonPainLevel?: number // Sintesi 0-5 della seduta
  tendonStatus?: BdfTendonHealthLog[]
  notes?: string
  createdAt: string
  updatedAt: string
}

// Template / Preset Esercizio
export interface BdfExerciseTemplate {
  id: string
  name: string
  vector: BdfVector
  defaultEquipment: BdfEquipment
  defaultMode: BdfSetMode
  description?: string
  isCustom?: boolean
}

// Record Personale (PR)
export interface BdfPersonalRecord {
  exerciseId: string
  exerciseName: string
  vector: BdfVector
  equipment: BdfEquipment
  mode: BdfSetMode
  maxWeightKg: number
  repsOrSeconds: number
  achievedAt: string
  arm: BdfArmTarget
  sessionId: string
}

// Dashboard Summary del modulo
export interface BdfDashboardSummary {
  totalWorkouts: number
  lastWorkout: BdfWorkoutSession | null
  currentTendonStatus: {
    status: 'ottimo' | 'moderato' | 'allerta_scarico'
    avgPain: number
    activeZone?: BdfTendonZone
  }
  topPRs: BdfPersonalRecord[]
  weeklyVolume: {
    workoutsThisWeek: number
    totalSetsThisWeek: number
  }
}

// Stato persistente su KV / LocalStorage
export interface BdfStorageState {
  schemaVersion: number
  sessions: BdfWorkoutSession[]
  customExercises: BdfExerciseTemplate[]
  tendonLogs: BdfTendonHealthLog[]
}
