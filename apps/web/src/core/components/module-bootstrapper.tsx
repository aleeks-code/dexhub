'use client'

import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { moduleLoader } from '@/core/runtime'
import { moduleRegistry } from '@/core/registry/module-registry'
import type { ModuleFactory } from '@/core/runtime'

const API = process.env['NEXT_PUBLIC_API_URL'] ?? ''

const MODULE_FACTORIES: ModuleFactory[] = [
  () => import('@dexhub/notes'),
  () => import('@dexhub/tasks'),
  () => import('@dexhub/worklog'),
  () => import('@dexhub/pizza'),
  () => import('@dexhub/debts'),
  () => import('@dexhub/loans'),
  () => import('@dexhub/subscriptions'),
]

async function installInApi(manifest: unknown): Promise<boolean> {
  const res = await fetch(`${API}/api/v1/modules`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ manifest }),
    credentials: 'include',
  })
  return res.status === 201
}

export function ModuleBootstrapper() {
  const queryClient = useQueryClient()
  const bootstrappedRef = useRef(false)

  useEffect(() => {
    if (bootstrappedRef.current) return
    bootstrappedRef.current = true

    async function bootstrap() {
      let anyInstalled = false

      for (const factory of MODULE_FACTORIES) {
        try {
          const { default: mod } = await factory()
          const moduleId = mod.manifest.id
          await moduleLoader.load(factory)

          const entry = moduleRegistry.get(moduleId)
          if (entry) {
            const installed = await installInApi(entry.manifest)
            if (installed) anyInstalled = true
          }
        } catch (err) {
          console.error(`[ModuleBootstrapper] Failed to load module:`, err)
        }
      }

      if (anyInstalled) {
        await queryClient.invalidateQueries({ queryKey: ['modules'] })
      }
    }

    void bootstrap()
  }, [queryClient])

  return null
}
