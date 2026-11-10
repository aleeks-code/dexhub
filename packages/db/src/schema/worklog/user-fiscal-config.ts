import { integer, numeric, pgEnum, pgTable, text, timestamp, varchar } from 'drizzle-orm/pg-core'
import { users } from '../core/users'
import { worklogCcnlProfile } from './ccnl-profile'

export const worklogTipoContrattoEnum = pgEnum('worklog_tipo_contratto', [
  'ordinario',
  'apprendistato',
])

export const worklogUserFiscalConfig = pgTable('worklog_user_fiscal_config', {
  userId: text('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  ccnlId: varchar('ccnl_id', { length: 50 })
    .notNull()
    .references(() => worklogCcnlProfile.id),
  tipoContratto: worklogTipoContrattoEnum('tipo_contratto').notNull().default('ordinario'),
  // Regional/municipal surcharges are optional — user may omit them.
  // When null, the engine runs with addizionali=0 and emits warningNoAddizionali=true.
  // NOTE: in reality regional surcharges are often structured (multi-bracket), not a flat
  // rate. A single aliquota is a known approximation documented here.
  regione: varchar('regione', { length: 50 }),
  comune: varchar('comune', { length: 100 }),
  aliquotaAddRegionale: numeric('aliquota_add_regionale', { precision: 6, scale: 5 }),
  aliquotaAddComunale: numeric('aliquota_add_comunale', { precision: 6, scale: 5 }),
  // Per-user override of worklog_fiscal_profile.contributiInps (global default, e.g. 9,19%
  // IVS ordinario). Set when the employer falls under a CIGS/solidarietà regime — e.g. 9,49%
  // = 9,19% IVS + 0,30% CIGS lavoratore, entered here as ONE combined rate, not two fields.
  // NULL = use the global year default.
  contributiInpsOverride: numeric('contributi_inps_override', { precision: 6, scale: 5 }),
  // Pay periods per year: 13 (most common) or 14. Used for RAL-based IRPEF calculation.
  mensilita: integer('mensilita').notNull().default(13),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export type WorklogUserFiscalConfig = typeof worklogUserFiscalConfig.$inferSelect
export type NewWorklogUserFiscalConfig = typeof worklogUserFiscalConfig.$inferInsert
