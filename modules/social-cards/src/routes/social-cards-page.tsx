'use client'

import React, { useEffect, useState, useCallback } from 'react'
import {
  Wallet,
  Plus,
  Landmark,
  Info,
  Calendar,
  Layers,
  Sparkles,
  ShoppingBag,
} from 'lucide-react'
import {
  loadState,
  getCards,
  getCardSummary,
  addExpense,
  updateExpense,
  deleteExpense,
  addReconciliation,
} from '../services/social-cards-service'
import type {
  SocialCardsStorageState,
  SocialBenefitCard,
  SocialCardExpense,
  CardBalanceSummary,
} from '../types'
import { ActivationBanner } from '../components/activation-banner'
import { CardHeroBalance } from '../components/card-hero-balance'
import { ExpensesList } from '../components/expenses-list'
import { ExpenseModal } from '../components/expense-modal'
import { ReconciliationModal } from '../components/reconciliation-modal'
import { AllowedCategoriesModal } from '../components/allowed-categories-modal'

export default function SocialCardsPage() {
  const [state, setState] = useState<SocialCardsStorageState | null>(null)
  const [activeCard, setActiveCard] = useState<SocialBenefitCard | null>(null)
  const [summary, setSummary] = useState<CardBalanceSummary | null>(null)
  const [loading, setLoading] = useState(true)

  // Modals state
  const [expenseModalOpen, setExpenseModalOpen] = useState(false)
  const [editingExpense, setEditingExpense] = useState<SocialCardExpense | null>(null)
  const [reconcileModalOpen, setReconcileModalOpen] = useState(false)
  const [categoriesModalOpen, setCategoriesModalOpen] = useState(false)

  const reloadData = useCallback(async () => {
    try {
      const s = await loadState()
      setState(s)
      const cards = await getCards()
      const primary = cards[0] ?? null
      setActiveCard(primary)

      if (primary) {
        const sum = await getCardSummary(primary.id)
        setSummary(sum)
      }
    } catch (err) {
      console.error('[SocialCardsPage] Failed to load data:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void reloadData()
  }, [reloadData])

  // Expense Handlers
  const handleOpenAddExpense = () => {
    setEditingExpense(null)
    setExpenseModalOpen(true)
  }

  const handleEditExpense = (exp: SocialCardExpense) => {
    setEditingExpense(exp)
    setExpenseModalOpen(true)
  }

  const handleSaveExpense = async (data: {
    merchant: string
    amount: number
    spentAt: string
    isPartnerMerchant: boolean
    discountSaved: number
    category: string
    notes?: string
  }) => {
    if (!activeCard) return

    if (editingExpense) {
      await updateExpense(editingExpense.id, data)
    } else {
      await addExpense({
        cardId: activeCard.id,
        ...data,
      })
    }
    await reloadData()
  }

  const handleDeleteExpense = async (id: string) => {
    await deleteExpense(id)
    await reloadData()
  }

  // Reconciliation Handler
  const handleSaveReconciliation = async (data: {
    atmBalance: number
    reconciledAt: string
    notes?: string
  }) => {
    if (!activeCard) return
    await addReconciliation({
      cardId: activeCard.id,
      ...data,
    })
    await reloadData()
  }

  if (loading || !summary || !activeCard) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="flex flex-col items-center gap-2 text-text-subtle text-xs">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
          <span>Caricamento Carte & Bonus Sociali...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-12 animate-in fade-in-50">
      {/* Top Banner & Quick Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-text flex items-center gap-2.5">
            <span className="p-1.5 rounded-xl bg-emerald-500/15 text-emerald-400">
              <Wallet className="h-6 w-6" />
            </span>
            Carte & Bonus Sociali
          </h1>
          <p className="text-xs text-text-subtle mt-1">
            Monitoraggio dedicato per la Carta Dedicata a Te, con saldo stimato, gestione tranche FIFO e scadenze ministeriali.
          </p>
        </div>

        {/* Pulsante Normativa / Beni Ammessi */}
        <button
          type="button"
          onClick={() => setCategoriesModalOpen(true)}
          className="flex items-center gap-1.5 rounded-xl border border-border bg-card hover:bg-card-hover px-3.5 py-2 text-xs font-medium text-text transition-colors cursor-pointer self-start sm:self-auto shadow-sm"
        >
          <Info className="h-4 w-4 text-emerald-400" />
          <span>Beni Ammessi & Convenzioni</span>
        </button>
      </div>

      {/* 1. Banner Pre-Attivazione Adattivo (16 Dicembre 2026) */}
      <ActivationBanner
        summary={summary}
        onNewExpenseClick={handleOpenAddExpense}
      />

      {/* 2. Hero Card Saldo Stimato & Checkpoint Postamat */}
      <CardHeroBalance
        summary={summary}
        onAddExpense={handleOpenAddExpense}
        onReconcile={() => setReconcileModalOpen(true)}
      />

      {/* 3. Registro Spese */}
      <ExpensesList
        expenses={state?.expenses.filter((e) => e.cardId === activeCard.id) ?? []}
        onEdit={handleEditExpense}
        onDelete={handleDeleteExpense}
      />

      {/* Modali */}
      <ExpenseModal
        isOpen={expenseModalOpen}
        onClose={() => setExpenseModalOpen(false)}
        onSave={handleSaveExpense}
        initialExpense={editingExpense}
      />

      <ReconciliationModal
        isOpen={reconcileModalOpen}
        onClose={() => setReconcileModalOpen(false)}
        summary={summary}
        onSave={handleSaveReconciliation}
      />

      <AllowedCategoriesModal
        isOpen={categoriesModalOpen}
        onClose={() => setCategoriesModalOpen(false)}
      />
    </div>
  )
}
