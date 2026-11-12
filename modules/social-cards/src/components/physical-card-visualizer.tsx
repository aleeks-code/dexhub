'use client'

import React, { useState, useEffect } from 'react'
import {
  CreditCard,
  Eye,
  EyeOff,
  Copy,
  Check,
  Edit2,
  ShieldAlert,
  ShieldCheck,
  KeyRound,
  Lock,
  X,
  AlertTriangle,
} from 'lucide-react'
import { cn } from '@dexhub/ui'
import type { SocialBenefitCard } from '../types'

interface Props {
  card: SocialBenefitCard
  onEditCredentials: () => void
}

/**
 * Official Mastercard Logo (SVG Vector with overlapping geometric circles)
 */
function MastercardLogo({ className }: { className?: string }) {
  return (
    <div className={cn('flex flex-col items-center justify-center select-none', className)}>
      <svg
        viewBox="0 0 38 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="h-6 w-9 sm:h-7 sm:w-10 shrink-0 drop-shadow-sm"
        aria-label="Circuito Mastercard"
      >
        {/* Left Circle: Mastercard Red */}
        <circle cx="12" cy="12" r="10" fill="#EB001B" />
        {/* Right Circle: Mastercard Yellow */}
        <circle cx="26" cy="12" r="10" fill="#F79E1B" fillOpacity="0.96" />
        {/* Intersecting area: Mastercard Orange */}
        <path
          d="M19 4.35A9.97 9.97 0 0 0 15.65 12c0 3.08 1.39 5.84 3.58 7.74A9.97 9.97 0 0 0 22.35 12c0-3.08-1.39-5.84-3.58-7.74z"
          fill="#FF5F00"
        />
      </svg>
      <span className="font-sans text-[7.5px] font-bold tracking-tight lowercase text-white/95 leading-none mt-0.5 drop-shadow-xs">
        mastercard
      </span>
    </div>
  )
}

/**
 * Realistic EMV Smart Card Contact Chip with ISO 7816 contact patterns
 */
function EmvChip() {
  return (
    <div className="relative h-7 w-9 sm:h-8 sm:w-10.5 rounded-[5px] bg-gradient-to-br from-[#fbf5e4] via-[#e6d8b0] to-[#bda671] border border-[#9b834b]/80 shadow-inner overflow-hidden p-0.5 select-none shrink-0">
      <svg viewBox="0 0 40 32" className="w-full h-full text-[#876e33]/70 stroke-current" fill="none" strokeWidth="0.8">
        <rect x="1.5" y="1.5" width="37" height="29" rx="2.5" strokeWidth="0.8" />
        <path d="M1.5 11 H13 V21 H1.5" />
        <path d="M38.5 11 H27 V21 H38.5" />
        <path d="M13 1.5 V30.5" />
        <path d="M27 1.5 V30.5" />
        <path d="M13 16 H27" />
        <circle cx="20" cy="16" r="2.8" fill="#876e33" fillOpacity="0.25" />
      </svg>
    </div>
  )
}

/**
 * Contactless Radio Wave Icon
 */
function ContactlessIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      className={cn('h-5 w-5 rotate-90 text-zinc-300 drop-shadow-xs', className)}
      aria-label="Pagamento Contactless"
    >
      <path d="M8.5 16.5a5 5 0 0 1 0-7" />
      <path d="M12 19a8.5 8.5 0 0 1 0-12" />
      <path d="M15.5 21.5a12 12 0 0 1 0-17" />
    </svg>
  )
}

/**
 * Double Confirmation Modal for Viewing PIN
 */
