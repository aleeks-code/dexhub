'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Check, Copy, Eye, EyeOff, Key, ShieldOff, ShieldCheck, Trash2, UserPlus, X } from 'lucide-react'
import { cn } from '@dexhub/ui'
import { useT } from '@/i18n'
import { useMe } from '@/core/hooks/use-me'
import {
  useAdminUsers,
  useAdminUserPasskeys,
  useDeleteUserPasskey,
  useGetRecoveryCode,
  useLogRecoveryCodeCopy,
  useInviteUser,
  useSetUserStatus,
  useDeleteUser,
  useRegenerateRecoveryCodes,
  type AdminUser,
} from '@/core/hooks/use-admin'

function Section({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-6 space-y-4">
      <div>
        <h2 className="text-base font-semibold text-text">{title}</h2>
        <p className="text-sm text-text-muted">{subtitle}</p>
      </div>
      {children}
    </div>
  )
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl border border-border bg-surface shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h3 className="font-semibold text-text">{title}</h3>
          <button onClick={onClose} className="rounded p-1 text-text-muted hover:bg-surface-raised hover:text-text">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}

function CopyButton({ text, label, copiedLabel }: { text: string; label: string; copiedLabel: string }) {
  const [copied, setCopied] = useState(false)
  function handleCopy() {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1.5 rounded-md border border-border bg-surface-raised px-3 py-1.5 text-xs text-text-muted hover:text-text transition-colors"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? copiedLabel : label}
    </button>
  )
}

