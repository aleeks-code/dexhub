import { boolean, integer, pgEnum, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core'

export const backupTypeEnum = pgEnum('backup_type', ['daily', 'weekly', 'monthly', 'manual'])
export const backupStatusEnum = pgEnum('backup_status', ['pending', 'completed', 'failed'])

export const backupJobs = pgTable('backup_jobs', {
  id: uuid('id').primaryKey().defaultRandom(),
  filename: varchar('filename', { length: 255 }).notNull(),
  sizeBytes: integer('size_bytes'),
  checksum: varchar('checksum', { length: 64 }),
  encrypted: boolean('encrypted').notNull().default(false),
  type: backupTypeEnum('type').notNull().default('manual'),
  status: backupStatusEnum('status').notNull().default('pending'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  error: text('error'),
})

export type BackupJob = typeof backupJobs.$inferSelect
export type NewBackupJob = typeof backupJobs.$inferInsert
