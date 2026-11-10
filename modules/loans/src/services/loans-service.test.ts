import { describe, it, expect, beforeEach } from 'vitest'
import {
  getLoans,
  createLoan,
  getLoanById,
  updateLoan,
  deleteLoan,
  addExtraPayment,
  setInstallmentOverride,
  _clearStoreForTesting,
} from './loans-service'

describe('Loans Service', () => {
  beforeEach(() => {
    _clearStoreForTesting()
  })

  it('creates and retrieves a loan with generated amortization schedule', async () => {
    const loan = await createLoan({
      name: 'Prestito Auto Findomestic',
      lender: 'Findomestic',
      type: 'auto',
      financedAmount: 15000,
      tan: 6.0,
      installmentsCount: 48,
      monthlyInstallment: 352.28,
      monthlyFee: 2.0,
      startDate: '2025-01-15',
      paymentDay: 15,
    })

    expect(loan.id).toBeDefined()
    expect(loan.schedule.length).toBe(48)

    const fetched = await getLoanById(loan.id)
    expect(fetched?.name).toBe('Prestito Auto Findomestic')

    const all = await getLoans()
    expect(all.length).toBe(1)
  })

  it('updates loan properties and manages extra payments', async () => {
    const loan = await createLoan({
      name: 'Mutuo Casa',
      lender: 'Intesa Sanpaolo',
      type: 'mortgage',
      financedAmount: 100000,
      tan: 3.5,
      installmentsCount: 240,
      monthlyInstallment: 579.96,
      monthlyFee: 1.5,
      startDate: '2024-01-01',
      paymentDay: 1,
    })

    const withExtra = await addExtraPayment(loan.id, {
      date: '2025-06-01',
      amount: 5000,
      strategy: 'reduce_term',
      note: 'Bonus aziendale',
    })

    expect(withExtra?.extraPayments?.length).toBe(1)
    expect(withExtra?.extraPayments?.[0]?.amount).toBe(5000)

    // Set manual override on installment 1
    const withOverride = await setInstallmentOverride(loan.id, 1, 'paid')
    expect(withOverride?.schedule[0]?.manualOverride).toBe('paid')

    // Delete
    const deleted = await deleteLoan(loan.id)
    expect(deleted).toBe(true)
    const list = await getLoans()
    expect(list.length).toBe(0)
  })
})
