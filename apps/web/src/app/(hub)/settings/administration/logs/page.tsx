'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  Info,
  RefreshCw,
  Search,
  Terminal,
  Trash2,
  XCircle,
} from 'lucide-react'
import { Button, cn } from '@dexhub/ui'
import { useT } from '@/i18n'
import {
  useClearSystemLogs,
  useSystemLogs,
  type SystemLogEntry,
} from '@/core/hooks/use-admin'

const LEVEL_COLORS: Record<string, { label: string; text: string; bg: string }> = {
  info: { label: 'INFO', text: 'text-sky-400', bg: 'bg-sky-500/10' },
  warn: { label: 'WARN', text: 'text-yellow-300', bg: 'bg-yellow-500/10' },
  error: { label: 'ERR', text: 'text-rose-400', bg: 'bg-rose-500/10' },
  fatal: { label: 'FATAL', text: 'text-rose-500', bg: 'bg-rose-500/20' },
  debug: { label: 'DEBUG', text: 'text-purple-400', bg: 'bg-purple-500/10' },
  verbose: { label: 'VERB', text: 'text-text-muted', bg: 'bg-surface-raised' },
}

export default function LogsPage() {
  const t = useT()
  const tl = t.admin.logs

  const [level, setLevel] = useState<string>('all')
  const [search, setSearch] = useState<string>('')
  const [expandedTraceId, setExpandedTraceId] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const { data: logs, isLoading, refetch, isFetching } = useSystemLogs(level, search)
  const clearLogs = useClearSystemLogs()

  const handleCopyLine = (log: SystemLogEntry) => {
    const text = `[${log.timestamp}] [${log.level.toUpperCase()}] [${log.context}] ${log.message}${log.trace ? '\n' + log.trace : ''}`
    navigator.clipboard.writeText(text)
    setCopiedId(log.id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const handleClear = () => {
    clearLogs.mutate()
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
              <Terminal className="h-6 w-6 text-primary" />
              {tl.title}
            </h1>
            <p className="mt-1 text-sm text-text-muted">{tl.subtitle}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isFetching}
              className="flex items-center gap-1.5 text-xs"
            >
              <RefreshCw className={cn('h-3.5 w-3.5', isFetching && 'animate-spin')} />
              Aggiorna
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleClear}
              disabled={clearLogs.isPending}
              className="flex items-center gap-1.5 text-xs text-text-muted hover:text-text"
            >
              <Trash2 className="h-3.5 w-3.5" />
              {tl.clearView}
            </Button>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-text-muted" />
          <input
            type="text"
            placeholder={tl.searchPlaceholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-border bg-surface-raised pl-9 pr-3 py-1.5 text-xs text-text placeholder-text-muted focus:border-primary focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={level}
            onChange={(e) => setLevel(e.target.value)}
            className="rounded-lg border border-border bg-surface-raised px-3 py-1.5 text-xs text-text focus:border-primary focus:outline-none"
          >
            <option value="all">{tl.allLevels}</option>
            <option value="error">{tl.errorLevel}</option>
            <option value="warn">{tl.warnLevel}</option>
            <option value="info">{tl.infoLevel}</option>
          </select>
          <span className="text-[11px] text-text-muted hidden sm:inline">
            Aggiornamento continuo (4s)
          </span>
        </div>
      </div>

      {/* Terminal View */}
      <div className="overflow-hidden rounded-xl border border-border bg-[#0d1117] shadow-xl">
        {/* Terminal Header */}
        <div className="flex items-center justify-between border-b border-border/40 bg-[#161b22] px-4 py-2.5">
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-rose-500/80 inline-block" />
            <span className="h-3 w-3 rounded-full bg-yellow-500/80 inline-block" />
            <span className="h-3 w-3 rounded-full bg-emerald-500/80 inline-block" />
            <span className="ml-2 font-mono text-xs text-text-muted">dexhub-api • live logs</span>
          </div>
          {logs && (
            <span className="font-mono text-[10px] text-text-muted">
              {logs.length} linee caricate
            </span>
          )}
        </div>

        {/* Terminal Body */}
        <div className="max-h-[550px] min-h-[300px] overflow-y-auto p-4 font-mono text-[11px] sm:text-xs leading-relaxed space-y-1">
          {isLoading ? (
            <div className="flex h-48 items-center justify-center text-text-muted">
              <RefreshCw className="mr-2 h-4 w-4 animate-spin text-primary" />
              Connessione al flusso log…
            </div>
          ) : !logs || logs.length === 0 ? (
            <div className="flex h-48 flex-col items-center justify-center text-text-muted">
              <Terminal className="h-8 w-8 opacity-30 mb-2" />
              <p>{tl.empty}</p>
            </div>
          ) : (
            logs.map((log) => {
              const cfg = LEVEL_COLORS[log.level] ?? {
                label: log.level.toUpperCase(),
                text: 'text-text-muted',
                bg: '',
              }
              const isExpanded = expandedTraceId === log.id
              const isCopied = copiedId === log.id

              return (
                <div
                  key={log.id}
                  className="group rounded px-2 py-1 transition-colors hover:bg-[#161b22]/70"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-wrap items-start gap-1.5 min-w-0">
                      <span className="text-text-subtle select-none">
                        {log.timestamp.slice(11, 19)}
                      </span>
                      <span className={cn('font-bold', cfg.text)}>
                        [{cfg.label}]
                      </span>
                      <span className="text-indigo-400 font-medium">
                        [{log.context}]
                      </span>
                      <span className="text-text break-all">{log.message}</span>
                    </div>

                    <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      {log.trace && (
                        <button
                          onClick={() => setExpandedTraceId(isExpanded ? null : log.id)}
                          className="rounded p-0.5 text-text-muted hover:text-text"
                          title="Espandi stack trace"
                        >
                          {isExpanded ? (
                            <ChevronDown className="h-3.5 w-3.5" />
                          ) : (
                            <ChevronRight className="h-3.5 w-3.5" />
                          )}
                        </button>
                      )}
                      <button
                        onClick={() => handleCopyLine(log)}
                        className="rounded p-0.5 text-text-muted hover:text-text"
                        title="Copia log"
                      >
                        {isCopied ? (
                          <Check className="h-3.5 w-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Stack trace if error */}
                  {log.trace && isExpanded && (
                    <div className="mt-2 rounded border border-rose-500/20 bg-rose-950/20 p-2.5 text-[10px] text-rose-300 overflow-x-auto whitespace-pre">
                      {log.trace}
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
