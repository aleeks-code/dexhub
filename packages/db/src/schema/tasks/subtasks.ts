import { boolean, index, integer, pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core'
import { tasks } from './tasks'

export const taskSubtasks = pgTable(
  'task_subtasks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    taskId: uuid('task_id')
      .notNull()
      .references(() => tasks.id, { onDelete: 'cascade' }),
    title: varchar('title', { length: 500 }).notNull(),
    completed: boolean('completed').notNull().default(false),
    sortOrder: integer('sort_order').notNull().default(10),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('idx_subtasks_task').on(t.taskId)],
)

export type TaskSubtask = typeof taskSubtasks.$inferSelect
export type NewTaskSubtask = typeof taskSubtasks.$inferInsert
