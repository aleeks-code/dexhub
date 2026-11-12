'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { Wallet, ArrowRight, ArrowUpRight, ArrowDownLeft } from 'lucide-react'
import { cn } from '@dexhub/ui'
import { type Person, type DebtTransaction } from '../types'
import {
  listPeople,
  listTransactions,
  computePersonSummaries,
  computeGlobalSummary,
} from '../services/debts-service'

export default function DebtsWidget() {
  const [people, setPeople] = useState<Person[]>([])
  const [transactions, setTransactions] = useState<DebtTransaction[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([listPeople(), listTransactions()])
      .then(([p, txs]) => {
        setPeople(p)
        setTransactions(txs)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const personSummaries = useMemo(() => {
    return computePersonSummaries(people, transactions)
  }, [people, transactions])

  const globalSummary = useMemo(() => {
    return computeGlobalSummary(personSummaries, transactions)
  }, [personSummaries, transactions])

  // Top 3 active balances
  const topActive = useMemo(() => {
    return personSummaries
      .filter((s) => Math.abs(s.netBalance) >= 0.01)
      .sort((a, b) => Math.abs(b.netBalance) - Math.abs(a.netBalance))
      .slice(0, 3)
  }, [personSummaries])

  return (
    <div className="flex h-full flex-col justify-between gap-3">
      {/* Widget Header */}
      <div className="flex items-center justify-between border-b border-border/60 pb-2">
        <div className="flex items-center gap-2">
          <Wallet className="h-4 w-4 text-primary" />
          <span className="text-xs font-semibold text-text">Debiti & Crediti</span>
        </div>
        <Link
          href="/debts"
          className="flex items-center gap-1 text-[11px] text-text-subtle hover:text-primary transition-colors"
        >
          Apri <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      {loading ? (
        <div className="flex flex-1 items-center justify-center text-xs text-text-subtle">
          Caricamento…
        </div>
      ) : (
        <div className="flex flex-1 flex-col justify-between gap-2.5">
          {/* Net balance headline */}
          <div className="flex items-center justify-between rounded-lg bg-overlay-subtle px-3 py-2">
            <div>
              <div className="text-[10px] text-text-subtle uppercase tracking-wider">Saldo Netto</div>
              <div
                className={cn(
                  'font-mono text-base font-bold',
                  globalSummary.netBalance > 0
                    ? 'text-primary'
                    : globalSummary.netBalance < 0
                      ? 'text-rose-400'
                      : 'text-text-muted',
                )}
              >
                {globalSummary.netBalance > 0 ? '+' : ''}
                {globalSummary.netBalance.toFixed(2)} €
              </div>
            </div>
            <div className="text-right text-[10px] text-text-subtle">
              <div>+{globalSummary.totalCredit.toFixed(2)} € da ricevere</div>
              <div>-{globalSummary.totalDebt.toFixed(2)} € da rendere</div>
            </div>
          </div>

          {/* Top active people list */}
          {topActive.length === 0 ? (
            <div className="text-center py-2 text-xs text-text-subtle">
              Tutti i conti sono in pari! ✨
            </div>
          ) : (
            <div className="space-y-1">
              {topActive.map((item) => (
                <div
                  key={item.person.id}
                  className="flex items-center justify-between rounded-md bg-surface-raised/60 px-2 py-1 text-xs"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      className="h-4 w-4 rounded-full flex items-center justify-center text-[8px] font-bold text-white shrink-0"
                      style={{ backgroundColor: item.person.avatarColor || '#0d9488' }}
                    >
                      {item.person.name.slice(0, 1).toUpperCase()}
                    </div>
                    <span className="truncate text-text text-[11px] font-medium">{item.person.name}</span>
                  </div>

                  <span
                    className={cn(
                      'font-mono text-[11px] font-bold shrink-0 ml-2',
                      item.netBalance > 0 ? 'text-primary' : 'text-rose-400',
                    )}
                  >
                    {item.netBalance > 0 ? '+' : ''}
                    {item.netBalance.toFixed(2)} €
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
