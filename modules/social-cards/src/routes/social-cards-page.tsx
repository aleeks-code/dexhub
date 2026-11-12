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
  Trash2,
  CreditCard,
} from 'lucide-react'
import {
  loadState,
  getCards,
  getCardSummary,
  registerCard,
  deleteCard,
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
import { RegisterCardModal } from '../components/register-card-modal'
import { EmptyCardsState } from '../components/empty-cards-state'

export default function SocialCardsPage() {
  const [state, setState] = useState<SocialCardsStorageState | null>(null)
  const [cards, setCards] = useState<SocialBenefitCard[]>([])
  const [activeCardId, setActiveCardId] = useState<string | null>(null)
  const [summary, setSummary] = useState<CardBalanceSummary | null>(null)
  const [loading, setLoading] = useState(true)

  // Modals state
  const [registerModalOpen, setRegisterModalOpen] = useState(false)
  const [expenseModalOpen, setExpenseModalOpen] = useState(false)
  const [editingExpense, setEditingExpense] = useState<SocialCardExpense | null>(null)
  const [reconcileModalOpen, setReconcileModalOpen] = useState(false)
  const [categoriesModalOpen, setCategoriesModalOpen] = useState(false)

  const reloadData = useCallback(async (preferredCardId?: string) => {
    try {
      const s = await loadState()
      setState(s)
      const cardList = await getCards()
      setCards(cardList)

      const targetCard =
        cardList.find((c) => c.id === preferredCardId) ??
        cardList.find((c) => c.id === activeCardId) ??
        cardList[0] ??
        null

      if (targetCard) {
        setActiveCardId(targetCard.id)
        const sum = await getCardSummary(targetCard.id)
        setSummary(sum)
      } else {
        setActiveCardId(null)
        setSummary(null)
      }
    } catch (err) {
      console.error('[SocialCardsPage] Failed to load data:', err)
    } finally {
      setLoading(false)
    }
  }, [activeCardId])

  useEffect(() => {
    void reloadData()
  }, [reloadData])

  // Card Switcher Handler
  const handleSelectCard = async (id: string) => {
    setActiveCardId(id)
    const sum = await getCardSummary(id)
    setSummary(sum)
  }

  // Card Registration Handler
  const handleRegisterCard = async (data: {
    profileId: string
    editionId: string
    customName: string
    cardNumberLast4?: string
    initialAtmBalance?: number
    notes?: string
  }) => {
    const newCard = await registerCard(data)
    await reloadData(newCard.id)
  }

  // Card Delete Handler
  const handleDeleteCard = async (cardId: string) => {
    if (!confirm('Sei sicuro di voler rimuovere questa carta? Tutti gli scontrini e le riconciliazioni associate verranno cancellati.')) {
      return
    }
    await deleteCard(cardId)
    await reloadData()
  }

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
    if (!activeCardId) return

    if (editingExpense) {
      await updateExpense(editingExpense.id, data)
    } else {
      await addExpense({
        cardId: activeCardId,
        ...data,
      })
    }
    await reloadData(activeCardId)
  }

  const handleDeleteExpense = async (id: string) => {
    await deleteExpense(id)
    await reloadData(activeCardId ?? undefined)
  }

  // Reconciliation Handler
  const handleSaveReconciliation = async (data: {
    atmBalance: number
    reconciledAt: string
    notes?: string
  }) => {
    if (!activeCardId) return
    await addReconciliation({
      cardId: activeCardId,
      ...data,
    })
    await reloadData(activeCardId)
  }

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="flex flex-col items-center gap-2 text-text-subtle text-xs">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
          <span>Caricamento Carte & Bonus Sociali...</span>
        </div>
      </div>
    )
  }

  const activeCard = cards.find((c) => c.id === activeCardId) ?? null

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-12 animate-in fade-in-50">
      {/* Top Banner & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-text flex items-center gap-2.5">
            <span className="p-1.5 rounded-xl bg-emerald-500/15 text-emerald-400">
              <Wallet className="h-6 w-6" />
            </span>
            Carte & Bonus Sociali
          </h1>
          <p className="text-xs text-text-subtle mt-1">
            Monitoraggio personalizzato della Carta Dedicata a Te con saldo stimato, gestione tranche FIFO e scadenze ministeriali.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          <button
            type="button"
            onClick={() => setCategoriesModalOpen(true)}
            className="flex items-center gap-1.5 rounded-xl border border-border bg-card hover:bg-card-hover px-3.5 py-2 text-xs font-medium text-text transition-colors cursor-pointer shadow-sm"
          >
            <Info className="h-4 w-4 text-emerald-400" />
            <span>Beni Ammessi & Convenzioni</span>
          </button>

          <button
            type="button"
            onClick={() => setRegisterModalOpen(true)}
            className="flex items-center gap-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black px-3.5 py-2 text-xs font-semibold transition-colors cursor-pointer shadow-sm"
          >
            <Plus className="h-4 w-4" />
            <span>Registra Carta</span>
          </button>
        </div>
      </div>

      {/* Se non ci sono carte registrate: Mostra Onboarding / Empty State */}
      {cards.length === 0 ? (
        <EmptyCardsState onRegisterClick={() => setRegisterModalOpen(true)} />
      ) : activeCard && summary ? (
        <>
          {/* Barra di selezione carte (se ce ne sono più d'una) */}
          {cards.length > 1 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {cards.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => handleSelectCard(c.id)}
                  className={`flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                    c.id === activeCardId
                      ? 'bg-emerald-500 text-black font-semibold'
                      : 'border border-border bg-card text-text-subtle hover:text-text'
                  }`}
                >
                  <CreditCard className="h-3.5 w-3.5" />
                  <span>{c.customName || 'Carta Dedicata a Te'}</span>
                  {c.cardNumberLast4 && (
                    <span className="font-mono text-[10px] opacity-80">
                      (•••• {c.cardNumberLast4})
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}

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

          {/* Card Management / Delete footer */}
          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={() => handleDeleteCard(activeCard.id)}
              className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-rose-400 transition-colors cursor-pointer"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Rimuovi questa carta dal monitoraggio</span>
            </button>
          </div>
        </>
      ) : null}

      {/* Modali */}
      <RegisterCardModal
        isOpen={registerModalOpen}
        onClose={() => setRegisterModalOpen(false)}
        onRegister={handleRegisterCard}
      />

      <ExpenseModal
        isOpen={expenseModalOpen}
        onClose={() => setExpenseModalOpen(false)}
        onSave={handleSaveExpense}
        initialExpense={editingExpense}
      />

      {summary && (
        <ReconciliationModal
          isOpen={reconcileModalOpen}
          onClose={() => setReconcileModalOpen(false)}
          summary={summary}
          onSave={handleSaveReconciliation}
        />
      )}

      <AllowedCategoriesModal
        isOpen={categoriesModalOpen}
        onClose={() => setCategoriesModalOpen(false)}
      />
    </div>
  )
}
