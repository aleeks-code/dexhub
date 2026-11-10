import { Controller, Delete, Get, Param, Post, Req, UseGuards } from '@nestjs/common'
import type { FastifyRequest } from 'fastify'
import { AdminGuard } from '../../common/guards/admin.guard'
import { successResponse } from '../../common/response/api-response'
import { auditLogs, desc, eq, getClient, sessions, sql, users } from '@dexhub/db'

type AdminReq = FastifyRequest & { session: { user: { id: string } } }

@UseGuards(AdminGuard)
@Controller('admin/maintenance')
export class AdminMaintenanceController {
  @Get('sessions')
  async listSessions() {
    const db = getClient()
    const rows = await db
      .select({
        id: sessions.id,
        createdAt: sessions.createdAt,
        expiresAt: sessions.expiresAt,
        ipAddress: sessions.ipAddress,
        userAgent: sessions.userAgent,
        userId: sessions.userId,
        userName: users.name,
        userEmail: users.email,
        userIsAdmin: users.isAdmin,
      })
      .from(sessions)
      .leftJoin(users, eq(sessions.userId, users.id))
      .orderBy(desc(sessions.createdAt))
      .limit(100)

    const now = new Date()
    const items = rows.map((r) => ({
      ...r,
      isExpired: r.expiresAt < now,
    }))

    return successResponse(items)
  }

  @Delete('sessions/:id')
  async revokeSession(@Param('id') id: string, @Req() req: AdminReq) {
    const db = getClient()
    await db.delete(sessions).where(eq(sessions.id, id))

    await db.insert(auditLogs).values({
      category: 'SECURITY',
      action: 'session.revoked_by_admin',
      severity: 'warning',
      outcome: 'success',
      actorId: req.session.user.id,
      actorType: 'user',
      targetType: 'session',
      targetId: id,
    })

    return successResponse({ success: true })
  }

  @Post('cleanup-sessions')
  async cleanupExpiredSessions(@Req() req: AdminReq) {
    const db = getClient()
    const result = await db.execute(sql`
      WITH deleted AS (
        DELETE FROM sessions
        WHERE expires_at <= NOW()
        RETURNING id
      )
      SELECT count(*)::text as count FROM deleted
    `)

    const rows = result as unknown as Array<{ count: string }>
    const cleanedCount = parseInt(rows[0]?.count ?? '0', 10)

    await db.insert(auditLogs).values({
      category: 'ADMIN',
      action: 'sessions.expired_cleaned',
      severity: 'info',
      outcome: 'success',
      actorId: req.session.user.id,
      actorType: 'user',
      metadata: { cleanedCount },
    })

    return successResponse({ cleanedCount })
  }

  @Get('tables')
  async getTableStats() {
    const db = getClient()
    const result = await db.execute(sql`
      SELECT
        relname AS table_name,
        pg_total_relation_size(relid)::text AS total_size_bytes,
        pg_size_pretty(pg_total_relation_size(relid)) AS total_size_pretty,
        n_live_tup::text AS row_estimate
      FROM pg_stat_user_tables
      ORDER BY pg_total_relation_size(relid) DESC
      LIMIT 25;
    `)

    const rows = result as unknown as Array<{
      table_name: string
      total_size_bytes: string
      total_size_pretty: string
      row_estimate: string
    }>

    const tables = rows.map((row) => ({
      tableName: row.table_name,
      sizeBytes: parseInt(row.total_size_bytes, 10),
      sizeFormatted: row.total_size_pretty,
      rowCount: parseInt(row.row_estimate, 10),
    }))

    return successResponse(tables)
  }

  @Post('vacuum')
  async vacuumAnalyze(@Req() req: AdminReq) {
    const db = getClient()
    await db.execute(sql`VACUUM ANALYZE`)

    await db.insert(auditLogs).values({
      category: 'ADMIN',
      action: 'database.vacuum_analyze',
      severity: 'info',
      outcome: 'success',
      actorId: req.session.user.id,
      actorType: 'user',
    })

    return successResponse({ success: true, timestamp: new Date().toISOString() })
  }
}
