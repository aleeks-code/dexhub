'use client'

import React, { useState, useEffect } from 'react'
import { X, Store, Percent, Calendar, DollarSign, FileText, Check } from 'lucide-react'
import { PARTNER_SUPERMARKETS } from '../config/dedicata-a-te'
import { calculateDiscountSavings } from '../engine/discount'
import type { SocialCardExpense } from '../types'

interface Props {
  isOpen: boolean
  onClose: () => void
  onSave: (data: {
    merchant: string
    amount: number
    spentAt: string
    isPartnerMerchant: boolean
    discountSaved: number
    category: string
    notes?: string
  }) => Promise<void>
  initialExpense?: SocialCardExpense | null
}

export function ExpenseModal({ isOpen, onClose, onSave, initialExpense }: Props) {
  const [merchant, setMerchant] = useState('')
  const [amountStr, setAmountStr] = useState('')
  const [spentAtDate, setSpentAtDate] = useState('')
  const [spentAtTime, setSpentAtTime] = useState('')
  const [isPartnerMerchant, setIsPartnerMerchant] = useState(false)
  const [discountSavedStr, setDiscountSavedStr] = useState('')
  const [userOverrodeDiscount, setUserOverrodeDiscount] = useState(false)
  const [notes, setNotes] = useState('')
  const [showMerchantSuggestions, setShowMerchantSuggestions] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Inizializza form
  useEffect(() => {
    if (!isOpen) return

    if (initialExpense) {
      setMerchant(initialExpense.merchant)
      setAmountStr(initialExpense.amount.toString())
      const d = new Date(initialExpense.spentAt)
      setSpentAtDate(d.toISOString().slice(0, 10))
      setSpentAtTime(d.toTimeString().slice(0, 5))
      setIsPartnerMerchant(initialExpense.isPartnerMerchant)
      setDiscountSavedStr(initialExpense.discountSaved ? initialExpense.discountSaved.toString() : '0')
      setUserOverrodeDiscount(true)
      setNotes(initialExpense.notes ?? '')
    } else {
      const now = new Date()
      setMerchant('')
      setAmountStr('')
      setSpentAtDate(now.toISOString().slice(0, 10))
      setSpentAtTime(now.toTimeString().slice(0, 5))
      setIsPartnerMerchant(false)
      setDiscountSavedStr('0')
      setUserOverrodeDiscount(false)
      setNotes('')
    }
    setError(null)
  }, [isOpen, initialExpense])

  // Riconoscimento automatico supermercato convenzionato
  const handleMerchantChange = (val: string) => {
    setMerchant(val)
    const match = PARTNER_SUPERMARKETS.find(
      (p) => p.name.toLowerCase() === val.trim().toLowerCase()
    )
    if (match) {
      setIsPartnerMerchant(true)
    }
  }

  const handleSelectPresetMerchant = (name: string) => {
    setMerchant(name)
    setIsPartnerMerchant(true)
    setShowMerchantSuggestions(false)
  }

  // Pre-calcolo scorporo 15% quando l'importo o il flag cambiano
  useEffect(() => {
    if (userOverrodeDiscount) return

    const num = parseFloat(amountStr)
    if (!isNaN(num) && num > 0 && isPartnerMerchant) {
      const autoSavings = calculateDiscountSavings(num, 0.15)
      setDiscountSavedStr(autoSavings.toString())
    } else if (!isPartnerMerchant) {
      setDiscountSavedStr('0')
    }
  }, [amountStr, isPartnerMerchant, userOverrodeDiscount])

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const numAmount = parseFloat(amountStr.replace(',', '.'))
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Inserisci un importo valido per lo scontrino.')
      return
    }

    if (!merchant.trim()) {
      setError('Inserisci il nome del supermercato o punto vendita.')
      return
    }

    const numDiscount = parseFloat(discountSavedStr.replace(',', '.')) || 0

    // Combina data e ora in ISO
    let spentAtIso: string
    try {
      const combined = new Date(`${spentAtDate}T${spentAtTime || '12:00'}:00`)
      spentAtIso = combined.toISOString()
    } catch {
      spentAtIso = new Date().toISOString()
    }

    try {
      setSubmitting(true)
      await onSave({
        merchant: merchant.trim(),
        amount: numAmount,
        spentAt: spentAtIso,
        isPartnerMerchant,
        discountSaved: numDiscount,
        category: 'alimentari_prima_necessita',
        notes: notes.trim() || undefined,
      })
      onClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Errore durante il salvataggio.')
    } finally {
      setSubmitting(false)
    }
  }

  const filteredPresets = PARTNER_SUPERMARKETS.filter((p) =>
    p.name.toLowerCase().includes(merchant.toLowerCase())
  ).slice(0, 6)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 overflow-y-auto">
      <div className="relative w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-2xl animate-in fade-in-50 zoom-in-95 my-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/60 pb-3">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-emerald-500/15 p-1.5 text-emerald-400">
              <Store className="h-4 w-4" />
            </div>
            <h3 className="text-base font-bold text-text">
              {initialExpense ? 'Modifica Spesa' : 'Nuova Spesa'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-text-subtle hover:bg-surface-raised transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mt-3 rounded-lg bg-rose-500/15 border border-rose-500/30 p-2.5 text-xs text-rose-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Supermercato / Esercizio con Autocompletamento */}
          <div className="relative">
            <label className="block text-xs font-medium text-text-subtle mb-1">
              Supermercato / Esercizio
            </label>
            <div className="relative">
              <input
                type="text"
                value={merchant}
                onChange={(e) => handleMerchantChange(e.target.value)}
                onFocus={() => setShowMerchantSuggestions(true)}
                placeholder="es. Conad, Coop, Esselunga..."
                className="w-full rounded-lg border border-border bg-surface-raised px-3 py-2 text-sm text-text placeholder:text-zinc-600 focus:outline-hidden focus:border-emerald-500"
                required
              />
            </div>

            {/* Suggerimenti preset */}
            {showMerchantSuggestions && filteredPresets.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1 z-10 rounded-xl border border-border bg-surface-raised p-1 shadow-2xl">
                <span className="block px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-text-subtle">
                  Esercizi Convenzionati (-15%)
                </span>
                {filteredPresets.map((p) => (
                  <button
                    key={p.name}
                    type="button"
                    onClick={() => handleSelectPresetMerchant(p.name)}
                    className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs text-text hover:bg-surface transition-colors text-left cursor-pointer"
                  >
                    <span>{p.name}</span>
                    <span className="text-[10px] font-medium text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded">
                      Convenzione 15%
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Importo Scontrino (pagato) */}
          <div>
            <label className="block text-xs font-medium text-text-subtle mb-1">
              Importo Pagato sullo Scontrino (€)
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
                placeholder="0.00"
                className="w-full rounded-lg border border-border bg-surface-raised px-3 py-2 text-base font-semibold font-mono text-emerald-400 placeholder:text-zinc-600 focus:outline-hidden focus:border-emerald-500"
                required
              />
            </div>
            <span className="text-[11px] text-text-subtle mt-0.5 block">
              Inserisci l&apos;importo effettivo pagato alla cassa con la carta.
            </span>
          </div>

          {/* Switch Sconto Convenzione 15% */}
          <div className="rounded-xl border border-border bg-surface-raised p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Percent className="h-4 w-4 text-emerald-400" />
                <div>
                  <span className="text-xs font-semibold text-text">
                    Sconto Convenzione 15%
                  </span>
                  <span className="block text-[11px] text-text-subtle">
                    Applicato alla cassa dal supermercato aderente
                  </span>
                </div>
              </div>
              <input
                type="checkbox"
                checked={isPartnerMerchant}
                onChange={(e) => setIsPartnerMerchant(e.target.checked)}
                className="h-4 w-4 rounded border-border accent-emerald-500 cursor-pointer"
              />
            </div>

            {isPartnerMerchant && (
              <div className="mt-2.5 pt-2.5 border-t border-border/60 flex items-center justify-between">
                <span className="text-xs text-text-subtle">
                  Risparmio calcolato:
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-emerald-400 font-medium">+</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={discountSavedStr}
                    onChange={(e) => {
                      setUserOverrodeDiscount(true)
                      setDiscountSavedStr(e.target.value)
                    }}
                    className="w-20 rounded border border-border bg-surface px-2 py-0.5 text-xs text-right font-mono text-emerald-400 focus:outline-hidden"
                  />
                  <span className="text-xs text-text-subtle">€</span>
                </div>
              </div>
            )}
          </div>

          {/* Data e Ora */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium text-text-subtle mb-1">
                Data
              </label>
              <input
                type="date"
                value={spentAtDate}
                onChange={(e) => setSpentAtDate(e.target.value)}
                className="w-full rounded-lg border border-border bg-surface-raised px-3 py-2 text-xs text-text focus:outline-hidden"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-subtle mb-1">
                Ora
              </label>
              <input
                type="time"
                value={spentAtTime}
                onChange={(e) => setSpentAtTime(e.target.value)}
                className="w-full rounded-lg border border-border bg-surface-raised px-3 py-2 text-xs text-text focus:outline-hidden"
              />
            </div>
          </div>

          {/* Note / Dettaglio Scontrino */}
          <div>
            <label className="block text-xs font-medium text-text-subtle mb-1">
              Note (Opzionale)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="es. Spesa generi alimentari"
              className="w-full rounded-lg border border-border bg-surface-raised px-3 py-2 text-xs text-text placeholder:text-zinc-600 focus:outline-hidden"
            />
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-border px-3.5 py-2 text-xs text-text-subtle hover:bg-surface-raised transition-colors cursor-pointer"
            >
              Annulla
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-semibold px-4 py-2 text-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              {submitting ? 'Salvataggio...' : initialExpense ? 'Aggiorna' : 'Aggiungi Spesa'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
