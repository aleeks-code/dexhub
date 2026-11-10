import { describe, it, expect } from 'vitest'
import {
  calculateFrenchMonthlyInstallment,
  generateAmortizationSchedule,
  getInstallmentStatus,
  calculateLoanStatistics,
  simulateEarlyRepayment,
  round,
} from './amortization'
import type { Loan } from '../types'

describe('Amortization Engine', () => {
  it('calculates French monthly installment accurately', () => {
    // 10,000 € at 5% for 48 months
    // Standard financial calculation: ~230.29 €
    const installment = calculateFrenchMonthlyInstallment(10000, 5, 48)
    expect(installment).toBe(230.29)
  })

  it('handles zero interest loans (Tasso Zero)', () => {
    // 1,200 € at 0% for 12 months = 100 € / month
    const installment = calculateFrenchMonthlyInstallment(1200, 0, 12)
    expect(installment).toBe(100)
  })

  it('generates a full amortization schedule ending in exactly 0 residual debt', () => {
    const schedule = generateAmortizationSchedule({
      financedAmount: 10000,
      tan: 6.5,
      installmentsCount: 36,
      startDate: '2025-01-15',
      paymentDay: 15,
      monthlyFee: 1.5,
    })

    expect(schedule.length).toBe(36)
    expect(schedule[0]!.dueDate).toBe('2025-01-15')
    expect(schedule[0]!.feeAmount).toBe(1.5)
    expect(schedule[35]!.residualDebt).toBe(0)

    // Sum of principal quotas must equal exactly original financedAmount
    const totalPrincipal = schedule.reduce((acc, row) => round(acc + row.principalAmount), 0)
    expect(Math.abs(totalPrincipal - 10000)).toBeLessThanOrEqual(0.05)
  })

  it('automatically marks installments as paid when due date is in the past without manual action', () => {
    const instPast = {
      number: 1,
      dueDate: '2025-01-15',
      totalAmount: 200,
      principalAmount: 180,
      interestAmount: 20,
      feeAmount: 0,
      residualDebt: 800,
    }

    const instFuture = {
      number: 2,
      dueDate: '2028-12-15',
      totalAmount: 200,
      principalAmount: 180,
      interestAmount: 20,
      feeAmount: 0,
      residualDebt: 600,
    }

    const today = '2026-05-10'
    expect(getInstallmentStatus(instPast, today)).toBe('paid')
    expect(getInstallmentStatus(instFuture, today)).toBe('upcoming')
  })

  it('computes loan statistics correctly with automatic progress', () => {
    const schedule = generateAmortizationSchedule({
      financedAmount: 6000,
      tan: 0,
      installmentsCount: 6,
      startDate: '2026-01-10',
      paymentDay: 10,
    })

    const mockLoan: Loan = {
      id: 'test-loan-1',
      name: 'Prestito Test',
      lender: 'Findomestic',
      type: 'personal',
      financedAmount: 6000,
      tan: 0,
      installmentsCount: 6,
      monthlyInstallment: 1000,
      monthlyFee: 0,
      startDate: '2026-01-10',
      paymentDay: 10,
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
      schedule,
    }

    // On 2026-03-15: installments for Jan 10, Feb 10, Mar 10 are paid (3 installments = 3,000 € repaid)
    const stats = calculateLoanStatistics(mockLoan, '2026-03-15')
    expect(stats.installmentsPaidCount).toBe(3)
    expect(stats.installmentsRemainingCount).toBe(3)
    expect(stats.totalPrincipalPaid).toBe(3000)
    expect(stats.residualDebt).toBe(3000)
    expect(stats.completionPercentage).toBe(50)
    expect(stats.isCompleted).toBe(false)
    expect(stats.nextInstallment?.dueDate).toBe('2026-04-10')
  })

  it('simulates early repayment reducing duration and saving interest', () => {
    const schedule = generateAmortizationSchedule({
      financedAmount: 20000,
      tan: 7.0,
      installmentsCount: 60,
      startDate: '2026-01-01',
      paymentDay: 1,
    })

    const mockLoan: Loan = {
      id: 'test-loan-2',
      name: 'Simulatore Mutuo',
      lender: 'Intesa Sanpaolo',
      type: 'mortgage',
      financedAmount: 20000,
      tan: 7.0,
      installmentsCount: 60,
      monthlyInstallment: 396.02,
      monthlyFee: 0,
      startDate: '2026-01-01',
      paymentDay: 1,
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
      schedule,
    }

    // Repay 5,000 € extra right before installment 1
    const simTerm = simulateEarlyRepayment(mockLoan, 5000, 'reduce_term', '2025-12-31')
    expect(simTerm.newResidualDebt).toBe(15000)
    expect(simTerm.monthsSaved).toBeGreaterThan(12)
    expect(simTerm.interestSaved).toBeGreaterThan(500)

    const simInst = simulateEarlyRepayment(mockLoan, 5000, 'reduce_installment', '2025-12-31')
    expect(simInst.newRemainingMonths).toBe(60)
    expect(simInst.monthlySaving).toBeGreaterThan(50)
    expect(simInst.newMonthlyInstallment).toBeLessThan(396.02)
  })
})
