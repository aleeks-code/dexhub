import type { BdfExerciseTemplate, BdfTendonZone } from '../types'

export const DEFAULT_BDF_EXERCISES: BdfExerciseTemplate[] = [
  // 1. Pronazione
  {
    id: 'pronation-judo-belt',
    name: 'Pronazione con Judo Belt',
    vector: 'pronazione',
    defaultEquipment: 'judo_belt',
    defaultMode: 'isometric_hold',
    description: 'Cintura judo avvolta attorno al pollice e dorso mano per simulare la pressione di toproll.',
  },
  {
    id: 'pronation-dumbbell',
    name: 'Pronazione con Manubrio',
    vector: 'pronazione',
    defaultEquipment: 'manubrio',
    defaultMode: 'reps',
    description: 'Carico asimmetrico per rinforzare il pronatore teres e la tenuta.',
  },

  // 2. Rising
  {
    id: 'rising-judo-belt',
    name: 'Rising con Judo Belt',
    vector: 'rising',
    defaultEquipment: 'judo_belt',
    defaultMode: 'isometric_hold',
    description: 'Cintura che passa sulla nocca dell’indice per elevare il polso e mantenere l’altezza al tavolo.',
  },
  {
    id: 'rising-dumbbell',
    name: 'Rising con Manubrio',
    vector: 'rising',
    defaultEquipment: 'manubrio',
    defaultMode: 'reps',
    description: 'Elevazione radiale del polso con manubrio poggiato su panca o coscia.',
  },

  // 3. Cupping / Flessione Polso
  {
    id: 'cupping-dumbbell',
    name: 'Wrist Curl / Cupping con Manubrio',
    vector: 'cupping',
    defaultEquipment: 'manubrio',
    defaultMode: 'reps',
    description: 'Flessione del polso fondamentale per entrare e tenere l’Hook.',
  },
  {
    id: 'cupping-judo-belt',
    name: 'Cupping con Judo Belt',
    vector: 'cupping',
    defaultEquipment: 'judo_belt',
    defaultMode: 'isometric_hold',
    description: 'Tenuta isometrica in chiusura con cinghia sul palmo e dita.',
  },

  // 4. Backpressure
  {
    id: 'backpressure-hammer-belt',
    name: 'Hammer Curl con Judo Belt',
    vector: 'backpressure',
    defaultEquipment: 'judo_belt',
    defaultMode: 'isometric_hold',
    description: 'Trazione dorsale/brachioradiale con presa a martello a 90° gradi.',
  },
  {
    id: 'backpressure-ez-bar',
    name: 'Hammer / Bicipite con EZ Bar',
    vector: 'backpressure',
    defaultEquipment: 'ez_bar',
    defaultMode: 'reps',
    description: 'Rinforzo della catena flessoria del braccio e brachiale.',
  },

  // 5. Side Pressure
  {
    id: 'side-pressure-belt',
    name: 'Side Pressure con Judo Belt',
    vector: 'sidepressure',
    defaultEquipment: 'judo_belt',
    defaultMode: 'isometric_hold',
    description: 'Pressione laterale interna per chiudere il braccio al cuscinetto (pad).',
  },
  {
    id: 'side-pressure-band',
    name: 'Side Pressure con Elastico',
    vector: 'sidepressure',
    defaultEquipment: 'elastico',
    defaultMode: 'reps',
    description: 'Lavoro controllato e costante per la cuffia e stabilizzatori interni.',
  },

  // 6. Supinazione
  {
    id: 'supination-band',
    name: 'Supinazione Difensiva con Elastico',
    vector: 'supinazione',
    defaultEquipment: 'elastico',
    defaultMode: 'reps',
    description: 'Rotazione esterna per difesa dal toproll e stabilizzazione hook.',
  },
  {
    id: 'supination-dumbbell',
    name: 'Supinazione con Manubrio',
    vector: 'supinazione',
    defaultEquipment: 'manubrio',
    defaultMode: 'reps',
    description: 'Rotazione esterna controllata con manubrio a carico asimmetrico.',
  },

  // 7. Presa & Dita
  {
    id: 'finger-containment-dumbbell',
    name: 'Finger Curl / Containment',
    vector: 'presa_dita',
    defaultEquipment: 'manubrio',
    defaultMode: 'reps',
    description: 'Chiusura delle dita dalla punta al palmo per contrastare l’estensione avversaria.',
  },

  // 8. Condizionamento & Forza Generale
  {
    id: 'weighted-pullups',
    name: 'Trazioni alla Sbarra Zavorrate',
    vector: 'condizionamento',
    defaultEquipment: 'corpo_libero',
    defaultMode: 'reps',
    description: 'Trazioni prone o neutre con cintura/zavorra per schiena e dorsali.',
  },
  {
    id: 'weighted-dips',
    name: 'Dip alle Parallele Zavorrati',
    vector: 'condizionamento',
    defaultEquipment: 'corpo_libero',
    defaultMode: 'reps',
    description: 'Spinta tricipiti e petto per la transizione in press e spalla avanzata.',
  },
  {
    id: 'bench-press',
    name: 'Panca Piana con Bilanciere',
    vector: 'condizionamento',
    defaultEquipment: 'bilanciere',
    defaultMode: 'reps',
    description: 'Forza di spinta generale per pettorali, deltoidi e tricipiti.',
  },

  // 9. Rehab & Scarico Tendineo
  {
    id: 'rehab-pronator-band',
    name: 'Rehab Pronatore con Elastico (High Reps)',
    vector: 'rehab',
    defaultEquipment: 'elastico',
    defaultMode: 'reps',
    description: '30-50 ripetizioni fluide con loop band leggera per irrorare l’epitroclea.',
  },
  {
    id: 'rehab-extensors-band',
    name: 'Rehab Estensori Polso con Elastico',
    vector: 'rehab',
    defaultEquipment: 'elastico',
    defaultMode: 'reps',
    description: 'Estensioni lente per prevenire epicondilite e scaricare i flessori.',
  },

  // 10. Tavolo
  {
    id: 'table-sparring',
    name: 'Sparring al Tavolo (Table Time)',
    vector: 'sidepressure',
    defaultEquipment: 'tavolo',
    defaultMode: 'isometric_hold',
    description: 'Round tecnici con partner al tavolo, prove di partenza (Ready-Go) e cinghie.',
  },
]

