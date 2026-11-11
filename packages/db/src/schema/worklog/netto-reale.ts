import { check, jsonb, numeric, pgTable, primaryKey, text, timestamp, varchar } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'
import { users } from '../core/users'

export interface StimaSnapshotMetadata {
  engineVersion: string
  mese: string
  calculatedAt: string
  netto: number
  lordo?: number
  inps?: number
  imponibile?: number
  irpef?: number
  trattenutaSindacale?: number
  trattenutaMensa?: number
  trattenutaAddizionali?: number
}

// Netto reale da busta paga, per mese — chiave composta (userId, mese)
export const worklogNettoReale = pgTable(
  'worklog_netto_reale',
  {
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    mese: varchar('mese', { length: 7 }).notNull(), // 'YYYY-MM', es. '2026-10'
    netto: numeric('netto', { precision: 10, scale: 2 }).notNull(),
    // Snapshot immutabile della stima generata al momento del primo confronto
    stimaNettoSnapshot: numeric('stima_netto_snapshot', { precision: 10, scale: 2 }),
    stimaSnapshot: jsonb('stima_snapshot').$type<StimaSnapshotMetadata>(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.mese] }),
    check('chk_worklog_netto_reale_netto_nonneg', sql`${t.netto} >= 0`),
  ],
)

export type WorklogNettoReale = typeof worklogNettoReale.$inferSelect
export type NewWorklogNettoReale = typeof worklogNettoReale.$inferInsert
