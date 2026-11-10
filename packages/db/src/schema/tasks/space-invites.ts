import { index, pgTable, text, timestamp, unique, uuid, varchar } from 'drizzle-orm/pg-core'
import { users } from '../core/users'
import { taskSpaces } from './spaces'

// Inviti "In attesa" di un workspace condiviso (mockup, punto 11).
//
// Tabella SEPARATA da task_space_members di proposito: un invito via email punta a una persona
// che puo' non avere ancora un account, quindi non esiste una riga in `users` a cui agganciarsi.
// Un invito diventa membership quando chi lo riceve entra col codice — a quel punto la riga qui
// viene consumata (cancellata) e ne nasce una in task_space_members.
export const taskSpaceInvites = pgTable(
  'task_space_invites',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    spaceId: uuid('space_id')
      .notNull()
      .references(() => taskSpaces.id, { onDelete: 'cascade' }),
    email: varchar('email', { length: 255 }).notNull(),
    invitedBy: text('invited_by')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    // Stessa email invitata due volte nello stesso workspace = un invito solo.
    unique('uq_space_invite_email').on(t.spaceId, t.email),
    index('idx_space_invites_space').on(t.spaceId),
    index('idx_space_invites_email').on(t.email),
  ],
)

export type TaskSpaceInvite = typeof taskSpaceInvites.$inferSelect
export type NewTaskSpaceInvite = typeof taskSpaceInvites.$inferInsert
