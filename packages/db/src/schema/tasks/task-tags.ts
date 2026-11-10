import { pgTable, primaryKey, uuid } from 'drizzle-orm/pg-core'
import { tasks } from './tasks'
import { taskTags } from './tags'

export const taskTaskTags = pgTable(
  'task_task_tags',
  {
    taskId: uuid('task_id')
      .notNull()
      .references(() => tasks.id, { onDelete: 'cascade' }),
    tagId: uuid('tag_id')
      .notNull()
      .references(() => taskTags.id, { onDelete: 'cascade' }),
  },
  (t) => [primaryKey({ columns: [t.taskId, t.tagId] })],
)

export type TaskTaskTag = typeof taskTaskTags.$inferSelect