function PinSecurityConfirmModal({
  isOpen,
  onClose,
  onConfirm,
}: {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
}) {
  const [acknowledged, setAcknowledged] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setAcknowledged(false)
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-yellow-500/15 p-2.5 text-yellow-400 border border-yellow-500/25">
              <ShieldAlert className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-text">Conferma di Sicurezza PIN</h3>
              <p className="text-xs text-text-subtle">Doppia autenticazione visiva</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-text-subtle hover:bg-surface-raised hover:text-text transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Warning Note */}
        <div className="rounded-xl border border-yellow-500/25 bg-yellow-500/10 p-3.5 space-y-1.5 text-xs text-yellow-300">
          <div className="flex items-center gap-1.5 font-bold">
            <AlertTriangle className="h-4 w-4 text-yellow-400 shrink-0" />
            <span>Attenzione alla riservatezza</span>
          </div>
          <p className="text-[11px] leading-relaxed text-yellow-300/90">
            Stai per visualizzare in chiaro il <strong>PIN a 5 cifre</strong> della tua Carta Dedicata a Te. Questo codice consente di consultare il saldo agli sportelli Postamat ed effettuare transazioni. Assicurati che lo schermo non sia visibile ad estranei.
          </p>
        </div>

        {/* Acknowledgment Checkbox */}
        <label className="flex items-start gap-2.5 rounded-xl border border-border bg-surface-raised/40 p-3 text-xs text-text cursor-pointer hover:bg-surface-raised transition-colors">
          <input
            type="checkbox"
            checked={acknowledged}
            onChange={(e) => setAcknowledged(e.target.checked)}
            className="mt-0.5 rounded border-border text-primary focus:ring-primary h-4 w-4"
          />
          <span className="text-[11px] leading-tight select-none">
            Confermo di trovarmi in un ambiente sicuro e desidero mostrare il PIN in chiaro.
          </span>
        </label>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-border bg-surface-raised hover:bg-surface px-4 py-2 text-xs font-semibold text-text transition-colors"
          >
            Annulla
          </button>
          <button
            type="button"
            disabled={!acknowledged}
            onClick={() => {
              onConfirm()
              onClose()
            }}
            className={cn(
              'rounded-xl px-4 py-2 text-xs font-bold transition-all shadow-xs flex items-center gap-1.5',
              acknowledged
                ? 'bg-yellow-400 hover:bg-yellow-300 text-black cursor-pointer'
                : 'bg-surface-raised border border-border text-text-subtle cursor-not-allowed opacity-50'
            )}
          >
            <KeyRound className="h-3.5 w-3.5" />
            <span>Svela PIN (30s)</span>
          </button>
        </div>
      </div>
    </div>
  )
}

function formatCardNumber(num?: string): string {
  if (!num) return ''
  const clean = num.replace(/\s/g, '')
  return clean.match(/.{1,4}/g)?.join(' ') ?? clean
}

