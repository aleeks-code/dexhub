import { Injectable } from '@nestjs/common'
import { getClient, auditLogs } from '@dexhub/db'
import type { AuditCategory, AuditSeverity, AuditOutcome, ActorType } from '@dexhub/db'

export interface LogOptions {
  category: AuditCategory
  action: string
  severity: AuditSeverity
  outcome: AuditOutcome
  actorId?: string
  actorType?: ActorType
  actorIp?: string
  actorUserAgent?: string
  targetType?: string
  targetId?: string
  targetModule?: string
  metadata?: Record<string, unknown>
  sessionId?: string
}

@Injectable()
export class AuditService {
  async log(opts: LogOptions): Promise<void> {
    await getClient()
      .insert(auditLogs)
      .values({
        category: opts.category,
        action: opts.action,
        severity: opts.severity,
        outcome: opts.outcome,
        actorId: opts.actorId,
        actorType: opts.actorType ?? 'system',
        actorIp: opts.actorIp,
        actorUserAgent: opts.actorUserAgent,
        targetType: opts.targetType,
        targetId: opts.targetId,
        targetModule: opts.targetModule,
        metadata: opts.metadata,
        sessionId: opts.sessionId,
      })
      .catch(() => {})
  }
}
