'use client'

import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { startRegistration } from '@simplewebauthn/browser'
import { authClient, type Session } from '@/lib/auth-client'

const API = process.env['NEXT_PUBLIC_API_URL'] ?? ''

export interface MyPasskey {
  id: string
  name: string | null
  deviceType: string
  createdAt: string
}

const MY_PASSKEYS_KEY = ['auth', 'passkeys']

export function useMyPasskeys() {
  return useQuery<MyPasskey[]>({
    queryKey: MY_PASSKEYS_KEY,
    queryFn: async () => {
      const res = await fetch(`${API}/api/v1/auth/passkey/manage`, { credentials: 'include' })
      if (!res.ok) throw new Error('Failed to load passkeys')
      const json = (await res.json()) as { data: MyPasskey[] }
      return json.data
    },
  })
}

export function useDeletePasskey() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`${API}/api/v1/auth/passkey/manage/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { message?: string }
        throw new Error(body.message ?? 'Failed to delete passkey')
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: MY_PASSKEYS_KEY }),
  })
}

interface AuthState {
  session: Session | null
  isLoading: boolean
}

export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>({ session: null, isLoading: true })

  useEffect(() => {
    authClient.getSession().then((result: { data?: Session | null }) => {
      setState({
        session: result.data ?? null,
        isLoading: false,
      })
    })
  }, [])

  return state
}

export function useRegisterPasskey() {
  const qc = useQueryClient()
  return useMutation({
    onSuccess: () => qc.invalidateQueries({ queryKey: MY_PASSKEYS_KEY }),
    mutationFn: async () => {
      const optRes = await fetch(`${API}/api/v1/auth/passkey/manage/options`, {
        credentials: 'include',
      })
      if (!optRes.ok) throw new Error('Failed to get registration options')
      const options = await optRes.json()

      let credential
      try {
        credential = await startRegistration({ optionsJSON: options })
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err)
        if (msg.toLowerCase().includes('cancel') || msg.toLowerCase().includes('abort') || msg.toLowerCase().includes('not allowed')) {
          throw new Error('cancelled')
        }
        throw new Error(msg)
      }

      const verifyRes = await fetch(`${API}/api/v1/auth/passkey/manage/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(credential),
      })
      if (!verifyRes.ok) {
        const data = (await verifyRes.json().catch(() => ({}))) as { message?: string }
        throw new Error(data.message ?? 'Passkey registration failed')
      }
    },
  })
}
