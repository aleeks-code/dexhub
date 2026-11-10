export interface Person {
  id: string
  name: string
  avatarColor: string
  notes?: string
  createdAt: string
}

export type TransactionType =
  | 'lend' // Ho prestato / Ha un debito verso di me (Mio credito +)
  | 'borrow' // Ho preso in prestito / Ho un debito verso di lui (Mio debito -)
  | 'repayment_received' // Mi ha restituito dei soldi (Diminuisce il mio credito)
  | 'repayment_sent' // Ho restituito dei soldi (Diminuisce il mio debito)

export interface DebtTransaction {
  id: string
  personId: string
  type: TransactionType
  amount: number // Valore positivo in €
  description: string
  date: string // YYYY-MM-DD
  settled: boolean
  category?: string
  linkedTxId?: string
  createdAt: string
}

export interface PersonSummary {
  person: Person
  netBalance: number // > 0: mi deve soldi; < 0: gli devo soldi; == 0: in pari
  totalLent: number
  totalBorrowed: number
  openTransactionsCount: number
  lastActivityDate?: string
}

export interface GlobalSummary {
  totalCredit: number // Somma di tutti i crediti verso gli altri
  totalDebt: number // Somma di tutti i debiti verso gli altri
  netBalance: number // totalCredit - totalDebt
  peopleCount: number
  unsettledCount: number
}

export const AVATAR_COLORS = [
  '#0d9488', // Teal
  '#0284c7', // Sky
  '#6366f1', // Indigo
  '#8b5cf6', // Purple
  '#ec4899', // Pink
  '#f59e0b', // Amber
  '#10b981', // Emerald
  '#f97316', // Orange
]

export const TRANSACTION_CATEGORIES = [
  'Cena & Uscite',
  'Spesa & Casa',
  'Viaggi & Vacanze',
  'Regali',
  'Bollette & Servizi',
  'Prestito Personale',
  'Altro',
]

// ──────────────── Undo / Redo & History ────────────────

export type HistoryStepType =
  | 'add_tx'
  | 'delete_tx'
  | 'edit_tx'
  | 'settle'
  | 'split'
  | 'add_person'
  | 'delete_person'

export type HistoryStep =
  | {
      id: string
      timestamp: number
      title: string
      type: 'add_tx'
      tx: DebtTransaction
    }
  | {
      id: string
      timestamp: number
      title: string
      type: 'delete_tx'
      tx: DebtTransaction
    }
  | {
      id: string
      timestamp: number
      title: string
      type: 'edit_tx'
      previous: DebtTransaction
      updated: DebtTransaction
    }
  | {
      id: string
      timestamp: number
      title: string
      type: 'settle'
      tx: DebtTransaction
    }
  | {
      id: string
      timestamp: number
      title: string
      type: 'split'
      txs: DebtTransaction[]
    }
  | {
      id: string
      timestamp: number
      title: string
      type: 'add_person'
      person: Person
    }
  | {
      id: string
      timestamp: number
      title: string
      type: 'delete_person'
      person: Person
      txs: DebtTransaction[]
    }

