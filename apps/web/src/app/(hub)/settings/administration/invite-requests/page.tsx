'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import {
  AlertCircle,
  Ban,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  ExternalLink,
  MailPlus,
  MessageCircle,
  Phone,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  UserCheck,
  Users,
  X,
} from 'lucide-react'
import { cn } from '@dexhub/ui'
import { useT } from '@/i18n'
import {
  useInviteRequests,
  useUpdateInviteRequestStatus,
  useDeleteInviteRequest,
  useAcceptInviteRequest,
  useRejectInviteRequest,
  useResendInviteRequest,
  useDirectInvite,
  useBulkRejectInviteRequests,
  useBulkDeleteInviteRequests,
  type InviteRequestItem,
} from '@/core/hooks/use-admin'

type Filter = 'all' | 'pending' | 'invited' | 'registered' | 'dismissed' | 'deleted'

function cleanDisplayUrl(url: string): string {
  if (typeof window === 'undefined' || !url) return url
  if (url.includes('localhost') || url.includes('127.0.0.1')) {
    try {
      const parsed = new URL(url)
      return `${window.location.origin}${parsed.pathname}${parsed.search}`
    } catch {
      return url
    }
  }
  return url
}

function StatusBadge({
  item,
  t,
}: {
  item: InviteRequestItem
  t: ReturnType<typeof useT>['admin']['inviteRequests']
}) {
  if (item.deletedAt) {
    return (
      <span className="rounded-full bg-error/10 px-2.5 py-0.5 text-xs font-medium text-error inline-flex items-center gap-1">
        <Trash2 className="h-3 w-3" />
        {t.statusDeleted}
      </span>
    )
  }

  if (item.registered) {
    return (
      <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-400 inline-flex items-center gap-1 border border-emerald-500/20">
        <UserCheck className="h-3 w-3" />
        Registrato
      </span>
    )
  }

  if (item.status === 'invited') {
    if (item.inviteExpired) {
      return (
        <span className="rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-medium text-amber-400 inline-flex items-center gap-1 border border-amber-500/20">
          <Clock className="h-3 w-3" />
          Scaduto (48h)
        </span>
      )
    }
    return (
      <span className="rounded-full bg-blue-500/10 px-2.5 py-0.5 text-xs font-medium text-blue-400 inline-flex items-center gap-1 border border-blue-500/20">
        <MailPlus className="h-3 w-3" />
        {t.statusInvited}
      </span>
    )
  }

  if (item.status === 'dismissed') {
    return (
      <span className="rounded-full bg-surface-raised px-2.5 py-0.5 text-xs font-medium text-text-subtle inline-flex items-center gap-1 border border-border">
        <Ban className="h-3 w-3" />
        {t.statusDismissed}
      </span>
    )
  }

  return (
    <span className="rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-medium text-amber-300 inline-flex items-center gap-1 border border-amber-500/20">
      <Clock className="h-3 w-3" />
      {t.statusPending}
    </span>
  )
}

