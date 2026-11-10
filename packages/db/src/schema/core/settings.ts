import { jsonb, pgTable, text, timestamp, varchar } from 'drizzle-orm/pg-core'
import { users } from './users'

export const settings = pgTable('settings', {
  key: varchar('key', { length: 100 }).primaryKey(),
  value: jsonb('value').notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  updatedBy: text('updated_by').references(() => users.id, { onDelete: 'set null' }),
})

export const SETTINGS_KEYS = {
  MULTI_USER_ENABLED: 'app.multi_user_enabled',
  REGISTRATION_ENABLED: 'app.registration_enabled',
  APP_NAME: 'app.name',
  APP_THEME_DEFAULT: 'app.theme_default',
  BACKUP_SCHEDULE: 'backup.schedule',
  BACKUP_ENCRYPTION_ENABLED: 'backup.encryption_enabled',
  BACKUP_RETENTION: 'backup.retention',
  ALLOW_NON_ADMIN_LOGINS: 'auth.allowNonAdminLogins',
} as const

export type SettingKey = (typeof SETTINGS_KEYS)[keyof typeof SETTINGS_KEYS]

export type Setting = typeof settings.$inferSelect
export type NewSetting = typeof settings.$inferInsert
