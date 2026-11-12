'use client'

import React, { useState } from 'react'
import { X, Wallet, ShieldCheck, Check, Sparkles, CreditCard } from 'lucide-react'
import { DEDICATA_A_TE_PROFILE, EDITION_2026_2027 } from '../config/dedicata-a-te'

interface Props {
  isOpen: boolean
  onClose: () => void
  onRegister: (data: {
    profileId: string
    editionId: string
    customName: string
    cardNumberLast4?: string
    initialAtmBalance?: number
    notes?: string
  }) => Promise<void>
}

export function RegisterCardModal({ isOpen, onClose, onRegister }: Props) {
  const [customName, setCustomName] = useState('Carta Dedicata a Te')
  const [cardNumberLast4, setCardNumberLast4] = useState('')
  const [cardStatus, setCardStatus] = useState<'new' | 'existing'>('new')
  const [initialAtmBalanceStr, setInitialAtmBalanceStr] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

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

    try {
      setSubmitting(true)
      await onRegister({
        profileId: DEDICATA_A_TE_PROFILE.id,
        editionId: EDITION_2026_2027.editionId,
        customName: customName.trim() || 'Carta Dedicata a Te',
        cardNumberLast4: cardNumberLast4.trim() || undefined,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="relative w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl animate-in fade-in-50 zoom-in-95">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/60 pb-3">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-emerald-500/15 p-1.5 text-emerald-400">
              <Wallet className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-text">
                Registra Carta o Agevolazione
              </h3>
              <p className="text-[11px] text-text-subtle">
                Aggiungi la tua carta per monitorare saldo e scadenze
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-text-subtle hover:bg-zinc-800 transition-colors cursor-pointer"
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
          <div className="rounded-xl border border-emerald-500/40 bg-gradient-to-br from-emerald-500/15 to-emerald-500/5 p-3.5">
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                  Agevolazione Selezionata
                </span>
                <h4 className="font-bold text-text text-sm mt-0.5">
                  Carta Dedicata a Te (Edizione 2026–2027)
                </h4>
                <p className="text-[11px] text-text-subtle mt-1 leading-relaxed">
                  500 € erogati nel 2026 e ulteriori 500 € ad aprile 2027. Termine primo acquisto: 16 Dicembre 2026.
                </p>
              </div>
              <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-xs font-bold text-emerald-300 font-mono shrink-0">
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
              placeholder="es. Carta Dedicata a Te Famiglia"
              className="w-full rounded-lg border border-border bg-zinc-900/60 px-3 py-2 text-xs text-text focus:outline-hidden focus:border-emerald-500"
              required
            />
          </div>

          {/* Ultime 4 cifre Postepay (opzionale) */}
          <div>
            <label className="block text-xs font-medium text-text-subtle mb-1">
              Ultime 4 cifre della Postepay (Opzionale)
            </label>
            <div className="relative">
              <input
                type="text"
                maxLength={4}
                value={cardNumberLast4}
                onChange={(e) => setCardNumberLast4(e.target.value.replace(/\D/g, ''))}
                placeholder="es. 4821"
                className="w-full rounded-lg border border-border bg-zinc-900/60 px-3 py-2 text-xs text-text font-mono placeholder:text-zinc-600 focus:outline-hidden focus:border-emerald-500"
              />
            </div>
            <span className="text-[11px] text-text-subtle mt-0.5 block">
              Ti aiuta a identificare la carta fisica nel portafoglio.
            </span>
          </div>

          {/* Stato iniziale della carta */}
          <div className="rounded-xl border border-border bg-zinc-900/40 p-3 space-y-2.5">
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
                  className="w-full rounded-lg border border-border bg-zinc-900 px-3 py-1.5 text-sm font-mono font-bold text-emerald-400 focus:outline-hidden focus:border-emerald-500"
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
              className="rounded-lg border border-border px-3.5 py-2 text-xs text-text-subtle hover:bg-zinc-800 transition-colors cursor-pointer"
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
