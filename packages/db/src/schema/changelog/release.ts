import { pgEnum, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'

export const changelogStatoEnum = pgEnum('changelog_stato', ['draft', 'published'])

export const changelogRelease = pgTable(
  'changelog_release',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    versione: text('versione').notNull(), // SemVer come stringa, nessun parsing/vincolo a DB
    titolo: text('titolo').notNull(),
    descrizione: text('descrizione'),
    stato: changelogStatoEnum('stato').notNull().default('draft'),
    dataPubblicazione: timestamp('data_pubblicazione', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    // Al massimo una release in draft alla volta — indice unico parziale, mai un check
    // (non esprimibile come check su singola riga: il vincolo è cross-row).
    uniqueIndex('idx_changelog_release_single_draft').on(t.stato).where(sql`${t.stato} = 'draft'`),
    // Una release = una versione — invariante di dominio, ora a DB. Rende sicuro anche
    // l'upsert-by-versione del seed (select-then-insert manuale, mai un ON CONFLICT finora).
    uniqueIndex('idx_changelog_release_versione_unique').on(t.versione),
  ],
)

export type ChangelogRelease = typeof changelogRelease.$inferSelect
export type NewChangelogRelease = typeof changelogRelease.$inferInsert
