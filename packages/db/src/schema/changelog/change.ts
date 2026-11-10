import { integer, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { changelogRelease } from './release'

export const changelogCategoriaEnum = pgEnum('changelog_categoria', [
  'feature',
  'improvement',
  'fix',
  'security',
  'breaking',
])

export const changelogVisibilitaEnum = pgEnum('changelog_visibilita', ['user', 'developer', 'internal'])

export const changelogChange = pgTable('changelog_change', {
  id: uuid('id').primaryKey().defaultRandom(),
  releaseId: uuid('release_id')
    .notNull()
    .references(() => changelogRelease.id, { onDelete: 'cascade' }),
  categoria: changelogCategoriaEnum('categoria').notNull(),
  visibilita: changelogVisibilitaEnum('visibilita').notNull().default('user'),
  // Module key stabile (slug: worklog, wiki, shell, patch-notes) — NON una label. Nessuna FK
  // verso il Module Registry ora (la tabella non esiste ancora), ma il valore va trattato
  // come chiave, mai renderizzato direttamente come nome modulo.
  modulo: text('modulo'),
  titolo: text('titolo').notNull(),
  descrizione: text('descrizione'),
  linkWiki: text('link_wiki'),
  migrationNote: text('migration_note'),
  ordine: integer('ordine').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export type ChangelogChange = typeof changelogChange.$inferSelect
export type NewChangelogChange = typeof changelogChange.$inferInsert
