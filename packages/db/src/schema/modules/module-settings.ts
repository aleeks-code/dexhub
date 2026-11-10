import { jsonb, pgTable, primaryKey, varchar } from 'drizzle-orm/pg-core'
import { moduleRegistry } from './module-registry'

export const moduleSettings = pgTable(
  'module_settings',
  {
    moduleId: varchar('module_id', { length: 50 })
      .notNull()
      .references(() => moduleRegistry.id, { onDelete: 'cascade' }),
    key: varchar('key', { length: 100 }).notNull(),
    value: jsonb('value').notNull(),
  },
  (t) => [primaryKey({ columns: [t.moduleId, t.key] })],
)

export type ModuleSetting = typeof moduleSettings.$inferSelect
export type NewModuleSetting = typeof moduleSettings.$inferInsert
