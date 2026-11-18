import { describe, it, expect, beforeEach } from 'vitest'
import {
  _clearStateForTesting,
  getSessions,
  saveSession,
  deleteSession,
  createSessionFromPrevious,
  getAllExercises,
  addCustomExercise,
  logTendonPain,
  getBdfDashboard,
} from './bdf-service'
import type { BdfWorkoutSession } from '../types'

describe('BdfService', () => {
  beforeEach(() => {
    _clearStateForTesting()
  })

  it('inizializza uno stato con gli esercizi predefiniti BDF', async () => {
    const exercises = await getAllExercises()
    expect(exercises.length).toBeGreaterThan(10)
    expect(exercises.some((e) => e.name.includes('Judo Belt'))).toBe(true)
  })

  it('salva e recupera una nuova sessione di allenamento BDF', async () => {
    const session: BdfWorkoutSession = {
      id: 'test-session-1',
      date: '2026-11-18',
      title: 'Pronazione & Rising Pesante',
      type: 'gara_prep',
      targetArm: 'destro',
      createdAt: '2026-11-18T10:00:00.000Z',
      updatedAt: '2026-11-18T10:00:00.000Z',
      exercises: [
        {
          id: 'ex-1',
          exerciseId: 'pronation-judo-belt',
          name: 'Pronazione con Judo Belt',
          vector: 'pronazione',
          equipment: 'judo_belt',
          targetArm: 'destro',
          sets: [
            { id: 'st-1', setNumber: 1, mode: 'isometric_hold', weightKg: 35, holdSeconds: 5, completed: true },
          ],
        },
      ],
    }

    await saveSession(session)
    const list = await getSessions()
    expect(list.length).toBe(1)
    expect(list[0]?.title).toBe('Pronazione & Rising Pesante')
  })

  it('clona la sessione precedente mantenendo esercizi e carichi ma azzerando il completamento', async () => {
    const base: BdfWorkoutSession = {
      id: 'base-1',
      date: '2026-11-15',
      title: 'Hook Workout',
      type: 'ordinario',
      targetArm: 'destro',
      createdAt: '2026-11-15T10:00:00.000Z',
      updatedAt: '2026-11-15T10:00:00.000Z',
      exercises: [
        {
          id: 'ex-1',
          exerciseId: 'cupping-dumbbell',
          name: 'Wrist Curl / Cupping con Manubrio',
          vector: 'cupping',
          equipment: 'manubrio',
          targetArm: 'destro',
          sets: [
            { id: 'st-1', setNumber: 1, mode: 'reps', weightKg: 28, reps: 8, completed: true },
          ],
        },
      ],
    }

    await saveSession(base)
    const cloned = await createSessionFromPrevious({ baseSessionId: 'base-1' })

    expect(cloned.exercises.length).toBe(1)
    expect(cloned.exercises[0]?.name).toBe('Wrist Curl / Cupping con Manubrio')
    expect(cloned.exercises[0]?.sets[0]?.weightKg).toBe(28)
    expect(cloned.exercises[0]?.sets[0]?.completed).toBe(false) // Azzerato per la nuova seduta
  })

  it('permette di aggiungere un esercizio personalizzato', async () => {
    const newEx = await addCustomExercise({
      name: 'Mazurenko Handle Pronation',
      vector: 'pronazione',
      defaultEquipment: 'cavo' as any,
      defaultMode: 'isometric_hold',
      description: 'Maniglia conica professionale',
    })

    const all = await getAllExercises()
    expect(all.some((e) => e.name === 'Mazurenko Handle Pronation')).toBe(true)
  })

  it('registra e calcola i dati di sintesi della dashboard', async () => {
    await logTendonPain({
      date: '2026-11-18T10:00:00.000Z',
      zone: 'epitroclea_mediale',
      painLevel: 2,
      arm: 'destro',
      notes: 'Leggero fastidio post-tavolo',
    })

    const dashboard = await getBdfDashboard()
    expect(dashboard.currentTendonStatus.avgPain).toBe(2)
    expect(dashboard.currentTendonStatus.status).toBe('moderato')
  })
})
