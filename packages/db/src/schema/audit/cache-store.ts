import { index, jsonb, pgTable, primaryKey, timestamp, varchar } from 'drizzle-orm/pg-core'

export const cacheStore = pgTable(
  'cache_store',
  {
    namespace: varchar('namespace', { length: 100 }).notNull(),
    key: varchar('key', { length: 500 }).notNull(),
    value: jsonb('value').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.namespace, t.key] }),
    index('idx_cache_expires_at').on(t.expiresAt),
    index('idx_cache_namespace').on(t.namespace),
  ],
)

export type CacheEntry = typeof cacheStore.$inferSelect
export type NewCacheEntry = typeof cacheStore.$inferInsert
