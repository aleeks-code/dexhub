import { createAuthClient } from 'better-auth/client'

export const authClient = createAuthClient({
  baseURL: process.env['NEXT_PUBLIC_API_URL'] ?? '',
  basePath: '/api/v1/auth',
})

export type Session = typeof authClient.$Infer.Session
