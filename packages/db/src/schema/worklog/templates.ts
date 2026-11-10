import { jsonb, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core'
import { index } from 'drizzle-orm/pg-core'
import { users } from '../core/users'
import type { EntryKind } from './entries'

export interface TemplateEntry {
  kind: EntryKind
  hours: number
  modifiers?: {
    notturno?: boolean
    festivoLavorato?: boolean
    reperibilita?: boolean
  }
  note?: string
}

export const worklogTemplates = pgTable('worklog_templates', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 100 }).notNull(),
  entries: jsonb('entries').$type<TemplateEntry[]>().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('idx_worklog_templates_user').on(t.userId),
])

export type WorklogTemplate = typeof worklogTemplates.$inferSelect
export type NewWorklogTemplate = typeof worklogTemplates.$inferInsert