export function PhysicalCardVisualizer({ card, onEditCredentials }: Props) {
  // Independent visibility toggles
  const [showCardDetails, setShowCardDetails] = useState(false)
  const [showPin, setShowPin] = useState(false)
  const [pinCountdown, setPinCountdown] = useState<number | null>(null)
  const [confirmPinModalOpen, setConfirmPinModalOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  const hasCredentials = Boolean(
    card.cardNumber || card.expiryDate || card.cvv || card.pin
  )

  // Auto-hide PIN after 30 seconds countdown
  useEffect(() => {
    if (!showPin) {
      setPinCountdown(null)
      return
    }

    setPinCountdown(30)
    const interval = setInterval(() => {
      setPinCountdown((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(interval)
          setShowPin(false)
          return null
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [showPin])

  const handleCopyNumber = () => {
    if (!card.cardNumber) return
    void navigator.clipboard.writeText(card.cardNumber.replace(/\s/g, ''))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const rawNumber = card.cardNumber?.replace(/\s/g, '') || ''
  const displayCardNumber = showCardDetails
    ? formatCardNumber(rawNumber)
    : rawNumber.length >= 4
    ? `•••• •••• •••• ${rawNumber.slice(-4)}`
    : card.cardNumberLast4
    ? `•••• •••• •••• ${card.cardNumberLast4}`
    : '•••• •••• •••• ••••'

  const displayExpiry = showCardDetails ? card.expiryDate || '••/••' : '••/••'
  const displayCvv = showCardDetails ? card.cvv || '•••' : '•••'
  const displayPin = showPin ? card.pin || '•••••' : '•••••'

  return (
    <div className="rounded-2xl border border-border bg-surface p-5 shadow-xs">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/60">
        <div className="flex items-center gap-2.5">
          <div className="rounded-xl bg-sky-500/15 p-2 text-sky-400">
            <CreditCard className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold text-text uppercase tracking-wider">
                Carta Fisica & Credenziali Protette
              </h3>
              <span className="inline-flex items-center gap-1 rounded bg-emerald-500/15 border border-emerald-500/25 px-1.5 py-0.2 text-[9px] font-bold text-emerald-400">
                <ShieldCheck className="h-3 w-3" /> Cifratura AES-256
              </span>
            </div>
            <p className="text-[11px] text-text-subtle">
              Numero, scadenza, CVV e PIN Postamat protetti da cifratura a riposo
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Toggle Dati Carta (Numero, Scadenza, CVV) */}
          <button
            type="button"
            onClick={() => setShowCardDetails((prev) => !prev)}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-surface-raised hover:bg-surface px-2.5 py-1 text-xs text-text transition-colors cursor-pointer"
            title={showCardDetails ? 'Nascondi numero e dati carta' : 'Mostra numero e dati carta'}
          >
            {showCardDetails ? (
              <>
                <EyeOff className="h-3.5 w-3.5 text-zinc-400" />
                <span>Nascondi Dati</span>
              </>
            ) : (
              <>
                <Eye className="h-3.5 w-3.5 text-zinc-400" />
                <span>Mostra Dati</span>
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
            <span>Modifica</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Card Plastic Render + Protected PIN Panel */}
      <div className="mt-4 grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
        {/* Front of Physical Mastercard (Photorealistic ISO 7810 ID-1) */}
        <div className="md:col-span-7">
          <div className="relative overflow-hidden rounded-2xl border border-zinc-700/70 bg-gradient-to-br from-[#1c1f24] via-[#14161a] to-[#0d0e11] p-5 text-white shadow-xl aspect-[1.586/1] flex flex-col justify-between">
            {/* Specular Card Shine Effect (simulating laminated plastic texture) */}
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white/[0.08] via-transparent to-transparent" />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-transparent via-white/[0.02] to-white/[0.05]" />

            {/* Top Row: Official Poste Italiane Logo + Carta Dedicata a Te */}
            <div className="relative z-10 flex items-start justify-between">
              <div>
                <div className="flex items-center gap-1.5">
                  <div className="h-4.5 px-1.5 rounded-xs bg-[#FFCC00] flex items-center justify-center font-black text-[#003399] text-[9.5px] tracking-tight leading-none shadow-xs">
                    PT
                  </div>
                  <span className="font-extrabold text-[12px] tracking-tight text-white uppercase drop-shadow-xs">
                    Poste<span className="text-[#FFCC00]">italiane</span>
                  </span>
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 block mt-0.5">
                  Carta Dedicata a Te
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="rounded bg-zinc-800/80 px-2 py-0.5 text-[9.5px] font-semibold text-zinc-300 border border-zinc-700/50 backdrop-blur-xs">
                  Prepagata
                </span>
              </div>
            </div>

            {/* Middle Row: EMV Chip & Contactless */}
            <div className="relative z-10 flex items-center gap-3.5 my-auto pt-1">
              <EmvChip />
              <ContactlessIcon />
            </div>

            {/* Embossed Card Number Display */}
            <div className="relative z-10 flex items-center justify-between">
              <div className="flex items-baseline gap-2">
                <span
                  className="font-mono text-base sm:text-lg tracking-[0.2em] font-bold text-zinc-100 select-all"
                  style={{
                    textShadow: '0 1px 1px rgba(255,255,255,0.35), 0 -1px 1px rgba(0,0,0,0.85)',
                  }}
                >
                  {displayCardNumber}
                </span>
              </div>

              {card.cardNumber && (
                <button
                  type="button"
                  onClick={handleCopyNumber}
                  className="rounded-md p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800/80 transition-colors cursor-pointer"
                  title="Copia numero completo"
                >
                  {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                </button>
              )}
            </div>

            {/* Bottom Row: Holder Name, Expiry/CVV & Official Mastercard Logo */}
            <div className="relative z-10 flex items-end justify-between text-xs pt-1 border-t border-white/[0.06]">
              {/* Holder */}
              <div className="min-w-0 pr-2">
                <span className="text-[8px] uppercase tracking-wider text-zinc-400 block font-semibold">
                  Intestatario
                </span>
                <span className="font-bold text-zinc-200 text-[11px] truncate uppercase tracking-wider block">
                  {card.customName || 'Beneficiario'}
                </span>
              </div>

              {/* Expiry & CVV */}
              <div className="flex items-center gap-4 text-center px-2">
                <div>
                  <span className="text-[8px] uppercase tracking-wider text-zinc-400 block font-semibold">
                    Scadenza
                  </span>
                  <span
                    className="font-mono font-bold text-zinc-200 text-xs tracking-wider"
                    style={{ textShadow: '0 1px 1px rgba(255,255,255,0.25)' }}
                  >
                    {displayExpiry}
                  </span>
                </div>
                <div>
                  <span className="text-[8px] uppercase tracking-wider text-zinc-400 block font-semibold">
                    CVV
                  </span>
                  <span
                    className="font-mono font-bold text-zinc-200 text-xs tracking-wider"
                    style={{ textShadow: '0 1px 1px rgba(255,255,255,0.25)' }}
                  >
                    {displayCvv}
                  </span>
                </div>
              </div>

              {/* Official Mastercard Brandmark */}
              <div className="shrink-0 pl-1">
                <MastercardLogo />
              </div>
            </div>
          </div>
        </div>

        {/* Side Details: Protected PIN with Double-Confirmation Workflow */}
        <div className="md:col-span-5 flex flex-col justify-between gap-3 h-full">
          {/* Box PIN Postamat (Protetta da doppia conferma) */}
          <div className="rounded-xl border border-border bg-surface-raised p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-sky-400" />
                <div>
                  <span className="text-xs font-bold text-text block">
                    PIN Sportello Postamat
                  </span>
                  <span className="text-[10px] text-text-subtle">
                    Prelevamento e verifica ATM
                  </span>
                </div>
              </div>

              {showPin ? (
                <button
                  type="button"
                  onClick={() => setShowPin(false)}
                  className="flex items-center gap-1 rounded-md bg-surface border border-border px-2 py-0.5 text-[11px] font-semibold text-text hover:bg-surface-raised transition-colors cursor-pointer"
                >
                  <EyeOff className="h-3 w-3 text-zinc-400" />
                  <span>Nascondi</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmPinModalOpen(true)}
                  className="flex items-center gap-1 rounded-md bg-yellow-500/15 border border-yellow-500/25 px-2 py-0.5 text-[11px] font-bold text-yellow-400 hover:bg-yellow-500/25 transition-colors cursor-pointer"
                  title="Richiede conferma di sicurezza"
                >
                  <Lock className="h-3 w-3" />
                  <span>Mostra PIN</span>
                </button>
              )}
            </div>

            <div className="mt-3 flex items-center justify-between">
              <div>
                <span className="font-mono text-2xl font-black tracking-[0.25em] text-text">
                  {displayPin}
                </span>
                {showPin && pinCountdown !== null && (
                  <span className="block text-[10px] text-yellow-400 font-medium mt-0.5">
                    ● Visibile per {pinCountdown}s
                  </span>
                )}
                {!showPin && (
                  <span className="block text-[10px] text-text-subtle mt-0.5">
                    Protetto da doppia conferma
                  </span>
                )}
              </div>

              <div className="text-right max-w-[125px]">
                <span className="text-[10px] text-text-subtle leading-tight block">
                  Necessario per scontrino saldo e prelievi ATM Postamat
                </span>
              </div>
            </div>
          </div>

          {/* Privacy & Anti-Tamper Security Banner */}
          <div className="rounded-xl border border-border bg-surface-raised/60 p-3 text-xs text-text-subtle">
            <div className="flex items-start gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
              <p className="text-[11px] leading-relaxed">
                <strong>Cassaforte Crittografica:</strong> Le credenziali (PAN, CVV e PIN) sono cifrate con algoritmo <strong>AES-256-GCM</strong> prima di essere salvate. Anche in caso di furto o dump del database, i dati risultano inaccessibili e indecifrabili.
              </p>
            </div>
          </div>

          {!hasCredentials && (
            <button
              type="button"
              onClick={onEditCredentials}
              className="w-full rounded-xl border border-dashed border-sky-500/40 p-2.5 text-xs text-sky-400 hover:bg-sky-500/10 transition-colors text-center font-medium cursor-pointer"
            >
              + Inserisci PIN e credenziali complete della carta
            </button>
          )}
        </div>
      </div>

      {/* Double confirmation modal */}
      <PinSecurityConfirmModal
        isOpen={confirmPinModalOpen}
        onClose={() => setConfirmPinModalOpen(false)}
        onConfirm={() => setShowPin(true)}
      />
    </div>
  )
}
