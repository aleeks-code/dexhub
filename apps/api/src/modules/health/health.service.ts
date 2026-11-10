import { Injectable } from '@nestjs/common'
import { getClient, sql } from '@dexhub/db'

interface CheckResult {
  status: 'healthy' | 'error'
  latencyMs?: number
  message?: string
}

interface MemoryResult {
  status: 'healthy'
  heapUsedMb: number
  heapTotalMb: number
  rssMb: number
}

export interface HealthStatus {
  status: 'healthy' | 'degraded'
  version: string
  uptimeSeconds: number
  timestamp: string
  checks: {
    database: CheckResult
    memory: MemoryResult
  }
}

@Injectable()
export class HealthService {
  async check(): Promise<HealthStatus> {
    const [database, memory] = await Promise.all([
      this.checkDatabase(),
      Promise.resolve(this.checkMemory()),
    ])

    const status = database.status === 'healthy' ? 'healthy' : 'degraded'

    return {
      status,
      version: process.env['npm_package_version'] ?? '0.1.0',
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      checks: { database, memory },
    }
  }

  private async checkDatabase(): Promise<CheckResult> {
    try {
      const db = getClient()
      const start = Date.now()
      await db.execute(sql`SELECT 1`)
      return { status: 'healthy', latencyMs: Date.now() - start }
    } catch (err) {
      return {
        status: 'error',
        message: err instanceof Error ? err.message : 'Database unreachable',
      }
    }
  }

  private checkMemory(): MemoryResult {
    const mem = process.memoryUsage()
    const toMb = (n: number) => Math.round((n / 1048576) * 10) / 10
    return {
      status: 'healthy',
      heapUsedMb: toMb(mem.heapUsed),
      heapTotalMb: toMb(mem.heapTotal),
      rssMb: toMb(mem.rss),
    }
  }
}
