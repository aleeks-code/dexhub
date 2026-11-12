'use client'

import React, { useState } from 'react'
import {
  CreditCard,
  Eye,
  EyeOff,
  Copy,
  Check,
  Edit2,
  Shield,
  KeyRound,
  Calendar,
  Lock,
} from 'lucide-react'
import { cn } from '@dexhub/ui'
import type { SocialBenefitCard } from '../types'

interface Props {
  card: SocialBenefitCard
  onEditCredentials: () => void
}

function formatCardNumber(num?: string): string {
  if (!num) return ''
  const clean = num.replace(/\s/g, '')
  return clean.match(/.{1,4}/g)?.join(' ') ?? clean
}

export function PhysicalCardVisualizer({ card, onEditCredentials }: Props) {
  const [showSensitive, setShowSensitive] = useState(false)
  const [copied, setCopied] = useState(false)

  const hasCredentials = Boolean(
    card.cardNumber || card.expiryDate || card.cvv || card.pin
  )

  const handleCopyNumber = () => {
    if (!card.cardNumber) return
    void navigator.clipboard.writeText(card.cardNumber.replace(/\s/g, ''))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const rawNumber = card.cardNumber?.replace(/\s/g, '') || ''
  const displayCardNumber = showSensitive
    ? formatCardNumber(rawNumber)
    : rawNumber.length >= 4
    ? `•••• •••• •••• ${rawNumber.slice(-4)}`
    : card.cardNumberLast4
    ? `•••• •••• •••• ${card.cardNumberLast4}`
    : '•••• •••• •••• ••••'

  const displayExpiry = showSensitive ? card.expiryDate || '••/••' : '••/••'
  const displayCvv = showSensitive ? card.cvv || '•••' : '•••'
  const displayPin = showSensitive ? card.pin || '•••••' : '•••••'

  return (
    <div className="rounded-2xl border border-border bg-surface p-5 shadow-xs">
      <div className="flex items-center justify-between pb-3 border-b border-border/60">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-sky-500/15 p-1.5 text-sky-400">
            <CreditCard className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-text uppercase tracking-wider">
              Dati & Credenziali Carta Fisica
            </h3>
            <p className="text-[11px] text-text-subtle">
              Numero, scadenza, CVV e PIN Postamat protetti
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setShowSensitive((prev) => !prev)}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-surface-raised hover:bg-surface px-2.5 py-1 text-xs text-text transition-colors cursor-pointer"
            title={showSensitive ? 'Nascondi dati' : 'Mostra dati'}
          >
            {showSensitive ? (
              <>
                <EyeOff className="h-3.5 w-3.5 text-zinc-400" />
                <span className="hidden sm:inline">Nascondi</span>
              </>
            ) : (
              <>
                <Eye className="h-3.5 w-3.5 text-zinc-400" />
                <span className="hidden sm:inline">Mostra</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={onEditCredentials}
            className="flex items-center gap-1 rounded-lg border border-border bg-surface-raised hover:bg-surface px-2.5 py-1 text-xs text-text transition-colors cursor-pointer"
            title="Modifica credenziali carta"
          >
            <Edit2 className="h-3.5 w-3.5 text-zinc-400" />
            <span className="hidden sm:inline">Modifica</span>
          </button>
        </div>
      </div>

      {/* Realistic Virtual Card Container */}
      <div className="mt-4 grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
        {/* Front of the Card */}
        <div className="md:col-span-7">
          <div className="relative overflow-hidden rounded-2xl border border-zinc-700/60 bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-950 p-5 text-white shadow-lg aspect-[1.586/1]">
            {/* Top Row: Postepay / Dedicata a Te Label */}
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 block">
                  Poste Italiane
                </span>
                <span className="text-xs font-bold text-zinc-200">
                  Carta Dedicata a Te
                </span>
              </div>
              <span className="rounded bg-zinc-800/80 px-2 py-0.5 text-[10px] font-semibold text-zinc-400 border border-zinc-700/40">
                Prepagata
              </span>
            </div>

            {/* Chip & Contactless */}
            <div className="mt-4 flex items-center gap-3">
              <div className="h-7 w-9 rounded-md bg-gradient-to-br from-amber-200 to-amber-500 border border-amber-600/50 shadow-inner" />
              <div className="flex flex-col gap-0.5 text-zinc-500">
                <div className="h-1.5 w-3 rounded-full bg-zinc-600" />
                <div className="h-1.5 w-4 rounded-full bg-zinc-500" />
              </div>
            </div>

            {/* Card Number */}
            <div className="mt-4 flex items-center justify-between">
              <span className="font-mono text-base sm:text-lg tracking-widest font-semibold text-zinc-100">
                {displayCardNumber}
              </span>
              {card.cardNumber && (
                <button
                  type="button"
                  onClick={handleCopyNumber}
                  className="rounded-md p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
                  title="Copia numero completo"
                >
                  {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                </button>
              )}
            </div>

            {/* Bottom Row: Expiry, CVV & Holder */}
            <div className="mt-3 flex items-end justify-between text-xs">
              <div>
                <span className="text-[9px] uppercase tracking-wider text-zinc-500 block">
                  Intestatario
                </span>
                <span className="font-medium text-zinc-200 text-xs">
                  {card.customName || 'Beneficiario'}
                </span>
              </div>

              <div className="flex items-center gap-4 text-right">
                <div>
                  <span className="text-[9px] uppercase tracking-wider text-zinc-500 block">
                    Scadenza
                  </span>
                  <span className="font-mono font-semibold text-zinc-200">
                    {displayExpiry}
                  </span>
                </div>
                <div>
                  <span className="text-[9px] uppercase tracking-wider text-zinc-500 block">
                    CVV
                  </span>
                  <span className="font-mono font-semibold text-zinc-200">
                    {displayCvv}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Side Details: PIN & Quick info */}
        <div className="md:col-span-5 flex flex-col justify-between gap-3 h-full">
          {/* Box PIN Postamat (Protettissimo) */}
          <div className="rounded-xl border border-border bg-surface-raised p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-sky-400" />
                <span className="text-xs font-bold text-text">
                  PIN Sportello Postamat
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowSensitive((p) => !p)}
                className="text-[11px] text-sky-400 hover:underline cursor-pointer"
              >
                {showSensitive ? 'Nascondi' : 'Mostra'}
              </button>
            </div>

            <div className="mt-3 flex items-center justify-between">
              <span className="font-mono text-2xl font-black tracking-widest text-text">
                {displayPin}
              </span>
              <span className="text-[10px] text-text-subtle text-right max-w-[130px]">
                Necessario per consultare il saldo all&apos;ATM
              </span>
            </div>
          </div>

          {/* Alert promemoria riservatezza */}
          <div className="rounded-xl border border-border/80 bg-surface-raised p-3 text-xs text-text-subtle">
            <div className="flex items-start gap-2">
              <Lock className="h-4 w-4 text-zinc-400 shrink-0 mt-0.5" />
              <p className="text-[11px] leading-relaxed">
                I dati della carta sono salvati esclusivamente nel tuo database protetto DexHub. Di default PIN e saldo restano nascosti per tutelare la tua privacy in pubblico.
              </p>
            </div>
          </div>

          {!hasCredentials && (
            <button
              type="button"
              onClick={onEditCredentials}
              className="w-full rounded-xl border border-dashed border-sky-500/40 p-2.5 text-xs text-sky-400 hover:bg-sky-500/10 transition-colors text-center font-medium cursor-pointer"
            >
              + Inserisci PIN e dati completi della carta
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
