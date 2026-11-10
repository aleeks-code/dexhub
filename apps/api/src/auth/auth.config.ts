import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { getClient } from '@dexhub/db'
import * as schema from '@dexhub/db'

export function createAuth() {
  const secret = process.env['BETTER_AUTH_SECRET']
  if (!secret) throw new Error('BETTER_AUTH_SECRET env var is required')

  const db = getClient()

  return betterAuth({
    database: drizzleAdapter(db, {
      provider: 'pg',
      schema: {
        user: schema.users,
        session: schema.sessions,
        account: schema.accounts,
        verification: schema.verifications,
      },
    }),
    baseURL: process.env['BETTER_AUTH_URL']!,
    basePath: '/api/v1/auth',
    secret,
    user: {
      additionalFields: {
        isAdmin: {
          type: 'boolean',
          required: false,
          defaultValue: false,
        },
        isActive: {
          type: 'boolean',
          required: false,
          defaultValue: true,
        },
      },
    },
  })
}

export type Auth = ReturnType<typeof createAuth>
