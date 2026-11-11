import { integer, numeric, pgTable, text, timestamp } from 'drizzle-orm/pg-core'

export const worklogCigMassimale = pgTable('worklog_cig_massimale', {
  anno: integer('anno').primaryKey(),
  massimaleLordo: numeric('massimale_lordo', { precision: 10, scale: 2 }).notNull(),
  massimaleNetto: numeric('massimale_netto', { precision: 10, scale: 2 }).notNull(),
  aliquotaRiduzione: numeric('aliquota_riduzione', { precision: 6, scale: 5 }).notNull().default('0.05840'),
  circolareInps: text('circolare_inps'),
  note: text('note'),
  documentoUrl: text('documento_url'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export type WorklogCigMassimale = typeof worklogCigMassimale.$inferSelect
export type NewWorklogCigMassimale = typeof worklogCigMassimale.$inferInsert
