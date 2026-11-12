'use client'

import React from 'react'
import { X, Check, AlertCircle, ShoppingCart, Percent, Info } from 'lucide-react'
import { PARTNER_SUPERMARKETS } from '../config/dedicata-a-te'

interface Props {
  isOpen: boolean
  onClose: () => void
}

export function AllowedCategoriesModal({ isOpen, onClose }: Props) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 overflow-y-auto">
      <div className="relative w-full max-w-lg rounded-2xl border border-border bg-surface p-6 shadow-2xl max-h-[90vh] overflow-y-auto animate-in fade-in-50 zoom-in-95 my-6">
        <div className="flex items-center justify-between border-b border-border/60 pb-3">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-sky-500/15 p-1.5 text-sky-400">
              <Info className="h-4 w-4" />
            </div>
            <h3 className="text-base font-bold text-text">
              Regole & Beni Ammessi (Edizione 2026–2027)
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

        <div className="mt-4 space-y-4 text-xs text-text-subtle leading-relaxed">
          {/* Categorie Ammesse */}
          <div className="rounded-xl border border-emerald-500/30 bg-surface-raised p-3.5">
            <h4 className="font-semibold text-emerald-300 text-sm flex items-center gap-1.5 mb-2">
              <Check className="h-4 w-4 text-emerald-400" />
              Generi Alimentari di Prima Necessità (Ammessi)
            </h4>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-zinc-300">
              <li>• Carni bovine, suine, avicole, ovine</li>
              <li>• Pescato fresco o surgelato</li>
              <li>• Latte, yogurt e prodotti caseari</li>
              <li>• Uova fresche</li>
              <li>• Oli d&apos;oliva e di semi</li>
              <li>• Prodotti della panetteria e pasticceria</li>
              <li>• Paste alimentari, riso, orzo, farro</li>
              <li>• Farine di cereali</li>
              <li>• Ortaggi freschi e lavorati</li>
              <li>• Frutta fresca e secca</li>
              <li>• Alimenti per la prima infanzia</li>
              <li>• Legumi, conserve di pomodoro</li>
              <li>• Acque minerali, aceto, caffè, tè</li>
            </ul>
          </div>

          {/* Categorie Escluse */}
          <div className="rounded-xl border border-rose-500/30 bg-surface-raised p-3.5">
            <h4 className="font-semibold text-rose-300 text-sm flex items-center gap-1.5 mb-2">
              <AlertCircle className="h-4 w-4 text-rose-400" />
              Beni Esclusi per l&apos;Edizione 2026
            </h4>
            <ul className="space-y-1 text-zinc-300">
              <li>• <strong>Bevande alcoliche:</strong> escluse tassativamente da tutte le normative ministeriali.</li>
              <li>• <strong>Carburante:</strong> non previsto per la tranche alimentare 2026.</li>
              <li>• <strong>Abbonamenti Trasporto Pubblico Locale:</strong> non previsti per la tranche 2026.</li>
              <li>• Farmaci, tabacchi ed elettrodomestici.</li>
            </ul>
          </div>

          {/* Sconto 15% Convenzioni */}
          <div className="rounded-xl border border-border bg-surface-raised p-3.5">
            <h4 className="font-semibold text-text text-sm flex items-center gap-1.5 mb-2">
              <Percent className="h-4 w-4 text-emerald-400" />
              Sconto 15% Esercizi Convenzionati
            </h4>
            <p className="mb-2">
              I principali gruppi della Grande Distribuzione Organizzata applicano uno sconto aggiuntivo del 15% alla cassa sui prodotti ammessi:
            </p>
            <div className="flex flex-wrap gap-1.5">
              {PARTNER_SUPERMARKETS.map((p) => (
                <span
                  key={p.name}
                  className="rounded-md bg-surface px-2 py-0.5 text-[11px] text-zinc-300 font-medium border border-border/40"
                >
                  {p.name}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-surface-raised hover:bg-surface text-text border border-border px-4 py-2 text-xs font-semibold transition-colors cursor-pointer"
          >
            Chiudi
          </button>
        </div>
      </div>
    </div>
  )
}
