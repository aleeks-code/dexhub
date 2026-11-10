import {
  boolean,
  customType,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core'
import { users } from '../core/users'
import { taskSpaces } from './spaces'

export const taskStatusEnum = pgEnum('task_status', [
  'da_fare',
  'in_corso',
  'completata',
  'archiviata',
])

export const taskPriorityEnum = pgEnum('task_priority', ['bassa', 'media', 'alta', 'critica'])

// Raggruppamento nella vista "Tutte". E' una colonna VERA e non un derivato di dueDate:
// il drag&drop permette di spostare un'attivita' in un'altra sezione senza toccarne la data
// (mockup, punto 8), quindi sezione e data possono legittimamente divergere.
export const taskSectionEnum = pgEnum('task_section', ['oggi', 'settimana', 'prossime'])

// tsvector is not natively supported by drizzle-orm; use customType
const tsvector = customType<{ data: string }>({
  dataType() {
    return 'tsvector'
  },
})

export const tasks = pgTable(
  'tasks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    spaceId: uuid('space_id')
      .notNull()
      .references(() => taskSpaces.id, { onDelete: 'cascade' }),
    title: varchar('title', { length: 500 }).notNull(),
    description: text('description'),
    status: taskStatusEnum('status').notNull().default('da_fare'),
    priority: taskPriorityEnum('priority').notNull().default('media'),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    dueDate: timestamp('due_date', { withTimezone: true }),
    sortOrder: integer('sort_order').notNull().default(10),
    favorite: boolean('favorite').notNull().default(false),
    pinned: boolean('pinned').notNull().default(false),
    section: taskSectionEnum('section').notNull().default('oggi'),
    // Chi se ne occupa. Nullable: le attivita' personali non hanno assegnatario, e in un
    // workspace condiviso un'attivita' puo' restare non assegnata. SET NULL e non CASCADE:
    // se l'utente sparisce l'attivita' resta, semplicemente senza assegnatario.
    assigneeId: text('assignee_id').references(() => users.id, { onDelete: 'set null' }),
    searchVector: tsvector('search_vector'),
    createdBy: text('created_by')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (t) => [
    index('idx_tasks_space').on(t.spaceId),
    index('idx_tasks_due_date').on(t.dueDate),
    index('idx_tasks_status').on(t.spaceId, t.status),
    index('idx_tasks_sort').on(t.spaceId, t.sortOrder),
    index('idx_tasks_assignee').on(t.assigneeId),
  ],
)

export type Task = typeof tasks.$inferSelect
export type NewTask = typeof tasks.$inferInsert
export type TaskStatus = (typeof taskStatusEnum.enumValues)[number]
export type TaskPriority = (typeof taskPriorityEnum.enumValues)[number]
export type TaskSection = (typeof taskSectionEnum.enumValues)[number]
