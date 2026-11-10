'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  CheckCircle2,
  Database,
  Globe,
  HardDrive,
  Laptop,
  LogOut,
  RefreshCw,
  Shield,
  Smartphone,
  Sparkles,
  Trash2,
  User,
  Wrench,
  X,
} from 'lucide-react'
import { Button, cn } from '@dexhub/ui'
import { useT } from '@/i18n'
import {
  useAdminSessions,
  useAdminTableStats,
  useCleanupExpiredSessions,
  useRevokeSession,
  useVacuumAnalyze,
  type AdminSessionItem,
} from '@/core/hooks/use-admin'

function getDeviceIcon(ua: string | null) {
  if (!ua) return Globe
  if (/mobi|android|iphone|ipad/i.test(ua)) return Smartphone
  return Laptop
}

function parseBrowserAndOs(ua: string | null) {
  if (!ua) return 'Sconosciuto'
  let os = 'Sconosciuto'
  if (ua.includes('Win')) os = 'Windows'
  else if (ua.includes('Mac')) os = 'macOS'
  else if (ua.includes('Linux')) os = 'Linux'
  else if (ua.includes('Android')) os = 'Android'
  else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS'

  let browser = 'Browser'
  if (ua.includes('Edg/')) browser = 'Edge'
  else if (ua.includes('Chrome/')) browser = 'Chrome'
  else if (ua.includes('Firefox/')) browser = 'Firefox'
  else if (ua.includes('Safari/') && !ua.includes('Chrome')) browser = 'Safari'

  return `${browser} su ${os}`
}

