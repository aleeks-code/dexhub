'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import {
  Wallet,
  Users,
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
  CheckCircle2,
  Receipt,
  Search,
  Trash2,
  Split,
  Calendar,
  X,
  CreditCard,
  UserPlus,
  Info,
  Clock,
  Check,
  RotateCcw,
  RotateCw,
  History,
  Pencil,
  Banknote,
  Link2,
  CornerDownRight,
} from 'lucide-react'
import { Button, cn } from '@dexhub/ui'
import {
  type Person,
  type DebtTransaction,
  type TransactionType,
  type HistoryStep,
  TRANSACTION_CATEGORIES,
  AVATAR_COLORS,
} from '../types'
import {
  listPeople,
  addPerson,
  deletePerson,
  listTransactions,
  addTransaction,
  updateTransaction,
  deleteTransaction,
  settlePersonAccount,
  splitExpense,
  executeUndoStep,
  executeRedoStep,
  computePersonSummaries,
  computeGlobalSummary,
} from '../services/debts-service'

export default function DebtsPage() {
  const [activeTab, setActiveTab] = useState<'people' | 'transactions' | 'split'>('people')
  const [people, setPeople] = useState<Person[]>([])
  const [transactions, setTransactions] = useState<DebtTransaction[]>([])
  const [loading, setLoading] = useState(true)

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [txTypeFilter, setTxTypeFilter] = useState<'all' | 'credit' | 'debt'>('all')

  // Modals state
  const [addPersonModalOpen, setAddPersonModalOpen] = useState(false)
  const [newPersonName, setNewPersonName] = useState('')
  const [newPersonNotes, setNewPersonNotes] = useState('')
  const [newPersonColor, setNewPersonColor] = useState(AVATAR_COLORS[0])

  const [addTxModalOpen, setAddTxModalOpen] = useState(false)
  const [editingTx, setEditingTx] = useState<DebtTransaction | null>(null)
  const [selectedPersonId, setSelectedPersonId] = useState('')
  const [txType, setTxType] = useState<TransactionType>('lend')
  const [txAmount, setTxAmount] = useState('')
  const [txDescription, setTxDescription] = useState('')
  const [txDate, setTxDate] = useState(new Date().toISOString().slice(0, 10))
  const [txCategory, setTxCategory] = useState(TRANSACTION_CATEGORIES[0])
  const [linkedDebtId, setLinkedDebtId] = useState('')

  // Selected person detail modal
  const [detailPerson, setDetailPerson] = useState<Person | null>(null)

  // Split expense modal / tool
  const [splitAmount, setSplitAmount] = useState('')
  const [splitDesc, setSplitDesc] = useState('')
  const [splitPaidByMe, setSplitPaidByMe] = useState(true)
  const [splitSelectedPeople, setSplitSelectedPeople] = useState<string[]>([])
  const [splitCategory, setSplitCategory] = useState(TRANSACTION_CATEGORIES[0])
  const [splitSuccessNotice, setSplitSuccessNotice] = useState(false)

  // Settle confirmation
  const [settleNotice, setSettleNotice] = useState<string | null>(null)

  // ──────────────── Undo / Redo & Toast ────────────────
  const [undoStack, setUndoStack] = useState<HistoryStep[]>(() => {
    if (typeof window === 'undefined') return []
    try {
      const saved = sessionStorage.getItem('dexhub:debts:session_undo')
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })

  const [redoStack, setRedoStack] = useState<HistoryStep[]>(() => {
    if (typeof window === 'undefined') return []
    try {
      const saved = sessionStorage.getItem('dexhub:debts:session_redo')
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })

  const [historyModalOpen, setHistoryModalOpen] = useState(false)

  const [toast, setToast] = useState<{
    id: number
    title: string
    detail: string
    actionType: 'undo' | 'redo' | 'none'
  } | null>(null)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.setItem('dexhub:debts:session_undo', JSON.stringify(undoStack))
      } catch {
        // Ignore
      }
    }
  }, [undoStack])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.setItem('dexhub:debts:session_redo', JSON.stringify(redoStack))
      } catch {
        // Ignore
      }
    }
  }, [redoStack])

  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => {
      setToast(null)
    }, 8000)
    return () => clearTimeout(timer)
  }, [toast])

  const reloadData = useCallback(async () => {
    setLoading(true)
    try {
      const [pList, txList] = await Promise.all([listPeople(), listTransactions()])
      setPeople(pList)
      setTransactions(txList)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    reloadData()
  }, [reloadData])

  const pushHistoryStep = useCallback((step: HistoryStep) => {
    setUndoStack((prev) => [...prev.slice(-19), step])
    setRedoStack([])
    setToast({
      id: Date.now(),
      title: 'Operazione registrata',
      detail: step.title,
      actionType: 'undo',
    })
  }, [])

  const handleUndo = useCallback(async () => {
    if (undoStack.length === 0) return
    const step = undoStack[undoStack.length - 1]
    if (!step) return

    try {
      await executeUndoStep(step)
      setUndoStack((prev) => prev.slice(0, prev.length - 1))
      setRedoStack((prev) => [...prev, step])
      setToast({
        id: Date.now(),
        title: 'Operazione annullata',
        detail: step.title,
        actionType: 'redo',
      })
      await reloadData()
    } catch (err) {
      console.error('[DebtsPage] Failed to undo operation:', err)
    }
  }, [undoStack, reloadData])

  const handleRedo = useCallback(async () => {
    if (redoStack.length === 0) return
    const step = redoStack[redoStack.length - 1]
    if (!step) return

    try {
      await executeRedoStep(step)
      setRedoStack((prev) => prev.slice(0, prev.length - 1))
      setUndoStack((prev) => [...prev, step])
      setToast({
        id: Date.now(),
        title: 'Operazione ripristinata',
        detail: step.title,
        actionType: 'undo',
      })
      await reloadData()
    } catch (err) {
      console.error('[DebtsPage] Failed to redo operation:', err)
    }
  }, [redoStack, reloadData])

  // Keyboard shortcut Ctrl+Z (Undo) and Ctrl+Y (Redo)
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault()
        handleUndo()
      } else if (
        (e.ctrlKey || e.metaKey) &&
        (e.key.toLowerCase() === 'y' || (e.shiftKey && e.key.toLowerCase() === 'z'))
      ) {
        e.preventDefault()
        handleRedo()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleUndo, handleRedo])

  // Derived summaries
  const personSummaries = useMemo(() => {
    return computePersonSummaries(people, transactions)
  }, [people, transactions])

  const globalSummary = useMemo(() => {
    return computeGlobalSummary(personSummaries, transactions)
  }, [personSummaries, transactions])

  // Filtered transactions list
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      const p = people.find((item) => item.id === tx.personId)
      const pName = p ? p.name.toLowerCase() : ''
      const desc = tx.description.toLowerCase()
      const q = searchQuery.toLowerCase()

      const matchesQuery = !q || pName.includes(q) || desc.includes(q)

      if (!matchesQuery) return false

      if (txTypeFilter === 'credit') {
        return tx.type === 'lend' || tx.type === 'repayment_sent'
      }
      if (txTypeFilter === 'debt') {
        return tx.type === 'borrow' || tx.type === 'repayment_received'
      }
      return true
    })
  }, [transactions, people, searchQuery, txTypeFilter])

  // List of previous transactions eligible for repayment
  const availableDebtsToRepay = useMemo(() => {
    if (!selectedPersonId) return []
    if (txType === 'repayment_sent') {
      // I am paying back -> find debts I borrowed from this person
      return transactions.filter((t) => t.personId === selectedPersonId && t.type === 'borrow')
    }
    if (txType === 'repayment_received') {
      // They are paying me back -> find loans I lent to this person
      return transactions.filter((t) => t.personId === selectedPersonId && t.type === 'lend')
    }
    return []
  }, [transactions, selectedPersonId, txType])

  // Automatically select the debt if there is only one
  useEffect(() => {
    if (!addTxModalOpen) return
    if (txType !== 'repayment_sent' && txType !== 'repayment_received') return
    if (editingTx) return

    if (availableDebtsToRepay.length === 1) {
      const singleDebt = availableDebtsToRepay[0]
      if (singleDebt && linkedDebtId !== singleDebt.id) {
        setLinkedDebtId(singleDebt.id)
        setTxDescription(`Rimborso: ${singleDebt.description}`)
        if (singleDebt.category) {
          setTxCategory(singleDebt.category)
        }
        if (!txAmount || parseFloat(txAmount) <= 0) {
          setTxAmount(singleDebt.amount.toString())
        }
      }
    }
  }, [
    addTxModalOpen,
    txType,
    selectedPersonId,
    availableDebtsToRepay,
    editingTx,
    linkedDebtId,
    txAmount,
  ])

  function handleSelectLinkedDebt(debtId: string) {
    setLinkedDebtId(debtId)
    if (!debtId) return

    const targetDebt = transactions.find((t) => t.id === debtId)
    if (targetDebt) {
      setTxDescription(`Rimborso: ${targetDebt.description}`)
      if (targetDebt.category) {
        setTxCategory(targetDebt.category)
      }
      if (!txAmount || parseFloat(txAmount) <= 0) {
        setTxAmount(targetDebt.amount.toString())
      }
    }
  }

  function handleQuickRepayDebt(debt: DebtTransaction) {
    setSelectedPersonId(debt.personId)
    setEditingTx(null)
    const newType: TransactionType = debt.type === 'borrow' ? 'repayment_sent' : 'repayment_received'
    setTxType(newType)
    setLinkedDebtId(debt.id)
    setTxDescription(`Rimborso: ${debt.description}`)
    if (debt.category) {
      setTxCategory(debt.category)
    }
    setTxAmount(debt.amount.toString())
    setTxDate(new Date().toISOString().slice(0, 10))
    setAddTxModalOpen(true)
  }

  // ──────────────── Handlers ────────────────

  async function handleAddPersonSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!newPersonName.trim()) return
    const newPerson = await addPerson(newPersonName, newPersonNotes, newPersonColor)
    setNewPersonName('')
    setNewPersonNotes('')
    setAddPersonModalOpen(false)

    pushHistoryStep({
      id: `step_${Date.now()}`,
      timestamp: Date.now(),
      title: `Aggiunta persona "${newPerson.name}"`,
      type: 'add_person',
      person: newPerson,
    })

    await reloadData()
  }

  function handleStartEditTx(tx: DebtTransaction) {
    setEditingTx(tx)
    setSelectedPersonId(tx.personId)
    setTxType(tx.type)
    setTxAmount(tx.amount.toString())
    setTxDescription(tx.description)
    setTxDate(tx.date)
    setTxCategory(tx.category || TRANSACTION_CATEGORIES[0])
    setLinkedDebtId(tx.linkedTxId || '')
    setAddTxModalOpen(true)
  }

  async function handleAddTransactionSubmit(e: React.FormEvent) {
    e.preventDefault()
    const amountNum = parseFloat(txAmount.replace(',', '.'))
    if (!selectedPersonId || isNaN(amountNum) || amountNum <= 0) return

    const person = people.find((p) => p.id === selectedPersonId)
    const typeLabel =
      txType === 'lend'
        ? 'Prestito a'
        : txType === 'borrow'
          ? 'Debito verso'
          : txType === 'repayment_received'
            ? 'Rimborso ricevuto da'
            : 'Pagamento a'

    const defaultDesc =
      txType === 'lend'
        ? 'Prestito'
        : txType === 'borrow'
          ? 'Debito'
          : txType === 'repayment_sent'
            ? 'Pagamento debito'
            : 'Rimborso ricevuto'

    const linkedIdToSave =
      (txType === 'repayment_sent' || txType === 'repayment_received') && linkedDebtId
        ? linkedDebtId
        : undefined

    if (editingTx) {
      const updateRes = await updateTransaction(editingTx.id, {
        personId: selectedPersonId,
        type: txType,
        amount: Math.round(amountNum * 100) / 100,
        description: txDescription.trim() || defaultDesc,
        date: txDate,
        category: txCategory,
        linkedTxId: linkedIdToSave,
      })

      if (updateRes) {
        pushHistoryStep({
          id: `step_${Date.now()}`,
          timestamp: Date.now(),
          title: `Modifica voce "${updateRes.updated.description}" (${person?.name ?? ''})`,
          type: 'edit_tx',
          previous: updateRes.previous,
          updated: updateRes.updated,
        })
      }
    } else {
      const newTx = await addTransaction({
        personId: selectedPersonId,
        type: txType,
        amount: Math.round(amountNum * 100) / 100,
        description: txDescription.trim() || defaultDesc,
        date: txDate,
        category: txCategory,
        linkedTxId: linkedIdToSave,
      })

      pushHistoryStep({
        id: `step_${Date.now()}`,
        timestamp: Date.now(),
        title: `${typeLabel} ${person?.name ?? 'Persona'} (${newTx.amount.toFixed(2)} €)`,
        type: 'add_tx',
        tx: newTx,
      })
    }

    setEditingTx(null)
    setLinkedDebtId('')
    setAddTxModalOpen(false)
    setTxAmount('')
    setTxDescription('')
    await reloadData()
  }

  async function handleSettle(personId: string, personName: string) {
    if (!confirm(`Vuoi registrare il saldo completo di tutti i conti con ${personName}?`)) return
    const settleTx = await settlePersonAccount(personId)
    if (settleTx) {
      pushHistoryStep({
        id: `step_${Date.now()}`,
        timestamp: Date.now(),
        title: `Saldo conto con ${personName} (${settleTx.amount.toFixed(2)} €)`,
        type: 'settle',
        tx: settleTx,
      })
    }
    setSettleNotice(`Conto con ${personName} saldato con successo!`)
    setTimeout(() => setSettleNotice(null), 3000)
    await reloadData()
  }

  async function handleDeletePersonConfirm(personId: string, personName: string) {
    if (
      !confirm(
        `Sei sicuro di voler eliminare ${personName}? Tutte le transazioni collegate verranno cancellate definitivamente.`,
      )
    )
      return
    const result = await deletePerson(personId)
    if (result) {
      pushHistoryStep({
        id: `step_${Date.now()}`,
        timestamp: Date.now(),
        title: `Eliminata persona "${result.person.name}" (${result.txs.length} transazioni)`,
        type: 'delete_person',
        person: result.person,
        txs: result.txs,
      })
    }
    if (detailPerson?.id === personId) {
      setDetailPerson(null)
    }
    await reloadData()
  }

  async function handleDeleteTx(txId: string) {
    if (!confirm('Eliminare questa voce dal registro?')) return
    const deleted = await deleteTransaction(txId)
    if (deleted) {
      const person = people.find((p) => p.id === deleted.personId)
      pushHistoryStep({
        id: `step_${Date.now()}`,
        timestamp: Date.now(),
        title: `Eliminata voce "${deleted.description}" (${person?.name ?? ''})`,
        type: 'delete_tx',
        tx: deleted,
      })
    }
    await reloadData()
  }

  async function handleSplitSubmit(e: React.FormEvent) {
    e.preventDefault()
    const amountNum = parseFloat(splitAmount.replace(',', '.'))
    if (isNaN(amountNum) || amountNum <= 0 || splitSelectedPeople.length === 0) return

    const createdTxs = await splitExpense(
      amountNum,
      splitDesc.trim() || 'Spesa condivisa',
      splitPaidByMe,
      splitSelectedPeople,
      splitCategory,
    )

    if (createdTxs.length > 0) {
      pushHistoryStep({
        id: `step_${Date.now()}`,
        timestamp: Date.now(),
        title: `Divisione spesa "${splitDesc || 'Spesa'}" (${createdTxs.length + 1} persone, ${amountNum.toFixed(2)} €)`,
        type: 'split',
        txs: createdTxs,
      })
    }

    setSplitAmount('')
    setSplitDesc('')
    setSplitSelectedPeople([])
    setSplitSuccessNotice(true)
    setTimeout(() => setSplitSuccessNotice(false), 3000)
    await reloadData()
    setActiveTab('people')
  }

  function toggleSplitPerson(pId: string) {
    setSplitSelectedPeople((prev) =>
      prev.includes(pId) ? prev.filter((id) => id !== pId) : [...prev, pId],
    )
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-5">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20">
            <Wallet className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-text">Debiti & Crediti</h1>
            <p className="text-xs text-text-subtle">
              Registro prestiti, debiti personali e divisione spese tra persone
            </p>
          </div>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center rounded-lg border border-border bg-surface-raised p-1 text-xs font-medium">
          <button
            onClick={() => setActiveTab('people')}
            className={cn(
              'flex items-center gap-1.5 rounded-md px-3 py-1.5 transition-all',
              activeTab === 'people'
                ? 'bg-surface text-primary font-semibold shadow-xs'
                : 'text-text-subtle hover:text-text',
            )}
          >
            <Users className="h-3.5 w-3.5" />
            Persone ({people.length})
          </button>
          <button
            onClick={() => setActiveTab('transactions')}
            className={cn(
              'flex items-center gap-1.5 rounded-md px-3 py-1.5 transition-all',
              activeTab === 'transactions'
                ? 'bg-surface text-primary font-semibold shadow-xs'
                : 'text-text-subtle hover:text-text',
            )}
          >
            <Receipt className="h-3.5 w-3.5" />
            Transazioni ({transactions.length})
          </button>
          <button
            onClick={() => setActiveTab('split')}
            className={cn(
              'flex items-center gap-1.5 rounded-md px-3 py-1.5 transition-all',
              activeTab === 'split'
                ? 'bg-surface text-primary font-semibold shadow-xs'
                : 'text-text-subtle hover:text-text',
            )}
          >
            <Split className="h-3.5 w-3.5" />
            Dividi spesa
          </button>
        </div>
      </div>

      {/* Global Net Balance Dashboard Card */}
      <div className="rounded-xl border border-border bg-surface p-5 shadow-sm space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-text-subtle">
              Saldo Netto Complessivo
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span
                className={cn(
                  'text-3xl font-extrabold font-mono tracking-tight',
                  globalSummary.netBalance > 0
                    ? 'text-primary'
                    : globalSummary.netBalance < 0
                      ? 'text-rose-400'
                      : 'text-text-muted',
                )}
              >
                {globalSummary.netBalance > 0 ? '+' : ''}
                {globalSummary.netBalance.toFixed(2)} €
              </span>
              <span className="text-xs text-text-subtle">
                {globalSummary.netBalance > 0
                  ? '(Sei in credito netto)'
                  : globalSummary.netBalance < 0
                    ? '(Sei in debito netto)'
                    : '(Tutti i conti sono in pari)'}
              </span>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              onClick={() => {
                if (people.length === 0) {
                  setAddPersonModalOpen(true)
                } else {
                  setSelectedPersonId(people[0]?.id ?? '')
                  setTxType('lend')
                  setAddTxModalOpen(true)
                }
              }}
              variant="primary"
              className="gap-1.5 text-xs font-semibold"
            >
              <Plus className="h-4 w-4" /> Registra operazione
            </Button>

            <Button
              onClick={() => setActiveTab('split')}
              variant="outline"
              className="gap-1.5 text-xs"
            >
              <Split className="h-3.5 w-3.5" /> Dividi spesa
            </Button>

            <Button
              onClick={() => setAddPersonModalOpen(true)}
              variant="outline"
              className="gap-1.5 text-xs"
            >
              <UserPlus className="h-3.5 w-3.5" /> Nuova persona
            </Button>

            {/* Torna indietro (Undo) */}
            <Button
              onClick={handleUndo}
              disabled={undoStack.length === 0}
              variant="outline"
              className={cn(
                'gap-1.5 text-xs transition-colors',
                undoStack.length > 0
                  ? 'border-border text-text hover:bg-surface-raised'
                  : 'opacity-40 cursor-not-allowed text-text-subtle',
              )}
              title={
                undoStack.length > 0
                  ? `Annulla: ${undoStack[undoStack.length - 1]?.title} (Ctrl+Z)`
                  : 'Nessuna operazione da annullare'
              }
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Torna indietro</span>
              {undoStack.length > 0 && (
                <span className="ml-0.5 rounded-full bg-surface-raised px-1.5 py-0.2 text-[10px] font-bold text-text-subtle border border-border">
                  {undoStack.length}
                </span>
              )}
            </Button>

            {/* Ripeti (Redo) */}
            {redoStack.length > 0 && (
              <Button
                onClick={handleRedo}
                variant="outline"
                className="gap-1.5 text-xs border-primary/40 text-primary hover:bg-primary/10 transition-colors"
                title={`Ripristina: ${redoStack[redoStack.length - 1]?.title} (Ctrl+Y)`}
              >
                <RotateCw className="h-3.5 w-3.5" />
                <span>Ripeti</span>
                <span className="ml-0.5 rounded-full bg-primary/20 px-1.5 py-0.2 text-[10px] font-bold text-primary">
                  {redoStack.length}
                </span>
              </Button>
            )}

            {/* Cronologia azioni */}
            {undoStack.length > 0 && (
              <button
                type="button"
                onClick={() => setHistoryModalOpen(true)}
                className="h-8 w-8 flex items-center justify-center rounded-lg border border-border text-text-subtle hover:text-text hover:bg-surface-raised transition-colors"
                title="Vedi cronologia operazioni di questa sessione"
              >
                <History className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* 3 Pillars Summary */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 pt-3 border-t border-border">
          <div className="flex items-center gap-3 rounded-lg border border-border bg-surface-raised p-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <ArrowUpRight className="h-5 w-5" />
            </div>
            <div>
              <div className="text-[11px] text-text-subtle">Ti devono in totale</div>
              <div className="font-mono text-base font-bold text-primary">
                +{globalSummary.totalCredit.toFixed(2)} €
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-lg border border-border bg-surface-raised p-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-rose-500/10 text-rose-400">
              <ArrowDownLeft className="h-5 w-5" />
            </div>
            <div>
              <div className="text-[11px] text-text-subtle">Devi restituire in totale</div>
              <div className="font-mono text-base font-bold text-rose-400">
                -{globalSummary.totalDebt.toFixed(2)} €
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-lg border border-border bg-surface-raised p-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-info/10 text-info">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <div className="text-[11px] text-text-subtle">Conti da saldare</div>
              <div className="font-mono text-base font-bold text-text">
                {globalSummary.unsettledCount}{' '}
                <span className="text-xs font-normal text-text-subtle">
                  su {globalSummary.peopleCount} persone
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {settleNotice && (
        <div className="rounded-lg bg-primary/10 border border-primary/20 px-4 py-2.5 text-xs text-primary flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4" />
          <span>{settleNotice}</span>
        </div>
      )}

      {/* TAB 1: PEOPLE LIST */}
      {activeTab === 'people' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-text">Rubrica Persone & Saldi</h2>
              <p className="text-xs text-text-subtle">
                Visualizza la situazione debitoria per ciascuna persona o registra un rimborso.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-text-subtle" />
                <input
                  type="text"
                  placeholder="Cerca persona..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-8 rounded-md border border-border bg-surface pl-8 pr-3 text-xs text-text focus:border-primary focus:outline-hidden"
                />
              </div>

              <Button
                size="sm"
                onClick={() => setAddPersonModalOpen(true)}
                className="gap-1.5 text-xs"
              >
                <Plus className="h-3.5 w-3.5" /> Aggiungi persona
              </Button>
            </div>
          </div>

          {people.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-surface p-12 text-center">
              <Users className="mx-auto h-12 w-12 text-text-subtle/50 mb-3" />
              <p className="text-sm font-semibold text-text">Nessuna persona registrata</p>
              <p className="mt-1 text-xs text-text-subtle max-w-sm mx-auto">
                Aggiungi la prima persona (amico, collega, familiare) per iniziare a tracciare i debiti o dividere le spese.
              </p>
              <Button
                onClick={() => setAddPersonModalOpen(true)}
                size="sm"
                variant="primary"
                className="mt-4 gap-1.5 text-xs"
              >
                <UserPlus className="h-4 w-4" /> Aggiungi persona
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {personSummaries
                .filter((s) => !searchQuery || s.person.name.toLowerCase().includes(searchQuery.toLowerCase()))
                .map((summary) => {
                  const { person, netBalance, openTransactionsCount, lastActivityDate } = summary
                  return (
                    <div
                      key={person.id}
                      onClick={() => setDetailPerson(person)}
                      className="group cursor-pointer rounded-xl border border-border bg-surface p-4.5 space-y-3.5 hover:border-primary/50 transition-all hover:shadow-md"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-bold text-white shadow-xs"
                            style={{ backgroundColor: person.avatarColor || '#0d9488' }}
                          >
                            {person.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <h3 className="font-semibold text-sm text-text group-hover:text-primary transition-colors">
                              {person.name}
                            </h3>
                            <span className="text-[11px] text-text-subtle">
                              {openTransactionsCount === 0
                                ? 'Nessun movimento'
                                : `${openTransactionsCount} ${openTransactionsCount === 1 ? 'movimento' : 'movimenti'}`}
                            </span>
                          </div>
                        </div>

                        {/* Balance Badge */}
                        <div className="text-right">
                          <div
                            className={cn(
                              'font-mono text-base font-bold',
                              netBalance > 0
                                ? 'text-primary'
                                : netBalance < 0
                                  ? 'text-rose-400'
                                  : 'text-text-muted',
                            )}
                          >
                            {netBalance > 0 ? '+' : ''}
                            {netBalance.toFixed(2)} €
                          </div>
                          <span
                            className={cn(
                              'inline-block rounded-full px-2 py-0.5 text-[9px] font-semibold',
                              netBalance > 0
                                ? 'bg-primary/10 text-primary'
                                : netBalance < 0
                                  ? 'bg-rose-500/10 text-rose-400'
                                  : 'bg-surface-raised text-text-subtle',
                            )}
                          >
                            {netBalance > 0 ? 'Ti deve' : netBalance < 0 ? 'Gli devi' : 'In pari'}
                          </span>
                        </div>
                      </div>

                      {person.notes && (
                        <p className="text-[11px] text-text-muted line-clamp-1 italic">
                          "{person.notes}"
                        </p>
                      )}

                      <div className="flex items-center justify-between pt-2 border-t border-border text-[11px]">
                        <span className="text-text-subtle">
                          {lastActivityDate ? `Ultimo: ${lastActivityDate}` : 'Nessuna attività'}
                        </span>

                        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                          {Math.abs(netBalance) >= 0.01 && (
                            <button
                              type="button"
                              onClick={() => handleSettle(person.id, person.name)}
                              className="rounded px-2 py-0.5 text-[10px] font-semibold bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                              title="Registra saldo completo"
                            >
                              Salda conto
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedPersonId(person.id)
                              setTxType('lend')
                              setAddTxModalOpen(true)
                            }}
                            className="rounded px-2 py-0.5 text-[10px] font-semibold bg-surface-raised text-text hover:bg-border transition-colors"
                            title="Aggiungi movimento"
                          >
                            + Movimento
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: TRANSACTIONS LIST */}
      {activeTab === 'transactions' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-text">Tutte le Transazioni</h2>
              <p className="text-xs text-text-subtle">
                Registro cronologico di tutti i prestiti, debiti e rimborsi effettuati.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Type filter */}
              <div className="flex items-center rounded-lg border border-border bg-surface-raised p-0.5 text-xs font-medium">
                <button
                  type="button"
                  onClick={() => setTxTypeFilter('all')}
                  className={cn(
                    'rounded-md px-2.5 py-1 transition-all',
                    txTypeFilter === 'all'
                      ? 'bg-surface text-text font-bold shadow-xs'
                      : 'text-text-subtle hover:text-text',
                  )}
                >
                  Tutte
                </button>
                <button
                  type="button"
                  onClick={() => setTxTypeFilter('credit')}
                  className={cn(
                    'rounded-md px-2.5 py-1 transition-all',
                    txTypeFilter === 'credit'
                      ? 'bg-surface text-primary font-bold shadow-xs'
                      : 'text-text-subtle hover:text-text',
                  )}
                >
                  Crediti (+)
                </button>
                <button
                  type="button"
                  onClick={() => setTxTypeFilter('debt')}
                  className={cn(
                    'rounded-md px-2.5 py-1 transition-all',
                    txTypeFilter === 'debt'
                      ? 'bg-surface text-rose-400 font-bold shadow-xs'
                      : 'text-text-subtle hover:text-text',
                  )}
                >
                  Debiti (-)
                </button>
              </div>

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-text-subtle" />
                <input
                  type="text"
                  placeholder="Cerca transazione..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-8 rounded-md border border-border bg-surface pl-8 pr-3 text-xs text-text focus:border-primary focus:outline-hidden"
                />
              </div>

              <Button
                size="sm"
                onClick={() => {
                  setSelectedPersonId(people[0]?.id ?? '')
                  setTxType('lend')
                  setAddTxModalOpen(true)
                }}
                className="gap-1.5 text-xs"
              >
                <Plus className="h-3.5 w-3.5" /> Nuova
              </Button>
            </div>
          </div>

          {filteredTransactions.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-surface p-12 text-center">
              <Receipt className="mx-auto h-12 w-12 text-text-subtle/50 mb-3" />
              <p className="text-sm font-semibold text-text">Nessuna transazione trovata</p>
              <p className="mt-1 text-xs text-text-subtle">
                Registra un nuovo prestito o debito per visualizzarlo nello storico.
              </p>
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-surface overflow-hidden">
              <div className="divide-y divide-border">
                {filteredTransactions.map((tx) => {
                  const person = people.find((p) => p.id === tx.personId)
                  const isCredit = tx.type === 'lend' || tx.type === 'repayment_sent'

                  return (
                    <div
                      key={tx.id}
                      className="flex items-center justify-between p-3.5 hover:bg-surface-raised transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg font-bold',
                            tx.type === 'lend'
                              ? 'bg-primary/10 text-primary'
                              : tx.type === 'borrow'
                                ? 'bg-rose-500/10 text-rose-400'
                                : 'bg-info/10 text-info',
                          )}
                        >
                          {tx.type === 'lend' ? (
                            <ArrowUpRight className="h-4 w-4" />
                          ) : tx.type === 'borrow' ? (
                            <ArrowDownLeft className="h-4 w-4" />
                          ) : (
                            <CheckCircle2 className="h-4 w-4" />
                          )}
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-text">
                              {person ? person.name : 'Persona rimossa'}
                            </span>
                            {tx.category && (
                              <span className="rounded bg-surface-raised border border-border px-1.5 py-0.2 text-[10px] text-text-subtle">
                                {tx.category}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-text-muted">
                            <span>{tx.description}</span>
                            <span>·</span>
                            <span className="text-text-subtle">{tx.date}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <span
                            className={cn(
                              'font-mono text-base font-bold',
                              isCredit ? 'text-primary' : 'text-rose-400',
                            )}
                          >
                            {isCredit ? '+' : '-'}
                            {tx.amount.toFixed(2)} €
                          </span>
                          <div className="text-[10px] text-text-subtle">
                            {tx.type === 'lend'
                              ? 'Prestito fatto'
                              : tx.type === 'borrow'
                                ? 'Preso in prestito'
                                : tx.type === 'repayment_received'
                                  ? 'Rimborso ricevuto'
                                  : 'Rimborso inviato'}
                          </div>
                        </div>

                        {(tx.type === 'borrow' || tx.type === 'lend') && (
                          <button
                            type="button"
                            onClick={() => handleQuickRepayDebt(tx)}
                            className="hidden sm:flex items-center gap-1 rounded bg-primary/10 hover:bg-primary/20 text-primary px-2 py-1 text-xs font-semibold transition-colors"
                            title={
                              tx.type === 'borrow'
                                ? 'Registra pagamento per questo debito'
                                : 'Registra rimborso per questo prestito'
                            }
                          >
                            <CornerDownRight className="h-3.5 w-3.5" />
                            Rimborsa
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleStartEditTx(tx)}
                          className="text-text-subtle hover:text-text p-1 rounded transition-colors"
                          title="Modifica voce"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteTx(tx.id)}
                          className="text-text-subtle hover:text-rose-400 p-1 rounded transition-colors"
                          title="Elimina transazione"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: SPLIT EXPENSE (Splitwise tool) */}
      {activeTab === 'split' && (
        <div className="mx-auto max-w-2xl space-y-5">
          <div className="border-b border-border pb-3">
            <h2 className="text-base font-bold text-text">Dividi una Spesa di Gruppo</h2>
            <p className="text-xs text-text-subtle">
              Inserisci l'importo totale di una cena, spesa o vacanza: DexHub calcolerà in automatico le quote per ciascuna persona.
            </p>
          </div>

          {splitSuccessNotice && (
            <div className="rounded-lg bg-primary/10 border border-primary/20 p-3 text-xs text-primary flex items-center gap-2">
              <Check className="h-4 w-4 shrink-0" />
              <span>Quote registrate con successo nel registro di ciascuna persona!</span>
            </div>
          )}

          <form onSubmit={handleSplitSubmit} className="rounded-xl border border-border bg-surface p-5 space-y-4 shadow-sm">
            {/* Amount & Description */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="text-xs font-semibold text-text">Importo Totale Speso (€) *</label>
                <div className="relative mt-1">
                  <span className="absolute left-3 top-2 text-sm font-bold text-text-muted">€</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    placeholder="Es. 75.00"
                    value={splitAmount}
                    onChange={(e) => setSplitAmount(e.target.value)}
                    className="w-full rounded-md border border-border bg-surface-raised pl-8 pr-3 py-2 text-sm font-mono font-bold text-text focus:border-primary focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-text">Descrizione Spesa *</label>
                <input
                  type="text"
                  required
                  placeholder="Es. Cena pizzeria, Spesa casa..."
                  value={splitDesc}
                  onChange={(e) => setSplitDesc(e.target.value)}
                  className="mt-1 w-full rounded-md border border-border bg-surface-raised px-3 py-2 text-sm text-text focus:border-primary focus:outline-hidden"
                />
              </div>
            </div>

            {/* Who Paid? */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-text">Chi ha pagato il conto?</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSplitPaidByMe(true)}
                  className={cn(
                    'p-2.5 rounded-lg border text-xs text-left transition-all',
                    splitPaidByMe
                      ? 'border-primary bg-primary/10 text-primary font-bold'
                      : 'border-border bg-surface-raised text-text-muted hover:text-text',
                  )}
                >
                  <div className="font-semibold">Ho pagato io</div>
                  <div className="text-[10px] opacity-75">Gli altri mi devono la loro quota</div>
                </button>

                <button
                  type="button"
                  onClick={() => setSplitPaidByMe(false)}
                  className={cn(
                    'p-2.5 rounded-lg border text-xs text-left transition-all',
                    !splitPaidByMe
                      ? 'border-primary bg-primary/10 text-primary font-bold'
                      : 'border-border bg-surface-raised text-text-muted hover:text-text',
                  )}
                >
                  <div className="font-semibold">Ha pagato qualcun altro</div>
                  <div className="text-[10px] opacity-75">Io devo la mia quota agli altri</div>
                </button>
              </div>
            </div>

            {/* Select participants */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-text">
                  Chi divide questa spesa con te? ({splitSelectedPeople.length} selezionati)
                </label>
                <button
                  type="button"
                  onClick={() =>
                    setSplitSelectedPeople(
                      splitSelectedPeople.length === people.length ? [] : people.map((p) => p.id),
                    )
                  }
                  className="text-[11px] text-primary hover:underline"
                >
                  {splitSelectedPeople.length === people.length ? 'Deseleziona tutti' : 'Seleziona tutti'}
                </button>
              </div>

              {people.length === 0 ? (
                <div className="rounded-lg bg-surface-raised p-4 text-center text-xs text-text-subtle border border-border">
                  Devi prima aggiungere delle persone in rubrica per poter dividere una spesa.
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto p-1">
                  {people.map((p) => {
                    const isSelected = splitSelectedPeople.includes(p.id)
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => toggleSplitPerson(p.id)}
                        className={cn(
                          'flex items-center gap-2 p-2 rounded-lg border text-xs text-left transition-all',
                          isSelected
                            ? 'border-primary bg-primary/10 text-text font-semibold'
                            : 'border-border bg-surface-raised text-text-muted hover:text-text',
                        )}
                      >
                        <div
                          className="h-6 w-6 rounded-md flex items-center justify-center text-[10px] text-white font-bold shrink-0"
                          style={{ backgroundColor: p.avatarColor || '#0d9488' }}
                        >
                          {p.name.slice(0, 2).toUpperCase()}
                        </div>
                        <span className="truncate flex-1">{p.name}</span>
                        {isSelected && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Split Preview */}
            {parseFloat(splitAmount) > 0 && splitSelectedPeople.length > 0 && (
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-3.5 space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-text">
                  <span>Riepilogo quote:</span>
                  <span className="font-mono text-primary font-bold">
                    {(parseFloat(splitAmount) / (splitSelectedPeople.length + 1)).toFixed(2)} € a testa
                  </span>
                </div>
                <p className="text-[11px] text-text-subtle">
                  L'importo di <strong>{parseFloat(splitAmount).toFixed(2)} €</strong> viene diviso equamente tra{' '}
                  <strong>{splitSelectedPeople.length + 1} persone</strong> (tu + {splitSelectedPeople.length} amici).
                  {splitPaidByMe
                    ? ' Ciascuna persona avrà un debito verso di te per la sua quota.'
                    : ' Verrà registrato il debito corrispondente.'}
                </p>
              </div>
            )}

            <Button
              type="submit"
              disabled={!parseFloat(splitAmount) || splitSelectedPeople.length === 0}
              variant="primary"
              className="w-full justify-center gap-2"
            >
              <Split className="h-4 w-4" /> Registra Divisione Spese
            </Button>
          </form>
        </div>
      )}

      {/* MODAL: ADD PERSON */}
      {addPersonModalOpen && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setAddPersonModalOpen(false)
          }}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
        >
          <div className="w-full max-w-md rounded-xl border border-border bg-surface p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-2.5">
              <div className="flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-primary" />
                <h3 className="text-base font-bold text-text">Aggiungi Persona</h3>
              </div>
              <button
                onClick={() => setAddPersonModalOpen(false)}
                className="text-text-subtle hover:text-text text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddPersonSubmit} className="space-y-3.5">
              <div>
                <label className="text-xs font-semibold text-text">Nome o Soprannome *</label>
                <input
                  type="text"
                  required
                  placeholder="Es. Marco Rossi, Giulia, Mamma..."
                  value={newPersonName}
                  onChange={(e) => setNewPersonName(e.target.value)}
                  className="mt-1 w-full rounded-md border border-border bg-surface-raised px-3 py-2 text-sm text-text focus:border-primary focus:outline-hidden"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-text">Note (opzionale)</label>
                <input
                  type="text"
                  placeholder="Es. Coinquilino, Amico calcetto..."
                  value={newPersonNotes}
                  onChange={(e) => setNewPersonNotes(e.target.value)}
                  className="mt-1 w-full rounded-md border border-border bg-surface-raised px-3 py-2 text-sm text-text focus:border-primary focus:outline-hidden"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-text">Colore Identificativo</label>
                <div className="flex gap-2 mt-1.5">
                  {AVATAR_COLORS.map((col) => (
                    <button
                      key={col}
                      type="button"
                      onClick={() => setNewPersonColor(col)}
                      className={cn(
                        'h-7 w-7 rounded-full border-2 transition-transform',
                        newPersonColor === col ? 'scale-115 border-white' : 'border-transparent opacity-80',
                      )}
                      style={{ backgroundColor: col }}
                    />
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <Button type="button" variant="outline" onClick={() => setAddPersonModalOpen(false)}>
                  Annulla
                </Button>
                <Button type="submit" variant="primary">
                  Salva Persona
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: PERSON DETAIL & STATEMENT */}
      {detailPerson && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setDetailPerson(null)
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
        >
          <div className="w-full max-w-lg rounded-xl border border-border bg-surface p-5 shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border pb-3 shrink-0">
              <div className="flex items-center gap-3">
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-xl font-bold text-white shadow-xs"
                  style={{ backgroundColor: detailPerson.avatarColor || '#0d9488' }}
                >
                  {detailPerson.name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-bold text-base text-text">{detailPerson.name}</h3>
                  <span className="text-xs text-text-subtle">
                    {detailPerson.notes || 'Nessuna nota aggiuntiva'}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setDetailPerson(null)}
                className="text-text-subtle hover:text-text text-sm"
              >
                ✕
              </button>
            </div>

            {/* Person Balance Header */}
            {(() => {
              const summary = personSummaries.find((s) => s.person.id === detailPerson.id)
              const net = summary ? summary.netBalance : 0
              const personTxs = transactions.filter((t) => t.personId === detailPerson.id)

              return (
                <>
                  <div className="flex items-center justify-between rounded-xl border border-border bg-surface-raised p-4 shrink-0">
                    <div>
                      <div className="text-xs text-text-subtle">Saldo Attuale</div>
                      <div
                        className={cn(
                          'font-mono text-2xl font-extrabold',
                          net > 0 ? 'text-primary' : net < 0 ? 'text-rose-400' : 'text-text-muted',
                        )}
                      >
                        {net > 0 ? '+' : ''}
                        {net.toFixed(2)} €
                      </div>
                      <div className="text-[11px] text-text-subtle">
                        {net > 0
                          ? `${detailPerson.name} ti deve questa somma`
                          : net < 0
                            ? `Devi restituire questa somma a ${detailPerson.name}`
                            : 'Conto perfettamente in pari'}
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      {Math.abs(net) >= 0.01 && (
                        <div className="flex flex-wrap items-center gap-2">
                          <Button
                            size="sm"
                            variant="primary"
                            onClick={() => {
                              setSelectedPersonId(detailPerson.id)
                              setEditingTx(null)
                              setTxType(net < 0 ? 'repayment_sent' : 'repayment_received')
                              setTxAmount('')
                              setTxDescription(
                                net < 0 ? 'Pagamento / Rimborso debito' : 'Rimborso parziale',
                              )
                              setAddTxModalOpen(true)
                            }}
                            className="text-xs gap-1.5 font-semibold"
                          >
                            <Banknote className="h-4 w-4" />
                            {net < 0 ? 'Registra Pagamento' : 'Registra Rimborso'}
                          </Button>

                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleSettle(detailPerson.id, detailPerson.name)}
                            className="text-xs"
                          >
                            Salda tutto ({Math.abs(net).toFixed(2)} €)
                          </Button>
                        </div>
                      )}

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedPersonId(detailPerson.id)
                          setEditingTx(null)
                          setTxType('lend')
                          setTxAmount('')
                          setTxDescription('')
                          setAddTxModalOpen(true)
                        }}
                        className="text-xs gap-1"
                      >
                        <Plus className="h-3.5 w-3.5" /> Nuova voce
                      </Button>
                    </div>
                  </div>

                  {/* Movements List */}
                  <div className="flex-1 overflow-y-auto space-y-2 min-h-[160px] pr-1">
                    <span className="text-xs font-semibold uppercase tracking-wider text-text-subtle">
                      Storico Movimenti ({personTxs.length})
                    </span>

                    {personTxs.length === 0 ? (
                      <div className="rounded-lg border border-dashed border-border p-6 text-center text-xs text-text-subtle">
                        Nessun movimento registrato con questa persona.
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        {personTxs.map((tx) => {
                          const isCredit = tx.type === 'lend' || tx.type === 'repayment_sent'
                          return (
                            <div
                              key={tx.id}
                              className="flex items-center justify-between rounded-lg border border-border bg-surface-raised/50 p-2.5 text-xs"
                            >
                              <div>
                                <div className="font-semibold text-text">{tx.description}</div>
                                <div className="text-[10px] text-text-subtle">
                                  {tx.date} · {tx.category || 'Generale'}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <span
                                  className={cn(
                                    'font-mono font-bold text-sm',
                                    isCredit ? 'text-primary' : 'text-rose-400',
                                  )}
                                >
                                  {isCredit ? '+' : '-'}
                                  {tx.amount.toFixed(2)} €
                                </span>
                                {(tx.type === 'borrow' || tx.type === 'lend') && (
                                  <button
                                    type="button"
                                    onClick={() => handleQuickRepayDebt(tx)}
                                    className="flex items-center gap-1 rounded bg-primary/10 hover:bg-primary/20 text-primary px-2 py-0.5 text-[11px] font-semibold transition-colors"
                                    title={
                                      tx.type === 'borrow'
                                        ? 'Paga / Rimborsa questo debito'
                                        : 'Registra rimborso per questo prestito'
                                    }
                                  >
                                    <CornerDownRight className="h-3 w-3" />
                                    Rimborsa
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => handleStartEditTx(tx)}
                                  className="text-text-subtle hover:text-text p-1 rounded transition-colors"
                                  title="Modifica"
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteTx(tx.id)}
                                  className="text-text-subtle hover:text-rose-400 p-1 rounded transition-colors"
                                  title="Elimina"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>

                  {/* Footer actions */}
                  <div className="flex justify-between items-center pt-3 border-t border-border shrink-0">
                    <button
                      type="button"
                      onClick={() => handleDeletePersonConfirm(detailPerson.id, detailPerson.name)}
                      className="text-xs text-rose-400 hover:underline flex items-center gap-1"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Elimina persona
                    </button>
                    <Button variant="outline" size="sm" onClick={() => setDetailPerson(null)}>
                      Chiudi
                    </Button>
                  </div>
                </>
              )
            })()}
          </div>
        </div>
      )}

      {/* MODAL: ADD / EDIT TRANSACTION (z-[60] to cleanly overlay person detail) */}
      {addTxModalOpen && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setAddTxModalOpen(false)
              setEditingTx(null)
            }
          }}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
        >
          <div className="w-full max-w-md rounded-xl border border-border bg-surface p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-2.5">
              <div className="flex items-center gap-2">
                {editingTx ? (
                  <Pencil className="h-5 w-5 text-primary" />
                ) : (
                  <CreditCard className="h-5 w-5 text-primary" />
                )}
                <div>
                  <h3 className="text-base font-bold text-text">
                    {editingTx ? 'Modifica Operazione' : 'Registra Operazione'}
                  </h3>
                  {detailPerson && (
                    <p className="text-[11px] text-text-subtle">
                      Conto: <strong className="text-primary">{detailPerson.name}</strong>
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={() => {
                  setAddTxModalOpen(false)
                  setEditingTx(null)
                }}
                className="text-text-subtle hover:text-text text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddTransactionSubmit} className="space-y-3.5">
              {/* Person Select */}
              <div>
                <label className="text-xs font-semibold text-text">Persona *</label>
                <select
                  required
                  value={selectedPersonId}
                  onChange={(e) => setSelectedPersonId(e.target.value)}
                  className="mt-1 w-full rounded-md border border-border bg-surface-raised px-3 py-2 text-sm text-text focus:border-primary focus:outline-hidden [&>option]:bg-surface [&>option]:text-text"
                >
                  {people.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Type Switcher */}
              <div>
                <label className="text-xs font-semibold text-text">Tipo Operazione</label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <button
                    type="button"
                    onClick={() => setTxType('lend')}
                    className={cn(
                      'p-2.5 rounded-lg border text-xs text-left transition-all',
                      txType === 'lend'
                        ? 'border-primary bg-primary/10 text-primary font-bold'
                        : 'border-border bg-surface-raised text-text-muted hover:text-text',
                    )}
                  >
                    <div className="flex items-center gap-1.5 font-bold">
                      <ArrowUpRight className="h-4 w-4" /> Ho prestato
                    </div>
                    <div className="text-[10px] opacity-75">Mi deve questi soldi (+)</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTxType('borrow')}
                    className={cn(
                      'p-2.5 rounded-lg border text-xs text-left transition-all',
                      txType === 'borrow'
                        ? 'border-rose-500 bg-rose-500/10 text-rose-400 font-bold'
                        : 'border-border bg-surface-raised text-text-muted hover:text-text',
                    )}
                  >
                    <div className="flex items-center gap-1.5 font-bold">
                      <ArrowDownLeft className="h-4 w-4" /> Ho preso in prestito
                    </div>
                    <div className="text-[10px] opacity-75">Gli devo questi soldi (-)</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTxType('repayment_sent')}
                    className={cn(
                      'p-2.5 rounded-lg border text-xs text-left transition-all',
                      txType === 'repayment_sent'
                        ? 'border-primary bg-primary/10 text-primary font-bold'
                        : 'border-border bg-surface-raised text-text-muted hover:text-text',
                    )}
                  >
                    <div className="flex items-center gap-1.5 font-bold">
                      <Banknote className="h-4 w-4 text-primary" /> Ho restituito / Pagato
                    </div>
                    <div className="text-[10px] opacity-75">Scala il mio debito (es. 100€ dati)</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTxType('repayment_received')}
                    className={cn(
                      'p-2.5 rounded-lg border text-xs text-left transition-all',
                      txType === 'repayment_received'
                        ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold'
                        : 'border-border bg-surface-raised text-text-muted hover:text-text',
                    )}
                  >
                    <div className="flex items-center gap-1.5 font-bold">
                      <Banknote className="h-4 w-4 text-emerald-500" /> Mi ha restituito
                    </div>
                    <div className="text-[10px] opacity-75">Scala il credito verso di lui</div>
                  </button>
                </div>
              </div>

              {/* Linked Debt Selector (When Repaying) */}
              {(txType === 'repayment_sent' || txType === 'repayment_received') && (
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-text flex items-center gap-1.5">
                      <Link2 className="h-3.5 w-3.5 text-primary" />
                      {txType === 'repayment_sent'
                        ? 'Quale debito stai rimborsando?'
                        : 'A quale credito si riferisce?'}
                    </label>
                    <span className="text-[10px] text-text-subtle font-medium">Auto-compila motivo & categoria</span>
                  </div>

                  {availableDebtsToRepay.length === 1 ? (
                    <div className="flex items-center justify-between rounded-md border border-primary/30 bg-primary/10 p-2.5 text-xs">
                      <div className="space-y-0.5">
                        <div className="font-semibold text-text">
                          {availableDebtsToRepay[0]?.description}
                        </div>
                        <div className="text-[10px] text-text-subtle">
                          Importo originale: <strong>{availableDebtsToRepay[0]?.amount.toFixed(2)} €</strong> · Categoria: {availableDebtsToRepay[0]?.category || 'Generale'}
                        </div>
                      </div>
                      <span className="rounded bg-primary/20 px-2 py-0.5 text-[10px] font-bold text-primary shrink-0">
                        Selezionato in automatico
                      </span>
                    </div>
                  ) : availableDebtsToRepay.length > 1 ? (
                    <select
                      value={linkedDebtId}
                      onChange={(e) => handleSelectLinkedDebt(e.target.value)}
                      className="w-full rounded-md border border-border bg-surface px-2.5 py-1.5 text-xs text-text focus:border-primary focus:outline-hidden [&>option]:bg-surface [&>option]:text-text"
                    >
                      <option value="">— Seleziona quale debito rimborsare —</option>
                      {availableDebtsToRepay.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.description} · {d.amount.toFixed(2)} € ({d.date} · {d.category || 'Generale'})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <p className="text-[11px] text-text-subtle">
                      Nessun {txType === 'repayment_sent' ? 'debito' : 'prestito'} precedente registrato con questa persona. Compila liberamente i campi sottostanti.
                    </p>
                  )}
                </div>
              )}

              {/* Amount & Date */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-text">Importo (€) *</label>
                  <div className="relative mt-1">
                    <span className="absolute left-3 top-2 text-sm font-bold text-text-muted">€</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      required
                      placeholder="0.00"
                      value={txAmount}
                      onChange={(e) => setTxAmount(e.target.value)}
                      className="w-full rounded-md border border-border bg-surface-raised pl-8 pr-3 py-2 text-sm font-mono font-bold text-text focus:border-primary focus:outline-hidden"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-text">Data</label>
                  <input
                    type="date"
                    required
                    value={txDate}
                    onChange={(e) => setTxDate(e.target.value)}
                    className="mt-1 w-full rounded-md border border-border bg-surface-raised px-3 py-2 text-sm text-text focus:border-primary focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="text-xs font-semibold text-text">Motivo / Descrizione</label>
                <input
                  type="text"
                  placeholder="Es. Biglietto concerto, Quota cena, Benzina..."
                  value={txDescription}
                  onChange={(e) => setTxDescription(e.target.value)}
                  className="mt-1 w-full rounded-md border border-border bg-surface-raised px-3 py-2 text-sm text-text focus:border-primary focus:outline-hidden"
                />
              </div>

              {/* Category */}
              <div>
                <label className="text-xs font-semibold text-text">Categoria</label>
                <select
                  value={txCategory}
                  onChange={(e) => setTxCategory(e.target.value)}
                  className="mt-1 w-full rounded-md border border-border bg-surface-raised px-3 py-2 text-sm text-text focus:border-primary focus:outline-hidden [&>option]:bg-surface [&>option]:text-text"
                >
                  {TRANSACTION_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setAddTxModalOpen(false)
                    setEditingTx(null)
                  }}
                >
                  Annulla
                </Button>
                <Button type="submit" variant="primary">
                  {editingTx ? 'Salva Modifiche' : 'Registra Operazione'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ACTION HISTORY (CRONOLOGIA AZIONI) */}
      {historyModalOpen && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setHistoryModalOpen(false)
          }}
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
        >
          <div className="w-full max-w-md rounded-xl border border-border bg-surface p-5 shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-border pb-2.5 shrink-0">
              <div className="flex items-center gap-2">
                <History className="h-5 w-5 text-primary" />
                <h3 className="text-base font-bold text-text">Cronologia Operazioni</h3>
              </div>
              <button
                onClick={() => setHistoryModalOpen(false)}
                className="text-text-subtle hover:text-text text-sm"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-text-subtle shrink-0">
              Operazioni eseguite in questa sessione. Puoi annullarle a ritroso con il pulsante{' '}
              <strong className="text-text">Torna indietro</strong> o premendo{' '}
              <kbd className="rounded border border-border bg-surface-raised px-1 py-0.5 text-[10px]">
                Ctrl+Z
              </kbd>
              .
            </p>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-[120px]">
              {undoStack.length === 0 ? (
                <div className="p-8 text-center text-xs text-text-subtle">
                  Nessuna operazione registrata.
                </div>
              ) : (
                [...undoStack].reverse().map((step, idx) => {
                  const isLatest = idx === 0
                  return (
                    <div
                      key={step.id}
                      className={cn(
                        'flex items-center justify-between rounded-lg border p-2.5 text-xs transition-colors',
                        isLatest
                          ? 'border-border-strong bg-surface-raised'
                          : 'border-border bg-surface-raised/40',
                      )}
                    >
                      <div className="space-y-0.5 min-w-0 pr-2">
                        <div className="font-semibold text-text truncate">{step.title}</div>
                        <div className="text-[10px] text-text-subtle">
                          {new Date(step.timestamp).toLocaleTimeString()}
                          {isLatest && (
                            <span className="ml-2 font-semibold text-text-muted">
                              (Prossima da annullare)
                            </span>
                          )}
                        </div>
                      </div>

                      {isLatest && (
                        <button
                          type="button"
                          onClick={async () => {
                            await handleUndo()
                          }}
                          className="flex items-center gap-1 rounded bg-surface hover:bg-surface-overlay border border-border px-2 py-1 text-[11px] font-semibold text-text shrink-0 transition-colors"
                        >
                          <RotateCcw className="h-3 w-3" /> Annulla
                        </button>
                      )}
                    </div>
                  )
                })
              )}
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-border shrink-0">
              <button
                type="button"
                onClick={() => {
                  setUndoStack([])
                  setRedoStack([])
                  setHistoryModalOpen(false)
                }}
                className="text-xs text-text-subtle hover:text-rose-400 transition-colors"
              >
                Azzera cronologia
              </button>
              <Button variant="outline" size="sm" onClick={() => setHistoryModalOpen(false)}>
                Chiudi
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* FLOATING ACTION / UNDO TOAST NOTIFICATION */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-[80] flex max-w-md items-center gap-3 rounded-xl border border-border bg-surface-raised/95 px-4 py-3 shadow-2xl backdrop-blur-md transition-all animate-in fade-in slide-in-from-bottom-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            {toast.actionType === 'redo' ? (
              <RotateCcw className="h-4 w-4 text-text-subtle" />
            ) : (
              <CheckCircle2 className="h-4 w-4 text-primary" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-semibold text-text">{toast.title}</div>
            <div className="truncate text-[11px] text-text-subtle">{toast.detail}</div>
          </div>
          {toast.actionType === 'undo' && undoStack.length > 0 && (
            <button
              onClick={handleUndo}
              className="flex shrink-0 items-center gap-1 rounded-md bg-surface hover:bg-surface-overlay border border-border text-text px-2.5 py-1 text-xs font-semibold transition-colors"
            >
              <RotateCcw className="h-3 w-3" />
              Torna indietro
            </button>
          )}
          {toast.actionType === 'redo' && redoStack.length > 0 && (
            <button
              onClick={handleRedo}
              className="flex shrink-0 items-center gap-1 rounded-md bg-primary/15 hover:bg-primary/25 text-primary px-2.5 py-1 text-xs font-semibold transition-colors"
            >
              <RotateCw className="h-3 w-3" />
              Ripristina
            </button>
          )}
          <button
            onClick={() => setToast(null)}
            className="text-text-subtle hover:text-text p-1 rounded transition-colors"
            title="Chiudi"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  )
}
