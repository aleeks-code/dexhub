'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, Pencil, Trash2, Plus } from 'lucide-react'
import { useT } from '@/i18n'
import {
  useChangelogReleases,
  useChangelogRelease,
  useUpdateRelease,
  useDeleteChange,
  usePublishRelease,
  useDeleteRelease,
  type ChangelogCategoria,
  type ChangelogChange,
  type ChangelogRelease,
} from '@/core/hooks/use-changelog'
import { useDirtyState } from '@/core/hooks/use-dirty-state'
import { useMe } from '@/core/hooks/use-me'
import { CATEGORY_ICON, CATEGORY_ORDER } from '@/core/utils/changelog-categories'
import { ChangeEditorModal } from '@/core/components/change-editor-modal'
import { CreateReleaseModal } from '@/core/components/create-release-modal'

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })
}

type Tc = ReturnType<typeof useT>['changelog']

function OverviewRow({ release, tc }: { release: ChangelogRelease; tc: Tc }) {
  // ponytail: guardia difensiva — un changes mancante (shape API incompleto) non deve mai
  // crashare il render, anche se il backend è già corretto a monte.
  const changes = release.changes ?? []
  const counts = new Map<ChangelogCategoria, number>()
  for (const c of changes) counts.set(c.categoria, (counts.get(c.categoria) ?? 0) + 1)
  const migrationCount = changes.filter((c) => c.migrationNote != null).length

  return (
    <div className="mt-4 flex flex-wrap items-center gap-2">
      {CATEGORY_ORDER.filter((cat) => counts.has(cat)).map((cat) => {
        const n = counts.get(cat)!
        const Icon = CATEGORY_ICON[cat]
        const label = n === 1 ? tc.categories[cat] : tc.categoriesPlural[cat]
        return (
          <span
            key={cat}
            className="flex items-center gap-1 rounded-full border border-border bg-surface-raised px-2 py-0.5 text-xs text-text-muted"
          >
            <Icon size={11} />
            {n} {label}
          </span>
        )
      })}
      {migrationCount > 0 && (
        <span className="flex items-center gap-1 rounded-full bg-warning/10 px-2 py-0.5 text-xs font-medium text-warning">
          <AlertTriangle size={11} />
          {migrationCount} {migrationCount === 1 ? tc.actionRequired : tc.actionsRequiredPlural}
        </span>
      )}
    </div>
  )
}