function InviteModal({ onClose }: { onClose: () => void }) {
  const t = useT()
  const ta = t.admin.users
  const [email, setEmail] = useState('')
  const [inviteToken, setInviteToken] = useState<string | null>(null)
  const [error, setError] = useState('')
  const inviteUser = useInviteUser()

  const inviteUrl = inviteToken
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/invite/${inviteToken}`
    : ''

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    try {
      const result = await inviteUser.mutateAsync({ email: email.trim() || undefined })
      setInviteToken(result.token)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error')
    }
  }

  if (inviteToken) {
    return (
      <Modal title={ta.inviteUser} onClose={onClose}>
        <div className="space-y-4">
          <p className="text-sm text-text-muted">{ta.inviteLink}</p>
          <div className="flex items-center gap-2 rounded-lg border border-border bg-bg p-3 text-xs font-mono text-text break-all">
            {inviteUrl}
          </div>
          <CopyButton text={inviteUrl} label={ta.inviteCopy} copiedLabel={ta.inviteCopied} />
          <p className="text-xs text-text-subtle">{ta.inviteExpiry}</p>
          <div className="pt-2 flex justify-end">
            <button onClick={onClose} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
              OK
            </button>
          </div>
        </div>
      </Modal>
    )
  }

  return (
    <Modal title={ta.inviteUser} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-sm text-text-muted">{ta.inviteEmail}</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="user@example.com"
            className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus:border-primary"
          />
        </div>
        {error && <p className="text-sm text-error">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="rounded-lg border border-border px-4 py-2 text-sm text-text-muted hover:bg-surface-raised">
            {ta.cancel}
          </button>
          <button
            type="submit"
            disabled={inviteUser.isPending}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {inviteUser.isPending ? '…' : ta.send}
          </button>
        </div>
      </form>
    </Modal>
  )
}

function PasskeysModal({ user, onClose }: { user: AdminUser; onClose: () => void }) {
  const t = useT()
  const ta = t.admin.users
  const { data: passkeys, isLoading } = useAdminUserPasskeys(user.id)
  const deletePasskey = useDeleteUserPasskey()

  async function handleDelete(passkeyId: string) {
    if (!confirm(ta.confirmDeletePasskey)) return
    await deletePasskey.mutateAsync({ userId: user.id, passkeyId })
  }

  return (
    <Modal title={`${ta.passkeyModalTitle} — ${user.name}`} onClose={onClose}>
      <div className="space-y-2 min-h-[80px]">
        {isLoading && <p className="text-sm text-text-muted">…</p>}
        {!isLoading && (!passkeys || passkeys.length === 0) && (
          <p className="text-sm text-text-muted">{ta.noPasskeys}</p>
        )}
        {passkeys?.map((pk) => (
          <div key={pk.id} className="flex items-center justify-between rounded-lg border border-border bg-bg p-3">
            <div>
              <p className="text-sm font-medium text-text">{pk.name}</p>
              <p className="text-xs text-text-muted">{pk.deviceType} · {new Date(pk.createdAt).toLocaleDateString()}</p>
            </div>
            <button
              onClick={() => void handleDelete(pk.id)}
              disabled={deletePasskey.isPending}
              title={ta.deletePasskey}
              className="rounded p-1.5 text-text-muted transition-colors hover:bg-error-muted hover:text-error disabled:opacity-50"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </Modal>
  )
}

function RegenCodesModal({ user, onClose }: { user: AdminUser; onClose: () => void }) {
  const t = useT()
  const ta = t.admin.users
  const regen = useRegenerateRecoveryCodes()
  const [newCode, setNewCode] = useState<string | null>(null)
  const [error, setError] = useState('')

  async function handleConfirm() {
    setError('')
    try {
      const result = await regen.mutateAsync(user.id)
      setNewCode(result.code)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error')
    }
  }

  if (newCode) {
    return (
      <Modal title={ta.regenCodes} onClose={onClose}>
        <div className="space-y-4">
          <p className="text-sm text-text-muted">{ta.copyCodeHint}</p>
          <div className="rounded-lg border border-border bg-bg px-4 py-3 text-center">
            <code className="font-mono text-lg tracking-widest text-text">{newCode}</code>
          </div>
          <div className="flex items-center justify-between">
            <CopyButton text={newCode} label={ta.inviteCopy} copiedLabel={ta.inviteCopied} />
            <button onClick={onClose} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
              OK
            </button>
          </div>
        </div>
      </Modal>
    )
  }

  return (
    <Modal title={ta.regenCodesConfirm} onClose={onClose}>
      <div className="space-y-4">
        <p className="text-sm text-text-muted">{ta.regenCodesDesc}</p>
        {error && <p className="text-sm text-error">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="rounded-lg border border-border px-4 py-2 text-sm text-text-muted hover:bg-surface-raised">
            {ta.cancel}
          </button>
          <button
            onClick={handleConfirm}
            disabled={regen.isPending}
            className="rounded-lg bg-warning px-4 py-2 text-sm font-medium text-white hover:bg-warning/90 disabled:opacity-50"
          >
            {regen.isPending ? '…' : ta.confirm}
          </button>
        </div>
      </div>
    </Modal>
  )
}

function ViewRecoveryCodeModal({ user, onClose }: { user: AdminUser; onClose: () => void }) {
  const t = useT()
  const ta = t.admin.users
  const { data, isLoading } = useGetRecoveryCode(user.id, true)
  const logCopy = useLogRecoveryCodeCopy()
  const [revealed, setRevealed] = useState(false)
  const [copied, setCopied] = useState(false)

  function handleCopy() {
    if (!data?.code) return
    navigator.clipboard.writeText(data.code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    logCopy.mutate(user.id)
  }

  return (
    <Modal title={`${ta.viewCodeTitle} — ${user.name}`} onClose={onClose}>
      <div className="space-y-4 min-h-[80px]">
        {isLoading && <p className="text-sm text-text-muted">…</p>}
        {!isLoading && data?.code === null && (
          <p className="text-sm text-text-muted">{ta.viewCodeUnavailable}</p>
        )}
        {!isLoading && data?.code && (
          <>
            <div className="rounded-lg border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-warning">
              {ta.viewCodeWarning}
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-border bg-bg px-4 py-3">
              <code className="flex-1 text-center font-mono text-lg tracking-widest text-text select-none">
                {revealed ? data.code : '•'.repeat(data.code.length)}
              </code>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex gap-2">
                <button
                  onClick={() => setRevealed((v) => !v)}
                  className="flex items-center gap-1.5 rounded-md border border-border bg-surface-raised px-3 py-1.5 text-xs text-text-muted hover:text-text transition-colors"
                >
                  {revealed ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  {revealed ? ta.hideCode : ta.showCode}
                </button>
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 rounded-md border border-border bg-surface-raised px-3 py-1.5 text-xs text-text-muted hover:text-text transition-colors"
                >
                  {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? ta.inviteCopied : ta.copyCode}
                </button>
              </div>
              <button onClick={onClose} className="rounded-lg border border-border px-4 py-2 text-sm text-text-muted hover:bg-surface-raised">
                {ta.cancel}
              </button>
            </div>
          </>
        )}
      </div>
    </Modal>
  )
}

function ConfirmModal({
  title,
  desc,
  onConfirm,
  onClose,
  danger = false,
  loading = false,
  error = '',
}: {
  title: string
  desc: string
  onConfirm: () => void
  onClose: () => void
  danger?: boolean
  loading?: boolean
  error?: string
}) {
  const t = useT()
  const ta = t.admin.users
  return (
    <Modal title={title} onClose={onClose}>
      <div className="space-y-4">
        <p className="text-sm text-text-muted">{desc}</p>
        {error && <p className="text-sm text-error">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="rounded-lg border border-border px-4 py-2 text-sm text-text-muted hover:bg-surface-raised">
            {ta.cancel}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={cn(
              'rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50',
              danger ? 'bg-error text-white hover:bg-error/90' : 'bg-primary text-primary-foreground hover:bg-primary/90',
            )}
          >
            {loading ? '…' : ta.confirm}
          </button>
        </div>
      </div>
    </Modal>
  )
}

type ModalState =
  | { type: 'invite' }
  | { type: 'passkeys'; user: AdminUser }
  | { type: 'regen'; user: AdminUser }
  | { type: 'viewCode'; user: AdminUser }
  | { type: 'disable'; user: AdminUser }
  | { type: 'delete'; user: AdminUser }
  | null

export default function AdminUsersPage() {
  const t = useT()
  const ta = t.admin.users
  const { data: me } = useMe()
  const { data: users, isLoading, error } = useAdminUsers()
  const setStatus = useSetUserStatus()
  const deleteUser = useDeleteUser()
  const [modal, setModal] = useState<ModalState>(null)
  const [actionError, setActionError] = useState('')

  async function handleStatusChange(user: AdminUser) {
    setActionError('')
    try {
      await setStatus.mutateAsync({ id: user.id, isActive: !user.isActive })
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Error')
    }
    setModal(null)
  }

  async function handleDelete(user: AdminUser) {
    setActionError('')
    try {
      await deleteUser.mutateAsync(user.id)
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Error')
    }
    setModal(null)
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link
        href="/settings/administration"
        className="inline-flex items-center text-sm text-text-muted hover:text-text transition-colors"
      >
        {t.admin.back}
      </Link>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text">{ta.title}</h1>
          <p className="mt-1 text-sm text-text-muted">{ta.subtitle}</p>
        </div>
        <button
          onClick={() => setModal({ type: 'invite' })}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <UserPlus className="h-4 w-4" />
          {ta.inviteUser}
        </button>
      </div>

      <Section title={ta.title} subtitle={ta.subtitle}>
        {isLoading && (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-12 animate-pulse rounded-lg bg-surface-raised" />
            ))}
          </div>
        )}
        {error && <p className="text-sm text-error">Failed to load users</p>}
        {!isLoading && users && users.length === 0 && (
          <p className="text-sm text-text-muted">{ta.empty}</p>
        )}
        {users && users.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs font-medium uppercase tracking-wider text-text-subtle">
                  <th className="pb-3 pr-4">{ta.name}</th>
                  <th className="pb-3 pr-4">{ta.email}</th>
                  <th className="pb-3 pr-4">{ta.role}</th>
                  <th className="pb-3 pr-4">{ta.status}</th>
                  <th className="pb-3 pr-4">{ta.lastLogin}</th>
                  <th className="pb-3 pr-4">{ta.passkeyCount}</th>
                  <th className="pb-3">{ta.actions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {users.map((user) => (
                  <tr key={user.id} className="py-2">
                    <td className="py-3 pr-4 font-medium text-text">{user.name}</td>
                    <td className="py-3 pr-4 text-text-muted">{user.email}</td>
                    <td className="py-3 pr-4">
                      <span className={cn(
                        'rounded-full px-2 py-0.5 text-xs font-medium',
                        user.isAdmin
                          ? 'bg-primary-muted text-primary'
                          : 'bg-surface-raised text-text-muted',
                      )}>
                        {user.isAdmin ? ta.roles.admin : ta.roles.user}
                      </span>
                    </td>
                    <td className="py-3 pr-4">
                      <span className={cn(
                        'rounded-full px-2 py-0.5 text-xs font-medium',
                        user.isActive
                          ? 'bg-success/10 text-success'
                          : 'bg-error/10 text-error',
                      )}>
                        {user.isActive ? ta.active : ta.disabled}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-text-muted text-xs">
                      {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString() : ta.never}
                    </td>
                    <td className="py-3 pr-4 text-text-muted">{user.passkeyCount}</td>
                    <td className="py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setModal({ type: 'passkeys', user })}
                          title={ta.viewPasskeys}
                          className="rounded p-1.5 text-text-muted hover:bg-surface-raised hover:text-text"
                        >
                          <Key className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => setModal({ type: 'viewCode', user })}
                          title={ta.viewRecoveryCode}
                          className="rounded p-1.5 text-text-muted hover:bg-surface-raised hover:text-text"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => setModal({ type: 'regen', user })}
                          title={ta.regenCodes}
                          className="rounded p-1.5 text-text-muted hover:bg-surface-raised hover:text-text"
                        >
                          <ShieldCheck className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => setModal({ type: 'disable', user })}
                          title={user.isActive ? ta.disable : ta.activate}
                          className="rounded p-1.5 text-text-muted hover:bg-surface-raised hover:text-warning"
                        >
                          <ShieldOff className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => setModal({ type: 'delete', user })}
                          title={ta.delete}
                          disabled={user.id === me?.id}
                          className="rounded p-1.5 text-text-muted hover:bg-surface-raised hover:text-error disabled:cursor-not-allowed disabled:opacity-30"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      {actionError && (
        <p className="text-sm text-error">{actionError}</p>
      )}

      {modal?.type === 'invite' && <InviteModal onClose={() => setModal(null)} />}
      {modal?.type === 'passkeys' && <PasskeysModal user={modal.user} onClose={() => setModal(null)} />}
      {modal?.type === 'regen' && <RegenCodesModal user={modal.user} onClose={() => setModal(null)} />}
      {modal?.type === 'viewCode' && <ViewRecoveryCodeModal user={modal.user} onClose={() => setModal(null)} />}
      {modal?.type === 'disable' && (
        <ConfirmModal
          title={modal.user.isActive ? ta.confirmDisable : ta.activate}
          desc={modal.user.isActive ? ta.confirmDisableDesc : ''}
          onConfirm={() => handleStatusChange(modal.user)}
          onClose={() => setModal(null)}
          loading={setStatus.isPending}
          error={actionError}
        />
      )}
      {modal?.type === 'delete' && (
        <ConfirmModal
          title={ta.confirmDelete}
          desc={ta.confirmDeleteDesc}
          onConfirm={() => handleDelete(modal.user)}
          onClose={() => setModal(null)}
          danger
          loading={deleteUser.isPending}
          error={actionError}
        />
      )}
    </div>
  )
}
