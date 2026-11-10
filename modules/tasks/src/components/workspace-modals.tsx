'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { cn } from '@dexhub/ui'
import { Avatar, type Person } from './task-row'
import type { SpaceInvite, SpaceMember, TaskSpace } from '../api/tasks-client'
import type { Translations } from '../i18n'

// NOTE: shell dei modali duplicata (mirror) da administration/modules e users/page.
// Alla rule-of-three il progetto la estrae in core/components — qui il modulo non puo'
// importare da apps/web, quindi resta locale per costruzione.
function Modal({
  title,
  subtitle,
  onClose,
  children,
}: {
  title: string
  subtitle?: string
  onClose: () => void
  children: React.ReactNode
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl border border-border bg-surface p-5 shadow-xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-text">{title}</h2>
            {subtitle && <p className="mt-1 text-xs text-text-muted">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="rounded p-1 text-text-subtle hover:text-text">
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

const btnPrimary =
  'rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-40'
const btnGhost =
  'rounded-md border border-border px-3 py-1.5 text-xs text-text-muted transition-colors hover:text-text'
const inputCls =
  'w-full rounded-md border border-border bg-bg px-2.5 py-1.5 text-sm text-text placeholder:text-text-subtle focus:outline-none focus:ring-2 focus:ring-primary'

// ─── Invito (mockup, punto 11) ─────────────────────────────────────────────

export function InviteModal({
  t,
  space,
  members,
  invites,
  meId,
  isOwner,
  onClose,
  onInvite,
  onCancelInvite,
  onRemoveMember,
  onDeleteWorkspace,
  onLeave,
}: {
  t: Translations
  space: TaskSpace
  members: SpaceMember[]
  invites: SpaceInvite[]
  meId: string | null
  isOwner: boolean
  onClose: () => void
  onInvite: (email: string) => void
  onCancelInvite: (id: string) => void
  onRemoveMember: (userId: string) => void
  onDeleteWorkspace: () => void
  onLeave: () => void
}) {
  const [email, setEmail] = useState('')
  const [copied, setCopied] = useState(false)
  const code = space.joinCodeFormatted ?? space.joinCode ?? ''

  async function copy() {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      // clipboard negata (contesto non sicuro o permesso rifiutato): il codice resta
      // comunque leggibile a schermo, quindi non c'e' niente da recuperare.
    }
  }

  return (
    <Modal title={t.inviteTitle} subtitle={t.inviteSubtitle} onClose={onClose}>
      <div className="flex gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && email.trim() && onInvite(email.trim())}
          placeholder={t.inviteEmailPlaceholder}
          className={inputCls}
        />
        <button
          onClick={() => email.trim() && onInvite(email.trim())}
          disabled={!email.trim()}
          className={cn(btnPrimary, 'shrink-0')}
        >
          {t.invite}
        </button>
      </div>

      <div className="my-4 flex items-center gap-3">
        <span className="h-px flex-1 bg-border" />
        <span className="font-mono text-[10px] tracking-[0.12em] text-text-subtle">
          {t.orShareCode}
        </span>
        <span className="h-px flex-1 bg-border" />
      </div>

      <div className="flex items-center gap-2">
        <code className="flex-1 rounded-md border border-border bg-bg px-2.5 py-1.5 font-mono text-sm text-text">
          {code}
        </code>
        <button onClick={copy} className={cn(btnGhost, 'shrink-0')}>
          {copied ? t.copied : t.copy}
        </button>
      </div>
      <p className="mt-2 text-[11px] leading-relaxed text-text-subtle">{t.codeHint}</p>

      <p className="mb-2 mt-5 font-mono text-[10px] tracking-[0.12em] text-text-subtle">
        {t.membersLabel}
      </p>
      <ul className="space-y-1.5">
        {members.map((m) => {
          const person: Person = {
            id: m.userId,
            name: m.name ?? m.email ?? '?',
            initial: (m.name ?? m.email ?? '?').charAt(0).toUpperCase(),
          }
          return (
            <li key={m.userId} className="flex items-center gap-2.5">
              <Avatar person={person} />
              <span className="min-w-0 flex-1 truncate text-sm text-text">
                {person.name}
                {m.userId === meId && <span className="ml-1 text-text-subtle">{t.you}</span>}
              </span>
              {/* Gerarchia piatta: si etichetta solo il Proprietario (mockup, punto 14) */}
              {m.isOwner && (
                <span className="shrink-0 font-mono text-[10px] text-text-subtle">
                  {t.roleOwner}
                </span>
              )}
              {isOwner && m.userId !== meId && (
                <button
                  onClick={() => onRemoveMember(m.userId)}
                  title={t.removeMember}
                  className="shrink-0 rounded p-1 text-text-subtle hover:text-error"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </li>
          )
        })}

        {invites.map((inv) => (
          <li key={inv.id} className="flex items-center gap-2.5">
            <Avatar person={{ id: inv.id, name: inv.email, initial: inv.email.charAt(0).toUpperCase() }} />
            <span className="min-w-0 flex-1 truncate text-sm text-text-muted">{inv.email}</span>
            <span className="shrink-0 font-mono text-[10px] text-warning">{t.rolePending}</span>
            {isOwner && (
              <button
                onClick={() => onCancelInvite(inv.id)}
                title={t.removeMember}
                className="shrink-0 rounded p-1 text-text-subtle hover:text-error"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </li>
        ))}
      </ul>

      <div className="mt-5 border-t border-border pt-3">
        {isOwner ? (
          <button
            onClick={onDeleteWorkspace}
            className="w-full rounded-md border border-error/30 px-3 py-1.5 text-sm text-error transition-colors hover:bg-error-muted"
          >
            {t.deleteWorkspaceForAll}
          </button>
        ) : (
          <button
            onClick={onLeave}
            className="w-full rounded-md border border-error/30 px-3 py-1.5 text-sm text-error transition-colors hover:bg-error-muted"
          >
            {t.leaveWorkspace}
          </button>
        )}
      </div>
    </Modal>
  )
}

// ─── Nuovo workspace (punto 12) ────────────────────────────────────────────

export function NewWorkspaceModal({
  t,
  pending,
  onClose,
  onCreate,
}: {
  t: Translations
  pending: boolean
  onClose: () => void
  onCreate: (name: string) => void
}) {
  const [name, setName] = useState('')
  return (
    <Modal title={t.newWorkspaceTitle} subtitle={t.newWorkspaceSubtitle} onClose={onClose}>
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && name.trim() && onCreate(name.trim())}
        placeholder={t.workspaceNamePlaceholder}
        className={inputCls}
      />
      <div className="mt-4 flex justify-end gap-2">
        <button onClick={onClose} className={btnGhost}>
          {t.cancel}
        </button>
        <button
          onClick={() => name.trim() && onCreate(name.trim())}
          disabled={!name.trim() || pending}
          className={btnPrimary}
        >
          {t.create}
        </button>
      </div>
    </Modal>
  )
}

// ─── Unisciti con codice (punto 13) ────────────────────────────────────────

export function JoinModal({
  t,
  pending,
  error,
  onClose,
  onJoin,
}: {
  t: Translations
  pending: boolean
  error: string | null
  onClose: () => void
  onJoin: (code: string) => void
}) {
  const [code, setCode] = useState('')
  return (
    <Modal title={t.joinTitle} subtitle={t.joinSubtitle} onClose={onClose}>
      <input
        autoFocus
        value={code}
        onChange={(e) => setCode(e.target.value.toUpperCase())}
        onKeyDown={(e) => e.key === 'Enter' && code.trim() && onJoin(code.trim())}
        placeholder={t.joinCodePlaceholder}
        className={cn(inputCls, 'font-mono uppercase')}
      />
      {error && <p className="mt-2 text-xs text-error">{error}</p>}
      <div className="mt-4 flex justify-end gap-2">
        <button onClick={onClose} className={btnGhost}>
          {t.cancel}
        </button>
        <button
          onClick={() => code.trim() && onJoin(code.trim())}
          disabled={!code.trim() || pending}
          className={btnPrimary}
        >
          {t.join}
        </button>
      </div>
    </Modal>
  )
}
