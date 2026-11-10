import { boolean, pgTable, text, varchar } from 'drizzle-orm/pg-core'

export const permissions = pgTable('permissions', {
  id: varchar('id', { length: 100 }).primaryKey(),
  moduleId: varchar('module_id', { length: 50 }).notNull(),
  label: varchar('label', { length: 100 }).notNull(),
  description: text('description'),
  dangerous: boolean('dangerous').notNull().default(false),
})

export type Permission = typeof permissions.$inferSelect
export type NewPermission = typeof permissions.$inferInsert
