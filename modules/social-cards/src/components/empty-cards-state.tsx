'use client'

import React from 'react'
import { Wallet, Plus, Clock, Percent, ShieldCheck, ShoppingCart, Landmark } from 'lucide-react'

interface Props {
  onRegisterClick: () => void
}

export function EmptyCardsState({ onRegisterClick }: Props) {
  return (
    <div className="rounded-2xl border border-border bg-card p-8 sm:p-12 text-center shadow-sm">
      <div className="mx-auto rounded-2xl bg-emerald-500/15 p-4 w-fit text-emerald-400 mb-4">
        <Wallet className="h-10 w-10" />
      </div>

      <h2 className="text-xl sm:text-2xl font-black text-text tracking-tight">
        Benvenuto in Carte & Bonus Sociali
      </h2>
      <p className="mt-2 text-xs sm:text-sm text-text-subtle max-w-lg mx-auto leading-relaxed">
        Non hai ancora registrato nessuna agevolazione. Aggiungi la tua <strong>Carta Dedicata a Te</strong> per iniziare a monitorare le spese, il saldo stimato e le scadenze ministeriali.
      </p>

      {/* Feature Pills / Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-2xl mx-auto mt-8 text-left">
        <div className="rounded-xl border border-border/80 bg-zinc-900/40 p-4">
          <div className="rounded-lg bg-emerald-500/15 p-2 w-fit text-emerald-400 mb-2">
            <Clock className="h-4 w-4" />
          </div>
          <h4 className="text-xs font-bold text-text">Scadenza 16 Dicembre</h4>
          <p className="text-[11px] text-text-subtle mt-1 leading-relaxed">
            Alert continuo sul primo acquisto obbligatorio per non far decadere il beneficio dei 500 €.
          </p>
        </div>

        <div className="rounded-xl border border-border/80 bg-zinc-900/40 p-4">
          <div className="rounded-lg bg-emerald-500/15 p-2 w-fit text-emerald-400 mb-2">
            <Percent className="h-4 w-4" />
          </div>
          <h4 className="text-xs font-bold text-text">Convenzioni 15%</h4>
          <p className="text-[11px] text-text-subtle mt-1 leading-relaxed">
            Calcolo automatico con formula di scorporo per tracciare quanto risparmi nei negozi partner.
          </p>
        </div>

        <div className="rounded-xl border border-border/80 bg-zinc-900/40 p-4">
          <div className="rounded-lg bg-emerald-500/15 p-2 w-fit text-emerald-400 mb-2">
            <Landmark className="h-4 w-4" />
          </div>
          <h4 className="text-xs font-bold text-text">Ancoraggio Postamat</h4>
          <p className="text-[11px] text-text-subtle mt-1 leading-relaxed">
            Riconciliazione del saldo stimato con il valore verificato fisicamente all&apos;ATM Postamat.
          </p>
        </div>
      </div>

      <div className="mt-8">
        <button
          type="button"
          onClick={onRegisterClick}
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-sm px-5 py-3 transition-colors cursor-pointer shadow-md hover:shadow-lg"
        >
          <Plus className="h-5 w-5" />
          <span>Registra la tua Carta Dedicata a Te</span>
        </button>
      </div>
    </div>
  )
}
