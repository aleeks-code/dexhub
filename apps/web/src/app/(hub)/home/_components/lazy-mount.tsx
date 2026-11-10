'use client'

import { lazy, Suspense, type ComponentType } from 'react'
import type { WidgetProps } from '@dexhub/sdk'

type WidgetLoader = () => Promise<{ default: unknown }>

// Loader function refs are stable (owned by the frontend module registry singleton) — cache
// the lazy() wrapper per loader so remounts reuse it instead of re-triggering Suspense.
const lazyCache = new Map<WidgetLoader, ComponentType<WidgetProps>>()

function resolveLazy(loader: WidgetLoader): ComponentType<WidgetProps> {
  let Comp = lazyCache.get(loader)
  if (!Comp) {
    Comp = lazy(loader as () => Promise<{ default: ComponentType<WidgetProps> }>)
    lazyCache.set(loader, Comp)
  }
  return Comp
}

export function LazyMount({ component, ...props }: { component: WidgetLoader } & WidgetProps) {
  const Comp = resolveLazy(component)
  return (
    <Suspense fallback={<div className="flex h-full min-h-16 items-center justify-center text-xs text-text-subtle">…</div>}>
      <Comp {...props} />
    </Suspense>
  )
}
