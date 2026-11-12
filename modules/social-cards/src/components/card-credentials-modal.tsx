'use client'

import React, { useState, useEffect } from 'react'
import { X, CreditCard, Lock, KeyRound, Calendar, ShieldCheck } from 'lucide-react'
import type { SocialBenefitCard } from '../types'

interface Props {
  isOpen: boolean
  onClose: () => void
  card: SocialBenefitCard
  onSave: (data: {
    customName?: string
    cardNumber?: string
    expiryDate?: string
    cvv?: string
    pin?: string
  }) => Promise<void>
}

export function CardCredentialsModal({ isOpen, onClose, card, onSave }: Props) {
  const [customName, setCustomName] = useState('')
  const [cardNumber, setCardNumber] = useState('')
  const [expiryDate, setExpiryDate] = useState('')
  const [cvv, setCvv] = useState('')
  const [pin, setPin] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen) return
    setCustomName(card.customName || 'Carta Dedicata a Te')
    setCardNumber(card.cardNumber || '')
    setExpiryDate(card.expiryDate || '')
    setCvv(card.cvv || '')
    setPin(card.pin || '')
    setError(null)
  }, [isOpen, card])

  if (!isOpen) return null

  // Format card number with spaces every 4 digits
  const handleCardNumberChange = (val: string) => {
    const raw = val.replace(/\D/g, '').slice(0, 16)
    const formatted = raw.match(/.{1,4}/g)?.join(' ') ?? raw
    setCardNumber(formatted)
  }

  // Format expiry MM/YY
  const handleExpiryChange = (val: string) => {
    const raw = val.replace(/\D/g, '').slice(0, 4)
    if (raw.length >= 3) {
      setExpiryDate(`${raw.slice(0, 2)}/${raw.slice(2)}`)
    } else {
      setExpiryDate(raw)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    try {
      setSubmitting(true)
      await onSave({
        customName: customName.trim() || 'Carta Dedicata a Te',
        cardNumber: cardNumber.replace(/\s/g, '').trim() || undefined,
        expiryDate: expiryDate.trim() || undefined,
        cvv: cvv.trim() || undefined,
        pin: pin.trim() || undefined,
      })
      onClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Errore nel salvataggio credenziali.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 overflow-y-auto">
      <div className="relative w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl border border-border bg-surface p-6 shadow-2xl animate-in fade-in-50 zoom-in-95 my-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/60 pb-3">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-sky-500/15 p-1.5 text-sky-400">
              <CreditCard className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-text">
                Credenziali Carta Fisica
              </h3>
              <p className="text-[11px] text-text-subtle">
                Aggiorna numero, scadenza, CVV e PIN Postamat
              </p>
            </div>
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
          {/* Nome intestatario / personalizzato */}
          <div>
            <label className="block text-xs font-medium text-text-subtle mb-1">
              Nome Riconoscibile
            </label>
            <input
              type="text"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              placeholder="es. Carta Dedicata a Te"
              className="w-full rounded-lg border border-border bg-surface-raised px-3 py-2 text-xs text-text focus:outline-hidden focus:border-sky-500"
              required
            />
          </div>

          {/* Numero Carta (16 cifre) */}
          <div>
            <label className="block text-xs font-medium text-text-subtle mb-1">
              Numero Carta (16 cifre)
            </label>
            <input
              type="text"
              value={cardNumber}
              onChange={(e) => handleCardNumberChange(e.target.value)}
              placeholder="es. 5333 1712 3456 7890"
              className="w-full rounded-lg border border-border bg-surface-raised px-3 py-2 text-sm font-mono tracking-wider text-text placeholder:text-zinc-600 focus:outline-hidden focus:border-sky-500"
            />
          </div>

          {/* Scadenza & CVV */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-text-subtle mb-1">
                Scadenza (MM/AA)
              </label>
              <input
                type="text"
                maxLength={5}
                value={expiryDate}
                onChange={(e) => handleExpiryChange(e.target.value)}
                placeholder="12/28"
                className="w-full rounded-lg border border-border bg-surface-raised px-3 py-2 text-xs font-mono text-center text-text focus:outline-hidden focus:border-sky-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-text-subtle mb-1">
                CVV (3 cifre)
              </label>
              <input
                type="password"
                maxLength={3}
                value={cvv}
                onChange={(e) => setCvv(e.target.value.replace(/\D/g, ''))}
                placeholder="•••"
                className="w-full rounded-lg border border-border bg-surface-raised px-3 py-2 text-xs font-mono text-center text-text focus:outline-hidden focus:border-sky-500"
              />
            </div>
          </div>

          {/* PIN Postamat (5 cifre) */}
          <div className="rounded-xl border border-sky-500/30 bg-surface-raised p-3.5 space-y-1.5">
            <div className="flex items-center gap-1.5">
              <KeyRound className="h-4 w-4 text-sky-400" />
              <label className="text-xs font-bold text-text">
                PIN Sportello Postamat (5 cifre)
              </label>
            </div>
            <input
              type="password"
              maxLength={5}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
              placeholder="•••••"
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-base font-mono font-bold tracking-widest text-center text-sky-400 focus:outline-hidden focus:border-sky-500"
            />
            <span className="block text-[11px] text-text-subtle">
              Indispensabile per consultare il saldo presso gli sportelli Postamat ATM.
            </span>
          </div>

          {/* Encryption security assurance */}
          <div className="flex items-center gap-1.5 text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-2.5 py-1.5">
            <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
            <span>I dati inseriti vengono cifrati con algoritmo AES-256-GCM prima di essere salvati sul server.</span>
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
              className="rounded-lg bg-sky-500 hover:bg-sky-400 text-black font-semibold px-4 py-2 text-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              {submitting ? 'Salvataggio...' : 'Salva Credenziali'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
