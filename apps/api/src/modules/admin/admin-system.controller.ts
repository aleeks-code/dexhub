import { Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common'
import type { FastifyRequest } from 'fastify'
import { AdminGuard } from '../../common/guards/admin.guard'
import { successResponse } from '../../common/response/api-response'
import { auditLogs, cacheStore, getClient, sql } from '@dexhub/db'
import { JsonLogger } from '../../common/logger/json-logger'

type AdminReq = FastifyRequest & { session: { user: { id: string } } }

@UseGuards(AdminGuard)
@Controller('admin/system')
export class AdminSystemController {
  @Get('stats')
  async getSystemStats() {
    const db = getClient()
    const startTime = Date.now()
    await db.execute(sql`SELECT 1`)
    const latencyMs = Date.now() - startTime

    // Database size and postgres version
    const dbMetaQuery = (await db.execute(sql`
      SELECT
        pg_database_size(current_database())::text as size_bytes,
        version() as version,
        (SELECT count(*) FROM pg_stat_activity WHERE datname = current_database())::int as active_connections
    `)) as unknown as Array<{
      size_bytes: string
      version: string
      active_connections: number
    }>
    const dbMeta = dbMetaQuery[0] ?? { size_bytes: '0', version: 'Unknown', active_connections: 1 }

    // Counts across system
    const [usersCount, sessionsCount, tasksCount, worklogCount, auditCount, cacheCount] =
      await Promise.all([
        db.execute(sql`SELECT count(*)::text as count FROM users`).then((r) => parseInt((r as unknown as Array<{ count: string }>)[0]?.count ?? '0', 10)),
        db.execute(sql`SELECT count(*)::text as count FROM sessions WHERE expires_at > NOW()`).then((r) => parseInt((r as unknown as Array<{ count: string }>)[0]?.count ?? '0', 10)),
        db.execute(sql`SELECT count(*)::text as count FROM tasks`).then((r) => parseInt((r as unknown as Array<{ count: string }>)[0]?.count ?? '0', 10)).catch(() => 0),
        db.execute(sql`SELECT count(*)::text as count FROM worklog_entries`).then((r) => parseInt((r as unknown as Array<{ count: string }>)[0]?.count ?? '0', 10)).catch(() => 0),
        db.execute(sql`SELECT count(*)::text as count FROM audit_logs`).then((r) => parseInt((r as unknown as Array<{ count: string }>)[0]?.count ?? '0', 10)).catch(() => 0),
        db.execute(sql`SELECT count(*)::text as count FROM cache_store`).then((r) => parseInt((r as unknown as Array<{ count: string }>)[0]?.count ?? '0', 10)).catch(() => 0),
      ])

    const mem = process.memoryUsage()
    const toMb = (n: number) => Math.round((n / (1024 * 1024)) * 10) / 10

    const sizeBytes = parseInt(dbMeta.size_bytes, 10)
    const sizeMb = Math.round((sizeBytes / (1024 * 1024)) * 100) / 100

    return successResponse({
      uptimeSeconds: Math.floor(process.uptime()),
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      environment: process.env['NODE_ENV'] ?? 'development',
      memory: {
        heapUsedMb: toMb(mem.heapUsed),
        heapTotalMb: toMb(mem.heapTotal),
        rssMb: toMb(mem.rss),
        heapUsagePercent: Math.round((mem.heapUsed / mem.heapTotal) * 100),
      },
      database: {
        latencyMs,
        activeConnections: dbMeta.active_connections,
        sizeMb,
        sizeBytes,
        version: dbMeta.version.split(' ')[0] + ' ' + (dbMeta.version.split(' ')[1] ?? ''),
      },
      counts: {
        users: usersCount,
        activeSessions: sessionsCount,
        tasks: tasksCount,
        worklogEntries: worklogCount,
        auditLogs: auditCount,
        cacheEntries: cacheCount,
      },
    })
  }

  @Post('ping-db')
  async pingDb() {
    const db = getClient()
    const start = Date.now()
    await db.execute(sql`SELECT 1`)
    const latencyMs = Date.now() - start
    return successResponse({ latencyMs, timestamp: new Date().toISOString() })
  }

  @Post('purge-cache')
  async purgeCache(@Req() req: AdminReq) {
    const db = getClient()
    await db.delete(cacheStore)

    await db.insert(auditLogs).values({
      category: 'DATA',
      action: 'system.cache_purged',
      severity: 'warning',
      outcome: 'success',
      actorId: req.session.user.id,
      actorType: 'user',
      metadata: { action: 'purge_cache' },
    })

    return successResponse({ success: true, timestamp: new Date().toISOString() })
  }

  @Post('optimize-db')
  async optimizeDb(@Req() req: AdminReq) {
    const db = getClient()
    await db.execute(sql`ANALYZE`)

    await db.insert(auditLogs).values({
      category: 'ADMIN',
      action: 'system.db_optimized',
      severity: 'info',
      outcome: 'success',
      actorId: req.session.user.id,
      actorType: 'user',
      metadata: { action: 'analyze' },
    })

    return successResponse({ success: true, timestamp: new Date().toISOString() })
  }

  @Get('logs')
  async getLogs(
    @Query('level') level?: string,
    @Query('search') search?: string,
  ) {
    const logs = JsonLogger.getRecentLogs(level, search)
    return successResponse(logs)
  }

  @Post('logs/clear')
  async clearLogs() {
    JsonLogger.clearLogs()
    return successResponse({ success: true })
  }
}
