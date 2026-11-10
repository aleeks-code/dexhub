import { index, jsonb, pgTable, primaryKey, timestamp, varchar } from 'drizzle-orm/pg-core'

export const moduleKvStore = pgTable(
  'module_kv_store',
  {
    namespace: varchar('namespace', { length: 50 }).notNull(),
    key: varchar('key', { length: 255 }).notNull(),
    value: jsonb('value').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.namespace, t.key] }),
    index('idx_kv_expires_at').on(t.expiresAt),
  ],
)

export type ModuleKvEntry = typeof moduleKvStore.$inferSelect
export type NewModuleKvEntry = typeof moduleKvStore.$inferInsert