// Sezione auto-contenuta (header + lista propria): un domani un toggle collapse si aggiunge
// qui dentro senza toccare il resto del DOM della pagina.
function CategorySection({
  categoria,
  changes,
  showModuloChip,
  tc,
  onEdit,
  onDelete,
}: {
  categoria: ChangelogCategoria
  changes: ChangelogChange[]
  showModuloChip: boolean
  tc: Tc
  onEdit?: (change: ChangelogChange) => void
  onDelete?: (change: ChangelogChange) => void
}) {
  const Icon = CATEGORY_ICON[categoria]
  const editable = onEdit != null && onDelete != null

  return (
    <section>
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-text-muted">
        <Icon size={13} />
        {tc.categories[categoria]}
      </div>
      <ul className="mt-2 space-y-3 pl-5">
        {changes.map((change) => (
          <li key={change.id}>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium text-text">{change.titolo}</span>
              {showModuloChip && change.modulo && (
                <span className="rounded border border-border px-1.5 py-0.5 text-[10px] text-text-muted">
                  {change.modulo}
                </span>
              )}
              {change.visibilita !== 'user' && (
                <span className="rounded border border-border/60 px-1.5 py-0.5 text-[10px] text-text-subtle opacity-70">
                  {change.visibilita === 'developer' ? tc.visibilityDeveloper : tc.visibilityInternal}
                </span>
              )}
              {editable && (
                <span className="ml-auto flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => onEdit!(change)}
                    className="rounded p-1 text-text-muted hover:text-primary"
                  >
                    <Pencil size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete!(change)}
                    className="rounded p-1 text-text-muted hover:text-error"
                  >
                    <Trash2 size={13} />
                  </button>
                </span>
              )}
            </div>
            {change.descrizione && <p className="mt-0.5 text-sm text-text-muted">{change.descrizione}</p>}
            {change.migrationNote && (
              <div className="mt-1.5 flex items-start gap-1.5 rounded-lg bg-warning/10 px-2.5 py-1.5 text-xs text-warning">
                <AlertTriangle size={12} className="mt-0.5 shrink-0" />
                <span>
                  <strong className="font-medium">{tc.actionRequired}:</strong> {change.migrationNote}
                </span>
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}

interface DraftFields extends Record<string, unknown> {
  versione: string
  titolo: string
  descrizione: string
}

function toFields(release: ChangelogRelease): DraftFields {
  return { versione: release.versione, titolo: release.titolo, descrizione: release.descrizione ?? '' }
}

export default function ChangelogDetailPage() {
  const t = useT()
  const tc = t.changelog
  const params = useParams<{ versione: string }>()
  const versione = params.versione ?? ''
  const router = useRouter()
  const qc = useQueryClient()
  const { data: release, isLoading, isError } = useChangelogRelease(versione)
  const { data: releases } = useChangelogReleases()
  const { data: me } = useMe()
  const update = useUpdateRelease(release?.id ?? '')
  const deleteChange = useDeleteChange()
  const publish = usePublishRelease(release?.id ?? '')
  const deleteRelease = useDeleteRelease(release?.id ?? '')
  const { value, setValue, isDirty, commit } = useDirtyState<DraftFields>({
    versione: '',
    titolo: '',
    descrizione: '',
  })
  const [saveError, setSaveError] = useState('')
  const [editorState, setEditorState] = useState<{ mode: 'create' } | { mode: 'edit'; change: ChangelogChange } | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ChangelogChange | null>(null)
  const [publishConfirmOpen, setPublishConfirmOpen] = useState(false)
  const [deleteReleaseConfirmOpen, setDeleteReleaseConfirmOpen] = useState(false)
  const [publishError, setPublishError] = useState('')
  const [deleteReleaseError, setDeleteReleaseError] = useState('')
  const [createNextOpen, setCreateNextOpen] = useState(false)

  async function handleConfirmDelete() {
    if (!deleteTarget) return
    await deleteChange.mutateAsync(deleteTarget.id)
    setDeleteTarget(null)
  }

  async function handlePublish() {
    setPublishError('')
    try {
      await publish.mutateAsync()
      setPublishConfirmOpen(false)
      // Nessun setQueryData con la risposta grezza: invalida e basta, il refetch di
      // getReleaseByVersion annida changes correttamente e la pagina torna read-only da sola.
    } catch (err: unknown) {
      setPublishError(err instanceof Error ? err.message : 'Error')
    }
  }

  async function handleDeleteRelease() {
    setDeleteReleaseError('')
    try {
      await deleteRelease.mutateAsync()
      router.push('/changelog')
    } catch (err: unknown) {
      setDeleteReleaseError(err instanceof Error ? err.message : 'Error')
    }
  }

  // Seed solo al primo caricamento di QUESTA release (id), mai su un refetch in background
  // dello stesso id — altrimenti un digitare in corso verrebbe sovrascritto sotto le mani.
  useEffect(() => {
    if (release) commit(toFields(release))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [release?.id])

  // Chip modulo solo se la release copre ≥2 moduli distinti — evita il rumore "worklog ovunque"
  // quando tutti i change sono dello stesso modulo (o modulo null).
  const showModuloChip = release ? new Set((release.changes ?? []).map((c) => c.modulo)).size >= 2 : false
  const isDraft = release?.stato === 'draft'
  // Difesa in profondità: il confine vero è il guard backend, questo evita solo di mostrare
  // controlli che darebbero 403 (un non-admin non vede mai una draft comunque, il backend la 404a).
  const canEdit = isDraft && !!me?.isAdmin

  async function handleSave() {
    if (!release) return
    setSaveError('')
    try {
      const updated = await update.mutateAsync({
        versione: value.versione.trim(),
        titolo: value.titolo.trim(),
        descrizione: value.descrizione.trim() || null,
      })
      commit(toFields(updated))
      qc.setQueryData(['changelog', 'release', updated.versione], updated)
      // La versione può cambiare — l'URL corrente diventerebbe stale, si naviga a quella nuova.
      if (updated.versione !== release.versione) router.replace(`/changelog/${updated.versione}`)
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : 'Error')
    }
  }

  return (
    <div className="px-4 pb-24 pt-6">
      <Link href="/changelog" className="text-sm text-text-muted hover:text-text">
        {tc.backToList}
      </Link>

      {isLoading && <div className="mt-6 p-6 text-center text-sm text-text-muted">{tc.loading}</div>}
      {isError && <div className="mt-6 p-6 text-center text-sm text-error">{tc.error}</div>}
      {!isLoading && !isError && release === null && (
        <div className="mt-6 p-6 text-center text-sm text-text-muted">{tc.notFound}</div>
      )}

      {release && (
        <>
          <div className="mt-4">
            <div className="flex items-center justify-between gap-3">
              {canEdit ? (
                <input
                  value={value.versione}
                  onChange={(e) => setValue({ ...value, versione: e.target.value })}
                  className="w-32 rounded border border-border bg-bg px-2 py-1 font-mono text-xs text-text focus:outline-none focus:ring-2 focus:ring-primary"
                />
              ) : (
                <span className="font-mono text-xs text-text-muted">{release.versione}</span>
              )}
              {isDraft ? (
                <span className="shrink-0 rounded-full bg-warning/10 px-2 py-0.5 text-xs font-medium text-warning">
                  {tc.draft} · {tc.draftHint}
                </span>
              ) : (
                <span className="text-xs text-text-muted">
                  {release.dataPubblicazione ? formatDate(release.dataPubblicazione) : ''}
                </span>
              )}
            </div>

            {canEdit ? (
              <>
                <input
                  value={value.titolo}
                  onChange={(e) => setValue({ ...value, titolo: e.target.value })}
                  className="mt-2 w-full rounded-lg border border-border bg-bg px-3 py-2 text-xl font-medium text-text focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <textarea
                  value={value.descrizione}
                  onChange={(e) => setValue({ ...value, descrizione: e.target.value })}
                  placeholder={tc.descrizionePh}
                  rows={2}
                  className="mt-2 w-full resize-none rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text placeholder:text-text-subtle focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <div className="mt-2 flex items-center gap-1.5 text-xs">
                  <span className={isDirty ? 'text-warning' : 'text-success'}>●</span>
                  <span className={isDirty ? 'text-warning' : 'text-success'}>
                    {isDirty ? tc.unsavedChanges : tc.savedChanges}
                  </span>
                </div>
                {saveError && <p className="mt-2 text-sm text-error">{saveError}</p>}
              </>
            ) : (
              <h1 className="mt-1 text-xl font-medium text-text">{release.titolo}</h1>
            )}
          </div>

          <OverviewRow release={release} tc={tc} />

          <div className="mt-4 border-t border-border" />

          {canEdit && (
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => setEditorState({ mode: 'create' })}
                className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-text hover:bg-surface-raised"
              >
                <Plus className="h-4 w-4" />
                {tc.addChange}
              </button>
            </div>
          )}

          <div className="mt-4 space-y-6">
            {CATEGORY_ORDER.filter((cat) => (release.changes ?? []).some((c) => c.categoria === cat)).map((cat) => (
              <CategorySection
                key={cat}
                categoria={cat}
                changes={(release.changes ?? []).filter((c) => c.categoria === cat)}
                showModuloChip={showModuloChip}
                tc={tc}
                onEdit={canEdit ? (change) => setEditorState({ mode: 'edit', change }) : undefined}
                onDelete={canEdit ? (change) => setDeleteTarget(change) : undefined}
              />
            ))}
          </div>

          {canEdit && (
            // Sticky, non fixed: resta raggiungibile senza rompere lo scroll su release lunghe.
            // Elimina bozza volutamente separata a sinistra (danger secondario, distante dalle
            // altre due) — Salva/Pubblica a destra, gerarchia Pubblica > Salva.
            <div className="sticky bottom-0 z-10 -mx-4 mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-border bg-surface px-4 py-3">
              <button
                onClick={() => setDeleteReleaseConfirmOpen(true)}
                disabled={deleteRelease.isPending}
                className="rounded-lg border border-error/30 px-3 py-2 text-sm text-error hover:bg-error/10 disabled:opacity-50"
              >
                {tc.deleteRelease}
              </button>

              <div className="flex items-center gap-3">
                {isDirty && <span className="text-xs text-text-muted">{tc.publishGateHint}</span>}
                <button
                  onClick={() => void handleSave()}
                  disabled={!isDirty || update.isPending}
                  className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text hover:bg-surface-raised disabled:opacity-50"
                >
                  {update.isPending ? tc.saving : tc.saveChanges}
                </button>
                <button
                  onClick={() => setPublishConfirmOpen(true)}
                  disabled={isDirty || publish.isPending}
                  title={isDirty ? tc.publishGateHint : undefined}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  {publish.isPending ? tc.saving : tc.publishRelease}
                </button>
              </div>
            </div>
          )}

          {!isDraft && me?.isAdmin && !releases?.some((r) => r.stato === 'draft') && (
            <div className="mt-6 flex items-center justify-between gap-3 rounded-xl border border-dashed border-border px-4 py-3">
              <span className="text-sm text-text-muted">{tc.createNextInvite}</span>
              <button
                onClick={() => setCreateNextOpen(true)}
                className="shrink-0 rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-text hover:bg-surface-raised"
              >
                {tc.newRelease}
              </button>
            </div>
          )}
        </>
      )}

      {release && editorState && (
        <ChangeEditorModal
          releaseId={release.id}
          mode={editorState.mode}
          change={editorState.mode === 'edit' ? editorState.change : undefined}
          existingChanges={release.changes ?? []}
          onClose={() => setEditorState(null)}
        />
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-xl border border-border bg-surface shadow-xl">
            <div className="px-4 py-4">
              <p className="text-sm font-semibold text-text">{tc.confirmDeleteChange}</p>
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-border px-4 py-3">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={deleteChange.isPending}
                className="rounded-lg border border-border px-3 py-1.5 text-sm text-text-muted hover:bg-surface-raised"
              >
                {tc.cancel}
              </button>
              <button
                onClick={() => void handleConfirmDelete()}
                disabled={deleteChange.isPending}
                className="rounded-lg bg-error px-3 py-1.5 text-sm font-medium text-white hover:bg-error/90 disabled:opacity-50"
              >
                {deleteChange.isPending ? '…' : tc.confirmDelete}
              </button>
            </div>
          </div>
        </div>
      )}

      {publishConfirmOpen && release && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-xl border border-border bg-surface shadow-xl">
            <div className="space-y-2 px-4 py-4">
              <p className="text-sm font-semibold text-text">
                {tc.confirmPublish} {release.versione}?
              </p>
              <p className="text-sm text-text-muted">{tc.confirmPublishBody}</p>
              {publishError && <p className="text-sm text-error">{publishError}</p>}
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-border px-4 py-3">
              <button
                onClick={() => setPublishConfirmOpen(false)}
                disabled={publish.isPending}
                className="rounded-lg border border-border px-3 py-1.5 text-sm text-text-muted hover:bg-surface-raised"
              >
                {tc.cancel}
              </button>
              <button
                onClick={() => void handlePublish()}
                disabled={publish.isPending}
                className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {publish.isPending ? '…' : tc.publishRelease}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteReleaseConfirmOpen && release && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-xl border border-border bg-surface shadow-xl">
            <div className="space-y-2 px-4 py-4">
              <p className="text-sm font-semibold text-text">
                {tc.confirmDeleteRelease} {release.versione}?
              </p>
              <p className="text-sm text-text-muted">{tc.confirmDeleteReleaseBody}</p>
              {deleteReleaseError && <p className="text-sm text-error">{deleteReleaseError}</p>}
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-border px-4 py-3">
              <button
                onClick={() => setDeleteReleaseConfirmOpen(false)}
                disabled={deleteRelease.isPending}
                className="rounded-lg border border-border px-3 py-1.5 text-sm text-text-muted hover:bg-surface-raised"
              >
                {tc.cancel}
              </button>
              <button
                onClick={() => void handleDeleteRelease()}
                disabled={deleteRelease.isPending}
                className="rounded-lg bg-error px-3 py-1.5 text-sm font-medium text-white hover:bg-error/90 disabled:opacity-50"
              >
                {deleteRelease.isPending ? '…' : tc.deleteRelease}
              </button>
            </div>
          </div>
        </div>
      )}

      <CreateReleaseModal isOpen={createNextOpen} onClose={() => setCreateNextOpen(false)} />
    </div>
  )
}
