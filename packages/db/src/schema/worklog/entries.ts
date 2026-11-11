import { index, jsonb, numeric, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { worklogDays } from './days'

export const worklogEntryKindEnum = pgEnum('worklog_entry_kind', [
  'work',
  'overtime',
  'vacation',
  'leave',
  'sick',
  'holiday',
  'rest',
  'recovery',
  'cig',
  'permesso_non_retribuito',
  'congedo_parentale_80',
  'congedo_parentale_30',
])

// 'rest'/'recovery' morti (mai realmente rimossi dall'enum Postgres, sostituiti da
// permesso_non_retribuito + weekend già non-lavorativo) — esclusi qui, non toccare l'enum sopra.
export type EntryKind = Exclude<(typeof worklogEntryKindEnum.enumValues)[number], 'rest' | 'recovery'>

export interface EntryModifiers {
  notturno?: boolean
  pomeridiano?: boolean       // turno pomeridiano ordinario (Step 5.3) — mutuamente esclusivo con
                              // notturno lato UI (stesse ore, un solo turno), non enforced qui
  orarioInizio?: string       // 'HH:MM' — orario esplicito (Step 5.4), precedenza su notturno/pomeridiano
  orarioFine?: string         // 'HH:MM' — fine ≤ inizio → wrappa mezzanotte
  festivoLavorato?: boolean
  reperibilita?: boolean
}

export const worklogEntries = pgTable(
  'worklog_entries',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    dayId: uuid('day_id')
      .notNull()
      .references(() => worklogDays.id, { onDelete: 'cascade' }),
    kind: worklogEntryKindEnum('kind').notNull(),
    // numeric(4,2): supports 0.25–99.99 h; Drizzle returns as string, parse in service
    hours: numeric('hours', { precision: 4, scale: 2 }).notNull(),
    modifiers: jsonb('modifiers').$type<EntryModifiers>(),
    note: text('note'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('idx_worklog_entries_day').on(t.dayId)],
)

export type WorklogEntry = typeof worklogEntries.$inferSelect
export type NewWorklogEntry = typeof worklogEntries.$inferInsert
