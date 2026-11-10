import { sql } from 'drizzle-orm'
import { check, index, numeric, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core'
import { users } from '../core/users'

// Flat variabili (Fase 3, Step 6) — importi one-off attribuiti a un mese preciso, entrano in
// imponibileExtra/marginale nel motore, MAI nel fisso/RAL (vedi StimaInput.variabiliFlat: un
// totale, non un tipo — il motore non distingue). `tipo` è varchar non pgEnum: nuove etichette
// (nuove cadenze) si aggiungono senza migration, la cadenza resta informazione utente.
export type VariabileFlatTipo = 'premio_produzione_feriale' | 'premio_produzione_variabile'

export const worklogVariabiliFlat = pgTable(
  'worklog_variabili_flat',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    mese: varchar('mese', { length: 7 }).notNull(), // 'YYYY-MM' — mese in cui entra in imponibileExtra
    tipo: varchar('tipo', { length: 40 }).$type<VariabileFlatTipo>().notNull(),
    importo: numeric('importo', { precision: 10, scale: 2 }).notNull(),
    note: text('note'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('idx_worklog_variabili_flat_user_mese').on(t.userId, t.mese),
    check('chk_worklog_variabili_flat_importo_positivo', sql`${t.importo} >= 0`),
  ],
)

export type WorklogVariabileFlat = typeof worklogVariabiliFlat.$inferSelect
export type NewWorklogVariabileFlat = typeof worklogVariabiliFlat.$inferInsert
