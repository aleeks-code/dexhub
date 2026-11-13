'use client'

import Link from 'next/link'
import { Landmark, Briefcase, TrendingUp, ArrowUpRight, Repeat } from 'lucide-react'
import { useDailyBriefing } from '@/core/hooks/use-daily-briefing'
import { useVisibleModules } from '@/core/hooks/use-modules'

function formatEuro(n: number): string {
  return new Intl.NumberFormat('it-IT', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n)
}

export function FinancialSynergyBanner() {
  const { financialSynergy } = useDailyBriefing()
  const { data: visibleModules } = useVisibleModules()

  const isModuleActive = (id: string) =>
    (visibleModules ?? []).some((m) => m.id === id && m.enabled && !m.maintenance)

  const loansActive = isModuleActive('loans')
  const debtsActive = isModuleActive('debts')
  const worklogActive = isModuleActive('worklog')
  const subscriptionsActive = isModuleActive('subscriptions')

  // Se l'utente non ha attivo né finanziamenti né debiti né abbonamenti, non mostrare affatto la sinergia
  if (!loansActive && !debtsActive && !subscriptionsActive) {
    return null
  }

  const {
    stimaStipendio,
    rateFinanziamenti,
    spesaAbbonamenti,
    activeSubscriptionsCount,
    nextSubscriptionRenewal,
    totalUsciteFisse,
    loanSharePercent,
    subSharePercent,
    impegnoFissoPercent,
    disponibilitaStimata,
    netBalanceDebiti,
  } = financialSynergy

  // Se non c'è stima stipendio né rate né abbonamenti né debiti, non mostrare
  if (
    stimaStipendio === null &&
    rateFinanziamenti <= 0 &&
    spesaAbbonamenti <= 0 &&
    netBalanceDebiti === 0
  ) {
    return null
  }

  const income = stimaStipendio ?? 0

  // Calcolo card attive per layout responsive
  const activeCardsCount =
    (worklogActive ? 1 : 0) +
    (loansActive ? 1 : 0) +
    (subscriptionsActive ? 1 : 0) +
    1 // Disponibilità Residua Netta

  const gridColsClass =
    activeCardsCount >= 4
      ? 'sm:grid-cols-2 lg:grid-cols-4'
      : activeCardsCount === 3
        ? 'sm:grid-cols-3'
        : 'sm:grid-cols-2'

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
        <div className={`grid gap-3.5 ${gridColsClass}`}>
          {/* Entrate Stimate (Worklog) */}
          {worklogActive && (
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
              <p className="text-[11px] text-text-subtle mt-1 truncate">
                Calcolato dal tuo Cartellino ore
              </p>
            </Link>
          )}

          {/* Rate Finanziamenti */}
          {loansActive && (
            <Link
              href="/loans"
              className="group flex flex-col justify-between rounded-xl bg-surface/50 border border-border/50 p-3.5 transition-colors hover:border-emerald-500/40 text-decoration-none"
              style={{ textDecoration: 'none' }}
            >
              <div className="flex items-center justify-between text-xs text-text-muted mb-1">
                <span className="flex items-center gap-1.5 font-medium">
                  <Landmark className="h-3.5 w-3.5 text-emerald-500" /> Rate Finanziamenti
                </span>
                <ArrowUpRight className="h-3 w-3 text-text-subtle group-hover:text-emerald-500 transition-colors" />
              </div>
              <div className="font-mono text-lg font-bold text-emerald-500">
                {rateFinanziamenti > 0 ? `-${formatEuro(rateFinanziamenti)} €` : '0,00 €'}
              </div>
              <p className="text-[11px] text-text-subtle mt-1 truncate">
                {loanSharePercent > 0
                  ? `${loanSharePercent}% delle entrate mensili`
                  : 'Nessun finanziamento attivo'}
              </p>
            </Link>
          )}

          {/* Abbonamenti & Ricorrenze */}
          {subscriptionsActive && (
            <Link
              href="/subscriptions"
              className="group flex flex-col justify-between rounded-xl bg-surface/50 border border-border/50 p-3.5 transition-colors hover:border-sky-400/40 text-decoration-none"
              style={{ textDecoration: 'none' }}
            >
              <div className="flex items-center justify-between text-xs text-text-muted mb-1">
                <span className="flex items-center gap-1.5 font-medium">
                  <Repeat className="h-3.5 w-3.5 text-sky-400" /> Abbonamenti & Ricorrenze
                </span>
                <ArrowUpRight className="h-3 w-3 text-text-subtle group-hover:text-sky-400 transition-colors" />
              </div>
              <div className="font-mono text-lg font-bold text-sky-400">
                {spesaAbbonamenti > 0 ? `-${formatEuro(spesaAbbonamenti)} €` : '0,00 €'}
              </div>
              <p className="text-[11px] text-text-subtle mt-1 truncate">
                {nextSubscriptionRenewal ? (
                  <>
                    Prossimo:{' '}
                    <span className="font-medium text-text">
                      {nextSubscriptionRenewal.subscription.name}
                    </span>{' '}
                    ({formatEuro(nextSubscriptionRenewal.subscription.cost)} €
                    {nextSubscriptionRenewal.daysUntil === 0
                      ? ' · oggi'
                      : nextSubscriptionRenewal.daysUntil === 1
                        ? ' · domani'
                        : ` · tra ${nextSubscriptionRenewal.daysUntil}gg`}
                    )
                  </>
                ) : activeSubscriptionsCount > 0 ? (
                  `${activeSubscriptionsCount} ${activeSubscriptionsCount === 1 ? 'ricorrenza attiva' : 'ricorrenze attive'}${subSharePercent > 0 ? ` · ${subSharePercent}% reddito` : ''}`
                ) : (
                  'Nessun abbonamento attivo'
                )}
              </p>
            </Link>
          )}

          {/* Disponibilità Residua Stimata */}
          <div className="flex flex-col justify-between rounded-xl bg-primary/10 border border-primary/20 p-3.5">
            <div className="flex items-center justify-between text-xs text-primary font-medium mb-1">
              <span>Disponibilità Netta Stimata</span>
              {debtsActive && netBalanceDebiti !== 0 && (
                <span className="text-[10px] text-text-muted font-normal">
                  {netBalanceDebiti > 0
                    ? `+${formatEuro(netBalanceDebiti)} € crediti`
                    : `-${formatEuro(Math.abs(netBalanceDebiti))} € debiti`}
                </span>
              )}
            </div>
            <div className="font-mono text-lg font-bold text-primary">
              {disponibilitaStimata !== null ? `${formatEuro(disponibilitaStimata)} €` : '—'}
            </div>
            <p className="text-[11px] text-text-muted mt-1 truncate">
              {rateFinanziamenti > 0 && spesaAbbonamenti > 0
                ? 'Entrate - rate - abbonamenti'
                : rateFinanziamenti > 0
                  ? 'Entrate nette - rate fisse'
                  : spesaAbbonamenti > 0
                    ? 'Entrate nette - abbonamenti'
                    : 'Entrate nette stimate'}
            </p>
          </div>
        </div>

        {/* Progress Bar of commitment (Finanziamenti + Abbonamenti) */}
        {income > 0 && totalUsciteFisse > 0 && (
          <div className="mt-4 pt-3 border-t border-border/40">
            <div className="flex items-center justify-between text-xs text-text-subtle mb-1.5">
              <span>Impegno fisso e ricorrente sul reddito</span>
              <span className="font-medium text-text">
                {impegnoFissoPercent}% ({formatEuro(totalUsciteFisse)} €/mese)
              </span>
            </div>
            {/* Multi-segment progress bar */}
            <div className="h-1.5 w-full rounded-full bg-surface-raised overflow-hidden flex">
              {loanSharePercent > 0 && (
                <div
                  className="h-full bg-emerald-500 transition-all duration-300"
                  style={{ width: `${loanSharePercent}%` }}
                  title={`Rate finanziamenti: ${loanSharePercent}% (${formatEuro(rateFinanziamenti)} €)`}
                />
              )}
              {subSharePercent > 0 && (
                <div
                  className="h-full bg-sky-400 transition-all duration-300"
                  style={{ width: `${subSharePercent}%` }}
                  title={`Abbonamenti e ricorrenze: ${subSharePercent}% (${formatEuro(spesaAbbonamenti)} €)`}
                />
              )}
            </div>

            {/* Legenda a segmenti */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-2.5 text-[11px] text-text-subtle">
              {loansActive && rateFinanziamenti > 0 && (
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                  <span>
                    Finanziamenti: <strong className="font-medium text-text">{loanSharePercent}%</strong> ({formatEuro(rateFinanziamenti)} €)
                  </span>
                </div>
              )}
              {subscriptionsActive && spesaAbbonamenti > 0 && (
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-sky-400 shrink-0" />
                  <span>
                    Abbonamenti: <strong className="font-medium text-text">{subSharePercent}%</strong> ({formatEuro(spesaAbbonamenti)} €)
                  </span>
                </div>
              )}
              {stimaStipendio !== null && (
                <div className="flex items-center gap-1.5 ml-auto">
                  <span className="h-2 w-2 rounded-full bg-primary shrink-0" />
                  <span>
                    Disponibile: <strong className="font-medium text-primary">{Math.max(0, 100 - impegnoFissoPercent)}%</strong> ({formatEuro(disponibilitaStimata ?? 0)} €)
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
