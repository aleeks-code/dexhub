'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMe } from './use-me'

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
    throw new Error(body?.message ?? `HTTP ${res.status}`)
  }
  const json = await res.json()
  return json.data as T
}

export interface AdminUser {
  id: string
  name: string
  email: string
  isAdmin: boolean
  isActive: boolean
  lastLoginAt: string | null
  passkeyCount: number
}

export interface AdminPasskey {
  id: string
  name: string
  createdAt: string
  deviceType: string
}

export function useAdminUsers() {
  const { data: me } = useMe()
  return useQuery<AdminUser[]>({
    queryKey: ['admin', 'users'],
    queryFn: () => apiFetch('/admin/users'),
    enabled: !!me?.isAdmin,
  })
}

export function useAdminUserPasskeys(userId: string) {
  return useQuery<AdminPasskey[]>({
    queryKey: ['admin', 'users', userId, 'passkeys'],
    queryFn: () => apiFetch(`/admin/users/${userId}/passkeys`),
    enabled: !!userId,
  })
}

export function useDeleteUserPasskey() {
  const qc = useQueryClient()
  return useMutation<null, Error, { userId: string; passkeyId: string }>({
    mutationFn: ({ userId, passkeyId }) =>
      apiFetch(`/admin/users/${userId}/passkeys/${passkeyId}`, { method: 'DELETE' }),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['admin', 'users', vars.userId, 'passkeys'] })
      qc.invalidateQueries({ queryKey: ['admin', 'users'] })
    },
  })
}

export function useAdminSecuritySettings() {
  const { data: me } = useMe()
  return useQuery<{ allowNonAdminLogins: boolean }>({
    queryKey: ['admin', 'security'],
    queryFn: () => apiFetch('/admin/security'),
    enabled: !!me?.isAdmin,
  })
}

export function useInviteUser() {
  const qc = useQueryClient()
  return useMutation<{ token: string }, Error, { email?: string }>({
    mutationFn: (body) =>
      apiFetch('/admin/users/invite', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'users'] }),
  })
}

export function useSetUserStatus() {
  const qc = useQueryClient()
  return useMutation<null, Error, { id: string; isActive: boolean }>({
    mutationFn: ({ id, isActive }) =>
      apiFetch(`/admin/users/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'users'] }),
  })
}

export function useDeleteUser() {
  const qc = useQueryClient()
  return useMutation<null, Error, string>({
    mutationFn: (id) => apiFetch(`/admin/users/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'users'] }),
  })
}

export function useRegenerateRecoveryCodes() {
  return useMutation<{ code: string }, Error, string>({
    mutationFn: (id) => apiFetch(`/admin/users/${id}/recovery-codes`, { method: 'POST' }),
  })
}

export function useGetRecoveryCode(userId: string, enabled: boolean) {
  return useQuery<{ code: string | null }>({
    queryKey: ['admin', 'users', userId, 'recovery-code'],
    queryFn: () => apiFetch(`/admin/users/${userId}/recovery-code`),
    enabled,
    staleTime: 0,
    gcTime: 0,
  })
}

export function useLogRecoveryCodeCopy() {
  return useMutation<null, Error, string>({
    mutationFn: (id) =>
      apiFetch(`/admin/users/${id}/recovery-code/copy-event`, { method: 'POST' }),
  })
}

export interface InviteRequestItem {
  id: string
  email: string
  phone: string | null
  status: 'pending' | 'invited' | 'dismissed'
  createdAt: string
  deletedAt: string | null
}

export function useInviteRequests() {
  const { data: me } = useMe()
  return useQuery<InviteRequestItem[]>({
    queryKey: ['admin', 'invite-requests'],
    queryFn: () => apiFetch('/invite-requests'),
    enabled: !!me?.isAdmin,
  })
}

export function useUpdateInviteRequestStatus() {
  const qc = useQueryClient()
  return useMutation<{ id: string; status: string }, Error, { id: string; status: 'pending' | 'invited' | 'dismissed' }>({
    mutationFn: ({ id, status }) =>
      apiFetch(`/invite-requests/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'invite-requests'] }),
  })
}

export function useDeleteInviteRequest() {
  const qc = useQueryClient()
  return useMutation<null, Error, string>({
    mutationFn: (id) => apiFetch(`/invite-requests/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'invite-requests'] }),
  })
}

