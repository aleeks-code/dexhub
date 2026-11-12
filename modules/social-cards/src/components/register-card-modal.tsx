'use client'

import React, { useState } from 'react'
import { X, CreditCard, ShieldCheck, Check, Sparkles, KeyRound, Calendar, Lock } from 'lucide-react'
import { DEDICATA_A_TE_PROFILE, EDITION_2026_2027 } from '../config/dedicata-a-te'

interface Props {
  isOpen: boolean
  onClose: () => void
  onRegister: (data: {
    profileId: string
    editionId: string
    customName: string
    cardNumber?: string
    cardNumberLast4?: string
    expiryDate?: string
    cvv?: string
    pin?: string
    initialAtmBalance?: number
    notes?: string
  }) => Promise<void>
}

export function RegisterCardModal({ isOpen, onClose, onRegister }: Props) {
  const [customName, setCustomName] = useState('Carta Dedicata a Te')
  const [cardNumber, setCardNumber] = useState('')
  const [expiryDate, setExpiryDate] = useState('')
  const [cvv, setCvv] = useState('')
  const [pin, setPin] = useState('')
  const [cardStatus, setCardStatus] = useState<'new' | 'existing'>('new')
  const [initialAtmBalanceStr, setInitialAtmBalanceStr] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

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

    let initialAtmBalance: number | undefined = undefined
    if (cardStatus === 'existing') {
      const num = parseFloat(initialAtmBalanceStr.replace(',', '.'))
      if (isNaN(num) || num < 0) {
        setError('Inserisci il saldo effettivo riscontrato allo sportello Postamat.')
        return
      }
      initialAtmBalance = num
    }

    const rawNum = cardNumber.replace(/\s/g, '').trim()

    try {
      setSubmitting(true)
      await onRegister({
        profileId: DEDICATA_A_TE_PROFILE.id,
        editionId: EDITION_2026_2027.editionId,
        customName: customName.trim() || 'Carta Dedicata a Te',
        cardNumber: rawNum || undefined,
        expiryDate: expiryDate.trim() || undefined,
        cvv: cvv.trim() || undefined,
        pin: pin.trim() || undefined,
        initialAtmBalance,
        notes: cardStatus === 'existing' ? 'Saldo iniziale registrato dall’utente' : undefined,
      })
      onClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Errore durante la registrazione.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 overflow-y-auto">
      <div className="relative w-full max-w-lg rounded-2xl border border-border bg-surface p-6 shadow-2xl animate-in fade-in-50 zoom-in-95 my-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/60 pb-3">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-sky-500/15 p-1.5 text-sky-400">
              <CreditCard className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-text">
                Registra la tua Carta Dedicata a Te
              </h3>
              <p className="text-[11px] text-text-subtle">
                Aggiungi la carta per monitorare saldo, scadenze e credenziali protette
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
          {/* Card Profilo Preimpostato */}
          <div className="rounded-xl border border-sky-500/30 bg-surface-raised p-3.5">
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-sky-400">
                  Edizione Ministeriale 2026–2027
                </span>
                <h4 className="font-bold text-text text-sm mt-0.5">
                  Carta Dedicata a Te (500 € + 500 €)
                </h4>
                <p className="text-[11px] text-text-subtle mt-1 leading-relaxed">
                  500 € accreditati nel 2026 e ulteriori 500 € ad aprile 2027. Attivazione obbligatoria entro il 16 Dicembre 2026.
                </p>
              </div>
              <span className="rounded bg-sky-500/20 px-2 py-0.5 text-xs font-bold text-sky-200 font-mono shrink-0">
                500 €
              </span>
            </div>
          </div>

          {/* Nome personalizzato */}
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

          {/* Dati Carta Fisici (Opzionali ma utilissimi per averli a portata di mano) */}
          <div className="rounded-xl border border-border bg-surface-raised p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-text flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5 text-sky-400" />
                Dati della Carta Fisica (Opzionali)
              </span>
              <span className="text-[10px] text-text-subtle">
                Nascosti di default con asterischi
              </span>
            </div>

            <div>
              <label className="block text-[11px] text-text-subtle mb-1">
                Numero Carta (16 cifre)
              </label>
              <input
                type="text"
                value={cardNumber}
                onChange={(e) => handleCardNumberChange(e.target.value)}
                placeholder="es. 5333 1712 3456 7890"
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-xs font-mono tracking-wider text-text placeholder:text-zinc-600 focus:outline-hidden focus:border-sky-500"
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-[11px] text-text-subtle mb-1">
                  Scadenza (MM/AA)
                </label>
                <input
                  type="text"
                  maxLength={5}
                  value={expiryDate}
                  onChange={(e) => handleExpiryChange(e.target.value)}
                  placeholder="12/28"
                  className="w-full rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs font-mono text-center text-text focus:outline-hidden focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-[11px] text-text-subtle mb-1">
                  CVV (3 cifre)
                </label>
                <input
                  type="password"
                  maxLength={3}
                  value={cvv}
                  onChange={(e) => setCvv(e.target.value.replace(/\D/g, ''))}
                  placeholder="•••"
                  className="w-full rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs font-mono text-center text-text focus:outline-hidden focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-[11px] text-text-subtle mb-1">
                  PIN Postamat (5 cifre)
                </label>
                <input
                  type="password"
                  maxLength={5}
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="•••••"
                  className="w-full rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs font-mono text-center text-sky-400 font-bold focus:outline-hidden focus:border-sky-500"
                />
              </div>
            </div>
          </div>

          {/* Stato iniziale della carta */}
          <div className="rounded-xl border border-border bg-surface-raised p-3.5 space-y-2.5">
            <span className="block text-xs font-semibold text-text">
              Stato iniziale della carta
            </span>

            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="radio"
                name="cardStatus"
                checked={cardStatus === 'new'}
                onChange={() => setCardStatus('new')}
                className="mt-0.5 accent-emerald-500"
              />
              <div>
                <span className="text-xs font-medium text-text block">
                  Appena ritirata / Nuova di zecca
                </span>
                <span className="text-[11px] text-text-subtle block">
                  Saldo iniziale intero di 500,00 €.
                </span>
              </div>
            </label>

            <label className="flex items-start gap-2.5 cursor-pointer pt-2 border-t border-border/40">
              <input
                type="radio"
                name="cardStatus"
                checked={cardStatus === 'existing'}
                onChange={() => setCardStatus('existing')}
                className="mt-0.5 accent-emerald-500"
              />
              <div>
                <span className="text-xs font-medium text-text block">
                  L&apos;ho già utilizzata per degli acquisti
                </span>
                <span className="text-[11px] text-text-subtle block">
                  Imposta subito il saldo effettivo letto all&apos;ultimo scontrino Postamat.
                </span>
              </div>
            </label>

            {cardStatus === 'existing' && (
              <div className="mt-2 pt-2 border-t border-border/60">
                <label className="block text-xs font-medium text-text-subtle mb-1">
                  Saldo Attuale Postamat (€)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="500"
                  value={initialAtmBalanceStr}
                  onChange={(e) => setInitialAtmBalanceStr(e.target.value)}
                  placeholder="es. 412.50"
                  className="w-full rounded-lg border border-border bg-surface px-3 py-1.5 text-sm font-mono font-bold text-emerald-400 focus:outline-hidden focus:border-emerald-500"
                  required
                />
              </div>
            )}
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
              {submitting ? 'Registrazione...' : 'Conferma e Inizia'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
