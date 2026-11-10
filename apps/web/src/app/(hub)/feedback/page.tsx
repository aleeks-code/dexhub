'use client'

import { useState } from 'react'
import { Bug, Lightbulb } from 'lucide-react'
import { cn } from '@dexhub/ui'
import { useT } from '@/i18n'
import { useMyTickets, type FeedbackStatus, type FeedbackType } from '@/core/hooks/use-feedback'
import { FeedbackModal } from '@/core/components/feedback-modal'

function StatusBadge({ status, t }: { status: FeedbackStatus; t: Record<string, string> }) {
  const map: Record<FeedbackStatus, { label: string; cls: string }> = {
    open: { label: t.statusOpen ?? '', cls: 'bg-warning/10 text-warning' },
    in_progress: { label: t.statusInProgress ?? '', cls: 'bg-primary/10 text-primary' },
    closed: { label: t.statusClosed ?? '', cls: 'bg-success/10 text-success' },
  }
  const entry = map[status] ?? map.open
  return (
    <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', entry.cls)}>
      {entry.label}
    </span>
  )
}

export default function FeedbackPage() {
  const t = useT()
  const tf = t.feedback
  const [modalType, setModalType] = useState<FeedbackType | null>(null)
  const { data: tickets, isLoading } = useMyTickets()

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text">{tf.myTickets.title}</h1>
        <p className="mt-1 text-sm text-text-muted">{tf.myTickets.subtitle}</p>
      </div>

      {/* Two separate entry points */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => setModalType('bug')}
          className="flex items-center gap-3 rounded-xl border border-border bg-surface p-4 text-left transition-colors hover:bg-surface-raised"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-error/10">
            <Bug className="h-4 w-4 text-error" />
          </div>
          <span className="text-sm font-medium text-text">{tf.bugBtn}</span>
        </button>
        <button
          onClick={() => setModalType('feature')}
          className="flex items-center gap-3 rounded-xl border border-border bg-surface p-4 text-left transition-colors hover:bg-surface-raised"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <Lightbulb className="h-4 w-4 text-primary" />
          </div>
          <span className="text-sm font-medium text-text">{tf.featureBtn}</span>
        </button>
      </div>

      {/* Bug tickets list */}
      <div className="rounded-xl border border-border bg-surface p-6">
        {isLoading && (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-12 animate-pulse rounded-lg bg-surface-raised" />
            ))}
          </div>
        )}
        {!isLoading && (!tickets || tickets.length === 0) && (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <Bug className="h-8 w-8 text-text-subtle" />
            <p className="text-sm text-text-muted">{tf.myTickets.empty}</p>
          </div>
        )}
        {tickets && tickets.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs font-medium uppercase tracking-wider text-text-subtle">
                  <th className="pb-3 pr-4">{tf.myTickets.colTitle}</th>
                  <th className="pb-3 pr-4">{tf.myTickets.colStatus}</th>
                  <th className="pb-3">{tf.myTickets.colDate}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {tickets.map((ticket) => (
                  <tr key={ticket.id}>
                    <td className="py-3 pr-4 font-medium text-text">{ticket.title}</td>
                    <td className="py-3 pr-4">
                      <StatusBadge
                        status={ticket.status}
                        t={tf.myTickets as unknown as Record<string, string>}
                      />
                    </td>
                    <td className="py-3 text-xs text-text-muted">
                      {new Date(ticket.createdAt).toLocaleDateString('it-IT', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modalType !== null && (
        <FeedbackModal
          isOpen
          type={modalType}
          onClose={() => setModalType(null)}
        />
      )}
    </div>
  )
}