export const TENDON_ZONES_CONFIG: Array<{
  zone: BdfTendonZone
  label: string
  vulgo: string
  description: string
}> = [
  {
    zone: 'epitroclea_mediale',
    label: 'Epitroclea (Gomito Interno)',
    vulgo: 'Tendinite del Golfer / Medial Pain',
    description: 'Inserzione dei flessori del polso e pronatore teres. Molto sollecitata in Hook e Side Pressure.',
  },
  {
    zone: 'epicondilo_laterale',
    label: 'Epicondilo (Gomito Esterno)',
    vulgo: 'Gomito del Tennista / Lateral Pain',
    description: 'Inserzione estensori e supinatori. Sollecitata da Toproll e Rising forzato.',
  },
  {
    zone: 'bicipite_distale',
    label: 'Bicipite Distale (Piega Gomito)',
    vulgo: 'Tendine Bicipitale',
    description: 'Punto critico nella Backpressure ad angolo stretto e transizioni violente.',
  },
  {
    zone: 'brachioradiale',
    label: 'Brachioradiale (Avambraccio Alto)',
    vulgo: 'Top of Forearm',
    description: 'Muscolo chiave per trazione a martello e tenuta del toproll.',
  },
  {
    zone: 'polso',
    label: 'Polso & Complesso Fibrocartilagineo',
    vulgo: 'TFCC & Wrist Joint',
    description: 'Sollecitato da pronazioni e rising con carichi estremi.',
  },
]
