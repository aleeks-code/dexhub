'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

const API = process.env['NEXT_PUBLIC_API_URL'] ?? ''

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const hasBody = init?.body !== undefined
  const res = await fetch(`${API}/api/v1${path}`, {
    credentials: 'include',
    headers: {
      ...(hasBody ? { 'Content-Type': 'application/json' } : {}),
      ...init?.headers,
    },
    ...init,
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error((body as { message?: string })?.message ?? `HTTP ${res.status}`)
  }
  if (res.status === 204) return undefined as T
  const json = (await res.json()) as { data: T }
  return json.data
}

export type ChangelogCategoria = 'feature' | 'improvement' | 'fix' | 'security' | 'breaking'
export type ChangelogVisibilita = 'user' | 'developer' | 'internal'
export type ChangelogStato = 'draft' | 'published'

export interface ChangelogChange {
  id: string
  releaseId: string
  categoria: ChangelogCategoria
  visibilita: ChangelogVisibilita
  modulo: string | null
  titolo: string
  descrizione: string | null
  linkWiki: string | null
  migrationNote: string | null
  ordine: number
  createdAt: string
}

export interface ChangelogRelease {
  id: string
  versione: string
  titolo: string
  descrizione: string | null
  stato: ChangelogStato
  dataPubblicazione: string | null
  createdAt: string
  updatedAt: string
  changes: ChangelogChange[]
}

export function useChangelogReleases() {
  return useQuery<ChangelogRelease[]>({
    queryKey: ['changelog', 'releases'],
    queryFn: () => apiFetch('/changelog/releases'),
  })
}

// 404 → `null` (dato valido, non errore): la pagina distingue "non trovata" da un vero
// fallimento di fetch senza dover ispezionare un messaggio d'errore stringato.
export function useChangelogRelease(versione: string) {
  return useQuery<ChangelogRelease | null>({
    queryKey: ['changelog', 'release', versione],
    queryFn: async () => {
      const res = await fetch(`${API}/api/v1/changelog/releases/version/${versione}`, {
        credentials: 'include',
      })
      if (res.status === 404) return null
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error((body as { message?: string })?.message ?? `HTTP ${res.status}`)
      }
      const json = (await res.json()) as { data: ChangelogRelease }
      return json.data
    },
    enabled: versione.length > 0,
  })
}

export interface CreateReleaseInput {
  versione: string
  titolo: string
  descrizione: string | null
}

export function useCreateRelease() {
  const qc = useQueryClient()
  return useMutation<ChangelogRelease, Error, CreateReleaseInput>({
    mutationFn: (body) => apiFetch('/changelog/releases', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['changelog', 'releases'] })
    },
  })
}

export function useUpdateRelease(id: string) {
  const qc = useQueryClient()
  return useMutation<ChangelogRelease, Error, CreateReleaseInput>({
    mutationFn: (body) =>
      apiFetch(`/changelog/releases/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['changelog', 'releases'] })
    },
  })
}

export interface ChangeInput {
  categoria: ChangelogCategoria
  visibilita: ChangelogVisibilita
  modulo: string | null
  titolo: string
  descrizione: string | null
  linkWiki: string | null
  migrationNote: string | null
  ordine: number
}

// I change sono CRUD immediato (nessun dirty-tracking) — ogni mutazione invalida sia il
// dettaglio release (prefisso, copre qualunque versione in cache) sia la lista (overview/pill
// categorie della card in lista dipendono anch'esse da release.changes).
function invalidateChangelog(qc: ReturnType<typeof useQueryClient>) {
  void qc.invalidateQueries({ queryKey: ['changelog', 'release'] })
  void qc.invalidateQueries({ queryKey: ['changelog', 'releases'] })
}

export function useCreateChange(releaseId: string) {
  const qc = useQueryClient()
  return useMutation<ChangelogChange, Error, ChangeInput>({
    mutationFn: (body) =>
      apiFetch(`/changelog/releases/${releaseId}/changes`, { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => invalidateChangelog(qc),
  })
}

export function useUpdateChange() {
  const qc = useQueryClient()
  return useMutation<ChangelogChange, Error, ChangeInput & { changeId: string }>({
    mutationFn: ({ changeId, ...body }) =>
      apiFetch(`/changelog/changes/${changeId}`, { method: 'PUT', body: JSON.stringify(body) }),
    onSuccess: () => invalidateChangelog(qc),
  })
}

export function useDeleteChange() {
  const qc = useQueryClient()
  return useMutation<void, Error, string>({
    mutationFn: (changeId) => apiFetch(`/changelog/changes/${changeId}`, { method: 'DELETE' }),
    onSuccess: () => invalidateChangelog(qc),
  })
}

// Nota: la risposta di /publish non annida changes[] (stesso bug già corretto su updateRelease
// in una sessione precedente, qui non toccato — backend fuori scope per questo diff). Innocuo
// qui: invalidiamo e lasciamo che il refetch di getReleaseByVersion (che annida correttamente)
// ripopoli la cache, non scriviamo mai la risposta grezza della mutation in cache.
export function usePublishRelease(id: string) {
  const qc = useQueryClient()
  return useMutation<ChangelogRelease, Error, void>({
    mutationFn: () => apiFetch(`/changelog/releases/${id}/publish`, { method: 'POST' }),
    onSuccess: () => invalidateChangelog(qc),
  })
}

export function useDeleteRelease(id: string) {
  const qc = useQueryClient()
  return useMutation<void, Error, void>({
    mutationFn: () => apiFetch(`/changelog/releases/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['changelog', 'releases'] })
    },
  })
}
