import { pgTable, unique, uuid, varchar } from 'drizzle-orm/pg-core'
import { taskSpaces } from './spaces'

export const taskTags = pgTable(
  'task_tags',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    spaceId: uuid('space_id')
      .notNull()
      .references(() => taskSpaces.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 100 }).notNull(),
    color: varchar('color', { length: 7 }),
  },
  (t) => [unique('uq_task_tags_space_name').on(t.spaceId, t.name)],
)

export type TaskTag = typeof taskTags.$inferSelect
export type NewTaskTag = typeof taskTags.$inferInsert
