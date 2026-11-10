'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Copy,
  Eye,
  Filter,
  Info,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  X,
} from 'lucide-react'
import { Button, cn } from '@dexhub/ui'
import { useT } from '@/i18n'
import {
  useAdminAuditLogs,
  useAdminAuditSummary,
  type AuditLogItem,
} from '@/core/hooks/use-admin'

const CATEGORY_COLORS: Record<string, string> = {
  AUTH: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
  SECURITY: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  ADMIN: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  MODULE: 'bg-primary/10 text-primary border-primary/20',
  DATA: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
  PERMISSION: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
}

const SEVERITY_BADGES: Record<string, { label: string; class: string }> = {
  info: { label: 'Info', class: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  warning: { label: 'Warn', class: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  critical: { label: 'Critico', class: 'bg-rose-500/10 text-rose-400 border-rose-500/20' },
}

export default function AuditLogsPage() {
  const t = useT()
  const ta = t.admin.auditLogs

  const [page, setPage] = useState(1)
  const [category, setCategory] = useState<string>('all')
  const [severity, setSeverity] = useState<string>('all')
  const [outcome, setOutcome] = useState<string>('all')
  const [search, setSearch] = useState<string>('')
  const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null)
  const [copied, setCopied] = useState(false)

  const { data: summary } = useAdminAuditSummary()
  const { data, isLoading, refetch, isFetching } = useAdminAuditLogs({
    page,
    limit: 20,
    category,
    severity,
    outcome,
    search,
  })

  const handleCopyJson = (obj: unknown) => {
    navigator.clipboard.writeText(JSON.stringify(obj, null, 2))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
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
              <ShieldAlert className="h-6 w-6 text-primary" />
              {ta.title}
            </h1>
            <p className="mt-1 text-sm text-text-muted">{ta.subtitle}</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="flex items-center gap-1.5 text-xs self-start sm:self-auto"
          >
            <RefreshCw className={cn('h-3.5 w-3.5', isFetching && 'animate-spin')} />
            Aggiorna
          </Button>
        </div>
      </div>

      {/* Summary KPI Badges */}
      {summary && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5 sm:gap-4">
          <div className="rounded-xl border border-border bg-surface p-3.5">
            <span className="text-xs text-text-muted">{ta.totalLogs}</span>
            <p className="mt-1 font-mono text-xl font-bold text-text">{summary.total}</p>
          </div>
          <div className="rounded-xl border border-border bg-surface p-3.5">
            <span className="text-xs text-text-muted">{ta.last24h}</span>
            <p className="mt-1 font-mono text-xl font-bold text-primary">{summary.last24h}</p>
          </div>
          <div className="rounded-xl border border-border bg-surface p-3.5">
            <span className="text-xs text-text-muted">{ta.criticalEvents}</span>
            <p className="mt-1 font-mono text-xl font-bold text-rose-400">{summary.critical}</p>
          </div>
          <div className="rounded-xl border border-border bg-surface p-3.5">
            <span className="text-xs text-text-muted">{ta.warningEvents}</span>
            <p className="mt-1 font-mono text-xl font-bold text-amber-400">{summary.warning}</p>
          </div>
          <div className="rounded-xl border border-border bg-surface p-3.5">
            <span className="text-xs text-text-muted">{ta.failures}</span>
            <p className="mt-1 font-mono text-xl font-bold text-rose-300">{summary.failures}</p>
          </div>
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-text-muted" />
          <input
            type="text"
            placeholder={ta.searchPlaceholder}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            className="w-full rounded-lg border border-border bg-surface-raised pl-9 pr-3 py-1.5 text-xs text-text placeholder-text-muted focus:border-primary focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Category */}
          <select
            value={category}
            onChange={(e) => {
              setCategory(e.target.value)
              setPage(1)
            }}
            className="rounded-lg border border-border bg-surface-raised px-2.5 py-1.5 text-xs text-text focus:border-primary focus:outline-none"
          >
            <option value="all">Tutte le Categorie</option>
            <option value="AUTH">AUTH</option>
            <option value="SECURITY">SECURITY</option>
            <option value="ADMIN">ADMIN</option>
            <option value="MODULE">MODULE</option>
            <option value="DATA">DATA</option>
            <option value="PERMISSION">PERMISSION</option>
          </select>

          {/* Severity */}
          <select
            value={severity}
            onChange={(e) => {
              setSeverity(e.target.value)
              setPage(1)
            }}
            className="rounded-lg border border-border bg-surface-raised px-2.5 py-1.5 text-xs text-text focus:border-primary focus:outline-none"
          >
            <option value="all">Tutte le Gravità</option>
            <option value="info">Info</option>
            <option value="warning">Warning</option>
            <option value="critical">Critical</option>
          </select>

          {/* Outcome */}
          <select
            value={outcome}
            onChange={(e) => {
              setOutcome(e.target.value)
              setPage(1)
            }}
            className="rounded-lg border border-border bg-surface-raised px-2.5 py-1.5 text-xs text-text focus:border-primary focus:outline-none"
          >
            <option value="all">Tutti gli Esiti</option>
            <option value="success">Success</option>
            <option value="failure">Failure</option>
          </select>
        </div>
      </div>

      {/* Logs Table / Cards */}
      <div className="overflow-hidden rounded-xl border border-border bg-surface">
        {isLoading ? (
          <div className="flex h-48 items-center justify-center text-xs text-text-muted">
            <RefreshCw className="mr-2 h-4 w-4 animate-spin text-primary" />
            Caricamento log…
          </div>
        ) : !data || data.items.length === 0 ? (
          <div className="flex h-48 flex-col items-center justify-center text-center p-6">
            <ShieldCheck className="h-8 w-8 text-text-muted mb-2 opacity-50" />
            <p className="text-sm font-medium text-text">{ta.empty}</p>
            <p className="mt-1 text-xs text-text-muted">Prova a modificare i filtri o la ricerca.</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {data.items.map((log) => {
              const sev = SEVERITY_BADGES[log.severity] ?? { label: log.severity, class: '' }
              const catClass = CATEGORY_COLORS[log.category] ?? 'bg-surface-raised text-text-muted border-border'
              const dateStr = new Date(log.timestamp).toLocaleString()

              return (
                <div
                  key={log.id}
                  onClick={() => setSelectedLog(log)}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 transition-colors hover:bg-surface-raised cursor-pointer"
                >
                  <div className="flex items-start sm:items-center gap-3 min-w-0">
                    <span
                      className={cn(
                        'shrink-0 rounded-md border px-2 py-0.5 font-mono text-[10px] font-semibold uppercase',
                        catClass,
                      )}
                    >
                      {log.category}
                    </span>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-semibold text-text truncate">
                          {log.action}
                        </span>
                        {log.outcome === 'success' ? (
                          <span className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.2 text-[10px] font-medium text-emerald-400 bg-emerald-500/10">
                            <CheckCircle2 className="h-2.5 w-2.5" />
                            OK
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.2 text-[10px] font-medium text-rose-400 bg-rose-500/10">
                            <AlertCircle className="h-2.5 w-2.5" />
                            FAIL
                          </span>
                        )}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-text-muted">
                        <span>{dateStr}</span>
                        <span>•</span>
                        <span>Attore: {log.actorType} {log.actorId ? `(${log.actorId.slice(0, 8)}…)` : ''}</span>
                        {log.actorIp && (
                          <>
                            <span>•</span>
                            <span className="font-mono">{log.actorIp}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    <span
                      className={cn(
                        'rounded-md border px-2 py-0.5 text-[10px] font-semibold',
                        sev.class,
                      )}
                    >
                      {sev.label}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedLog(log)
                      }}
                      className="rounded p-1 text-text-muted hover:bg-surface hover:text-text transition-colors"
                      title={ta.colDetails}
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Pagination Bar */}
        {data && data.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-border px-4 py-3 text-xs text-text-muted">
            <span>
              {ta.pageOf.replace('{page}', String(data.page)).replace('{total}', String(data.totalPages))}
            </span>
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="h-7 px-2 text-xs"
              >
                <ChevronLeft className="h-3.5 w-3.5 mr-1" />
                {ta.prev}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
                disabled={page >= data.totalPages}
                className="h-7 px-2 text-xs"
              >
                {ta.next}
                <ChevronRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Details Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-lg rounded-xl border border-border bg-surface shadow-2xl flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    'rounded-md border px-2 py-0.5 font-mono text-[10px] font-semibold uppercase',
                    CATEGORY_COLORS[selectedLog.category] ?? '',
                  )}
                >
                  {selectedLog.category}
                </span>
                <h3 className="font-semibold text-text text-sm font-mono truncate">
                  {selectedLog.action}
                </h3>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="rounded p-1 text-text-muted hover:bg-surface-raised hover:text-text"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-surface-raised p-2.5">
                  <span className="text-text-muted">Data & Ora</span>
                  <p className="mt-1 font-mono text-text">
                    {new Date(selectedLog.timestamp).toLocaleString()}
                  </p>
                </div>
                <div className="rounded-lg bg-surface-raised p-2.5">
                  <span className="text-text-muted">Esito / Gravità</span>
                  <p className="mt-1 font-mono text-text flex items-center gap-1.5">
                    <span
                      className={
                        selectedLog.outcome === 'success' ? 'text-emerald-400' : 'text-rose-400'
                      }
                    >
                      {selectedLog.outcome.toUpperCase()}
                    </span>
                    <span>•</span>
                    <span className="capitalize">{selectedLog.severity}</span>
                  </p>
                </div>
              </div>

              <div className="space-y-2 rounded-lg bg-surface-raised p-3">
                <div className="flex justify-between">
                  <span className="text-text-muted">{ta.clientIp}:</span>
                  <span className="font-mono text-text">{selectedLog.actorIp || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">Attore ({selectedLog.actorType}):</span>
                  <span className="font-mono text-text">{selectedLog.actorId || 'Sistema'}</span>
                </div>
                {selectedLog.sessionId && (
                  <div className="flex justify-between">
                    <span className="text-text-muted">{ta.sessionId}:</span>
                    <span className="font-mono text-text truncate max-w-[200px]">
                      {selectedLog.sessionId}
                    </span>
                  </div>
                )}
                {selectedLog.actorUserAgent && (
                  <div className="pt-1">
                    <span className="text-text-muted">{ta.userAgent}:</span>
                    <p className="mt-0.5 font-mono text-[11px] text-text-muted break-all">
                      {selectedLog.actorUserAgent}
                    </p>
                  </div>
                )}
              </div>

              {selectedLog.metadata && Object.keys(selectedLog.metadata).length > 0 && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-text">{ta.metadata}</span>
                    <button
                      onClick={() => handleCopyJson(selectedLog.metadata)}
                      className="flex items-center gap-1 text-[11px] text-primary hover:underline"
                    >
                      <Copy className="h-3 w-3" />
                      {copied ? 'Copiato!' : 'Copia'}
                    </button>
                  </div>
                  <pre className="max-h-48 overflow-y-auto rounded-lg border border-border bg-bg p-3 font-mono text-[11px] text-text">
                    {JSON.stringify(selectedLog.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            <div className="border-t border-border px-5 py-3 flex justify-end">
              <Button size="sm" onClick={() => setSelectedLog(null)} className="text-xs">
                {ta.close}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
