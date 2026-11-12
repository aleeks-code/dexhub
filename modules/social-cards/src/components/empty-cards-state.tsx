'use client'

import React from 'react'
import { CreditCard, Plus, Clock, Percent, ShieldCheck, ShoppingCart, Landmark } from 'lucide-react'

interface Props {
  onRegisterClick: () => void
}

export function EmptyCardsState({ onRegisterClick }: Props) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-8 sm:p-12 text-center shadow-xs">
      <div className="mx-auto rounded-2xl bg-sky-500/15 p-4 w-fit text-sky-400 mb-4">
        <CreditCard className="h-10 w-10" />
      </div>

      <h2 className="text-xl sm:text-2xl font-black text-text tracking-tight">
        Carta Dedicata a Te
      </h2>
      <p className="mt-2 text-xs sm:text-sm text-text-subtle max-w-lg mx-auto leading-relaxed">
        Non hai ancora registrato la tua carta. Aggiungila per monitorare il saldo stimato, proteggere PIN e credenziali fisiche, e tenere sotto controllo la scadenza di attivazione del 16 Dicembre 2026.
      </p>

      {/* Feature Pills / Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-2xl mx-auto mt-8 text-left">
        <div className="rounded-xl border border-border bg-surface-raised p-4">
          <div className="rounded-lg bg-sky-500/15 p-2 w-fit text-sky-400 mb-2">
            <Clock className="h-4 w-4" />
          </div>
          <h4 className="text-xs font-bold text-text">Scadenza 16 Dicembre</h4>
          <p className="text-[11px] text-text-subtle mt-1 leading-relaxed">
            Monitoraggio continuo sul primo acquisto obbligatorio per non far decadere il beneficio dei 500 €.
          </p>
        </div>

        <div className="rounded-xl border border-border bg-surface-raised p-4">
          <div className="rounded-lg bg-emerald-500/15 p-2 w-fit text-emerald-400 mb-2">
            <Percent className="h-4 w-4" />
          </div>
          <h4 className="text-xs font-bold text-text">Sconto 15% Convenzioni</h4>
          <p className="text-[11px] text-text-subtle mt-1 leading-relaxed">
            Scorporo automatico per verificare quanto hai risparmiato sui generi alimentari nei supermercati partner.
          </p>
        </div>

        <div className="rounded-xl border border-border bg-surface-raised p-4">
          <div className="rounded-lg bg-sky-500/15 p-2 w-fit text-sky-400 mb-2">
            <Landmark className="h-4 w-4" />
          </div>
          <h4 className="text-xs font-bold text-text">PIN & Checkpoint ATM</h4>
          <p className="text-[11px] text-text-subtle mt-1 leading-relaxed">
            PIN sempre a portata di mano (nascosto di default) e riconciliazione con lo scontrino dell&apos;ATM Postamat.
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