export function useUpdateSecuritySettings() {
  const qc = useQueryClient()
  return useMutation<{ allowNonAdminLogins: boolean }, Error, { allowNonAdminLogins: boolean }>({
    mutationFn: (body) =>
      apiFetch('/admin/security', { method: 'PATCH', body: JSON.stringify(body) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'security'] }),
  })
}

export interface SystemStats {
  uptimeSeconds: number
  nodeVersion: string
  platform: string
  arch: string
  environment: string
  memory: {
    heapUsedMb: number
    heapTotalMb: number
    rssMb: number
    heapUsagePercent: number
  }
  database: {
    latencyMs: number
    activeConnections: number
    sizeMb: number
    sizeBytes: number
    version: string
  }
  counts: {
    users: number
    activeSessions: number
    tasks: number
    worklogEntries: number
    auditLogs: number
    cacheEntries: number
  }
}

export interface SystemLogEntry {
  id: string
  timestamp: string
  level: 'info' | 'warn' | 'error' | 'debug' | 'verbose' | 'fatal'
  context: string
  message: string
  trace?: string
}

export interface AuditLogItem {
  id: string
  timestamp: string
  category: 'AUTH' | 'DATA' | 'PERMISSION' | 'MODULE' | 'ADMIN' | 'SECURITY'
  action: string
  severity: 'info' | 'warning' | 'critical'
  outcome: 'success' | 'failure'
  actorId?: string | null
  actorType: 'user' | 'system' | 'module'
  actorIp?: string | null
  actorUserAgent?: string | null
  targetType?: string | null
  targetId?: string | null
  targetModule?: string | null
  metadata?: Record<string, unknown> | null
  sessionId?: string | null
}

export interface AuditLogsResponse {
  items: AuditLogItem[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface AuditSummary {
  total: number
  last24h: number
  critical: number
  warning: number
  failures: number
}

export interface AdminSessionItem {
  id: string
  createdAt: string
  expiresAt: string
  ipAddress: string | null
  userAgent: string | null
  userId: string
  userName: string | null
  userEmail: string | null
  userIsAdmin: boolean | null
  isExpired: boolean
}

export interface TableStatItem {
  tableName: string
  sizeBytes: number
  sizeFormatted: string
  rowCount: number
}

export interface BroadcastBannerConfig {
  enabled: boolean
  message: string
  type: 'info' | 'warning' | 'alert' | 'success'
  dismissible: boolean
  updatedAt?: string
}

export function useSystemStats() {
  const { data: me } = useMe()
  return useQuery<SystemStats>({
    queryKey: ['admin', 'system', 'stats'],
    queryFn: () => apiFetch('/admin/system/stats'),
    enabled: !!me?.isAdmin,
    refetchInterval: 15_000,
  })
}

export function usePingDb() {
  return useMutation<{ latencyMs: number; timestamp: string }, Error>({
    mutationFn: () => apiFetch('/admin/system/ping-db', { method: 'POST' }),
  })
}

export function usePurgeCache() {
  const qc = useQueryClient()
  return useMutation<{ success: boolean; timestamp: string }, Error>({
    mutationFn: () => apiFetch('/admin/system/purge-cache', { method: 'POST' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'system'] })
    },
  })
}

export function useOptimizeDb() {
  const qc = useQueryClient()
  return useMutation<{ success: boolean; timestamp: string }, Error>({
    mutationFn: () => apiFetch('/admin/system/optimize-db', { method: 'POST' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'system'] })
    },
  })
}

export function useSystemLogs(level?: string, search?: string) {
  const { data: me } = useMe()
  const params = new URLSearchParams()
  if (level && level !== 'all') params.set('level', level)
  if (search && search.trim()) params.set('search', search.trim())
  const qs = params.toString() ? `?${params.toString()}` : ''

  return useQuery<SystemLogEntry[]>({
    queryKey: ['admin', 'system', 'logs', level, search],
    queryFn: () => apiFetch(`/admin/system/logs${qs}`),
    enabled: !!me?.isAdmin,
    refetchInterval: 4_000,
  })
}

