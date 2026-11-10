import { jsonb, pgEnum, pgTable, text, timestamp, varchar } from 'drizzle-orm/pg-core'

export const moduleStatusEnum = pgEnum('module_status', [
  'active',
  'disabled',
  'error',
  'incompatible',
])

export const moduleRegistry = pgTable('module_registry', {
  id: varchar('id', { length: 50 }).primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  version: varchar('version', { length: 20 }).notNull(),
  sdkVersion: varchar('sdk_version', { length: 20 }).notNull(),
  status: moduleStatusEnum('status').notNull().default('active'),
  manifest: jsonb('manifest').notNull(),
  error: text('error'),
  installedAt: timestamp('installed_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export type ModuleRegistryEntry = typeof moduleRegistry.$inferSelect
export type NewModuleRegistryEntry = typeof moduleRegistry.$inferInsert
