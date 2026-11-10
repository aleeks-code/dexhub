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
  maintenance: boolean
  pending: boolean
  onToggle: (next: boolean) => void
}

export function ModuleCatalogCard({ id, name, description, icon: Icon, enabled, maintenance, pending, onToggle }: ModuleCatalogCardProps) {
  const t = useT()
  const tm = t.modules

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4">
      <div className="flex items-start justify-between gap-2">
        {enabled && !maintenance && id ? (
          <Link
            href={`/${id}`}
            aria-label={name}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-raised text-text-muted hover:bg-primary-muted hover:text-primary transition-colors"
          >
            <Icon className="h-4 w-4" />
          </Link>
        ) : (
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-raised">
            <Icon className="h-4 w-4 text-text-muted" />
          </div>
        )}
        <span
          className={cn(
            'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider',
            maintenance ? 'bg-warning/10 text-warning' : enabled ? 'bg-primary-muted text-primary' : 'bg-surface-raised text-text-muted',
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
        {description && <p className="mt-1 text-xs text-text-muted">{description}</p>}
      </div>

      <div className="mt-auto flex items-center justify-between border-t border-border pt-3">
        <span className="text-xs text-text-muted">{enabled ? tm.statusEnabled : tm.statusDisabled}</span>
        <Switch
          checked={enabled}
          onChange={onToggle}
          disabled={pending || maintenance}
          aria-label={name}
        />
      </div>
    </div>
  )
}
