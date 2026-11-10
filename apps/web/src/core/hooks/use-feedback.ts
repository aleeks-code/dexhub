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
    throw new Error((body as { message?: string })?.message ?? `HTTP ${res.status}`)
  }
  const json = (await res.json()) as { data: T }
  return json.data
}

export type FeedbackType = 'bug' | 'feature'
export type FeedbackStatus = 'open' | 'in_progress' | 'closed'

export interface FeedbackItem {
  id: string
  userId: string
  type: FeedbackType
  title: string
  message: string
  status: FeedbackStatus
  createdAt: string
  updatedAt: string
}

export interface AdminFeedbackItem extends FeedbackItem {
  userEmail: string | null
  userName: string | null
}

export interface FeedbackCounts {
  totalBugs: number
  totalFeatures: number
}

export function useMyTickets() {
  return useQuery<FeedbackItem[]>({
    queryKey: ['feedback', 'mine'],
    queryFn: () => apiFetch('/feedback/mine'),
  })
}

export function useFeedbackCounts() {
  const { data: me } = useMe()
  return useQuery<FeedbackCounts>({
    queryKey: ['feedback', 'admin', 'count'],
    queryFn: () => apiFetch('/feedback/admin/count'),
    staleTime: 60_000,
    retry: 1,
    enabled: !!me?.isAdmin,
  })
}

export function useAdminFeedback(type: FeedbackType) {
  const { data: me } = useMe()
  return useQuery<AdminFeedbackItem[]>({
    queryKey: ['feedback', 'admin', type],
    queryFn: () => apiFetch(`/feedback/admin?type=${type}`),
    retry: 1,
    enabled: !!me?.isAdmin,
  })
}

export function useSubmitFeedback() {
  const qc = useQueryClient()
  return useMutation<FeedbackItem, Error, { type: FeedbackType; title: string; message: string }>({
    mutationFn: (body) =>
      apiFetch('/feedback', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: (data) => {
      void qc.invalidateQueries({ queryKey: ['feedback', 'mine'] })
      void qc.invalidateQueries({ queryKey: ['feedback', 'admin', data.type] })
      void qc.invalidateQueries({ queryKey: ['feedback', 'admin', 'count'] })
    },
  })
}

export function useUpdateFeedbackStatus() {
  const qc = useQueryClient()
  return useMutation<FeedbackItem, Error, { id: string; status: FeedbackStatus }>({
    mutationFn: ({ id, status }) =>
      apiFetch(`/feedback/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['feedback', 'admin'] })
      void qc.invalidateQueries({ queryKey: ['feedback', 'mine'] })
      void qc.invalidateQueries({ queryKey: ['feedback', 'admin', 'count'] })
    },
  })
}

export function useDeleteFeedback() {
  const qc = useQueryClient()
  return useMutation<void, Error, string>({
    mutationFn: (id) => apiFetch(`/feedback/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['feedback', 'admin'] })
      void qc.invalidateQueries({ queryKey: ['feedback', 'admin', 'count'] })
    },
  })
}