export default function MaintenancePage() {
  const t = useT()
  const tm = t.admin.maintenance

  const [activeTab, setActiveTab] = useState<'sessions' | 'tables'>('sessions')
  const [confirmRevokeId, setConfirmRevokeId] = useState<string | null>(null)
  const [successBanner, setSuccessBanner] = useState<string | null>(null)

  const { data: sessions, isLoading: sessionsLoading, refetch: refetchSessions } = useAdminSessions()
  const { data: tables, isLoading: tablesLoading, refetch: refetchTables } = useAdminTableStats()

  const revokeSession = useRevokeSession()
  const cleanupSessions = useCleanupExpiredSessions()
  const vacuumAnalyze = useVacuumAnalyze()

  const handleRevoke = (id: string) => {
    revokeSession.mutate(id, {
      onSuccess: () => {
        setConfirmRevokeId(null)
        setSuccessBanner('Sessione revocata con successo.')
        setTimeout(() => setSuccessBanner(null), 3000)
      },
    })
  }

  const handleCleanupSessions = () => {
    cleanupSessions.mutate(undefined, {
      onSuccess: (res) => {
        setSuccessBanner(`Pulizia completata: eliminate ${res.cleanedCount} sessioni scadute.`)
        setTimeout(() => setSuccessBanner(null), 3500)
      },
    })
  }

  const handleVacuum = () => {
    vacuumAnalyze.mutate(undefined, {
      onSuccess: () => {
        setSuccessBanner(tm.vacuumSuccess)
        setTimeout(() => setSuccessBanner(null), 3000)
      },
    })
  }

  const maxSize = tables && tables.length > 0 ? Math.max(...tables.map((t) => t.sizeBytes), 1) : 1

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
              <Wrench className="h-6 w-6 text-primary" />
              {tm.title}
            </h1>
            <p className="mt-1 text-sm text-text-muted">{tm.subtitle}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => (activeTab === 'sessions' ? refetchSessions() : refetchTables())}
              className="flex items-center gap-1.5 text-xs"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Aggiorna
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-border pb-1">
        <button
          onClick={() => setActiveTab('sessions')}
          className={cn(
            'flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg transition-colors',
            activeTab === 'sessions'
              ? 'bg-primary/10 text-primary'
              : 'text-text-muted hover:text-text hover:bg-surface',
          )}
        >
          <User className="h-4 w-4" />
          {tm.sessionsTab}
          {sessions && (
            <span className="rounded-full bg-surface-raised px-1.5 py-0.2 text-[10px] font-mono">
              {sessions.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('tables')}
          className={cn(
            'flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg transition-colors',
            activeTab === 'tables'
              ? 'bg-primary/10 text-primary'
              : 'text-text-muted hover:text-text hover:bg-surface',
          )}
        >
          <HardDrive className="h-4 w-4" />
          {tm.tablesTab}
        </button>
      </div>

      {/* Success Notification */}
      {successBanner && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-xs text-emerald-300">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
          <span>{successBanner}</span>
        </div>
      )}

      {/* SESSIONS TAB */}
      {activeTab === 'sessions' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-border bg-surface p-4">
            <div>
              <h2 className="text-sm font-semibold text-text">{tm.activeSessionsTitle}</h2>
              <p className="text-xs text-text-muted">
                Visualizza e revoca istantaneamente le sessioni aperte dai dispositivi degli utenti.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCleanupSessions}
              disabled={cleanupSessions.isPending}
              className="flex items-center gap-1.5 text-xs self-start sm:self-auto shrink-0"
            >
              <Trash2 className="h-3.5 w-3.5 text-warning" />
              {cleanupSessions.isPending ? tm.cleaning : tm.cleanupExpired}
            </Button>
          </div>

          <div className="overflow-hidden rounded-xl border border-border bg-surface divide-y divide-border">
            {sessionsLoading ? (
              <div className="flex h-48 items-center justify-center text-xs text-text-muted">
                <RefreshCw className="mr-2 h-4 w-4 animate-spin text-primary" />
                Caricamento sessioni…
              </div>
            ) : !sessions || sessions.length === 0 ? (
              <div className="p-8 text-center text-xs text-text-muted">{tm.noSessions}</div>
            ) : (
              sessions.map((sess) => {
                const DeviceIcon = getDeviceIcon(sess.userAgent)
                const deviceDesc = parseBrowserAndOs(sess.userAgent)
                const createdDate = new Date(sess.createdAt).toLocaleString()
                const expiresDate = new Date(sess.expiresAt).toLocaleString()

                return (
                  <div
                    key={sess.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 transition-colors hover:bg-surface-raised"
                  >
                    <div className="flex items-start sm:items-center gap-3 min-w-0">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-raised text-primary">
                        <DeviceIcon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-text truncate">
                            {sess.userName || sess.userEmail || 'Utente sconosciuto'}
                          </span>
                          {sess.userIsAdmin && (
                            <span className="rounded bg-primary/15 px-1.5 py-0.2 text-[10px] font-semibold text-primary">
                              Admin
                            </span>
                          )}
                          {sess.isExpired ? (
                            <span className="rounded bg-rose-500/10 px-1.5 py-0.2 text-[10px] font-medium text-rose-400">
                              {tm.statusExpired}
                            </span>
                          ) : (
                            <span className="rounded bg-emerald-500/10 px-1.5 py-0.2 text-[10px] font-medium text-emerald-400">
                              {tm.statusActive}
                            </span>
                          )}
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-text-muted">
                          <span>{deviceDesc}</span>
                          <span>•</span>
                          <span className="font-mono">{sess.ipAddress || 'IP sconosciuto'}</span>
                          <span>•</span>
                          <span>Scade: {expiresDate}</span>
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0 self-end sm:self-center">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setConfirmRevokeId(sess.id)}
                        className="h-7 px-2.5 text-xs text-rose-400 hover:text-rose-300 hover:border-rose-500/40"
                      >
                        <LogOut className="h-3 w-3 mr-1" />
                        {tm.revokeBtn}
                      </Button>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}

      {/* TABLES STORAGE TAB */}
      {activeTab === 'tables' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-border bg-surface p-4">
            <div>
              <h2 className="text-sm font-semibold text-text">{tm.tablesTitle}</h2>
              <p className="text-xs text-text-muted">
                Statistiche fisiche dell'occupazione di memoria su disco delle relazioni di PostgreSQL.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleVacuum}
              disabled={vacuumAnalyze.isPending}
              className="flex items-center gap-1.5 text-xs self-start sm:self-auto shrink-0"
            >
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              {vacuumAnalyze.isPending ? 'In corso…' : tm.vacuumBtn}
            </Button>
          </div>

          <div className="overflow-hidden rounded-xl border border-border bg-surface">
            {tablesLoading ? (
              <div className="flex h-48 items-center justify-center text-xs text-text-muted">
                <RefreshCw className="mr-2 h-4 w-4 animate-spin text-primary" />
                Caricamento statistiche tabelle…
              </div>
            ) : !tables || tables.length === 0 ? (
              <div className="p-8 text-center text-xs text-text-muted">Nessuna tabella trovata.</div>
            ) : (
              <div className="divide-y divide-border">
                {tables.map((table) => {
                  const percent = Math.min(100, Math.round((table.sizeBytes / maxSize) * 100))
                  return (
                    <div key={table.tableName} className="p-4 transition-colors hover:bg-surface-raised">
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="font-mono font-semibold text-text">{table.tableName}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-text-muted font-mono">
                            ~{table.rowCount} {tm.colRows.toLowerCase()}
                          </span>
                          <span className="font-mono font-bold text-primary">
                            {table.sizeFormatted}
                          </span>
                        </div>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-raised">
                        <div
                          className="h-full bg-primary/70 rounded-full transition-all duration-300"
                          style={{ width: `${Math.max(2, percent)}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Revoke Confirmation Modal */}
      {confirmRevokeId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-xl border border-border bg-surface p-5 shadow-2xl">
            <h3 className="font-semibold text-text text-sm">Conferma revoca sessione</h3>
            <p className="mt-2 text-xs text-text-muted">{tm.confirmRevoke}</p>
            <div className="mt-5 flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setConfirmRevokeId(null)}
                className="text-xs"
              >
                Annulla
              </Button>
              <Button
                size="sm"
                onClick={() => handleRevoke(confirmRevokeId)}
                disabled={revokeSession.isPending}
                className="text-xs bg-rose-600 hover:bg-rose-700 text-white"
              >
                {revokeSession.isPending ? tm.revoking : tm.revokeBtn}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
