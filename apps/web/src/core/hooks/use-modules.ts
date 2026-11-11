'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

const API = process.env['NEXT_PUBLIC_API_URL'] ?? ''

export interface ApiModule {
  id: string
  name: string
  version: string
  status: 'active' | 'disabled' | 'error' | 'incompatible'
  manifest: Record<string, unknown>
  installedAt: string
  updatedAt: string
}

export interface ModulePreference {
  moduleId: string
  enabled: boolean
  inOverview: boolean
}

async function fetchModules(): Promise<ApiModule[]> {
  const res = await fetch(`${API}/api/v1/modules`, { credentials: 'include' })
  if (!res.ok) return []
  const json = (await res.json()) as { data: ApiModule[] }
  return json.data
}

async function fetchMyModulePreferences(): Promise<ModulePreference[]> {
  const res = await fetch(`${API}/api/v1/me/modules`, { credentials: 'include' })
  if (!res.ok) return []
  const json = (await res.json()) as { data: ModulePreference[] }
  return json.data
}

export function useModules() {
  return useQuery<ApiModule[]>({
    queryKey: ['modules'],
    queryFn: fetchModules,
    refetchOnWindowFocus: true,
    staleTime: 0,
  })
}

export function useMyModulePreferences() {
  return useQuery<ModulePreference[]>({
    queryKey: ['me', 'modules'],
    queryFn: fetchMyModulePreferences,
  })
}

export function useSetModulePreference() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      moduleId,
      enabled,
      inOverview,
    }: {
      moduleId: string
      enabled?: boolean
      inOverview?: boolean
    }) => {
      const res = await fetch(`${API}/api/v1/me/modules/${moduleId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled, inOverview }),
        credentials: 'include',
      })
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { message?: string }
        throw new Error(data.message ?? 'Update failed')
      }
      return ((await res.json()) as { data: ModulePreference }).data
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['me', 'modules'] })
    },
  })
}

export function useSetModuleStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, action }: { id: string; action: 'enable' | 'disable' }) => {
      const res = await fetch(`${API}/api/v1/modules/${id}/${action}`, {
        method: 'POST',
        credentials: 'include',
      })
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { message?: string }
        throw new Error(data.message ?? 'Update failed')
      }
      return ((await res.json()) as { data: ApiModule }).data
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['modules'] })
    },
  })
}

export interface VisibleModule extends ApiModule {
  maintenance: boolean
  enabled: boolean
  inOverview: boolean
}

/**
 * Fonte neutra: tutti i moduli reali con flag maintenance/enabled/inOverview.
 * NON applica regole di visibilità — ogni superficie filtra secondo le proprie regole.
 */
export function useVisibleModules() {
  const { data: modules, isLoading: modulesLoading, ...modulesRest } = useModules()
  const { data: preferences, isLoading: preferencesLoading, ...preferencesRest } = useMyModulePreferences()

  const prefMap = new Map((preferences ?? []).map((p) => [p.moduleId, p]))

  const data: VisibleModule[] = (modules ?? []).map((m) => {
    const pref = prefMap.get(m.id)
    const enabled = pref ? pref.enabled : false
    const inOverview = pref ? (pref.inOverview && enabled) : false
    return {
      ...m,
      maintenance: m.status !== 'active',
      enabled,
      inOverview,
    }
  })

  return {
    ...modulesRest,
    data,
    isLoading: modulesLoading || preferencesLoading,
    isError: modulesRest.isError || preferencesRest.isError,
    error: modulesRest.error ?? preferencesRest.error,
  }
}

/**
 * Risolve moduleId → stato manutenzione dalla fonte neutra useVisibleModules.
 */
export function useModuleMaintenance(moduleId: string): { maintenance: boolean; isLoading: boolean } {
  const { data: modules, isLoading } = useVisibleModules()
  const mod = (modules ?? []).find((m) => m.id === moduleId)
  return { maintenance: mod?.maintenance ?? false, isLoading }
}

/**
 * Modulo attivo = status globale 'active' AND preferenza utente enabled === true.
 * Nessuna preferenza per un modulo = disattivato di default (opt-in esplicito).
 */
export function useActiveModules() {
  const { data: modules, isLoading: modulesLoading, ...modulesRest } = useModules()
  const { data: preferences, isLoading: preferencesLoading, ...preferencesRest } = useMyModulePreferences()

  const enabledIds = new Set((preferences ?? []).filter((p) => p.enabled).map((p) => p.moduleId))
  const data = (modules ?? []).filter((m) => m.status === 'active' && enabledIds.has(m.id))

  return {
    ...modulesRest,
    data,
    isLoading: modulesLoading || preferencesLoading,
    isError: modulesRest.isError || preferencesRest.isError,
    error: modulesRest.error ?? preferencesRest.error,
  }
}

/**
 * Moduli per la Panoramica (Home):
 * Modulo globale 'active' AND enabled === true AND inOverview === true.
 */
export function useOverviewModules() {
  const { data: modules, isLoading: modulesLoading, ...modulesRest } = useModules()
  const { data: preferences, isLoading: preferencesLoading, ...preferencesRest } = useMyModulePreferences()

  const overviewIds = new Set(
    (preferences ?? []).filter((p) => p.enabled && p.inOverview).map((p) => p.moduleId),
  )
  const data = (modules ?? []).filter((m) => m.status === 'active' && overviewIds.has(m.id))

  return {
    ...modulesRest,
    data,
    isLoading: modulesLoading || preferencesLoading,
    isError: modulesRest.isError || preferencesRest.isError,
    error: modulesRest.error ?? preferencesRest.error,
  }
}
