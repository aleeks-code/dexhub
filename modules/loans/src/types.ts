export type LoanType =
  | 'personal'
  | 'mortgage'
  | 'auto'
  | 'electronics'
  | 'salary_backed'
  | 'other'

export const LOAN_TYPE_LABELS: Record<LoanType, string> = {
  personal: 'Prestito Personale',
  mortgage: 'Mutuo Ipotecario',
  auto: 'Finanziamento Auto',
  electronics: 'Elettronica / Tasso Zero',
  salary_backed: 'Cessione del Quinto',
  other: 'Altro Finanziamento',
}

export type InstallmentStatus = 'paid' | 'in_due' | 'upcoming'

export interface Installment {
  number: number
  dueDate: string // YYYY-MM-DD
  totalAmount: number // Quota Capitale + Quota Interessi + Spese
  principalAmount: number // Quota Capitale
  interestAmount: number // Quota Interessi
  feeAmount: number // Spese Incasso
  residualDebt: number // Debito residuo dopo il pagamento
  manualOverride?: 'paid' | 'unpaid'
  paidAt?: string
}

export interface ExtraPayment {
  id: string
  date: string // YYYY-MM-DD
  amount: number
  strategy: 'reduce_term' | 'reduce_installment'
  note?: string
}

export type FieldOrigin = 'extracted' | 'computed' | 'manual'

export interface FieldProvenance {
  origin: FieldOrigin
  note?: string
}

export interface Loan {
  id: string
  name: string
  lender: string
  type: LoanType
  contractNumber?: string
  iban?: string
  notes?: string
  financedAmount: number
  tan: number // % (es. 5.5)
  taeg?: number // % (es. 6.2)
  installmentsCount: number
  monthlyInstallment: number
  monthlyFee: number // Default 0
  startDate: string // YYYY-MM-DD
  paymentDay: number // 1..31
  createdAt: string
  updatedAt: string
  schedule: Installment[]
  extraPayments?: ExtraPayment[]
  fieldProvenance?: Record<string, FieldProvenance>
}

export interface LoanStatistics {
  totalAmount: number
  residualDebt: number
  totalPrincipalPaid: number
  totalInterestDue: number
  totalInterestPaid: number
  remainingInterest: number
  totalFees: number
  totalCostOfLoan: number
  installmentsPaidCount: number
  installmentsRemainingCount: number
  installmentsTotalCount: number
  completionPercentage: number
  nextInstallment?: Installment
  daysUntilNext?: number
  projectedEndDate: string
  isCompleted: boolean
}

export interface GlobalLoansSummary {
  activeLoansCount: number
  completedLoansCount: number
  totalResidualDebt: number
  totalMonthlyCommitment: number
  totalPrincipalRepaid: number
  totalInterestPaid: number
  totalInitialFinanced: number
  nextPayment?: {
    loanId: string
    loanName: string
    lender: string
    installment: Installment
    daysUntil: number
  }
  upcomingThisMonth: {
    loanId: string
    loanName: string
    lender: string
    installment: Installment
  }[]
}

export interface ExtractedPdfData {
  lender?: string
  contractNumber?: string
  financedAmount?: number
  tan?: number
  taeg?: number
  installmentsCount?: number
  monthlyInstallment?: number
  monthlyFee?: number
  startDate?: string
  paymentDay?: number
  rawText: string
  schedule?: Installment[]
  provenance: Record<string, FieldProvenance>
  confidence: {
    lender: number
    amount: number
    tan: number
    installments: number
    monthlyPayment: number
    startDate: number
  }
}

export interface EarlyRepaymentSimulation {
  extraAmount: number
  strategy: 'reduce_term' | 'reduce_installment'
  originalResidualDebt: number
  originalRemainingInterest: number
  originalRemainingMonths: number
  originalMonthlyInstallment: number
  newResidualDebt: number
  newRemainingMonths: number
  newMonthlyInstallment: number
  interestSaved: number
  monthsSaved: number
  monthlySaving: number
}
