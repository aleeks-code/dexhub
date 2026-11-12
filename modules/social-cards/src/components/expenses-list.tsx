'use client'

import React, { useState } from 'react'
import { Store, Percent, Trash2, Edit2, Search, ShoppingBag, ArrowDownLeft } from 'lucide-react'
import { cn } from '@dexhub/ui'
import type { SocialCardExpense } from '../types'

interface Props {
  expenses: SocialCardExpense[]
  onEdit: (exp: SocialCardExpense) => void
  onDelete: (id: string) => Promise<void>
}

function formatEuro(val: number): string {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(val)
}

function formatDateTime(iso: string): string {
  try {
    const d = new Date(iso)
    return d.toLocaleString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}

export function ExpensesList({ expenses, onEdit, onDelete }: Props) {
  const [searchTerm, setSearchTerm] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const sorted = [...expenses].sort(
    (a, b) => new Date(b.spentAt).getTime() - new Date(a.spentAt).getTime()
  )

  const filtered = sorted.filter((e) =>
    e.merchant.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (e.notes && e.notes.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  const handleDelete = async (id: string) => {
    if (!confirm('Sei sicuro di voler eliminare questa spesa? Il saldo verrà ricalcolato.')) return
    try {
      setDeletingId(id)
      await onDelete(id)
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-4">
        <div>
          <h3 className="text-base font-bold text-text">Registro Spese</h3>
          <p className="text-xs text-text-subtle mt-0.5">
            {expenses.length} {expenses.length === 1 ? 'scontrino registrato' : 'scontrini registrati'}
          </p>
        </div>

        {/* Ricerca */}
        {expenses.length > 0 && (
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-zinc-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cerca supermercato o nota..."
              className="w-full rounded-lg border border-border bg-zinc-900/60 pl-8 pr-3 py-1.5 text-xs text-text placeholder:text-zinc-600 focus:outline-hidden focus:border-emerald-500"
            />
          </div>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="py-12 text-center">
          <div className="mx-auto rounded-full bg-zinc-800/80 p-3 w-fit text-zinc-500 mb-3">
            <ShoppingBag className="h-6 w-6" />
          </div>
          <p className="text-sm font-semibold text-text">
            {searchTerm ? 'Nessuna spesa trovata' : 'Nessuna spesa registrata'}
          </p>
          <p className="text-xs text-text-subtle mt-1 max-w-sm mx-auto">
            {searchTerm
              ? 'Prova con un termine di ricerca differente.'
              : 'Registra il tuo primo scontrino per iniziare a monitorare il saldo e attivare la carta entro il 16 Dicembre 2026.'}
          </p>
        </div>
      ) : (
        <div className="divide-y divide-border/40 mt-2">
          {filtered.map((exp) => (
            <div
              key={exp.id}
              className="flex items-center justify-between py-3.5 px-2 hover:bg-zinc-900/40 rounded-xl transition-colors gap-3"
            >
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-zinc-800 p-2 text-zinc-400 shrink-0 mt-0.5">
                  <Store className="h-4 w-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold text-text">
                      {exp.merchant}
                    </span>
                    {exp.isPartnerMerchant && (
                      <span className="flex items-center gap-1 rounded bg-emerald-500/10 px-1.5 py-0.2 text-[10px] font-semibold text-emerald-400">
                        <Percent className="h-2.5 w-2.5" /> Convenzione 15%
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-text-subtle mt-1 flex-wrap">
                    <span>{formatDateTime(exp.spentAt)}</span>
                    <span>•</span>
                    <span className="text-[11px] text-zinc-400">
                      Beni alimentari
                    </span>
                    {exp.notes && (
                      <>
                        <span>•</span>
                        <span className="italic text-zinc-400">&ldquo;{exp.notes}&rdquo;</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Importo e azioni */}
              <div className="flex items-center gap-3 shrink-0">
                <div className="text-right">
                  <span className="text-sm font-bold font-mono text-text block">
                    -{formatEuro(exp.amount)}
                  </span>
                  {exp.discountSaved > 0 && (
                    <span className="text-[10px] font-medium text-emerald-400 font-mono block">
                      +{formatEuro(exp.discountSaved)} risparmiati
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => onEdit(exp)}
                    className="rounded-lg p-1.5 text-zinc-400 hover:text-text hover:bg-zinc-800 transition-colors cursor-pointer"
                    title="Modifica spesa"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(exp.id)}
                    disabled={deletingId === exp.id}
                    className="rounded-lg p-1.5 text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                    title="Elimina spesa"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
