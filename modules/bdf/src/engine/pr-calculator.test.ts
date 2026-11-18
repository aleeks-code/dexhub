import { describe, it, expect } from 'vitest'
import { calculatePersonalRecords, evaluateTendonHealth, buildDashboardSummary } from './pr-calculator'
import type { BdfWorkoutSession, BdfTendonHealthLog } from '../types'

describe('BDF PR Calculator & Engine', () => {
  const mockSessions: BdfWorkoutSession[] = [
    {
      id: 's1',
      date: '2026-11-01T10:00:00.000Z',
      title: 'Toproll Focus',
      type: 'ordinario',
      targetArm: 'destro',
      createdAt: '2026-11-01T10:00:00.000Z',
      updatedAt: '2026-11-01T10:00:00.000Z',
      exercises: [
        {
          id: 'ex1',
          exerciseId: 'pronation-judo-belt',
          name: 'Pronazione con Judo Belt',
          vector: 'pronazione',
          equipment: 'judo_belt',
          targetArm: 'destro',
          sets: [
            { id: 'set1', setNumber: 1, mode: 'isometric_hold', weightKg: 30, holdSeconds: 5, completed: true },
            { id: 'set2', setNumber: 2, mode: 'isometric_hold', weightKg: 35, holdSeconds: 5, completed: true },
          ],
        },
        {
          id: 'ex2',
          exerciseId: 'rising-dumbbell',
          name: 'Rising con Manubrio',
          vector: 'rising',
          equipment: 'manubrio',
          targetArm: 'destro',
          sets: [
            { id: 'set3', setNumber: 1, mode: 'reps', weightKg: 16, reps: 8, completed: true },
            { id: 'set4', setNumber: 2, mode: 'reps', weightKg: 18, reps: 6, completed: true },
          ],
        },
      ],
    },
    {
      id: 's2',
      date: '2026-11-05T10:00:00.000Z',
      title: 'Preparazione Gara - Peaking',
      type: 'gara_prep',
      targetArm: 'destro',
      createdAt: '2026-11-05T10:00:00.000Z',
      updatedAt: '2026-11-05T10:00:00.000Z',
      exercises: [
        {
          id: 'ex3',
          exerciseId: 'pronation-judo-belt',
          name: 'Pronazione con Judo Belt',
          vector: 'pronazione',
          equipment: 'judo_belt',
          targetArm: 'destro',
          sets: [
            { id: 'set5', setNumber: 1, mode: 'isometric_hold', weightKg: 40, holdSeconds: 5, completed: true },
            { id: 'set6', setNumber: 2, mode: 'isometric_hold', weightKg: 42.5, holdSeconds: 4, completed: true },
          ],
        },
      ],
    },
  ]

  it('calcola correttamente i Record Personali per isometriche e reps', () => {
    const prs = calculatePersonalRecords(mockSessions)
    expect(prs.length).toBe(2)

    const pronationPR = prs.find((p) => p.exerciseId === 'pronation-judo-belt')
    expect(pronationPR).toBeDefined()
    expect(pronationPR?.maxWeightKg).toBe(42.5)
    expect(pronationPR?.repsOrSeconds).toBe(4)
    expect(pronationPR?.mode).toBe('isometric_hold')

    const risingPR = prs.find((p) => p.exerciseId === 'rising-dumbbell')
    expect(risingPR).toBeDefined()
    expect(risingPR?.maxWeightKg).toBe(18)
    expect(risingPR?.repsOrSeconds).toBe(6)
    expect(risingPR?.mode).toBe('reps')
  })

  it('ignora le serie non completate o con peso nullo', () => {
    const sessionWithIncomplete: BdfWorkoutSession[] = [
      {
        id: 's3',
        date: '2026-11-10T10:00:00.000Z',
        title: 'Test',
        type: 'ordinario',
        targetArm: 'destro',
        createdAt: '2026-11-10T10:00:00.000Z',
        updatedAt: '2026-11-10T10:00:00.000Z',
        exercises: [
          {
            id: 'ex',
            exerciseId: 'bench-press',
            name: 'Panca Piana',
            vector: 'condizionamento',
            equipment: 'bilanciere',
            targetArm: 'entrambi',
            sets: [
              { id: 'set-fail', setNumber: 1, mode: 'reps', weightKg: 120, reps: 1, completed: false },
              { id: 'set-ok', setNumber: 2, mode: 'reps', weightKg: 100, reps: 5, completed: true },
            ],
          },
        ],
      },
    ]

    const prs = calculatePersonalRecords(sessionWithIncomplete)
    expect(prs.length).toBe(1)
    expect(prs[0]?.maxWeightKg).toBe(100)
    expect(prs[0]?.repsOrSeconds).toBe(5)
  })

  it('rileva lo stato di allerta scarico quando il dolore al gomito supera la soglia', () => {
    const highPainLogs: BdfTendonHealthLog[] = [
      {
        id: 'log1',
        date: '2026-11-15T10:00:00.000Z',
        zone: 'epitroclea_mediale',
        painLevel: 4,
        arm: 'destro',
      },
      {
        id: 'log2',
        date: '2026-11-16T10:00:00.000Z',
        zone: 'epitroclea_mediale',
        painLevel: 4,
        arm: 'destro',
      },
    ]

    const health = evaluateTendonHealth([], highPainLogs)
    expect(health.status).toBe('allerta_scarico')
    expect(health.activeZone).toBe('epitroclea_mediale')
    expect(health.avgPain).toBe(4)
  })

  it('compila il dashboard summary con statistiche coerenti', () => {
    const summary = buildDashboardSummary(mockSessions, [])
    expect(summary.totalWorkouts).toBe(2)
    expect(summary.lastWorkout?.id).toBe('s2')
    expect(summary.topPRs.length).toBe(2)
    expect(summary.currentTendonStatus.status).toBe('ottimo')
  })
})
