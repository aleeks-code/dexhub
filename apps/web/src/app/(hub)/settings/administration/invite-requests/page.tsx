'use client'

import { useState } from 'react'
import Link from 'next/link'
import { AlertCircle, CheckCircle2, MailPlus, Trash2, X, Ban } from 'lucide-react'
import { cn } from '@dexhub/ui'
import { useT } from '@/i18n'
import {
  useInviteRequests,
  useUpdateInviteRequestStatus,
  useDeleteInviteRequest,
  useAcceptInviteRequest,
  useRejectInviteRequest,
  type InviteRequestItem,
} from '@/core/hooks/use-admin'

type Filter = 'all' | 'pending' | 'invited' | 'dismissed' | 'deleted'

function StatusBadge({
  item,
  t,
}: {
  item: InviteRequestItem
  t: ReturnType<typeof useT>['admin']['inviteRequests']
}) {
  if (item.deletedAt) {
    return (
      <span className="rounded-full bg-error/10 px-2 py-0.5 text-xs font-medium text-error">
        {t.statusDeleted}
      </span>
    )
  }
  return (
    <span
      className={cn(
        'rounded-full px-2 py-0.5 text-xs font-medium',
        item.status === 'pending' && 'bg-warning/10 text-warning',
        item.status === 'invited' && 'bg-success/10 text-success',
        item.status === 'dismissed' && 'bg-surface-raised text-text-subtle',
      )}
    >
      {item.status === 'pending'
        ? t.statusPending
        : item.status === 'invited'
          ? t.statusInvited
          : t.statusDismissed}
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
  const tbu = t.admin.users
  const acceptInvite = useAcceptInviteRequest()
  const [result, setResult] = useState<{
    inviteUrl: string
    emailSent: boolean
    emailError?: string
  } | null>(null)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')

  async function handleAccept() {
    setError('')
    try {
      const res = await acceptInvite.mutateAsync(request.id)
      setResult({
        inviteUrl: res.inviteUrl,
        emailSent: res.emailSent,
        emailError: res.emailError,
      })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Errore durante l'accettazione dell'invito")
    }
  }

  function handleCopy() {
    if (!result?.inviteUrl) return
    navigator.clipboard.writeText(result.inviteUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
      <div className="w-full max-w-md rounded-2xl border border-border bg-surface shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between border-b border-border px-5 py-4 bg-surface-raised">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <MailPlus className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-text">Accetta e Invia Invito</h3>
              <p className="text-xs text-text-muted">{request.email}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-text-muted hover:bg-surface hover:text-text transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5">
          {result ? (
            <div className="space-y-4">
              {result.emailSent ? (
                <div className="flex items-start gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3.5 text-emerald-400">
                  <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5" />
                  <div className="text-xs space-y-1">
                    <p className="font-semibold text-emerald-300">Email inviata con successo!</p>
                    <p className="text-emerald-400/90 leading-relaxed">
                      L&apos;utente ha ricevuto l&apos;email automatica da{' '}
                      <span className="font-mono font-medium">noreply</span> con il suo link di
                      registrazione personale valido 48 ore.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/10 p-3.5 text-amber-400">
                  <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                  <div className="text-xs space-y-1">
                    <p className="font-semibold text-amber-300">
                      {result.emailError === 'SMTP not configured'
                        ? 'Invito generato (SMTP non ancora configurato)'
                        : 'Invito generato (email non recapitata)'}
                    </p>
                    <p className="text-amber-400/90 leading-relaxed">
                      {result.emailError && result.emailError !== 'SMTP not configured'
                        ? `Motivo: ${result.emailError}. `
                        : "L'invito è valido, ma l'email automatica non è partita. "}
                      Puoi copiare manualmente il link sottostante per inoltrarlo all&apos;utente.
                    </p>
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <span className="text-xs font-medium text-text-subtle">Link di invito diretto:</span>
                <div className="rounded-xl border border-border bg-bg p-3 text-xs font-mono text-text break-all select-all">
                  {result.inviteUrl}
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={handleCopy}
                  className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-text-muted hover:bg-surface-raised hover:text-text transition-colors"
                >
                  {copied ? tbu.inviteCopied : tbu.inviteCopy}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  Fatto
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-text-muted leading-relaxed">
                Confermando, verrà creato un token di invito valido 48h e verrà spedita un&apos;email
                automatica da <span className="font-mono text-xs text-text font-medium">noreply</span>{' '}
                a <strong className="text-text">{request.email}</strong> per guidare la creazione del
                profilo e la configurazione della Passkey.
              </p>

              {error && (
                <div className="rounded-lg border border-error/20 bg-error/10 p-3 text-xs text-error">
                  {error}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-lg border border-border px-4 py-2 text-xs font-medium text-text-muted hover:bg-surface-raised transition-colors"
                >
                  Annulla
                </button>
                <button
                  type="button"
                  onClick={handleAccept}
                  disabled={acceptInvite.isPending}
                  className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  <MailPlus className="h-4 w-4" />
                  {acceptInvite.isPending ? 'Invio in corso…' : 'Accetta e Spedisci Email'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function RejectModal({
  request,
  onClose,
}: {
  request: InviteRequestItem
  onClose: () => void
}) {
  const rejectInvite = useRejectInviteRequest()
  const [sendEmail, setSendEmail] = useState(true)
  const [error, setError] = useState('')

  async function handleReject() {
    setError('')
    try {
      await rejectInvite.mutateAsync({ id: request.id, sendEmail })
      onClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Errore durante il rifiuto della richiesta')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
      <div className="w-full max-w-md rounded-2xl border border-border bg-surface shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between border-b border-border px-5 py-4 bg-surface-raised">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-error/10 text-error">
              <Ban className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-text">Rifiuta Richiesta</h3>
              <p className="text-xs text-text-muted">{request.email}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-text-muted hover:bg-surface hover:text-text transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-sm text-text-muted leading-relaxed">
            Sei sicuro di voler rifiutare la richiesta di accesso di{' '}
            <strong className="text-text">{request.email}</strong>?
          </p>

          <label className="flex items-center gap-2.5 text-xs text-text cursor-pointer select-none rounded-xl border border-border p-3 bg-bg">
            <input
              type="checkbox"
              checked={sendEmail}
              onChange={(e) => setSendEmail(e.target.checked)}
              className="rounded border-border text-primary focus:ring-primary h-4 w-4"
            />
            <span>
              Invia email di notifica cortese da <strong>noreply</strong>
            </span>
          </label>

          {error && (
            <div className="rounded-lg border border-error/20 bg-error/10 p-3 text-xs text-error">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-border px-4 py-2 text-xs font-medium text-text-muted hover:bg-surface-raised transition-colors"
            >
              Annulla
            </button>
            <button
              type="button"
              onClick={handleReject}
              disabled={rejectInvite.isPending}
              className="flex items-center gap-1.5 rounded-lg bg-error px-4 py-2 text-xs font-semibold text-white hover:bg-error/90 transition-colors disabled:opacity-50"
            >
              {rejectInvite.isPending ? 'Elaborazione…' : 'Conferma Rifiuto'}
            </button>
          </div>
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
  const [rejectTarget, setRejectTarget] = useState<InviteRequestItem | null>(null)

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
    { key: 'dismissed', label: `Rifiutati (${counts.dismissed})` },
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
                ? key === 'deleted'
                  ? 'bg-error text-white'
                  : 'bg-primary text-primary-foreground'
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
                          {new Date(
                            new Date(req.deletedAt).getTime() + 30 * 24 * 60 * 60 * 1000,
                          ).toLocaleDateString('it-IT', {
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
                                onClick={() => setRejectTarget(req)}
                                className="flex items-center gap-1 rounded-md border border-border px-2.5 py-1 text-xs text-text-muted hover:bg-surface-raised hover:text-error transition-colors"
                              >
                                <Ban className="h-3 w-3" />
                                Rifiuta
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
        <InviteModal request={inviteTarget} onClose={() => setInviteTarget(null)} />
      )}

      {rejectTarget && (
        <RejectModal request={rejectTarget} onClose={() => setRejectTarget(null)} />
      )}
    </div>
  )
}
