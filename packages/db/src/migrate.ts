import { migrate } from 'drizzle-orm/postgres-js/migrator'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { join } from 'node:path'

export async function runMigrations(): Promise<void> {
  const url = process.env['DATABASE_URL']
  if (!url) throw new Error('DATABASE_URL environment variable is not set')

  // Dedicated single-connection client — never shares the pool
  const sql = postgres(url, { max: 1 })
  const db = drizzle(sql)

  // __dirname is packages/db/dist/ in dev and /prod/api/node_modules/@dexhub/db/dist/ in prod
  const migrationsFolder = join(__dirname, '..', 'migrations')
  // NOTE: 0003/0004/0005 are not in drizzle.__drizzle_migrations (applied manually before tracking existed).
  // Drizzle's algorithm skips them permanently: it runs only migrations with when > max(tracked.created_at),
  // and 0009 is already tracked. On a clean DB all 10 run in idx order without conflicts (IF NOT EXISTS guards).

  try {
    await migrate(db, { migrationsFolder })
  } finally {
    await sql.end()
  }
}