export function useClearSystemLogs() {
  const qc = useQueryClient()
  return useMutation<{ success: boolean }, Error>({
    mutationFn: () => apiFetch('/admin/system/logs/clear', { method: 'POST' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'system', 'logs'] })
    },
  })
}

export function useAdminAuditLogs(params: {
  page?: number
  limit?: number
  category?: string
  severity?: string
  outcome?: string
  search?: string
}) {
  const { data: me } = useMe()
  const qs = new URLSearchParams()
  if (params.page) qs.set('page', String(params.page))
  if (params.limit) qs.set('limit', String(params.limit))
  if (params.category && params.category !== 'all') qs.set('category', params.category)
  if (params.severity && params.severity !== 'all') qs.set('severity', params.severity)
  if (params.outcome && params.outcome !== 'all') qs.set('outcome', params.outcome)
  if (params.search && params.search.trim()) qs.set('search', params.search.trim())

  const url = `/admin/audit-logs?${qs.toString()}`

  return useQuery<AuditLogsResponse>({
    queryKey: ['admin', 'audit-logs', params],
    queryFn: () => apiFetch(url),
    enabled: !!me?.isAdmin,
  })
}

export function useAdminAuditSummary() {
  const { data: me } = useMe()
  return useQuery<AuditSummary>({
    queryKey: ['admin', 'audit-logs', 'summary'],
    queryFn: () => apiFetch('/admin/audit-logs/summary'),
    enabled: !!me?.isAdmin,
  })
}

export function useAdminSessions() {
  const { data: me } = useMe()
  return useQuery<AdminSessionItem[]>({
    queryKey: ['admin', 'maintenance', 'sessions'],
    queryFn: () => apiFetch('/admin/maintenance/sessions'),
    enabled: !!me?.isAdmin,
  })
}

export function useRevokeSession() {
  const qc = useQueryClient()
  return useMutation<{ success: boolean }, Error, string>({
    mutationFn: (id) => apiFetch(`/admin/maintenance/sessions/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'maintenance', 'sessions'] })
    },
  })
}

export function useCleanupExpiredSessions() {
  const qc = useQueryClient()
  return useMutation<{ cleanedCount: number }, Error>({
    mutationFn: () => apiFetch('/admin/maintenance/cleanup-sessions', { method: 'POST' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'maintenance', 'sessions'] })
      qc.invalidateQueries({ queryKey: ['admin', 'system', 'stats'] })
    },
  })
}

export function useAdminTableStats() {
  const { data: me } = useMe()
  return useQuery<TableStatItem[]>({
    queryKey: ['admin', 'maintenance', 'tables'],
    queryFn: () => apiFetch('/admin/maintenance/tables'),
    enabled: !!me?.isAdmin,
  })
}

export function useVacuumAnalyze() {
  const qc = useQueryClient()
  return useMutation<{ success: boolean; timestamp: string }, Error>({
    mutationFn: () => apiFetch('/admin/maintenance/vacuum', { method: 'POST' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'maintenance', 'tables'] })
      qc.invalidateQueries({ queryKey: ['admin', 'system', 'stats'] })
    },
  })
}

export function useBroadcastConfig() {
  const { data: me } = useMe()
  return useQuery<BroadcastBannerConfig>({
    queryKey: ['admin', 'broadcast'],
    queryFn: () => apiFetch('/admin/broadcast'),
    enabled: !!me?.isAdmin,
  })
}

export function useUpdateBroadcastConfig() {
  const qc = useQueryClient()
  return useMutation<BroadcastBannerConfig, Error, BroadcastBannerConfig>({
    mutationFn: (body) =>
      apiFetch('/admin/broadcast', { method: 'PUT', body: JSON.stringify(body) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'broadcast'] })
      qc.invalidateQueries({ queryKey: ['broadcast'] })
    },
  })
}

export function useActiveBroadcast() {
  return useQuery<BroadcastBannerConfig | null>({
    queryKey: ['broadcast'],
    queryFn: () => apiFetch('/broadcast'),
    staleTime: 30_000,
    refetchInterval: 60_000,
  })
}
