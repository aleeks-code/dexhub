import { pgEnum, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core'
import { users } from '../core/users'

export const taskSpaceTypeEnum = pgEnum('task_space_type', ['personal', 'shared'])

export const taskSpaces = pgTable('task_spaces', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  type: taskSpaceTypeEnum('type').notNull().default('personal'),
  color: varchar('color', { length: 7 }),
  icon: varchar('icon', { length: 50 }),
  joinCode: varchar('join_code', { length: 10 }).unique(),
  createdBy: text('created_by')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
})

export type TaskSpace = typeof taskSpaces.$inferSelect
export type NewTaskSpace = typeof taskSpaces.$inferInsert
