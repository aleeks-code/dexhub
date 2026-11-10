import { SetMetadata } from '@nestjs/common'
import type { AuditCategory, AuditSeverity } from '@dexhub/db'

export const AUDIT_KEY = 'auditMeta'

export interface AuditMeta {
  action: string
  category: AuditCategory
  severity: AuditSeverity
}

export const Audit = (meta: AuditMeta) => SetMetadata(AUDIT_KEY, meta)
