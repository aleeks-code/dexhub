'use client'

import type { LucideIcon } from 'lucide-react'
import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import { cn } from '@dexhub/ui'
import { Switch } from '@/core/components/switch'
import { useT } from '@/i18n'

interface ModuleCatalogCardProps {
  id?: string
  name: string
  description?: string
  icon: LucideIcon
  enabled: boolean
  inOverview: boolean
  maintenance: boolean
  pending: boolean
  onToggleEnabled: (next: boolean) => void
  onToggleOverview: (next: boolean) => void
}

export function ModuleCatalogCard({
  id,
  name,
  description,
  icon: Icon,
  enabled,
  inOverview,
  maintenance,
  pending,
  onToggleEnabled,
  onToggleOverview,
}: ModuleCatalogCardProps) {
  const t = useT()
  const tm = t.modules

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4.5 shadow-xs">
      <div className="flex items-start justify-between gap-2">
        {enabled && !maintenance && id ? (
          <Link
            href={`/${id}`}
            aria-label={name}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-raised text-text-muted hover:bg-primary-muted hover:text-primary transition-colors"
          >
            <Icon className="h-5 w-5" />
          </Link>
        ) : (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-raised">
            <Icon className="h-5 w-5 text-text-muted" />
          </div>
        )}
        <span
          className={cn(
            'shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider',
            maintenance
              ? 'bg-warning/10 text-warning'
              : enabled
                ? 'bg-primary-muted text-primary'
                : 'bg-surface-raised text-text-subtle',
          )}
        >
          {maintenance ? tm.badgeMaintenance : enabled ? tm.badgeActive : tm.badgeAvailable}
        </span>
      </div>

      <div>
        {enabled && !maintenance && id ? (
          <Link
            href={`/${id}`}
            className="group/name inline-flex items-center gap-1 text-sm font-semibold text-text hover:text-primary transition-colors"
          >
            <span>{name}</span>
            <ArrowUpRight className="h-3.5 w-3.5 text-text-subtle opacity-50 group-hover/name:opacity-100 group-hover/name:text-primary group-hover/name:translate-x-0.5 group-hover/name:-translate-y-0.5 transition-all" />
          </Link>
        ) : (
          <p className="text-sm font-semibold text-text">{name}</p>
        )}
        {description && <p className="mt-1 text-xs text-text-muted line-clamp-2">{description}</p>}
      </div>

      {/* Doppia Flag: 1) Attiva Modulo, 2) Mostra in Panoramica */}
      <div className="mt-auto space-y-2 border-t border-border pt-3">
        {/* Flag 1: Attiva Modulo */}
        <div className="flex items-center justify-between py-1">
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-text">
              {enabled ? tm.statusEnabled : tm.statusDisabled}
            </span>
            <span className="text-[10px] text-text-subtle">
              {enabled ? 'Modulo utilizzabile' : 'Accesso disattivato'}
            </span>
          </div>
          <Switch
            checked={enabled}
            onChange={onToggleEnabled}
            disabled={pending || maintenance}
            aria-label={`Attiva ${name}`}
          />
        </div>

        {/* Flag 2: Mostra in Panoramica (Home) */}
        <div
          className={cn(
            'flex items-center justify-between rounded-xl px-2.5 py-2 transition-all border',
            enabled
              ? 'bg-surface-raised/60 border-border/60'
              : 'opacity-40 bg-surface-raised/20 border-transparent cursor-not-allowed',
          )}
        >
          <div className="flex flex-col">
            <span className="text-xs font-medium text-text">In Panoramica</span>
            <span className="text-[10px] text-text-subtle">
              {enabled
                ? inOverview
                  ? 'Widget visibile in Home'
                  : 'Nascosto dalla Home'
                : 'Richiede modulo attivo'}
            </span>
          </div>
          <Switch
            checked={inOverview && enabled}
            onChange={onToggleOverview}
            disabled={pending || maintenance || !enabled}
            aria-label={`Mostra ${name} in panoramica`}
          />
        </div>
      </div>
    </div>
  )
}
