'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Trash2 } from 'lucide-react'
import { cn } from '@dexhub/ui'
import { useT } from '@/i18n'
import {
  useAdminFeedback,
  useUpdateFeedbackStatus,
  useDeleteFeedback,
  type AdminFeedbackItem,
  type FeedbackStatus,
} from '@/core/hooks/use-feedback'

type Tab = 'bugs' | 'features'

const LS_BUGS = 'feedbackBugsLastSeen'
const LS_FEATURES = 'feedbackFeaturesLastSeen'

function statusBadgeClass(status: string) {
  const map: Record<string, string> = {
    open: 'bg-warning/10 text-warning',
    in_progress: 'bg-primary/10 text-primary',
    closed: 'bg-success/10 text-success',
  }
  return map[status] ?? 'bg-surface-raised text-text-muted'
}

function FeatureCard({ item, onDelete }: { item: AdminFeedbackItem; onDelete: () => void }) {
  return (
    <div className="group rounded-lg border border-border bg-bg p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <p className="font-medium text-text">{item.title}</p>
          <p className="mt-1 text-sm text-text-muted whitespace-pre-wrap">{item.message}</p>
        </div>
        <div className="shrink-0 flex flex-col items-end gap-2">
          <div className="text-right">
            <p className="text-xs text-text-subtle">
              {new Date(item.createdAt).toLocaleDateString('it-IT', {
                day: '2-digit', month: '2-digit', year: 'numeric',
              })}
            </p>
            <p className="mt-0.5 text-xs text-text-muted">
              {item.userEmail ?? item.userId.slice(0, 8)}
            </p>
          </div>
          <button
            onClick={onDelete}
            className="rounded p-1 text-text-subtle opacity-0 transition-opacity group-hover:opacity-100 hover:text-error"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}

export default function AdminFeedbackPage() {
  const t = useT()
  const tf = t.feedback
  const ta = t.admin
  const [activeTab, setActiveTab] = useState<Tab>('bugs')

  // Always fetch both so tab badges are immediately accurate
  const { data: bugs, isLoading: bugsLoading } = useAdminFeedback('bug')
  const { data: features, isLoading: featuresLoading } = useAdminFeedback('feature')
  const updateStatus = useUpdateFeedbackStatus()
  const deleteFeedback = useDeleteFeedback()

  // Mark bugs as read when their data loads while on the bugs tab
  useEffect(() => {
    if (bugs !== undefined) {
      localStorage.setItem(LS_BUGS, String(bugs.length))
    }
  }, [bugs])

  // Mark features as read when user opens that tab and data is available
  useEffect(() => {
    if (activeTab === 'features' && features !== undefined) {
      localStorage.setItem(LS_FEATURES, String(features.length))
    }
  }, [activeTab, features])

  const statusOptions: { value: FeedbackStatus; label: string }[] = [
    { value: 'open', label: tf.admin.statusOpen },
    { value: 'in_progress', label: tf.admin.statusInProgress },
    { value: 'closed', label: tf.admin.statusClosed },
  ]

  function handleDelete(item: AdminFeedbackItem) {
    const msg = item.type === 'bug' ? tf.admin.confirmDeleteBug : tf.admin.confirmDeleteFeature
    if (!confirm(msg)) return
    deleteFeedback.mutate(item.id)
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Link
        href="/settings/administration"
        className="inline-flex items-center text-sm text-text-muted hover:text-text transition-colors"
      >
        {ta.back}
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-text">{tf.admin.title}</h1>
        <p className="mt-1 text-sm text-text-muted">{tf.admin.subtitle}</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {([
          ['bugs', tf.admin.tabBugs, bugs?.length],
          ['features', tf.admin.tabFeatures, features?.length],
        ] as const).map(([key, label, count]) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px',
              activeTab === key
                ? 'border-primary text-primary'
                : 'border-transparent text-text-muted hover:text-text',
            )}
          >
            {label}
            {count != null && count > 0 && (
              <span className="rounded-full bg-surface-raised px-1.5 py-0.5 text-xs leading-none">
                {count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Bug tickets tab */}
      {activeTab === 'bugs' && (
        <div className="rounded-xl border border-border bg-surface p-6">
          {bugsLoading && (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-12 animate-pulse rounded-lg bg-surface-raised" />
              ))}
            </div>
          )}
          {!bugsLoading && (!bugs || bugs.length === 0) && (
            <p className="text-sm text-text-muted">{tf.admin.bugsEmpty}</p>
          )}
          {bugs && bugs.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs font-medium uppercase tracking-wider text-text-subtle">
                    <th className="pb-3 pr-4">{tf.admin.colUser}</th>
                    <th className="pb-3 pr-4">{tf.admin.colTitle}</th>
                    <th className="pb-3 pr-4 w-64">{tf.admin.colMessage}</th>
                    <th className="pb-3 pr-4">{tf.admin.colStatus}</th>
                    <th className="pb-3 pr-4">{tf.admin.colDate}</th>
                    <th className="pb-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {bugs.map((bug) => (
                    <tr key={bug.id} className="group">
                      <td className="py-3 pr-4 text-xs text-text-muted whitespace-nowrap">
                        {bug.userEmail ?? bug.userId.slice(0, 8)}
                      </td>
                      <td className="py-3 pr-4 font-medium text-text">{bug.title}</td>
                      <td className="py-3 pr-4 w-64">
                        <p className="line-clamp-2 text-xs text-text-muted">{bug.message}</p>
                      </td>
                      <td className="py-3 pr-4">
                        <select
                          value={bug.status}
                          onChange={(e) =>
                            updateStatus.mutate({ id: bug.id, status: e.target.value as FeedbackStatus })
                          }
                          disabled={updateStatus.isPending}
                          className={cn(
                            'rounded-full px-2 py-0.5 text-xs font-medium cursor-pointer border-0 focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50',
                            statusBadgeClass(bug.status),
                          )}
                        >
                          {statusOptions.map((opt) => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      </td>
                      <td className="py-3 pr-4 text-xs text-text-muted whitespace-nowrap">
                        {new Date(bug.createdAt).toLocaleDateString('it-IT', {
                          day: '2-digit', month: '2-digit', year: 'numeric',
                        })}
                      </td>
                      <td className="py-3">
                        <button
                          onClick={() => handleDelete(bug)}
                          disabled={deleteFeedback.isPending}
                          className="rounded p-1 text-text-subtle opacity-0 transition-opacity group-hover:opacity-100 hover:text-error disabled:opacity-30"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Feature requests tab */}
      {activeTab === 'features' && (
        <div className="rounded-xl border border-border bg-surface p-6">
          {featuresLoading && (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-20 animate-pulse rounded-lg bg-surface-raised" />
              ))}
            </div>
          )}
          {!featuresLoading && (!features || features.length === 0) && (
            <p className="text-sm text-text-muted">{tf.admin.featuresEmpty}</p>
          )}
          {features && features.length > 0 && (
            <div className="space-y-3">
              {features.map((feature) => (
                <FeatureCard
                  key={feature.id}
                  item={feature}
                  onDelete={() => handleDelete(feature)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
