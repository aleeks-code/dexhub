'use client'

import { useState } from 'react'
import Link from 'next/link'
import { MailPlus, Trash2, X } from 'lucide-react'
import { cn } from '@dexhub/ui'
import { useT } from '@/i18n'
import {
  useInviteRequests,
  useUpdateInviteRequestStatus,
  useDeleteInviteRequest,
  useInviteUser,
  type InviteRequestItem,
} from '@/core/hooks/use-admin'

type Filter = 'all' | 'pending' | 'invited' | 'dismissed' | 'deleted'

function StatusBadge({ item, t }: { item: InviteRequestItem; t: ReturnType<typeof useT>['admin']['inviteRequests'] }) {
  if (item.deletedAt) {
    return (
      <span className="rounded-full bg-error/10 px-2 py-0.5 text-xs font-medium text-error">
        {t.statusDeleted}
      </span>
    )
  }
  return (
    <span className={cn(
      'rounded-full px-2 py-0.5 text-xs font-medium',
      item.status === 'pending' && 'bg-warning/10 text-warning',
      item.status === 'invited' && 'bg-success/10 text-success',
      item.status === 'dismissed' && 'bg-surface-raised text-text-subtle',
    )}>
      {item.status === 'pending' ? t.statusPending : item.status === 'invited' ? t.statusInvited : t.statusDismissed}
    </span>
  )
}

