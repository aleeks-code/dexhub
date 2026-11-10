'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import {
  Bell,
  CheckCircle2,
  ChevronRight,
  Landmark,
  CheckSquare,
  Briefcase,
  Wallet,
  Repeat,
  AlertTriangle,
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

export function NotificationsMenu({ align = 'left' }: { align?: 'left' | 'right' }) {
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const { alerts, totalAlertsCount } = useDailyBriefing()

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }

    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleKeyDown)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  return (
    <div className="relative inline-block" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative rounded-xl p-2 text-text-subtle hover:bg-surface-raised hover:text-text transition-colors"
        aria-label="Notifiche e promemoria"
        title="Notifiche e promemoria"
        aria-expanded={open}
      >
        <Bell className="h-4 w-4" />
        {totalAlertsCount > 0 && (
          <span className="absolute right-1.5 top-1.5 flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-rose-500" />
          </span>
        )}
      </button>

      {open && (
        <div
          className={`absolute z-popover mt-2 w-80 sm:w-96 rounded-2xl border border-border bg-surface-raised p-2 shadow-2xl backdrop-blur-xl ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}
          style={{ maxHeight: '80vh', overflowY: 'auto' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border/60 px-3 py-2.5">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-xs text-text">Notifiche & Promemoria</span>
              {totalAlertsCount > 0 && (
                <span className="rounded-full bg-rose-500/15 px-2 py-0.5 text-[10px] font-bold text-rose-500">
                  {totalAlertsCount}
                </span>
              )}
            </div>
            {totalAlertsCount > 0 && (
              <span className="text-[10px] text-text-subtle">Sincronizzate in tempo reale</span>
            )}
          </div>

          {/* Body */}
          <div className="py-1">
            {alerts.length === 0 ? (
              <div className="py-8 px-4 text-center">
                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500 mb-2">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <p className="text-xs font-semibold text-text">Nessun promemoria pendente</p>
                <p className="text-[11px] text-text-muted mt-0.5">
                  Tutti i tuoi impegni, rate e task sono aggiornati.
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                {alerts.map((alert) => {
                  const Icon = getAlertIcon(alert.moduleId)
                  const isRed = alert.badgeVariant === 'red' || alert.type === 'urgent'
                  const isAmber = alert.badgeVariant === 'amber' || alert.type === 'warning'
                  const isEmerald = alert.badgeVariant === 'emerald'

                  return (
                    <Link
                      key={alert.id}
                      href={alert.href}
                      onClick={() => setOpen(false)}
                      className="group flex items-start gap-3 rounded-xl p-2.5 transition-colors hover:bg-surface text-decoration-none"
                    >
                      <div
                        className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                          isRed
                            ? 'bg-rose-500/15 text-rose-500'
                            : isAmber
                              ? 'bg-amber-500/15 text-amber-500'
                              : isEmerald
                                ? 'bg-emerald-500/15 text-emerald-500'
                                : 'bg-primary/15 text-primary'
                        }`}
                      >
                        <Icon className="h-3.5 w-3.5" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-semibold text-text group-hover:text-primary transition-colors truncate">
                            {alert.title}
                          </p>
                          {alert.badge && (
                            <span
                              className={`shrink-0 rounded-full px-1.5 py-0.2 text-[9px] font-semibold ${
                                isRed
                                  ? 'bg-rose-500/15 text-rose-500'
                                  : isAmber
                                    ? 'bg-amber-500/15 text-amber-500'
                                    : isEmerald
                                      ? 'bg-emerald-500/15 text-emerald-500'
                                      : 'bg-primary/15 text-primary'
                              }`}
                            >
                              {alert.badge}
                            </span>
                          )}
                        </div>

                        {alert.subtitle && (
                          <p className="text-[11px] text-text-muted mt-0.5 line-clamp-2">
                            {alert.subtitle}
                          </p>
                        )}
                      </div>

                      <ChevronRight className="h-3.5 w-3.5 shrink-0 text-text-subtle group-hover:text-primary group-hover:translate-x-0.5 transition-all mt-1" />
                    </Link>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
