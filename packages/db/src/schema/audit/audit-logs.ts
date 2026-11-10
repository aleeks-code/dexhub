import { index, jsonb, pgEnum, pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core'

export const auditCategoryEnum = pgEnum('audit_category', [
  'AUTH',
  'DATA',
  'PERMISSION',
  'MODULE',
  'ADMIN',
  'SECURITY',
])

export const auditSeverityEnum = pgEnum('audit_severity', ['info', 'warning', 'critical'])

export const auditOutcomeEnum = pgEnum('audit_outcome', ['success', 'failure'])

export const actorTypeEnum = pgEnum('actor_type', ['user', 'system', 'module'])

export const auditLogs = pgTable(
  'audit_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    timestamp: timestamp('timestamp', { withTimezone: true }).notNull().defaultNow(),
    category: auditCategoryEnum('category').notNull(),
    action: varchar('action', { length: 100 }).notNull(),
    severity: auditSeverityEnum('severity').notNull(),
    outcome: auditOutcomeEnum('outcome').notNull(),
    actorId: varchar('actor_id', { length: 100 }),
    actorType: actorTypeEnum('actor_type').notNull(),
    actorIp: varchar('actor_ip', { length: 45 }),
    actorUserAgent: varchar('actor_user_agent', { length: 500 }),
    targetType: varchar('target_type', { length: 100 }),
    targetId: varchar('target_id', { length: 100 }),
    targetModule: varchar('target_module', { length: 50 }),
    metadata: jsonb('metadata').$type<Record<string, unknown>>(),
    requestId: uuid('request_id'),
    sessionId: varchar('session_id', { length: 100 }),
  },
  (t) => [
    index('idx_audit_timestamp').on(t.timestamp),
    index('idx_audit_category').on(t.category),
    index('idx_audit_actor_id').on(t.actorId),
    index('idx_audit_target_module').on(t.targetModule),
    index('idx_audit_severity').on(t.severity),
  ],
)

export type AuditLog = typeof auditLogs.$inferSelect
export type NewAuditLog = typeof auditLogs.$inferInsert

export type AuditCategory = (typeof auditCategoryEnum.enumValues)[number]
export type AuditSeverity = (typeof auditSeverityEnum.enumValues)[number]
export type AuditOutcome = (typeof auditOutcomeEnum.enumValues)[number]
export type ActorType = (typeof actorTypeEnum.enumValues)[number]
