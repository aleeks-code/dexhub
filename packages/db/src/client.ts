import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

export type DrizzleClient = ReturnType<typeof createClient>

export function createClient(databaseUrl: string) {
  const isNeonOrCloud =
    databaseUrl.includes('neon.tech') ||
    databaseUrl.includes('render.com') ||
    databaseUrl.includes('sslmode=require') ||
    process.env['NODE_ENV'] === 'production'
  const isLocal =
    databaseUrl.includes('localhost') ||
    databaseUrl.includes('127.0.0.1') ||
    databaseUrl.includes('docker.internal')

  const queryClient = postgres(databaseUrl, {
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
    ...(isNeonOrCloud && !isLocal ? { ssl: 'require' } : {}),
  })

  return drizzle(queryClient, { schema })
}

let _client: DrizzleClient | null = null

export function getClient(): DrizzleClient {
  if (!_client) {
    const url = process.env['DATABASE_URL']
    if (!url) throw new Error('DATABASE_URL environment variable is not set')
    _client = createClient(url)
  }
  return _client
}
