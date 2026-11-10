import { boolean, index, pgTable, text, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core'
import { users } from '../core/users'

export const worklogDays = pgTable(
  'worklog_days',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    date: varchar('date', { length: 10 }).notNull(), // 'YYYY-MM-DD' — no tz issues
    note: text('note'),
    // null=auto, true=forza pasto, false=forza no-pasto — semantica resta in TS, non nel DB
    mealOverride: boolean('meal_override'),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('idx_worklog_days_user_date').on(t.userId, t.date),
    index('idx_worklog_days_user').on(t.userId),
  ],
)

export type WorklogDay = typeof worklogDays.$inferSelect
export type NewWorklogDay = typeof worklogDays.$inferInsert
