'use client'

import React, { Suspense, useEffect, useState } from 'react'
import { CORE_EVENTS } from '@dexhub/sdk'
import { coreEventBus } from '@/core/runtime'
import { moduleRegistry } from '@/core/registry/module-registry'
import { ModuleErrorBoundary } from '@/core/components/module-error-boundary'
import { useModuleMaintenance } from '@/core/hooks/use-modules'
import { useT } from '@/i18n'

const lazyCache = new Map<string, React.LazyExoticComponent<React.ComponentType>>()

function getLazy(
  key: string,
  factory: () => Promise<{ default: unknown }>,
): React.LazyExoticComponent<React.ComponentType> {
  const hit = lazyCache.get(key)
  if (hit) return hit
  const lazy = React.lazy(async () => {
    const mod = await factory()
    return { default: mod.default as React.ComponentType }
  })
  lazyCache.set(key, lazy)
  return lazy
}

export function ModuleRenderer({ moduleId, path }: { moduleId: string; path: string }) {
  const [, forceUpdate] = useState(0)
  const { maintenance, isLoading: maintenanceLoading } = useModuleMaintenance(moduleId)
  const t = useT()

  useEffect(() => {
    return coreEventBus.on(CORE_EVENTS.MODULE_REGISTERED, ({ moduleId: id }) => {
      if (id === moduleId) forceUpdate((n) => n + 1)
    })
  }, [moduleId])

  // Il contenuto operativo è opt-in: monta SOLO dopo conferma maintenance===false.
  // Nessun flash del modulo funzionante durante il caricamento delle query.
  if (maintenanceLoading) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-text-muted">
        Loading module…
      </div>
    )
  }

  if (maintenance) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-warning">
        {t.moduleRenderer.maintenance}
      </div>
    )
  }

  const entry = moduleRegistry.get(moduleId)

  if (!entry) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-text-muted">
        Loading module…
      </div>
    )
  }

  const route =
    entry.manifest.routes.find((r) => {
      if (r.path === path) return true
      if (r.path !== '/' && path.startsWith(r.path + '/')) return true
      return false
    }) ?? entry.manifest.routes[0]

  if (!route) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-text-muted">
        Route not found: {path}
      </div>
    )
  }

  const LazyComponent = getLazy(`${moduleId}::${route.path}`, route.component)

  return (
    <ModuleErrorBoundary moduleId={moduleId}>
      <Suspense
        fallback={
          <div className="flex h-48 items-center justify-center text-sm text-text-muted">
            Loading…
          </div>
        }
      >
        <LazyComponent />
      </Suspense>
    </ModuleErrorBoundary>
  )
}
