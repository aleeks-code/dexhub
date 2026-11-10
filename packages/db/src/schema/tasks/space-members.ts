import { jsonb, pgTable, primaryKey, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { index } from 'drizzle-orm/pg-core'
import { users } from '../core/users'
import { taskSpaces } from './spaces'

export const taskSpaceMembers = pgTable(
  'task_space_members',
  {
    spaceId: uuid('space_id')
      .notNull()
      .references(() => taskSpaces.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    joinedAt: timestamp('joined_at', { withTimezone: true }).notNull().defaultNow(),
    metadata: jsonb('metadata').$type<Record<string, unknown>>(),
  },
  (t) => [
    primaryKey({ columns: [t.spaceId, t.userId] }),
    index('idx_tsm_user_id').on(t.userId),
  ],
)

export type TaskSpaceMember = typeof taskSpaceMembers.$inferSelect
export type NewTaskSpaceMember = typeof taskSpaceMembers.$inferInsert
