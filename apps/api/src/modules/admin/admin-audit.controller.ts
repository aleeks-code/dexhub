import { Controller, Get, Query, UseGuards } from '@nestjs/common'
import { AdminGuard } from '../../common/guards/admin.guard'
import { successResponse } from '../../common/response/api-response'
import { and, auditLogs, desc, eq, getClient, ilike, or, sql } from '@dexhub/db'
import type { AuditCategory, AuditOutcome, AuditSeverity } from '@dexhub/db'

@UseGuards(AdminGuard)
@Controller('admin/audit-logs')
export class AdminAuditController {
  @Get()
  async getAuditLogs(
    @Query('page') pageRaw?: string,
    @Query('limit') limitRaw?: string,
    @Query('category') category?: AuditCategory,
    @Query('severity') severity?: AuditSeverity,
    @Query('outcome') outcome?: AuditOutcome,
    @Query('search') search?: string,
  ) {
    const page = Math.max(1, parseInt(pageRaw ?? '1', 10) || 1)
    const limit = Math.min(100, Math.max(1, parseInt(limitRaw ?? '25', 10) || 25))
    const offset = (page - 1) * limit

    const db = getClient()

    const conditions = []

    if (category) {
      conditions.push(eq(auditLogs.category, category))
    }
    if (severity) {
      conditions.push(eq(auditLogs.severity, severity))
    }
    if (outcome) {
      conditions.push(eq(auditLogs.outcome, outcome))
    }
    if (search && search.trim()) {
      const q = `%${search.trim()}%`
      conditions.push(
        or(
          ilike(auditLogs.action, q),
          ilike(auditLogs.actorId, q),
          ilike(auditLogs.targetType, q),
        ),
      )
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined

    const [items, totalResult] = await Promise.all([
      db
        .select()
        .from(auditLogs)
        .where(whereClause)
        .orderBy(desc(auditLogs.timestamp))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: sql<string>`count(*)::text` })
        .from(auditLogs)
        .where(whereClause)
        .then((r) => parseInt(r[0]?.count ?? '0', 10)),
    ])

    return successResponse({
      items,
      total: totalResult,
      page,
      limit,
      totalPages: Math.ceil(totalResult / limit),
    })
  }

  @Get('summary')
  async getSummary() {
    const db = getClient()
    const summaryResult = await db.execute(sql`
      SELECT
        count(*)::text as total,
        count(*) FILTER (WHERE timestamp >= NOW() - INTERVAL '24 hours')::text as last24h,
        count(*) FILTER (WHERE severity = 'critical')::text as critical_count,
        count(*) FILTER (WHERE severity = 'warning')::text as warning_count,
        count(*) FILTER (WHERE outcome = 'failure')::text as failure_count
      FROM audit_logs
    `)

    const rows = summaryResult as unknown as Array<{
      total: string
      last24h: string
      critical_count: string
      warning_count: string
      failure_count: string
    }>

    const row = rows[0] ?? {
      total: '0',
      last24h: '0',
      critical_count: '0',
      warning_count: '0',
      failure_count: '0',
    }

    return successResponse({
      total: parseInt(row.total, 10),
      last24h: parseInt(row.last24h, 10),
      critical: parseInt(row.critical_count, 10),
      warning: parseInt(row.warning_count, 10),
      failures: parseInt(row.failure_count, 10),
    })
  }
}
