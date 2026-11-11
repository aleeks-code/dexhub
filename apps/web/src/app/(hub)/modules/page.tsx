'use client'

import { useState } from 'react'
import { cn } from '@dexhub/ui'
import { useT } from '@/i18n'
import { useVisibleModules, useSetModulePreference } from '@/core/hooks/use-modules'
import { resolveModuleIcon } from '@/core/utils/module-icons'
import { ModuleCatalogCard } from './_components/module-catalog-card'

type Filter = 'all' | 'active' | 'overview' | 'available'

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
    inOverview: m.inOverview,
    maintenance: m.maintenance,
  }))

  const total = catalog.length
  const activeCount = catalog.filter((m) => m.enabled && !m.maintenance).length
  const overviewCount = catalog.filter((m) => m.enabled && m.inOverview && !m.maintenance).length

  const visible = catalog
    .filter((m) => m.name.toLowerCase().includes(search.toLowerCase()))
    .filter((m) => {
      if (filter === 'all') return true
      if (filter === 'active') return m.enabled && !m.maintenance
      if (filter === 'overview') return m.enabled && m.inOverview && !m.maintenance
      return !m.enabled && !m.maintenance
    })

  return (
    <div className="px-4 py-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mb-1 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-text-subtle">
            {tm.eyebrow}
          </p>
          <h1 className="text-2xl font-bold text-text">{tm.title}</h1>
          <p className="mt-1 text-sm text-text-muted">
            Personalizza la tua esperienza: attiva i moduli che utilizzi e scegli quali mostrare nella Panoramica (Home).
          </p>
        </div>

        <div className="flex gap-2.5">
          <div className="rounded-2xl border border-border bg-surface px-4 py-2.5 text-center min-w-[76px]">
            <p className="text-xl font-bold text-text">{total}</p>
            <p className="text-[10px] uppercase tracking-wider text-text-muted">{tm.statTotal}</p>
          </div>
          <div className="rounded-2xl border border-border bg-surface px-4 py-2.5 text-center min-w-[76px]">
            <p className="text-xl font-bold text-primary">{activeCount}</p>
            <p className="text-[10px] uppercase tracking-wider text-text-muted">{tm.statActive}</p>
          </div>
          <div className="rounded-2xl border border-border bg-surface px-4 py-2.5 text-center min-w-[76px]">
            <p className="text-xl font-bold text-emerald-400">{overviewCount}</p>
            <p className="text-[10px] uppercase tracking-wider text-text-muted">In Panoramica</p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={tm.searchPlaceholder}
          className="w-full max-w-xs rounded-xl border border-border bg-bg px-3.5 py-2 text-sm text-text placeholder:text-text-subtle focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <div className="flex gap-1.5 flex-wrap">
          {(
            [
              { id: 'all', label: tm.filterAll },
              { id: 'active', label: `${tm.filterActive} (${activeCount})` },
              { id: 'overview', label: `In Panoramica (${overviewCount})` },
              { id: 'available', label: tm.filterAvailable },
            ] as const
          ).map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={cn(
                'rounded-xl px-3 py-1.5 text-xs font-medium transition-colors',
                filter === f.id
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'bg-surface border border-border text-text-muted hover:bg-surface-raised hover:text-text',
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        {visible.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border py-16 text-center text-sm text-text-muted bg-surface/30">
            {tm.empty}
          </div>
        ) : (
          <div
            className="grid gap-4"
            style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}
          >
            {visible.map((m) => (
              <ModuleCatalogCard
                key={m.id}
                id={m.id}
                name={m.name}
                description={m.description}
                icon={m.icon}
                enabled={m.enabled}
                inOverview={m.inOverview}
                maintenance={m.maintenance}
                pending={setPreference.isPending && setPreference.variables?.moduleId === m.id}
                onToggleEnabled={(next) =>
                  setPreference.mutate({
                    moduleId: m.id,
                    enabled: next,
                    inOverview: next ? true : false,
                  })
                }
                onToggleOverview={(next) =>
                  setPreference.mutate({
                    moduleId: m.id,
                    inOverview: next,
                  })
                }
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
