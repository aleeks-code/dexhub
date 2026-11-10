import type {
  Loan,
  Installment,
  InstallmentStatus,
  LoanStatistics,
  GlobalLoansSummary,
  EarlyRepaymentSimulation,
} from '../types'

export function round(val: number, decimals: number = 2): number {
  const factor = Math.pow(10, decimals)
  return Math.round((val + Number.EPSILON) * factor) / factor
}

export function getTodayIso(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/**
 * Calculates French monthly installment (Rata costante alla francese)
 * R = C * [r * (1 + r)^n] / [(1 + r)^n - 1]
 */
export function calculateFrenchMonthlyInstallment(
  principal: number,
  annualRatePercentage: number,
  totalInstallments: number,
): number {
  if (principal <= 0 || totalInstallments <= 0) return 0
  if (annualRatePercentage <= 0) {
    return round(principal / totalInstallments)
  }

  const monthlyRate = annualRatePercentage / 100 / 12
  const pow = Math.pow(1 + monthlyRate, totalInstallments)
  const installment = (principal * (monthlyRate * pow)) / (pow - 1)
  return round(installment)
}

/**
 * Derives the annual TAN from financed principal, monthly installment (net of fees), and count of installments.
 * Uses Newton-Raphson numerical solver.
 */
export function solveTan(
  principal: number,
  monthlyInstallmentWithoutFee: number,
  totalInstallments: number,
): number {
  if (principal <= 0 || monthlyInstallmentWithoutFee <= 0 || totalInstallments <= 0) return 0
  if (Math.abs(monthlyInstallmentWithoutFee * totalInstallments - principal) < 1) return 0

  let r = (monthlyInstallmentWithoutFee * totalInstallments - principal) / (principal * totalInstallments)
  if (r <= 0) r = 0.005

  for (let iter = 0; iter < 50; iter++) {
    const pow = Math.pow(1 + r, totalInstallments)
    const f = (principal * (r * pow)) / (pow - 1) - monthlyInstallmentWithoutFee
    const fPrime =
      principal * (pow * (pow - 1 - totalInstallments * r) + pow) / Math.pow(pow - 1, 2)
    if (Math.abs(fPrime) < 1e-12) break
    const nextR = r - f / fPrime
    if (Math.abs(nextR - r) < 1e-8) {
      r = nextR
      break
    }
    r = nextR
  }

  const annualTan = round(r * 12 * 100, 2)
  return isNaN(annualTan) || annualTan < 0 ? 0 : annualTan
}

/**
 * Generates the full amortization schedule with automatic date succession and residual balance tracking
 */
export function generateAmortizationSchedule(params: {
  financedAmount: number
  tan: number
  installmentsCount: number
  startDate: string // YYYY-MM-DD
  paymentDay?: number
  monthlyFee?: number
  knownMonthlyInstallment?: number
}): Installment[] {
  const {
    financedAmount,
    tan,
    installmentsCount,
    startDate,
    paymentDay,
    monthlyFee = 0,
    knownMonthlyInstallment,
  } = params

  if (financedAmount <= 0 || installmentsCount <= 0) return []

  const monthlyRate = tan > 0 ? tan / 100 / 12 : 0
  const monthlyPaymentWithoutFee =
    knownMonthlyInstallment && knownMonthlyInstallment > 0
      ? knownMonthlyInstallment
      : calculateFrenchMonthlyInstallment(financedAmount, tan, installmentsCount)

  const schedule: Installment[] = []
  let residualDebt = financedAmount

  const [startYearStr, startMonthStr, startDayStr] = startDate.split('-')
  const startYear = parseInt(startYearStr || '2026', 10)
  const startMonth = parseInt(startMonthStr || '1', 10)
  const fallbackDay = parseInt(startDayStr || '15', 10)
  const dueDay = paymentDay && paymentDay >= 1 && paymentDay <= 31 ? paymentDay : fallbackDay

  for (let k = 1; k <= installmentsCount; k++) {
    // Calculate target year and month for installment k (k-1 offset)
    const monthIndex = startMonth - 1 + (k - 1)
    const year = startYear + Math.floor(monthIndex / 12)
    const month = (monthIndex % 12) + 1

    // Handle month length
    const daysInMonth = new Date(year, month, 0).getDate()
    const finalDay = Math.min(dueDay, daysInMonth)

    const dueDateStr = `${year}-${String(month).padStart(2, '0')}-${String(finalDay).padStart(2, '0')}`

    let interestQuota = monthlyRate > 0 ? round(residualDebt * monthlyRate) : 0
    let principalQuota: number
    let totalInstallment: number

    if (k === installmentsCount) {
      // Last installment: exact capital residual adjustment
      principalQuota = residualDebt
      totalInstallment = round(principalQuota + interestQuota + monthlyFee)
      residualDebt = 0
    } else {
      principalQuota = round(monthlyPaymentWithoutFee - interestQuota)
      if (principalQuota > residualDebt) {
        principalQuota = residualDebt
      }
      residualDebt = round(residualDebt - principalQuota)
      totalInstallment = round(principalQuota + interestQuota + monthlyFee)
    }

    schedule.push({
      number: k,
      dueDate: dueDateStr,
      totalAmount: totalInstallment,
      principalAmount: principalQuota,
      interestAmount: interestQuota,
      feeAmount: round(monthlyFee),
      residualDebt: Math.max(0, residualDebt),
    })
  }

  return schedule
}

/**
 * Determines whether an installment is automatically paid, in due, or upcoming.
 * "ogni futura domiciliazione con le date deve essere automaticamente aggiornata,
 *  dunque se il mese prossimo il 15 io pago in automatico, non devo io utente flaggare"
 */
export function getInstallmentStatus(
  installment: Installment,
  asOfDate: string = getTodayIso(),
): InstallmentStatus {
  if (installment.manualOverride === 'paid') return 'paid'
  if (installment.manualOverride === 'unpaid') return 'upcoming'

  // Automatic calendar date check:
  if (installment.dueDate <= asOfDate) {
    return 'paid'
  }

  // Check if due in current month or next 7 days
  const today = new Date(asOfDate)
  const dueDate = new Date(installment.dueDate)
  const diffDays = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

  if (diffDays <= 7 && diffDays >= 0) {
    return 'in_due'
  }

  return 'upcoming'
}

/**
 * Calculate comprehensive statistics for a single loan
 */
export function calculateLoanStatistics(
  loan: Loan,
  asOfDate: string = getTodayIso(),
): LoanStatistics {
  const schedule = loan.schedule || []
  let totalPrincipalPaid = 0
  let totalInterestPaid = 0
  let totalInterestDue = 0
  let paidCount = 0

  for (const inst of schedule) {
    totalInterestDue = round(totalInterestDue + inst.interestAmount)
    const status = getInstallmentStatus(inst, asOfDate)
    if (status === 'paid') {
      paidCount++
      totalPrincipalPaid = round(totalPrincipalPaid + inst.principalAmount)
      totalInterestPaid = round(totalInterestPaid + inst.interestAmount)
    }
  }

  // Include extra payments if any
  if (loan.extraPayments && loan.extraPayments.length > 0) {
    for (const ep of loan.extraPayments) {
      if (ep.date <= asOfDate) {
        totalPrincipalPaid = round(totalPrincipalPaid + ep.amount)
      }
    }
  }

  const residualDebt = Math.max(0, round(loan.financedAmount - totalPrincipalPaid))
  const remainingInterest = Math.max(0, round(totalInterestDue - totalInterestPaid))
  const totalFees = round((loan.monthlyFee || 0) * loan.installmentsCount)
  const totalCostOfLoan = round(loan.financedAmount + totalInterestDue + totalFees)
  const completionPercentage =
    loan.financedAmount > 0 ? round(Math.min(100, (totalPrincipalPaid / loan.financedAmount) * 100), 1) : 100

  // Next installment to be paid
  const nextInstallment = schedule.find((inst) => getInstallmentStatus(inst, asOfDate) !== 'paid')
  let daysUntilNext: number | undefined
  if (nextInstallment) {
    const today = new Date(asOfDate)
    const nextDate = new Date(nextInstallment.dueDate)
    daysUntilNext = Math.ceil((nextDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  }

  const projectedEndDate = schedule[schedule.length - 1]?.dueDate || loan.startDate
  const isCompleted = residualDebt <= 0.01 || paidCount >= loan.installmentsCount

  return {
    totalAmount: loan.financedAmount,
    residualDebt,
    totalPrincipalPaid,
    totalInterestDue,
    totalInterestPaid,
    remainingInterest,
    totalFees,
    totalCostOfLoan,
    installmentsPaidCount: paidCount,
    installmentsRemainingCount: Math.max(0, loan.installmentsCount - paidCount),
    installmentsTotalCount: loan.installmentsCount,
    completionPercentage,
    nextInstallment,
    daysUntilNext,
    projectedEndDate,
    isCompleted,
  }
}

/**
 * Computes aggregate summary across all user loans
 */
export function calculateGlobalLoansSummary(
  loans: Loan[],
  asOfDate: string = getTodayIso(),
): GlobalLoansSummary {
  let activeLoansCount = 0
  let completedLoansCount = 0
  let totalResidualDebt = 0
  let totalMonthlyCommitment = 0
  let totalPrincipalRepaid = 0
  let totalInterestPaid = 0
  let totalInitialFinanced = 0

  let earliestNextPayment:
    | {
        loanId: string
        loanName: string
        lender: string
        installment: Installment
        daysUntil: number
      }
    | undefined

  const upcomingThisMonth: {
    loanId: string
    loanName: string
    lender: string
    installment: Installment
  }[] = []

  const asOfYearMonth = asOfDate.slice(0, 7) // YYYY-MM

  for (const loan of loans) {
    const stats = calculateLoanStatistics(loan, asOfDate)
    totalInitialFinanced = round(totalInitialFinanced + loan.financedAmount)
    totalPrincipalRepaid = round(totalPrincipalRepaid + stats.totalPrincipalPaid)
    totalInterestPaid = round(totalInterestPaid + stats.totalInterestPaid)

    if (stats.isCompleted) {
      completedLoansCount++
    } else {
      activeLoansCount++
      totalResidualDebt = round(totalResidualDebt + stats.residualDebt)
      totalMonthlyCommitment = round(totalMonthlyCommitment + (loan.monthlyInstallment || 0))

      if (stats.nextInstallment && stats.daysUntilNext !== undefined) {
        if (!earliestNextPayment || stats.daysUntilNext < earliestNextPayment.daysUntil) {
          earliestNextPayment = {
            loanId: loan.id,
            loanName: loan.name,
            lender: loan.lender,
            installment: stats.nextInstallment,
            daysUntil: stats.daysUntilNext,
          }
        }
      }

      // Check upcoming installments in this month
      for (const inst of loan.schedule) {
        if (
          inst.dueDate.startsWith(asOfYearMonth) &&
          getInstallmentStatus(inst, asOfDate) !== 'paid'
        ) {
          upcomingThisMonth.push({
            loanId: loan.id,
            loanName: loan.name,
            lender: loan.lender,
            installment: inst,
          })
        }
      }
    }
  }

  return {
    activeLoansCount,
    completedLoansCount,
    totalResidualDebt,
    totalMonthlyCommitment: round(totalMonthlyCommitment),
    totalPrincipalRepaid,
    totalInterestPaid,
    totalInitialFinanced,
    nextPayment: earliestNextPayment,
    upcomingThisMonth,
  }
}

/**
 * Early Repayment Simulator:
 * Calculates savings in interest and duration or monthly payment.
 */
export function simulateEarlyRepayment(
  loan: Loan,
  extraAmount: number,
  strategy: 'reduce_term' | 'reduce_installment',
  asOfDate: string = getTodayIso(),
): EarlyRepaymentSimulation {
  const stats = calculateLoanStatistics(loan, asOfDate)
  const currentResidual = stats.residualDebt
  const remainingMonths = stats.installmentsRemainingCount
  const originalInterest = stats.remainingInterest
  const currentInstallment = loan.monthlyInstallment

  const cappedExtra = Math.min(extraAmount, currentResidual)
  const newResidual = round(currentResidual - cappedExtra)

  if (newResidual <= 0.01) {
    // Total payoff
    return {
      extraAmount: cappedExtra,
      strategy,
      originalResidualDebt: currentResidual,
      originalRemainingInterest: originalInterest,
      originalRemainingMonths: remainingMonths,
      originalMonthlyInstallment: currentInstallment,
      newResidualDebt: 0,
      newRemainingMonths: 0,
      newMonthlyInstallment: 0,
      interestSaved: originalInterest,
      monthsSaved: remainingMonths,
      monthlySaving: currentInstallment,
    }
  }

  const monthlyRate = loan.tan > 0 ? loan.tan / 100 / 12 : 0

  if (strategy === 'reduce_term') {
    // Keep monthly installment R, calculate new number of months n'
    let newMonths = 0
    let simulatedInterest = 0

    if (monthlyRate <= 0) {
      newMonths = Math.ceil(newResidual / currentInstallment)
      simulatedInterest = 0
    } else {
      // n = -ln(1 - (r * D) / R) / ln(1 + r)
      const ratio = (monthlyRate * newResidual) / currentInstallment
      if (ratio >= 1) {
        // Installment doesn't even cover monthly interest; edge case fallback
        newMonths = remainingMonths
        simulatedInterest = originalInterest
      } else {
        const rawN = -Math.log(1 - ratio) / Math.log(1 + monthlyRate)
        newMonths = Math.ceil(rawN)

        // Compute actual interest in new shortened schedule
        let tempDebt = newResidual
        for (let i = 1; i <= newMonths; i++) {
          const intQuota = round(tempDebt * monthlyRate)
          simulatedInterest = round(simulatedInterest + intQuota)
          const capQuota =
            i === newMonths ? tempDebt : Math.min(tempDebt, round(currentInstallment - intQuota))
          tempDebt = round(tempDebt - capQuota)
        }
      }
    }

    const monthsSaved = Math.max(0, remainingMonths - newMonths)
    const interestSaved = Math.max(0, round(originalInterest - simulatedInterest))

    return {
      extraAmount: cappedExtra,
      strategy,
      originalResidualDebt: currentResidual,
      originalRemainingInterest: originalInterest,
      originalRemainingMonths: remainingMonths,
      originalMonthlyInstallment: currentInstallment,
      newResidualDebt: newResidual,
      newRemainingMonths: newMonths,
      newMonthlyInstallment: currentInstallment,
      interestSaved,
      monthsSaved,
      monthlySaving: 0,
    }
  } else {
    // strategy === 'reduce_installment': keep remaining months constant, calculate new lower installment
    const newInstallment = calculateFrenchMonthlyInstallment(
      newResidual,
      loan.tan,
      remainingMonths,
    )
    const newTotalPaid = round(newInstallment * remainingMonths)
    const newTotalInterest = Math.max(0, round(newTotalPaid - newResidual))
    const interestSaved = Math.max(0, round(originalInterest - newTotalInterest))
    const monthlySaving = Math.max(0, round(currentInstallment - newInstallment))

    return {
      extraAmount: cappedExtra,
      strategy,
      originalResidualDebt: currentResidual,
      originalRemainingInterest: originalInterest,
      originalRemainingMonths: remainingMonths,
      originalMonthlyInstallment: currentInstallment,
      newResidualDebt: newResidual,
      newRemainingMonths: remainingMonths,
      newMonthlyInstallment: newInstallment,
      interestSaved,
      monthsSaved: 0,
      monthlySaving,
    }
  }
}
