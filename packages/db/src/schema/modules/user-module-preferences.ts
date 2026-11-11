import { boolean, pgTable, primaryKey, text, timestamp, varchar } from 'drizzle-orm/pg-core'
import { users } from '../core/users'
import { moduleRegistry } from './module-registry'

export const userModulePreferences = pgTable(
  'user_module_preferences',
  {
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    moduleId: varchar('module_id', { length: 50 })
      .notNull()
      .references(() => moduleRegistry.id, { onDelete: 'cascade' }),
    enabled: boolean('enabled').notNull().default(false),
    inOverview: boolean('in_overview').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.moduleId] })],
)

export type UserModulePreference = typeof userModulePreferences.$inferSelect
export type NewUserModulePreference = typeof userModulePreferences.$inferInsert
