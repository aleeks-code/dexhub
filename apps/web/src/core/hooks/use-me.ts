'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

const API = process.env['NEXT_PUBLIC_API_URL'] ?? ''

export interface Me {
  id: string
  name: string
  email: string
  image?: string | null
  isAdmin: boolean
  isActive: boolean
  lastLoginAt?: string | null
  createdAt: string
  updatedAt: string
}

export function useMe() {
  return useQuery<Me | null>({
    queryKey: ['me'],
    queryFn: async () => {
      const res = await fetch(`${API}/api/v1/users/me`, { credentials: 'include' })
      if (!res.ok) return null
      const json = (await res.json()) as { data: Me }
      return json.data
    },
  })
}

export function useUpdateMe() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: { name?: string; image?: string | null }) => {
      const res = await fetch(`${API}/api/v1/users/me`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        credentials: 'include',
      })
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { message?: string }
        throw new Error(data.message ?? 'Update failed')
      }
      return ((await res.json()) as { data: Me }).data
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['me'] })
    },
  })
}
