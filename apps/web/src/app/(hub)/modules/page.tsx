'use client'

import { useState } from 'react'
import { cn } from '@dexhub/ui'
import { useT } from '@/i18n'
import { useVisibleModules, useSetModulePreference } from '@/core/hooks/use-modules'
import { resolveModuleIcon } from '@/core/utils/module-icons'
import { ModuleCatalogCard } from './_components/module-catalog-card'

type Filter = 'all' | 'active' | 'available'

export default function ModulesPage() {
  const t = useT()
  const tm = t.modules
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<Filter>('all')

  const { data: modules } = useVisibleModules()
  const setPreference = useSetModulePreference()

  const catalog = (modules ?? []).map((m) => ({
    id: m.id,
    name: m.name,
    description: m.manifest['description'] as string | undefined,
    icon: resolveModuleIcon(m.manifest['icon'] as string | undefined),
    enabled: m.enabled,
    maintenance: m.maintenance,
  }))

  const total = catalog.length
  const activeCount = catalog.filter((m) => m.enabled && !m.maintenance).length

  const visible = catalog
    .filter((m) => m.name.toLowerCase().includes(search.toLowerCase()))
    .filter((m) =>
      filter === 'all'
        ? true
        : filter === 'active'
          ? m.enabled && !m.maintenance
          : !m.enabled && !m.maintenance,
    )

  return (
    <div className="px-4 py-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mb-1 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-text-subtle">
            {tm.eyebrow}
          </p>
          <h1 className="text-2xl font-bold text-text">{tm.title}</h1>
          <p className="text-sm text-text-muted">{tm.subtitle}</p>
        </div>

        <div className="flex gap-3">
          <div className="rounded-xl border border-border bg-surface px-4 py-3 text-center">
            <p className="text-xl font-bold text-text">{total}</p>
            <p className="text-[10px] uppercase tracking-wider text-text-muted">{tm.statTotal}</p>
          </div>
          <div className="rounded-xl border border-border bg-surface px-4 py-3 text-center">
            <p className="text-xl font-bold text-primary">{activeCount}</p>
            <p className="text-[10px] uppercase tracking-wider text-text-muted">{tm.statActive}</p>
          </div>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={tm.searchPlaceholder}
          className="w-full max-w-xs rounded-md border border-border bg-bg px-3 py-2 text-sm text-text placeholder:text-text-subtle focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <div className="flex gap-1">
          {(['all', 'active', 'available'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                'rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                filter === f ? 'bg-primary-muted text-primary' : 'text-text-muted hover:bg-surface-raised hover:text-text',
              )}
            >
              {f === 'all' ? tm.filterAll : f === 'active' ? tm.filterActive : tm.filterAvailable}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6">
        {visible.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border py-12 text-center text-sm text-text-muted">
            {tm.empty}
          </div>
        ) : (
          <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))' }}>
            {visible.map((m) => (
              <ModuleCatalogCard
                key={m.id}
                id={m.id}
                name={m.name}
                description={m.description}
                icon={m.icon}
                enabled={m.enabled}
                maintenance={m.maintenance}
                pending={setPreference.isPending && setPreference.variables?.moduleId === m.id}
                onToggle={(next) => setPreference.mutate({ moduleId: m.id, enabled: next })}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
