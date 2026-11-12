'use client'

import Link from 'next/link'
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Clock,
  ArrowRight,
  Sparkles,
  ChevronRight,
  Landmark,
  CheckSquare,
  Briefcase,
  Wallet,
  Repeat,
} from 'lucide-react'
import { useDailyBriefing, type DailyAlert } from '@/core/hooks/use-daily-briefing'

function getAlertIcon(moduleId: string) {
  switch (moduleId) {
    case 'loans':
      return Landmark
    case 'tasks':
      return CheckSquare
    case 'worklog':
      return Briefcase
    case 'debts':
      return Wallet
    case 'subscriptions':
      return Repeat
    default:
      return AlertTriangle
  }
}

export function DailyFocus() {
  const { alerts, totalAlertsCount } = useDailyBriefing()

  return (
    <section className="mt-8 mb-4">
      {/* Section Header */}
      <div className="flex items-center justify-between mb-3.5">
        <div className="flex items-center gap-2">
          <span
            className={`h-2 w-2 rounded-full ${
              totalAlertsCount > 0 ? 'bg-yellow-400' : 'bg-emerald-500'
            }`}
          />
          <h2
            style={{
              font: '500 11px var(--font-jetbrains-mono)',
              letterSpacing: '.14em',
              textTransform: 'uppercase',
              color: 'rgb(var(--home-ink) / .42)',
            }}
          >
            Il tuo Oggi · Focus
          </h2>
        </div>

        {totalAlertsCount > 0 && (
          <span
            style={{
              font: '500 11px var(--font-jetbrains-mono)',
              color: 'rgb(var(--home-ink) / .35)',
            }}
          >
            {totalAlertsCount} {totalAlertsCount === 1 ? 'notifica attiva' : 'notifiche attive'}
          </span>
        )}
      </div>

      {/* Content */}
      {alerts.length === 0 ? (
        <div
          style={{
            background: 'var(--home-card-bg)',
            border: '1px solid rgb(var(--home-line) / .06)',
            borderRadius: 14,
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500">
              <CheckCircle2 className="h-4 w-4" />
            </div>
            <div>
              <p
                style={{
                  font: '500 13.5px var(--font-manrope)',
                  color: 'var(--home-ink-strong)',
                  margin: 0,
                }}
              >
                Tutto in ordine per oggi
              </p>
              <p
                style={{
                  font: '400 11.5px var(--font-manrope)',
                  color: 'rgb(var(--home-ink) / .42)',
                  margin: '2px 0 0',
                }}
              >
                Nessuna rata imminente, nessun task urgente scaduto o ore da timbrare.
              </p>
            </div>
          </div>
          <span className="hidden sm:inline-flex items-center gap-1.5 text-xs text-emerald-500/80 font-medium">
            <Sparkles className="h-3.5 w-3.5" /> Tutto sotto controllo
          </span>
        </div>
      ) : (
        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {alerts.map((alert) => {
            const Icon = getAlertIcon(alert.moduleId)
            const isRed = alert.badgeVariant === 'red' || alert.type === 'urgent'
            const isYellow = alert.badgeVariant === 'amber' || alert.type === 'warning'
            const isCyan = alert.badgeVariant === 'cyan'
            const isEmerald = alert.badgeVariant === 'emerald'

            return (
              <Link
                key={alert.id}
                href={alert.href}
                className="group flex flex-col justify-between rounded-xl border transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
                style={{
                  background: 'var(--home-card-bg)',
                  borderColor: isRed
                    ? 'rgba(239, 68, 68, 0.25)'
                    : isYellow
                      ? 'rgba(250, 204, 21, 0.25)'
                      : 'rgb(var(--home-line) / .07)',
                  padding: '14px 16px',
                  textDecoration: 'none',
                }}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <div
                      className={`flex h-7 w-7 items-center justify-center rounded-lg ${
                        isRed
                          ? 'bg-rose-500/15 text-rose-500'
                          : isYellow
                            ? 'bg-yellow-500/15 text-yellow-400'
                            : isEmerald
                              ? 'bg-emerald-500/15 text-emerald-500'
                              : 'bg-primary/15 text-primary'
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <span
                      style={{
                        font: '500 10px var(--font-jetbrains-mono)',
                        letterSpacing: '.06em',
                        textTransform: 'uppercase',
                        color: 'rgb(var(--home-ink) / .4)',
                      }}
                    >
                      {alert.moduleName}
                    </span>
                  </div>

                  {alert.badge && (
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide ${
                        isRed
                          ? 'bg-rose-500/15 text-rose-500'
                          : isYellow
                            ? 'bg-yellow-500/15 text-yellow-400'
                            : isEmerald
                              ? 'bg-emerald-500/15 text-emerald-500'
                              : 'bg-primary/15 text-primary'
                      }`}
                    >
                      {alert.badge}
                    </span>
                  )}
                </div>

                <div>
                  <p
                    className="group-hover:text-primary transition-colors"
                    style={{
                      font: '600 13px var(--font-manrope)',
                      color: 'var(--home-card-title)',
                      margin: 0,
                    }}
                  >
                    {alert.title}
                  </p>
                  {alert.subtitle && (
                    <p
                      style={{
                        font: '400 11.5px/1.4 var(--font-manrope)',
                        color: 'rgb(var(--home-ink) / .42)',
                        margin: '3px 0 0',
                      }}
                      className="line-clamp-2"
                    >
                      {alert.subtitle}
                    </p>
                  )}
                </div>

                <div className="mt-3 flex items-center justify-end gap-1 text-[11px] font-medium text-text-subtle group-hover:text-primary transition-colors">
                  <span>{alert.actionLabel ?? 'Apri'}</span>
                  <ChevronRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </section>
  )
}
