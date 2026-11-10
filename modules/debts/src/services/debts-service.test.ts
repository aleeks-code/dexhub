import { describe, it, expect, beforeEach } from 'vitest'
import {
  computePersonSummaries,
  computeGlobalSummary,
  listPeople,
  listTransactions,
  addPerson,
  deletePerson,
  addTransaction,
  deleteTransaction,
  updateTransaction,
  settlePersonAccount,
  splitExpense,
  executeUndoStep,
  executeRedoStep,
  _clearStoreForTesting,
} from './debts-service'
import type { Person, DebtTransaction, HistoryStep } from '../types'

describe('Debts & Credits Calculation Engine', () => {
  const personA: Person = {
    id: 'p1',
    name: 'Marco',
    avatarColor: '#0d9488',
    createdAt: '2026-01-01T00:00:00.000Z',
  }

  const personB: Person = {
    id: 'p2',
    name: 'Giulia',
    avatarColor: '#0284c7',
    createdAt: '2026-01-01T00:00:00.000Z',
  }

  it('correctly computes net positive balance when lending money', () => {
    const txs: DebtTransaction[] = [
      {
        id: 't1',
        personId: 'p1',
        type: 'lend',
        amount: 50,
        description: 'Cena sushi',
        date: '2026-03-01',
        settled: false,
        createdAt: '2026-03-01',
      },
      {
        id: 't2',
        personId: 'p1',
        type: 'repayment_received',
        amount: 20,
        description: 'Rimborso parziale contanti',
        date: '2026-03-02',
        settled: false,
        createdAt: '2026-03-02',
      },
    ]

    const summaries = computePersonSummaries([personA], txs)
    expect(summaries[0]?.netBalance).toBe(30)
    expect(summaries[0]?.totalLent).toBe(50)
  })

  it('correctly computes net negative balance when borrowing money', () => {
    const txs: DebtTransaction[] = [
      {
        id: 't1',
        personId: 'p2',
        type: 'borrow',
        amount: 40,
        description: 'Biglietto cinema',
        date: '2026-03-01',
        settled: false,
        createdAt: '2026-03-01',
      },
    ]

    const summaries = computePersonSummaries([personB], txs)
    expect(summaries[0]?.netBalance).toBe(-40)
    expect(summaries[0]?.totalBorrowed).toBe(40)
  })

  it('computes global summary with total credits and debts correctly', () => {
    const txs: DebtTransaction[] = [
      // Marco owes me 30
      {
        id: 't1',
        personId: 'p1',
        type: 'lend',
        amount: 30,
        description: 'Pranzo',
        date: '2026-03-01',
        settled: false,
        createdAt: '2026-03-01',
      },
      // I owe Giulia 20
      {
        id: 't2',
        personId: 'p2',
        type: 'borrow',
        amount: 20,
        description: 'Benzina',
        date: '2026-03-02',
        settled: false,
        createdAt: '2026-03-02',
      },
    ]

    const summaries = computePersonSummaries([personA, personB], txs)
    const global = computeGlobalSummary(summaries, txs)

    expect(global.totalCredit).toBe(30)
    expect(global.totalDebt).toBe(20)
    expect(global.netBalance).toBe(10) // 30 - 20 = +10
    expect(global.peopleCount).toBe(2)
    expect(global.unsettledCount).toBe(2)
  })

  describe('Undo / Redo (Torna indietro) Operations', () => {
    beforeEach(async () => {
      _clearStoreForTesting()
    })

    it('can undo and redo adding a transaction', async () => {
      const p = await addPerson('Test Person')
      const tx = await addTransaction({
        personId: p.id,
        type: 'lend',
        amount: 45,
        description: 'Prestito test',
        date: '2026-03-10',
      })

      let txs = await listTransactions(p.id)
      expect(txs.length).toBe(1)

      const historyStep: HistoryStep = {
        id: 'h1',
        timestamp: Date.now(),
        title: 'Prestito test',
        type: 'add_tx',
        tx,
      }

      // Undo -> transaction should be removed
      await executeUndoStep(historyStep)
      txs = await listTransactions(p.id)
      expect(txs.length).toBe(0)

      // Redo -> transaction should be restored
      await executeRedoStep(historyStep)
      txs = await listTransactions(p.id)
      expect(txs.length).toBe(1)
      expect(txs[0]?.amount).toBe(45)
    })

    it('can undo and redo deleting a transaction', async () => {
      const p = await addPerson('Person Delete')
      const tx = await addTransaction({
        personId: p.id,
        type: 'borrow',
        amount: 80,
        description: 'Debito da eliminare',
        date: '2026-03-10',
      })

      const deleted = await deleteTransaction(tx.id)
      expect(deleted?.id).toBe(tx.id)

      let txs = await listTransactions(p.id)
      expect(txs.length).toBe(0)

      const historyStep: HistoryStep = {
        id: 'h2',
        timestamp: Date.now(),
        title: 'Eliminata voce',
        type: 'delete_tx',
        tx: deleted!,
      }

      // Undo delete -> transaction restored
      await executeUndoStep(historyStep)
      txs = await listTransactions(p.id)
      expect(txs.length).toBe(1)
      expect(txs[0]?.id).toBe(tx.id)

      // Redo delete -> transaction deleted again
      await executeRedoStep(historyStep)
      txs = await listTransactions(p.id)
      expect(txs.length).toBe(0)
    })

    it('can undo and redo deleting a person and their transactions', async () => {
      const p = await addPerson('Marco Da Eliminare')
      const tx = await addTransaction({
        personId: p.id,
        type: 'lend',
        amount: 100,
        description: 'Transazione collegata',
        date: '2026-03-10',
      })

      const delResult = await deletePerson(p.id)
      expect(delResult?.person.id).toBe(p.id)
      expect(delResult?.txs.length).toBe(1)

      let people = await listPeople()
      expect(people.some((x) => x.id === p.id)).toBe(false)

      const historyStep: HistoryStep = {
        id: 'h3',
        timestamp: Date.now(),
        title: 'Eliminato Marco',
        type: 'delete_person',
        person: delResult!.person,
        txs: delResult!.txs,
      }

      // Undo delete person -> person and transactions restored
      await executeUndoStep(historyStep)
      people = await listPeople()
      expect(people.some((x) => x.id === p.id)).toBe(true)
      const restoredTxs = await listTransactions(p.id)
      expect(restoredTxs.length).toBe(1)

      // Redo delete person
      await executeRedoStep(historyStep)
      people = await listPeople()
      expect(people.some((x) => x.id === p.id)).toBe(false)
    })

    it('can undo and redo settling an account', async () => {
      const p = await addPerson('Chiara')
      await addTransaction({
        personId: p.id,
        type: 'lend',
        amount: 50,
        description: 'Pranzo',
        date: '2026-03-10',
      })

      const settleTx = await settlePersonAccount(p.id)
      expect(settleTx).not.toBeNull()

      // Net balance should now be 0
      let txs = await listTransactions(p.id)
      let summaries = computePersonSummaries([p], txs)
      expect(summaries[0]?.netBalance).toBe(0)

      const historyStep: HistoryStep = {
        id: 'h4',
        timestamp: Date.now(),
        title: 'Saldo conto Chiara',
        type: 'settle',
        tx: settleTx!,
      }

      // Undo settlement -> balance restored to 50
      await executeUndoStep(historyStep)
      txs = await listTransactions(p.id)
      summaries = computePersonSummaries([p], txs)
      expect(summaries[0]?.netBalance).toBe(50)

      // Redo settlement -> balance back to 0
      await executeRedoStep(historyStep)
      txs = await listTransactions(p.id)
      summaries = computePersonSummaries([p], txs)
      expect(summaries[0]?.netBalance).toBe(0)
    })

    it('can undo and redo splitting an expense across multiple people', async () => {
      const p1 = await addPerson('Amico 1')
      const p2 = await addPerson('Amico 2')

      // Split 60€ between Me, Amico 1, Amico 2 (20€ each)
      const createdTxs = await splitExpense(60, 'Cena pizza', true, [p1.id, p2.id])
      expect(createdTxs.length).toBe(2)

      let txs1 = await listTransactions(p1.id)
      let txs2 = await listTransactions(p2.id)
      expect(txs1.length).toBe(1)
      expect(txs2.length).toBe(1)

      const historyStep: HistoryStep = {
        id: 'h5',
        timestamp: Date.now(),
        title: 'Divisione spesa cena pizza',
        type: 'split',
        txs: createdTxs,
      }

      // Undo split -> both transactions deleted
      await executeUndoStep(historyStep)
      txs1 = await listTransactions(p1.id)
      txs2 = await listTransactions(p2.id)
      expect(txs1.length).toBe(0)
      expect(txs2.length).toBe(0)

      // Redo split -> both transactions restored
      await executeRedoStep(historyStep)
      txs1 = await listTransactions(p1.id)
      txs2 = await listTransactions(p2.id)
      expect(txs1.length).toBe(1)
      expect(txs2.length).toBe(1)
      expect(txs1[0]?.amount).toBe(20)
    })

    it('can update a transaction and undo/redo the update', async () => {
      const p = await addPerson('Mamma Test')
      const originalTx = await addTransaction({
        personId: p.id,
        type: 'borrow',
        amount: 300,
        description: 'Debito iniziale',
        date: '2026-03-01',
      })

      // Update amount to 200
      const updateRes = await updateTransaction(originalTx.id, {
        amount: 200,
        description: 'Debito aggiornato dopo 100€ dati',
      })
      expect(updateRes).not.toBeNull()
      expect(updateRes?.updated.amount).toBe(200)

      let txs = await listTransactions(p.id)
      expect(txs[0]?.amount).toBe(200)

      const historyStep: HistoryStep = {
        id: 'h6',
        timestamp: Date.now(),
        title: 'Modifica debito',
        type: 'edit_tx',
        previous: updateRes!.previous,
        updated: updateRes!.updated,
      }

      // Undo update -> back to 300
      await executeUndoStep(historyStep)
      txs = await listTransactions(p.id)
      expect(txs[0]?.amount).toBe(300)

      // Redo update -> back to 200
      await executeRedoStep(historyStep)
      txs = await listTransactions(p.id)
      expect(txs[0]?.amount).toBe(200)
    })
  })
})
