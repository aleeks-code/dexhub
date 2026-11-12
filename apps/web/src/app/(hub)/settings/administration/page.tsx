'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Activity,
  HardDrive,
  LayoutGrid,
  MailOpen,
  Megaphone,
  MessageSquare,
  ShieldAlert,
  ShieldCheck,
  Terminal,
  Users,
  Wrench,
} from 'lucide-react'
import { useT } from '@/i18n'
import {
  useAdminAuditSummary,
  useBroadcastConfig,
  useInviteRequests,
} from '@/core/hooks/use-admin'
import { useFeedbackCounts } from '@/core/hooks/use-feedback'

const LS_BUGS = 'feedbackBugsLastSeen'
const LS_FEATURES = 'feedbackFeaturesLastSeen'

export default function AdministrationPage() {
  const t = useT()
  const ta = t.admin
  const { data: inviteRequests } = useInviteRequests()
  const { data: feedbackCounts } = useFeedbackCounts()
  const { data: auditSummary } = useAdminAuditSummary()
  const { data: broadcastConfig } = useBroadcastConfig()

  const [lastSeen, setLastSeen] = useState({ bugs: 0, features: 0 })

  useEffect(() => {
    setLastSeen({
      bugs: parseInt(localStorage.getItem(LS_BUGS) ?? '0', 10),
      features: parseInt(localStorage.getItem(LS_FEATURES) ?? '0', 10),
    })
  }, [])

  const pendingCount = inviteRequests?.filter((r) => r.status === 'pending').length ?? 0
  const totalBugs = feedbackCounts?.totalBugs ?? 0
  const totalFeatures = feedbackCounts?.totalFeatures ?? 0
  const newBugs = Math.max(0, totalBugs - lastSeen.bugs)
  const newFeatures = Math.max(0, totalFeatures - lastSeen.features)

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-text">{ta.index.title}</h1>
        <p className="mt-1 text-sm text-text-muted">{ta.index.subtitle}</p>
      </div>

      {/* Sezione Sistema, Telemetria & Monitoraggio */}
      <div className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-text-subtle px-1">
          Infrastruttura & Telemetria
        </h2>

        <div className="space-y-3">
          <Link
            href="/settings/administration/system"
            className="flex items-center gap-4 rounded-xl border border-border bg-surface p-4 transition-colors hover:bg-surface-raised"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-muted text-primary">
              <Activity className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-text">{ta.system.title}</p>
              <p className="text-xs text-text-muted">{ta.index.systemDesc}</p>
            </div>
            <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
              Live
            </span>
          </Link>

          <Link
            href="/settings/administration/audit-logs"
            className="flex items-center gap-4 rounded-xl border border-border bg-surface p-4 transition-colors hover:bg-surface-raised"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-rose-500/10 text-rose-400">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-text">{ta.auditLogs.title}</p>
              <p className="text-xs text-text-muted">{ta.index.auditLogsDesc}</p>
            </div>
            {auditSummary && auditSummary.critical > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1.5 text-xs font-bold text-white">
                {auditSummary.critical}
              </span>
            )}
          </Link>

          <Link
            href="/settings/administration/maintenance"
            className="flex items-center gap-4 rounded-xl border border-border bg-surface p-4 transition-colors hover:bg-surface-raised"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-yellow-500/10 text-yellow-400">
              <Wrench className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-text">{ta.maintenance.title}</p>
              <p className="text-xs text-text-muted">{ta.index.maintenanceDesc}</p>
            </div>
          </Link>

          <Link
            href="/settings/administration/logs"
            className="flex items-center gap-4 rounded-xl border border-border bg-surface p-4 transition-colors hover:bg-surface-raised"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400">
              <Terminal className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-text">{ta.logs.title}</p>
              <p className="text-xs text-text-muted">{ta.index.logsDesc}</p>
            </div>
          </Link>

          <Link
            href="/settings/administration/broadcast"
            className="flex items-center gap-4 rounded-xl border border-border bg-surface p-4 transition-colors hover:bg-surface-raised"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-muted text-primary">
              <Megaphone className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-text">{ta.broadcast.title}</p>
              <p className="text-xs text-text-muted">{ta.index.broadcastDesc}</p>
            </div>
            {broadcastConfig?.enabled && (
              <span className="rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-semibold text-primary">
                Attivo
              </span>
            )}
          </Link>
        </div>
      </div>

      {/* Sezione Utenti & Controllo Accessi */}
      <div className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-text-subtle px-1">
          Utenti, Moduli & Feedback
        </h2>

        <div className="space-y-3">
          <Link
            href="/settings/administration/users"
            className="flex items-center gap-4 rounded-xl border border-border bg-surface p-4 transition-colors hover:bg-surface-raised"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-muted text-primary">
              <Users className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-text">{ta.users.title}</p>
              <p className="text-xs text-text-muted">{ta.index.usersDesc}</p>
            </div>
          </Link>

          <Link
            href="/settings/administration/invite-requests"
            className="flex items-center gap-4 rounded-xl border border-border bg-surface p-4 transition-colors hover:bg-surface-raised"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-muted text-primary">
              <MailOpen className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-text">{ta.inviteRequests.title}</p>
              <p className="text-xs text-text-muted">{ta.index.inviteRequestsDesc}</p>
            </div>
            {pendingCount > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-warning px-1.5 text-xs font-bold text-white">
                {pendingCount}
              </span>
            )}
          </Link>

          <Link
            href="/settings/administration/feedback"
            className="flex items-center gap-4 rounded-xl border border-border bg-surface p-4 transition-colors hover:bg-surface-raised"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-muted text-primary">
              <MessageSquare className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-text">{t.feedback.admin.title}</p>
              <p className="text-xs text-text-muted">{ta.index.feedbackDesc}</p>
            </div>
            <div className="flex items-center gap-1.5">
              {newBugs > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-error px-1.5 text-xs font-bold text-white">
                  {newBugs}
                </span>
              )}
              {newFeatures > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-bold text-primary-foreground">
                  {newFeatures}
                </span>
              )}
            </div>
          </Link>

          <Link
            href="/settings/administration/security"
            className="flex items-center gap-4 rounded-xl border border-border bg-surface p-4 transition-colors hover:bg-surface-raised"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-muted text-primary">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-text">{ta.security.title}</p>
              <p className="text-xs text-text-muted">{ta.index.securityDesc}</p>
            </div>
          </Link>

          <Link
            href="/settings/administration/modules"
            className="flex items-center gap-4 rounded-xl border border-border bg-surface p-4 transition-colors hover:bg-surface-raised"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-muted text-primary">
              <LayoutGrid className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-text">{ta.modules.title}</p>
              <p className="text-xs text-text-muted">{ta.index.modulesDesc}</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  )
}