function InviteResultView({
  title,
  subtitle,
  email,
  inviteUrl,
  emailSent,
  emailError,
  onClose,
}: {
  title: string
  subtitle: string
  email: string
  inviteUrl: string
  emailSent: boolean
  emailError?: string
  onClose: () => void
}) {
  const [copied, setCopied] = useState(false)
  const displayUrl = cleanDisplayUrl(inviteUrl)

  function handleCopy() {
    navigator.clipboard.writeText(displayUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-4">
      {emailSent ? (
        <div className="flex items-start gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3.5 text-emerald-400">
          <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <p className="font-semibold text-emerald-300">Email inviata con successo!</p>
            <p className="text-emerald-400/90 leading-relaxed">
              L&apos;utente a <strong className="text-emerald-200">{email}</strong> ha ricevuto l&apos;email automatica
              da <span className="font-mono font-medium">noreply@dexhub.it</span> con il link personale valido 48 ore.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/10 p-3.5 text-amber-400">
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <p className="font-semibold text-amber-300">
              {emailError === 'SMTP not configured'
                ? 'Invito generato (SMTP non configurato)'
                : 'Invito generato (email non recapitata)'}
            </p>
            <p className="text-amber-400/90 leading-relaxed">
              {emailError && emailError !== 'SMTP not configured'
                ? `Dettaglio errore: ${emailError}. `
                : "L'invito è attivo sul database. "}
              Puoi copiare manualmente il link sottostante per inoltrarlo direttamente all&apos;utente.
            </p>
          </div>
        </div>
      )}

      <div className="space-y-1.5">
        <span className="text-xs font-medium text-text-subtle">Link di invito diretto (valido 48 ore):</span>
        <div className="rounded-xl border border-border bg-bg p-3 text-xs font-mono text-text break-all select-all">
          {displayUrl}
        </div>
      </div>

      <div className="flex items-center justify-between pt-2">
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1.5 rounded-lg border border-border px-3.5 py-2 text-xs font-medium text-text hover:bg-surface-raised transition-colors"
        >
          {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? 'Link Copiato!' : 'Copia Link'}
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
  )
}

function InviteModal({
  request,
  onClose,
}: {
  request: InviteRequestItem
  onClose: () => void
}) {
  const acceptInvite = useAcceptInviteRequest()
  const [result, setResult] = useState<{
    inviteUrl: string
    emailSent: boolean
    emailError?: string
  } | null>(null)
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
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
            <InviteResultView
              title="Invito Accettato"
              subtitle="L'invito è stato creato"
              email={request.email}
              inviteUrl={result.inviteUrl}
              emailSent={result.emailSent}
              emailError={result.emailError}
              onClose={onClose}
            />
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

function ResendModal({
  request,
  onClose,
}: {
  request: InviteRequestItem
  onClose: () => void
}) {
  const resendInvite = useResendInviteRequest()
  const [result, setResult] = useState<{
    inviteUrl: string
    emailSent: boolean
    emailError?: string
  } | null>(null)
  const [error, setError] = useState('')

  async function handleResend() {
    setError('')
    try {
      const res = await resendInvite.mutateAsync(request.id)
      setResult({
        inviteUrl: res.inviteUrl,
        emailSent: res.emailSent,
        emailError: res.emailError,
      })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Errore durante il reinvio dell'invito")
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="w-full max-w-md rounded-2xl border border-border bg-surface shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between border-b border-border px-5 py-4 bg-surface-raised">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400">
              <RefreshCw className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-text">Reinvia Invito</h3>
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
            <InviteResultView
              title="Invito Rinnovato"
              subtitle="Un nuovo link è stato generato"
              email={request.email}
              inviteUrl={result.inviteUrl}
              emailSent={result.emailSent}
              emailError={result.emailError}
              onClose={onClose}
            />
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-text-muted leading-relaxed">
                Verrà generato un <strong>nuovo token di registrazione valido per 48 ore</strong> e verrà
                spedita una nuova email da <span className="font-mono text-xs text-text font-medium">noreply</span>{' '}
                a <strong className="text-text">{request.email}</strong>.
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
                  onClick={handleResend}
                  disabled={resendInvite.isPending}
                  className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-500 transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={cn('h-4 w-4', resendInvite.isPending && 'animate-spin')} />
                  {resendInvite.isPending ? 'Rinnovo in corso…' : 'Rigenera e Invia'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function DirectInviteModal({ onClose }: { onClose: () => void }) {
  const directInvite = useDirectInvite()
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [sendEmail, setSendEmail] = useState(true)
  const [result, setResult] = useState<{
    inviteUrl: string
    emailSent: boolean
    emailError?: string
  } | null>(null)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setError('')
    try {
      const res = await directInvite.mutateAsync({
        email: email.trim(),
        phone: phone.trim() || undefined,
        sendEmail,
      })
      setResult({
        inviteUrl: res.inviteUrl,
        emailSent: res.emailSent,
        emailError: res.emailError,
      })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Errore durante la creazione dell'invito")
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="w-full max-w-md rounded-2xl border border-border bg-surface shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between border-b border-border px-5 py-4 bg-surface-raised">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Plus className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-text">Nuovo Invito Diretto</h3>
              <p className="text-xs text-text-muted">Invita un collaboratore senza passare dalla landing</p>
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
            <InviteResultView
              title="Invito Creato"
              subtitle="Nuovo link generato"
              email={email}
              inviteUrl={result.inviteUrl}
              emailSent={result.emailSent}
              emailError={result.emailError}
              onClose={onClose}
            />
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-text">Indirizzo Email *</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="utente@esempio.it"
                  required
                  className="w-full rounded-xl border border-border bg-bg px-3.5 py-2 text-sm text-text placeholder:text-text-subtle focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-text">Telefono (opzionale)</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+39 333 1234567"
                  className="w-full rounded-xl border border-border bg-bg px-3.5 py-2 text-sm text-text placeholder:text-text-subtle focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <label className="flex items-center gap-2.5 text-xs text-text cursor-pointer select-none rounded-xl border border-border p-3 bg-bg">
                <input
                  type="checkbox"
                  checked={sendEmail}
                  onChange={(e) => setSendEmail(e.target.checked)}
                  className="rounded border-border text-primary focus:ring-primary h-4 w-4"
                />
                <span>
                  Invia automaticamente email con il link Passkey da <strong>noreply@dexhub.it</strong>
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
                  type="submit"
                  disabled={directInvite.isPending}
                  className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  <MailPlus className="h-4 w-4" />
                  {directInvite.isPending ? 'Creazione in corso…' : 'Crea ed Emetti Invito'}
                </button>
              </div>
            </form>
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
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
              Invia email di notifica cortese da <strong>noreply@dexhub.it</strong>
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
  const bulkReject = useBulkRejectInviteRequests()
  const bulkDelete = useBulkDeleteInviteRequests()

  const [filter, setFilter] = useState<Filter>('all')
  const [search, setSearch] = useState('')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [inviteTarget, setInviteTarget] = useState<InviteRequestItem | null>(null)
  const [resendTarget, setResendTarget] = useState<InviteRequestItem | null>(null)
  const [rejectTarget, setRejectTarget] = useState<InviteRequestItem | null>(null)
  const [showDirectModal, setShowDirectModal] = useState(false)

  const active = useMemo(() => requests?.filter((r) => !r.deletedAt) ?? [], [requests])
  const deleted = useMemo(() => requests?.filter((r) => !!r.deletedAt) ?? [], [requests])

  const counts = useMemo(
    () => ({
      all: active.length,
      pending: active.filter((r) => r.status === 'pending').length,
      invited: active.filter((r) => r.status === 'invited' && !r.registered).length,
      registered: active.filter((r) => !!r.registered).length,
      dismissed: active.filter((r) => r.status === 'dismissed').length,
      deleted: deleted.length,
    }),
    [active, deleted],
  )

  const filtered = useMemo(() => {
    let list =
      filter === 'deleted'
        ? deleted
        : filter === 'all'
          ? active
          : filter === 'registered'
            ? active.filter((r) => !!r.registered)
            : filter === 'invited'
              ? active.filter((r) => r.status === 'invited' && !r.registered)
              : active.filter((r) => r.status === filter)

    if (search.trim()) {
      const q = search.toLowerCase().trim()
      list = list.filter(
        (r) =>
          r.email.toLowerCase().includes(q) ||
          (r.phone && r.phone.toLowerCase().includes(q)) ||
          (r.userName && r.userName.toLowerCase().includes(q)),
      )
    }

    return list
  }, [active, deleted, filter, search])

  const filters: { key: Filter; label: string; count: number }[] = [
    { key: 'all', label: 'Tutti', count: counts.all },
    { key: 'pending', label: tir.statusPending, count: counts.pending },
    { key: 'invited', label: 'Invito Attivo', count: counts.invited },
    { key: 'registered', label: 'Registrati', count: counts.registered },
    { key: 'dismissed', label: 'Rifiutati', count: counts.dismissed },
    { key: 'deleted', label: tir.statusDeleted, count: counts.deleted },
  ]

  function toggleSelectAll() {
    if (!filtered) return
    const ids = filtered.map((r) => r.id)
    if (selectedIds.length === ids.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(ids)
    }
  }

  function toggleSelectOne(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    )
  }

  function handleDelete(req: InviteRequestItem) {
    if (!confirm(tir.confirmDelete)) return
    deleteRequest.mutate(req.id)
  }

  async function handleBulkReject() {
    if (!confirm(`Rifiutare ${selectedIds.length} richieste selezionate?`)) return
    await bulkReject.mutateAsync({ ids: selectedIds, sendEmail: false })
    setSelectedIds([])
  }

  async function handleBulkDelete() {
    if (!confirm(`Spostare nel cestino ${selectedIds.length} richieste selezionate?`)) return
    await bulkDelete.mutateAsync(selectedIds)
    setSelectedIds([])
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Top Breadcrumb & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Link
            href="/settings/administration"
            className="inline-flex items-center text-sm text-text-muted hover:text-text transition-colors mb-2"
          >
            {ta.back}
          </Link>
          <h1 className="text-2xl font-bold text-text tracking-tight">{tir.title}</h1>
          <p className="mt-1 text-sm text-text-muted">
            Gestisci le richieste di invito, emetti nuovi inviti diretti e monitora le attivazioni Passkey.
          </p>
        </div>

        <button
          onClick={() => setShowDirectModal(true)}
          className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground shadow-md hover:bg-primary/90 transition-colors shrink-0"
        >
          <Plus className="h-4 w-4" />
          Nuovo Invito Diretto
        </button>
      </div>

      {/* KPI Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="rounded-2xl border border-border bg-surface p-4 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-text-muted">In Attesa</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-text">{counts.pending}</span>
            {counts.pending > 0 && (
              <span className="text-[11px] font-medium text-amber-400">da revisionare</span>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-4 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-text-muted">Inviti In Corso</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400">
              <MailPlus className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-text">{counts.invited}</span>
            <span className="text-[11px] text-text-muted">in attesa Passkey</span>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-4 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-text-muted">Utenti Convertiti</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
              <UserCheck className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-emerald-400">{counts.registered}</span>
            <span className="text-[11px] text-text-muted">attivi sul portale</span>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-4 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-text-muted">Totale Storico</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-surface-raised text-text-muted">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-text">{counts.all}</span>
            <span className="text-[11px] text-text-muted">richieste ricevute</span>
          </div>
        </div>
      </div>

      {/* Filter Chips & Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {filters.map(({ key, label, count }) => (
            <button
              key={key}
              onClick={() => {
                setFilter(key)
                setSelectedIds([])
              }}
              className={cn(
                'rounded-xl px-3 py-1.5 text-xs font-medium transition-colors flex items-center gap-1.5',
                filter === key
                  ? key === 'deleted'
                    ? 'bg-error text-white shadow-xs'
                    : 'bg-primary text-primary-foreground shadow-xs'
                  : 'bg-surface border border-border text-text-muted hover:text-text hover:bg-surface-raised',
              )}
            >
              <span>{label}</span>
              <span
                className={cn(
                  'rounded-full px-1.5 py-0.2 text-[10px] font-semibold',
                  filter === key ? 'bg-black/20 text-white' : 'bg-surface-raised text-text-subtle',
                )}
              >
                {count}
              </span>
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-subtle" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cerca email o telefono…"
            className="w-full rounded-xl border border-border bg-surface pl-8 pr-7 py-1.5 text-xs text-text placeholder:text-text-subtle focus:outline-none focus:ring-2 focus:ring-primary"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-subtle hover:text-text"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Bulk Action Banner */}
      {selectedIds.length > 0 && (
        <div className="flex items-center justify-between rounded-xl border border-primary/30 bg-primary/10 px-4 py-2.5 text-xs text-text">
          <span className="font-medium text-primary">
            {selectedIds.length} {selectedIds.length === 1 ? 'richiesta selezionata' : 'richieste selezionate'}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={handleBulkReject}
              disabled={bulkReject.isPending}
              className="rounded-lg bg-surface border border-border px-3 py-1 text-xs font-medium text-text hover:bg-surface-raised hover:text-error transition-colors"
            >
              Rifiuta Selezionati
            </button>
            <button
              onClick={handleBulkDelete}
              disabled={bulkDelete.isPending}
              className="rounded-lg bg-error/10 border border-error/20 px-3 py-1 text-xs font-medium text-error hover:bg-error/20 transition-colors"
            >
              Elimina Selezionati
            </button>
            <button
              onClick={() => setSelectedIds([])}
              className="text-text-muted hover:text-text ml-2 text-xs"
            >
              Deseleziona
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="rounded-2xl border border-border bg-surface shadow-xs overflow-hidden">
        {isLoading && (
          <div className="p-6 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-12 animate-pulse rounded-xl bg-surface-raised" />
            ))}
          </div>
        )}

        {error && (
          <div className="p-6 text-center text-sm text-error">
            Errore nel caricamento delle richieste di invito.
          </div>
        )}

        {!isLoading && (!filtered || filtered.length === 0) && (
          <div className="p-12 text-center space-y-3">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-raised text-text-subtle">
              <Users className="h-6 w-6" />
            </div>
            <p className="text-sm font-medium text-text">Nessuna richiesta trovata</p>
            <p className="text-xs text-text-muted max-w-sm mx-auto">
              {search
                ? `Nessun risultato corrispondente a "${search}". Prova a modificare i termini di ricerca.`
                : 'Non ci sono richieste in questa sezione al momento.'}
            </p>
          </div>
        )}

        {filtered && filtered.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-raised/40 text-left text-[11px] font-semibold uppercase tracking-wider text-text-subtle">
                  <th className="py-3.5 pl-4 pr-2 w-8">
                    <input
                      type="checkbox"
                      checked={selectedIds.length === filtered.length && filtered.length > 0}
                      onChange={toggleSelectAll}
                      className="rounded border-border text-primary focus:ring-primary h-3.5 w-3.5"
                    />
                  </th>
                  <th className="py-3.5 pr-4">Utente / Richiedente</th>
                  <th className="py-3.5 pr-4">Contatto Telefonico</th>
                  <th className="py-3.5 pr-4">Data Richiesta</th>
                  <th className="py-3.5 pr-4">Stato Invito</th>
                  <th className="py-3.5 pr-4 text-right">
                    {filter === 'deleted' ? tir.colExpiry : tir.colActions}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((req) => (
                  <tr
                    key={req.id}
                    className={cn(
                      'hover:bg-surface-raised/40 transition-colors',
                      selectedIds.includes(req.id) && 'bg-primary/5',
                    )}
                  >
                    <td className="py-3 pl-4 pr-2">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(req.id)}
                        onChange={() => toggleSelectOne(req.id)}
                        className="rounded border-border text-primary focus:ring-primary h-3.5 w-3.5"
                      />
                    </td>
                    <td className="py-3 pr-4">
                      <div className="space-y-0.5">
                        <div className="font-medium text-text text-sm flex items-center gap-2">
                          <span>{req.email}</span>
                          {req.registered && (
                            <span className="inline-flex items-center rounded-md bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-400 border border-emerald-500/20">
                              Passkey Attiva
                            </span>
                          )}
                        </div>
                        {req.userName && (
                          <p className="text-xs text-text-muted">Nome: {req.userName}</p>
                        )}
                      </div>
                    </td>
                    <td className="py-3 pr-4">
                      {req.phone ? (
                        <div className="flex items-center gap-2">
                          <a
                            href={`tel:${req.phone}`}
                            className="text-xs text-text hover:text-primary transition-colors flex items-center gap-1"
                          >
                            <Phone className="h-3 w-3 text-text-subtle" />
                            {req.phone}
                          </a>
                          <a
                            href={`https://wa.me/${req.phone.replace(/[^0-9]/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Chat WhatsApp"
                            className="rounded p-1 text-emerald-500 hover:bg-emerald-500/10 transition-colors"
                          >
                            <MessageCircle className="h-3.5 w-3.5" />
                          </a>
                        </div>
                      ) : (
                        <span className="text-xs text-text-subtle">—</span>
                      )}
                    </td>
                    <td className="py-3 pr-4 text-text-muted text-xs whitespace-nowrap">
                      {new Date(req.createdAt).toLocaleString('it-IT', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="py-3 pr-4 whitespace-nowrap">
                      <StatusBadge item={req} t={tir} />
                    </td>
                    <td className="py-3 pr-4 text-right whitespace-nowrap">
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
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Richiesta Pendente */}
                          {!req.deletedAt && req.status === 'pending' && (
                            <>
                              <button
                                onClick={() => setInviteTarget(req)}
                                className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
                              >
                                <MailPlus className="h-3.5 w-3.5" />
                                {tir.invite}
                              </button>
                              <button
                                onClick={() => setRejectTarget(req)}
                                className="flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-text-muted hover:bg-surface-raised hover:text-error transition-colors"
                              >
                                <Ban className="h-3.5 w-3.5" />
                                Rifiuta
                              </button>
                            </>
                          )}

                          {/* Invito emesso e non ancora registrato */}
                          {!req.deletedAt && req.status === 'invited' && !req.registered && (
                            <>
                              <button
                                onClick={() => setResendTarget(req)}
                                title="Reinvia email o rigenera token 48h"
                                className="flex items-center gap-1.5 rounded-lg border border-blue-500/30 bg-blue-500/10 px-2.5 py-1.5 text-xs font-medium text-blue-400 hover:bg-blue-500/20 transition-colors"
                              >
                                <RefreshCw className="h-3.5 w-3.5" />
                                Reinvia
                              </button>
                              <button
                                onClick={() => updateStatus.mutate({ id: req.id, status: 'pending' })}
                                title="Ripristina a pendente"
                                className="rounded-lg border border-border px-2.5 py-1.5 text-xs text-text-muted hover:bg-surface-raised hover:text-text transition-colors"
                              >
                                {tir.restore}
                              </button>
                            </>
                          )}

                          {/* Utente già registrato */}
                          {!req.deletedAt && req.registered && (
                            <Link
                              href="/settings/administration/users"
                              className="inline-flex items-center gap-1 text-xs text-primary hover:underline px-2 py-1"
                            >
                              Gestisci Utente
                              <ExternalLink className="h-3 w-3" />
                            </Link>
                          )}

                          {/* Richiesta Rifiutata */}
                          {!req.deletedAt && req.status === 'dismissed' && (
                            <>
                              <button
                                onClick={() => updateStatus.mutate({ id: req.id, status: 'pending' })}
                                className="rounded-lg border border-border px-2.5 py-1.5 text-xs text-text-muted hover:bg-surface-raised hover:text-text transition-colors"
                              >
                                {tir.restore}
                              </button>
                              <button
                                onClick={() => handleDelete(req)}
                                disabled={deleteRequest.isPending}
                                className="flex items-center gap-1 rounded-lg border border-error/30 px-2.5 py-1.5 text-xs text-error hover:bg-error-muted transition-colors disabled:opacity-50"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
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

      {/* Modals */}
      {inviteTarget && (
        <InviteModal request={inviteTarget} onClose={() => setInviteTarget(null)} />
      )}

      {resendTarget && (
        <ResendModal request={resendTarget} onClose={() => setResendTarget(null)} />
      )}

      {rejectTarget && (
        <RejectModal request={rejectTarget} onClose={() => setRejectTarget(null)} />
      )}

      {showDirectModal && (
        <DirectInviteModal onClose={() => setShowDirectModal(false)} />
      )}
    </div>
  )
}
