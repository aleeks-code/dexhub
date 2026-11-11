'use client'

import React, { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { ShieldAlert } from 'lucide-react'
import { CORE_EVENTS } from '@dexhub/sdk'
import { coreEventBus } from '@/core/runtime'
import { moduleRegistry } from '@/core/registry/module-registry'
import { ModuleErrorBoundary } from '@/core/components/module-error-boundary'
import { useVisibleModules } from '@/core/hooks/use-modules'
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
  const { data: modules, isLoading: modulesLoading } = useVisibleModules()
  const t = useT()

  useEffect(() => {
    return coreEventBus.on(CORE_EVENTS.MODULE_REGISTERED, ({ moduleId: id }) => {
      if (id === moduleId) forceUpdate((n) => n + 1)
    })
  }, [moduleId])

  if (modulesLoading) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-text-muted">
        Caricamento modulo…
      </div>
    )
  }

  const currentMod = (modules ?? []).find((m) => m.id === moduleId)

  // Se il modulo è in manutenzione a livello di sistema
  if (currentMod?.maintenance) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-warning">
        {t.moduleRenderer.maintenance}
      </div>
    )
  }

  // Se il modulo non è attivo per l'utente, blocca l'accesso
  if (!currentMod || !currentMod.enabled) {
    return (
      <div className="mx-auto max-w-lg mt-16 p-8 rounded-2xl border border-border bg-surface text-center shadow-lg space-y-4">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
          <ShieldAlert className="h-7 w-7" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-text">Modulo non attivo</h2>
          <p className="mt-1.5 text-sm text-text-muted leading-relaxed">
            Il modulo <strong className="text-text">{currentMod?.name || moduleId}</strong> non è attivo per il tuo account.
            Puoi attivarlo in qualsiasi momento dal Catalogo Moduli per iniziare a utilizzarlo.
          </p>
        </div>
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/modules"
            className="w-full sm:w-auto rounded-xl bg-primary px-5 py-2.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Vai al Catalogo Moduli
          </Link>
          <Link
            href="/home"
            className="w-full sm:w-auto rounded-xl border border-border bg-surface-raised px-5 py-2.5 text-xs font-medium text-text-muted hover:text-text transition-colors"
          >
            Torna alla Panoramica
          </Link>
        </div>
      </div>
    )
  }

  const entry = moduleRegistry.get(moduleId)

  if (!entry) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-text-muted">
        Inizializzazione modulo in corso…
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
      <div className="flex h-64 items-center justify-center text-sm text-text-muted">
        Percorso non trovato: {path}
      </div>
    )
  }

  const LazyComponent = getLazy(`${moduleId}::${route.path}`, route.component)

  return (
    <ModuleErrorBoundary moduleId={moduleId}>
      <Suspense
        fallback={
          <div className="flex h-64 items-center justify-center text-sm text-text-muted">
            Caricamento interfaccia…
          </div>
        }
      >
        <LazyComponent />
      </Suspense>
    </ModuleErrorBoundary>
  )
}
