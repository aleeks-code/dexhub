'use client'

import Link from 'next/link'
import { Landmark, Briefcase, TrendingUp, Wallet, ArrowUpRight } from 'lucide-react'
import { useDailyBriefing } from '@/core/hooks/use-daily-briefing'

function formatEuro(n: number): string {
  return new Intl.NumberFormat('it-IT', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n)
}

export function FinancialSynergyBanner() {
  const { financialSynergy } = useDailyBriefing()
  const { stimaStipendio, rateFinanziamenti, disponibilitaStimata, netBalanceDebiti } = financialSynergy

  // Se non c'è né stima stipendio né finanziamenti, non mostrare la barra
  if (stimaStipendio === null && rateFinanziamenti <= 0) {
    return null
  }

  const income = stimaStipendio ?? 0
  const loanSharePercent =
    income > 0 ? Math.min(100, Math.round((rateFinanziamenti / income) * 100)) : 0

  return (
    <section className="mb-8">
      <div className="flex items-center justify-between mb-3.5">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-3.5 w-3.5 text-primary" />
          <h2
            style={{
              font: '500 11px var(--font-jetbrains-mono)',
              letterSpacing: '.14em',
              textTransform: 'uppercase',
              color: 'rgb(var(--home-ink) / .42)',
            }}
          >
            Sinergia Finanziaria · Mese in Corso
          </h2>
        </div>
      </div>

      <div
        className="rounded-2xl border p-5 transition-shadow hover:shadow-lg"
        style={{
          background: 'var(--home-card-bg)',
          borderColor: 'rgb(var(--home-line) / .08)',
        }}
      >
        <div className="grid gap-4 sm:grid-cols-3">
          {/* Entrate Stimate (Worklog) */}
          <Link
            href="/worklog"
            className="group flex flex-col justify-between rounded-xl bg-surface/50 border border-border/50 p-3.5 transition-colors hover:border-primary/40 text-decoration-none"
            style={{ textDecoration: 'none' }}
          >
            <div className="flex items-center justify-between text-xs text-text-muted mb-1">
              <span className="flex items-center gap-1.5 font-medium">
                <Briefcase className="h-3.5 w-3.5 text-primary" /> Stipendio Netto Stimato
              </span>
              <ArrowUpRight className="h-3 w-3 text-text-subtle group-hover:text-primary transition-colors" />
            </div>
            <div className="font-mono text-lg font-bold text-text group-hover:text-primary transition-colors">
              {stimaStipendio !== null ? `${formatEuro(stimaStipendio)} €` : 'Da configurare'}
            </div>
            <p className="text-[11px] text-text-subtle mt-1">Calcolato dal tuo Worklog ore</p>
          </Link>

          {/* Rate Finanziamenti */}
          <Link
            href="/loans"
            className="group flex flex-col justify-between rounded-xl bg-surface/50 border border-border/50 p-3.5 transition-colors hover:border-emerald-500/40 text-decoration-none"
            style={{ textDecoration: 'none' }}
          >
            <div className="flex items-center justify-between text-xs text-text-muted mb-1">
              <span className="flex items-center gap-1.5 font-medium">
                <Landmark className="h-3.5 w-3.5 text-emerald-500" /> Rate Fisse del Mese
              </span>
              <ArrowUpRight className="h-3 w-3 text-text-subtle group-hover:text-emerald-500 transition-colors" />
            </div>
            <div className="font-mono text-lg font-bold text-emerald-500">
              {rateFinanziamenti > 0 ? `-${formatEuro(rateFinanziamenti)} €` : '0,00 €'}
            </div>
            <p className="text-[11px] text-text-subtle mt-1">
              {loanSharePercent > 0 ? `${loanSharePercent}% delle entrate mensili` : 'Nessun finanziamento attivo'}
            </p>
          </Link>

          {/* Disponibilità Residua Stimata */}
          <div
            className="flex flex-col justify-between rounded-xl bg-primary/10 border border-primary/20 p-3.5"
          >
            <div className="flex items-center justify-between text-xs text-primary font-medium mb-1">
              <span>Disponibilità Netta Stimata</span>
              {netBalanceDebiti !== 0 && (
                <span className="text-[10px] text-text-muted">
                  {netBalanceDebiti > 0 ? `+${formatEuro(netBalanceDebiti)} € crediti` : `-${formatEuro(Math.abs(netBalanceDebiti))} € debiti`}
                </span>
              )}
            </div>
            <div className="font-mono text-lg font-bold text-primary">
              {disponibilitaStimata !== null ? `${formatEuro(disponibilitaStimata)} €` : '—'}
            </div>
            <p className="text-[11px] text-text-muted mt-1">Entrate nette - rate fisse</p>
          </div>
        </div>

        {/* Progress Bar of commitment */}
        {income > 0 && rateFinanziamenti > 0 && (
          <div className="mt-4 pt-3 border-t border-border/40">
            <div className="flex items-center justify-between text-xs text-text-subtle mb-1.5">
              <span>Impegno finanziario fisso sul reddito</span>
              <span className="font-medium text-text">{loanSharePercent}%</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-surface-raised overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  loanSharePercent > 40 ? 'bg-amber-500' : 'bg-emerald-500'
                }`}
                style={{ width: `${loanSharePercent}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
