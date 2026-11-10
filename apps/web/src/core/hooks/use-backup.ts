'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

const API = process.env['NEXT_PUBLIC_API_URL'] ?? ''

export interface BackupJob {
  id: string
  filename: string
  sizeBytes: number | null
  checksum: string | null
  encrypted: boolean
  type: 'daily' | 'weekly' | 'monthly' | 'manual'
  status: 'pending' | 'completed' | 'failed'
  createdAt: string
  completedAt: string | null
  error: string | null
}

async function fetchBackups(): Promise<BackupJob[]> {
  const res = await fetch(`${API}/api/v1/backup`, { credentials: 'include' })
  if (!res.ok) throw new Error('Failed to fetch backups')
  const json = (await res.json()) as { data: BackupJob[] }
  return json.data
}

async function triggerCreate(): Promise<BackupJob> {
  const res = await fetch(`${API}/api/v1/backup`, { method: 'POST', credentials: 'include' })
  if (!res.ok) throw new Error('Failed to create backup')
  const json = (await res.json()) as { data: BackupJob }
  return json.data
}

async function triggerDelete(id: string): Promise<void> {
  await fetch(`${API}/api/v1/backup/${id}`, { method: 'DELETE', credentials: 'include' })
}

async function triggerDownload(id: string, filename: string): Promise<void> {
  const res = await fetch(`${API}/api/v1/backup/${id}/download`, { credentials: 'include' })
  if (!res.ok) throw new Error('Download failed')
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

async function triggerRestore(content: string): Promise<void> {
  const res = await fetch(`${API}/api/v1/backup/restore`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
    credentials: 'include',
  })
  if (!res.ok) {
    const json = (await res.json().catch(() => ({}))) as { message?: string }
    throw new Error(json.message ?? 'Restore failed')
  }
}

export function useBackups() {
  return useQuery({ queryKey: ['backups'], queryFn: fetchBackups, staleTime: 30_000 })
}

export function useCreateBackup() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: triggerCreate,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['backups'] }),
  })
}

export function useDeleteBackup() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: triggerDelete,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['backups'] }),
  })
}

export function useDownloadBackup() {
  return useMutation({
    mutationFn: ({ id, filename }: { id: string; filename: string }) =>
      triggerDownload(id, filename),
  })
}

export function useRestoreBackup() {
  return useMutation({ mutationFn: triggerRestore })
}