function InviteModal({
  request,
  onClose,
}: {
  request: InviteRequestItem
  onClose: () => void
}) {
  const t = useT()
  const ta = t.admin
  const tir = t.admin.inviteRequests
  const tbu = t.admin.users
  const inviteUser = useInviteUser()
  const updateStatus = useUpdateInviteRequestStatus()
  const [inviteToken, setInviteToken] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')

  const inviteUrl = inviteToken
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/invite/${inviteToken}`
    : ''

  async function handleCreate() {
    setError('')
    try {
      const result = await inviteUser.mutateAsync({ email: request.email })
      await updateStatus.mutateAsync({ id: request.id, status: 'invited' })
      setInviteToken(result.token)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error')
    }
  }

  function handleCopy() {
    navigator.clipboard.writeText(inviteUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl border border-border bg-surface shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h3 className="font-semibold text-text">{tir.invite} — {request.email}</h3>
          <button onClick={onClose} className="rounded p-1 text-text-muted hover:bg-surface-raised hover:text-text">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-5">
          {inviteToken ? (
            <div className="space-y-4">
              <p className="text-sm text-text-muted">{tbu.inviteLink}</p>
              <div className="flex items-center gap-2 rounded-lg border border-border bg-bg p-3 text-xs font-mono text-text break-all">
                {inviteUrl}
              </div>
              <div className="flex items-center justify-between">
                <button
                  onClick={handleCopy}
                  className="rounded-lg border border-border px-3 py-1.5 text-xs text-text-muted hover:bg-surface-raised hover:text-text"
                >
                  {copied ? tbu.inviteCopied : tbu.inviteCopy}
                </button>
                <button
                  onClick={onClose}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                >
                  OK
                </button>
              </div>
              <p className="text-xs text-text-subtle">{tbu.inviteExpiry}</p>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-text-muted">
                Verrà generato un link di invito per <strong className="text-text">{request.email}</strong>.
                La richiesta verrà contrassegnata come invitata.
              </p>
              {error && <p className="text-sm text-error">{error}</p>}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={onClose}
                  className="rounded-lg border border-border px-4 py-2 text-sm text-text-muted hover:bg-surface-raised"
                >
                  {ta.users.cancel}
                </button>
                <button
                  onClick={handleCreate}
                  disabled={inviteUser.isPending || updateStatus.isPending}
                  className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  <MailPlus className="h-4 w-4" />
                  {inviteUser.isPending ? '…' : tir.invite}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function InviteRequestsPage() {
  const t = useT()
  const ta = t.admin
  const tir = t.admin.inviteRequests
  const { data: requests, isLoading, error } = useInviteRequests()
  const updateStatus = useUpdateInviteRequestStatus()
  const deleteRequest = useDeleteInviteRequest()
  const [filter, setFilter] = useState<Filter>('all')
  const [inviteTarget, setInviteTarget] = useState<InviteRequestItem | null>(null)

  const active = requests?.filter((r) => !r.deletedAt) ?? []
  const deleted = requests?.filter((r) => !!r.deletedAt) ?? []

  const counts = {
    all: active.length,
    pending: active.filter((r) => r.status === 'pending').length,
    invited: active.filter((r) => r.status === 'invited').length,
    dismissed: active.filter((r) => r.status === 'dismissed').length,
    deleted: deleted.length,
  }

  const filtered =
    filter === 'deleted'
      ? deleted
      : filter === 'all'
        ? active
        : active.filter((r) => r.status === filter)

  const filters: { key: Filter; label: string }[] = [
    { key: 'all', label: `Tutti (${counts.all})` },
    { key: 'pending', label: `${tir.statusPending} (${counts.pending})` },
    { key: 'invited', label: `${tir.statusInvited} (${counts.invited})` },
    { key: 'dismissed', label: `${tir.statusDismissed} (${counts.dismissed})` },
    { key: 'deleted', label: `${tir.statusDeleted} (${counts.deleted})` },
  ]

  function handleDelete(req: InviteRequestItem) {
    if (!confirm(tir.confirmDelete)) return
    deleteRequest.mutate(req.id)
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
        <h1 className="text-2xl font-bold text-text">{tir.title}</h1>
        <p className="mt-1 text-sm text-text-muted">{tir.subtitle}</p>
      </div>

      {/* Filter pills */}
      <div className="flex flex-wrap gap-2">
        {filters.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={cn(
              'rounded-full px-3 py-1 text-xs font-medium transition-colors',
              filter === key
                ? key === 'deleted' ? 'bg-error text-white' : 'bg-primary text-primary-foreground'
                : 'bg-surface-raised text-text-muted hover:text-text',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border bg-surface p-6">
        {isLoading && (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-12 animate-pulse rounded-lg bg-surface-raised" />
            ))}
          </div>
        )}
        {error && <p className="text-sm text-error">Errore nel caricamento delle richieste</p>}
        {!isLoading && (!filtered || filtered.length === 0) && (
          <p className="text-sm text-text-muted">{tir.empty}</p>
        )}
        {filtered && filtered.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs font-medium uppercase tracking-wider text-text-subtle">
                  <th className="pb-3 pr-4">{tir.colEmail}</th>
                  <th className="pb-3 pr-4">{tir.colPhone}</th>
                  <th className="pb-3 pr-4">{tir.colDate}</th>
                  <th className="pb-3 pr-4">{tir.colStatus}</th>
                  <th className="pb-3">{filter === 'deleted' ? tir.colExpiry : tir.colActions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((req) => (
                  <tr key={req.id}>
                    <td className="py-3 pr-4 font-medium text-text">{req.email}</td>
                    <td className="py-3 pr-4 text-text-muted">{req.phone ?? tir.noPhone}</td>
                    <td className="py-3 pr-4 text-text-muted text-xs">
                      {new Date(req.createdAt).toLocaleString('it-IT', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="py-3 pr-4">
                      <StatusBadge item={req} t={tir} />
                    </td>
                    <td className="py-3">
                      {filter === 'deleted' && req.deletedAt ? (
                        <span className="text-xs text-error">
                          {tir.expiresOn}{' '}
                          {new Date(new Date(req.deletedAt).getTime() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('it-IT', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                          })}
                        </span>
                      ) : (
                      <div className="flex items-center gap-1.5">
                        {!req.deletedAt && req.status === 'pending' && (
                          <>
                            <button
                              onClick={() => setInviteTarget(req)}
                              className="flex items-center gap-1.5 rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                            >
                              <MailPlus className="h-3 w-3" />
                              {tir.invite}
                            </button>
                            <button
                              onClick={() => updateStatus.mutate({ id: req.id, status: 'dismissed' })}
                              className="rounded-md border border-border px-2.5 py-1 text-xs text-text-muted hover:bg-surface-raised hover:text-text transition-colors"
                            >
                              {tir.dismiss}
                            </button>
                          </>
                        )}
                        {!req.deletedAt && req.status === 'invited' && (
                          <button
                            onClick={() => updateStatus.mutate({ id: req.id, status: 'pending' })}
                            className="rounded-md border border-border px-2.5 py-1 text-xs text-text-muted hover:bg-surface-raised hover:text-text transition-colors"
                          >
                            {tir.restore}
                          </button>
                        )}
                        {!req.deletedAt && req.status === 'dismissed' && (
                          <>
                            <button
                              onClick={() => updateStatus.mutate({ id: req.id, status: 'pending' })}
                              className="rounded-md border border-border px-2.5 py-1 text-xs text-text-muted hover:bg-surface-raised hover:text-text transition-colors"
                            >
                              {tir.restore}
                            </button>
                            <button
                              onClick={() => handleDelete(req)}
                              disabled={deleteRequest.isPending}
                              className="flex items-center gap-1 rounded-md border border-error/30 px-2.5 py-1 text-xs text-error hover:bg-error-muted transition-colors disabled:opacity-50"
                            >
                              <Trash2 className="h-3 w-3" />
                              {tir.delete}
                            </button>
                          </>
                        )}
                      </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {inviteTarget && (
        <InviteModal
          request={inviteTarget}
          onClose={() => setInviteTarget(null)}
        />
      )}
    </div>
  )
}
