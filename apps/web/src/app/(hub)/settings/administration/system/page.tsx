'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Activity,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Cpu,
  Database,
  Layers,
  RefreshCw,
  Server,
  Sparkles,
  Trash2,
  Users,
  Zap,
} from 'lucide-react'
import { Button, cn } from '@dexhub/ui'
import { useT } from '@/i18n'
import {
  useOptimizeDb,
  usePingDb,
  usePurgeCache,
  useSystemStats,
} from '@/core/hooks/use-admin'

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  if (days > 0) return `${days}d ${hours}h ${minutes}m`
  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes}m ${seconds % 60}s`
}

export default function SystemPage() {
  const t = useT()
  const ts = t.admin.system
  const { data: stats, isLoading, refetch } = useSystemStats()
  const pingDb = usePingDb()
  const purgeCache = usePurgeCache()
  const optimizeDb = useOptimizeDb()

  const [lastPing, setLastPing] = useState<number | null>(null)
  const [successBanner, setSuccessBanner] = useState<string | null>(null)

  const handlePing = () => {
    pingDb.mutate(undefined, {
      onSuccess: (data) => {
        setLastPing(data.latencyMs)
      },
    })
  }

  const handlePurgeCache = () => {
    purgeCache.mutate(undefined, {
      onSuccess: () => {
        setSuccessBanner(ts.cachePurged)
        setTimeout(() => setSuccessBanner(null), 3000)
      },
    })
  }

  const handleOptimizeDb = () => {
    optimizeDb.mutate(undefined, {
      onSuccess: () => {
        setSuccessBanner(ts.dbOptimized)
        setTimeout(() => setSuccessBanner(null), 3000)
      },
    })
  }

  if (isLoading || !stats) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-text-muted">
        <RefreshCw className="mr-2 h-4 w-4 animate-spin text-primary" />
        Caricamento telemetria di sistema…
      </div>
    )
  }

  const heapPercent = stats.memory.heapUsagePercent
  const heapColor =
    heapPercent > 85 ? 'bg-error' : heapPercent > 65 ? 'bg-warning' : 'bg-primary'

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/settings/administration"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-text-muted transition-colors hover:text-text mb-3"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {t.admin.back}
        </Link>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-text flex items-center gap-2.5">
              <Activity className="h-6 w-6 text-primary" />
              {ts.title}
            </h1>
            <p className="mt-1 text-sm text-text-muted">{ts.subtitle}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              className="flex items-center gap-1.5 text-xs"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Aggiorna
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handlePing}
              disabled={pingDb.isPending}
              className="flex items-center gap-1.5 text-xs"
            >
              <Zap className="h-3.5 w-3.5 text-sky-400" />
              {pingDb.isPending ? 'Ping…' : ts.testPing}
              {lastPing !== null && (
                <span className="ml-1 rounded bg-surface-raised px-1 py-0.5 font-mono text-[10px] text-primary">
                  {lastPing}ms
                </span>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Success Notification */}
      {successBanner && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-xs text-emerald-300">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
          <span>{successBanner}</span>
        </div>
      )}

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <div className="rounded-xl border border-border bg-surface p-4">
          <div className="flex items-center gap-2 text-text-muted">
            <Server className="h-4 w-4 text-primary" />
            <span className="text-xs font-medium">{ts.uptime}</span>
          </div>
          <p className="mt-2 text-lg sm:text-xl font-bold font-mono text-text">
            {formatUptime(stats.uptimeSeconds)}
          </p>
          <span className="text-[10px] text-text-muted">{stats.environment}</span>
        </div>

        <div className="rounded-xl border border-border bg-surface p-4">
          <div className="flex items-center gap-2 text-text-muted">
            <Cpu className="h-4 w-4 text-emerald-400" />
            <span className="text-xs font-medium">{ts.heapUsed}</span>
          </div>
          <p className="mt-2 text-lg sm:text-xl font-bold font-mono text-text">
            {stats.memory.heapUsedMb} <span className="text-xs font-normal text-text-muted">MB</span>
          </p>
          <span className="text-[10px] text-text-muted">{heapPercent}% di {stats.memory.heapTotalMb}MB</span>
        </div>

        <div className="rounded-xl border border-border bg-surface p-4">
          <div className="flex items-center gap-2 text-text-muted">
            <Database className="h-4 w-4 text-sky-400" />
            <span className="text-xs font-medium">{ts.dbLatency}</span>
          </div>
          <p className="mt-2 text-lg sm:text-xl font-bold font-mono text-text">
            {stats.database.latencyMs} <span className="text-xs font-normal text-text-muted">ms</span>
          </p>
          <span className="text-[10px] text-text-muted">{stats.database.activeConnections} conn attive</span>
        </div>

        <div className="rounded-xl border border-border bg-surface p-4">
          <div className="flex items-center gap-2 text-text-muted">
            <Layers className="h-4 w-4 text-sky-400" />
            <span className="text-xs font-medium">{ts.dbSize}</span>
          </div>
          <p className="mt-2 text-lg sm:text-xl font-bold font-mono text-text">
            {stats.database.sizeMb} <span className="text-xs font-normal text-text-muted">MB</span>
          </p>
          <span className="text-[10px] text-text-muted">{stats.database.version}</span>
        </div>
      </div>

      {/* Memory & Resource Breakdown */}
      <div className="grid gap-4 sm:grid-cols-2">
        <section className="rounded-xl border border-border bg-surface p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-text flex items-center gap-2">
              <Cpu className="h-4 w-4 text-primary" />
              {ts.memoryTitle}
            </h2>
            <span className="font-mono text-xs text-text-muted">Node.js {stats.nodeVersion}</span>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-xs text-text-muted">
              <span>Heap Allocation</span>
              <span className="font-mono font-medium text-text">
                {stats.memory.heapUsedMb} MB / {stats.memory.heapTotalMb} MB ({heapPercent}%)
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-surface-raised">
              <div
                className={cn('h-full transition-all duration-500', heapColor)}
                style={{ width: `${Math.min(100, Math.max(5, heapPercent))}%` }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2 text-xs">
            <div className="rounded-lg bg-surface-raised p-2.5">
              <span className="text-text-muted">Resident Set Size (RSS)</span>
              <p className="mt-1 font-mono font-semibold text-text">{stats.memory.rssMb} MB</p>
            </div>
            <div className="rounded-lg bg-surface-raised p-2.5">
              <span className="text-text-muted">Piattaforma Host</span>
              <p className="mt-1 font-mono font-semibold text-text">
                {stats.platform} ({stats.arch})
              </p>
            </div>
          </div>
        </section>

        {/* Database & Storage Breakdown */}
        <section className="rounded-xl border border-border bg-surface p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-text flex items-center gap-2">
              <Database className="h-4 w-4 text-sky-400" />
              {ts.databaseTitle}
            </h2>
            <span className="font-mono text-xs text-text-muted">PostgreSQL 16</span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="rounded-lg bg-surface-raised p-2.5">
              <span className="text-text-muted">{ts.dbSize}</span>
              <p className="mt-1 font-mono font-semibold text-text">{stats.database.sizeMb} MB</p>
            </div>
            <div className="rounded-lg bg-surface-raised p-2.5">
              <span className="text-text-muted">{ts.dbConnections}</span>
              <p className="mt-1 font-mono font-semibold text-text">{stats.database.activeConnections}</p>
            </div>
          </div>

          <div className="pt-1">
            <Button
              variant="outline"
              size="sm"
              onClick={handleOptimizeDb}
              disabled={optimizeDb.isPending}
              className="w-full flex items-center justify-center gap-2 text-xs"
            >
              {optimizeDb.isPending ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Sparkles className="h-3.5 w-3.5 text-primary" />
              )}
              {optimizeDb.isPending ? ts.optimizing : ts.optimizeDb}
            </Button>
          </div>
        </section>
      </div>

      {/* Global Records Count */}
      <section className="rounded-xl border border-border bg-surface p-5 space-y-4">
        <h2 className="text-sm font-semibold text-text flex items-center gap-2">
          <Layers className="h-4 w-4 text-primary" />
          {ts.countsTitle}
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 text-xs">
          <div className="rounded-lg bg-surface-raised p-3">
            <span className="text-text-muted">{ts.registeredUsers}</span>
            <p className="mt-1 font-mono text-lg font-bold text-text">{stats.counts.users}</p>
          </div>
          <div className="rounded-lg bg-surface-raised p-3">
            <span className="text-text-muted">{ts.activeSessions}</span>
            <p className="mt-1 font-mono text-lg font-bold text-emerald-400">
              {stats.counts.activeSessions}
            </p>
          </div>
          <div className="rounded-lg bg-surface-raised p-3">
            <span className="text-text-muted">{ts.tasksCount}</span>
            <p className="mt-1 font-mono text-lg font-bold text-text">{stats.counts.tasks}</p>
          </div>
          <div className="rounded-lg bg-surface-raised p-3">
            <span className="text-text-muted">{ts.worklogCount}</span>
            <p className="mt-1 font-mono text-lg font-bold text-text">{stats.counts.worklogEntries}</p>
          </div>
          <div className="rounded-lg bg-surface-raised p-3">
            <span className="text-text-muted">{ts.auditCount}</span>
            <p className="mt-1 font-mono text-lg font-bold text-text">{stats.counts.auditLogs}</p>
          </div>
          <div className="rounded-lg bg-surface-raised p-3">
            <span className="text-text-muted">{ts.cacheCount}</span>
            <p className="mt-1 font-mono text-lg font-bold text-text">{stats.counts.cacheEntries}</p>
          </div>
        </div>
      </section>

      {/* Maintenance Actions */}
      <section className="rounded-xl border border-border bg-surface p-5">
        <h2 className="text-sm font-semibold text-text flex items-center gap-2 mb-3">
          <Trash2 className="h-4 w-4 text-warning" />
          {ts.quickActions}
        </h2>
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-lg bg-surface-raised p-4">
          <div>
            <p className="text-sm font-medium text-text">{ts.purgeCache}</p>
            <p className="text-xs text-text-muted">
              Rimuove tutti gli oggetti serializzati temporanei dalla tabella cache_store di PostgreSQL.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handlePurgeCache}
            disabled={purgeCache.isPending}
            className="w-full sm:w-auto shrink-0 flex items-center gap-2 text-xs text-warning border-warning/30 hover:bg-warning/10"
          >
            {purgeCache.isPending ? (
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Trash2 className="h-3.5 w-3.5" />
            )}
            {purgeCache.isPending ? ts.purging : ts.purgeCache}
          </Button>
        </div>
      </section>
    </div>
  )
}
