'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, Plus } from 'lucide-react'
import { useT } from '@/i18n'
import { useChangelogReleases, type ChangelogRelease } from '@/core/hooks/use-changelog'
import { useMe } from '@/core/hooks/use-me'
import { CreateReleaseModal } from '@/core/components/create-release-modal'
import { CATEGORY_ICON } from '@/core/utils/changelog-categories'

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })
}

function ReleaseRow({
  release,
  tc,
  onClick,
}: {
  release: ChangelogRelease
  tc: ReturnType<typeof useT>['changelog']
  onClick: () => void
}) {
  // Change di punta = primo per ordine (già ordinato dal backend) — fallback quando
  // release.descrizione è null, come nel seed storico.
  const puntaDescrizione = release.descrizione ?? release.changes[0]?.descrizione ?? ''
  const categorie = Array.from(new Set(release.changes.map((c) => c.categoria)))
  const hasMigration = release.changes.some((c) => c.migrationNote != null)

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full flex-col gap-2 border-b border-border px-4 py-4 text-left transition-colors last:border-b-0 hover:bg-surface"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="shrink-0 font-mono text-xs text-text-muted">{release.versione}</span>
          <span className="truncate text-sm font-semibold text-text">{release.titolo}</span>
        </div>
        {release.stato === 'draft' ? (
          <span className="shrink-0 rounded-full bg-warning/10 px-2 py-0.5 text-xs font-medium text-warning">
            {tc.draft} · {tc.draftHint}
          </span>
        ) : (
          <span className="shrink-0 text-xs text-text-muted">
            {release.dataPubblicazione ? formatDate(release.dataPubblicazione) : ''}
          </span>
        )}
      </div>

      {puntaDescrizione && <p className="text-sm text-text-muted">{puntaDescrizione}</p>}

      <div className="flex flex-wrap items-center gap-1.5">
        {categorie.map((cat) => {
          const Icon = CATEGORY_ICON[cat]
          return (
            <span
              key={cat}
              className="flex items-center gap-1 rounded-full border border-border bg-surface-raised px-2 py-0.5 text-xs text-text-muted"
            >
              <Icon size={11} />
              {tc.categories[cat]}
            </span>
          )
        })}
        {hasMigration && (
          <span className="flex items-center gap-1 rounded-full bg-warning/10 px-2 py-0.5 text-xs font-medium text-warning">
            <AlertTriangle size={11} />
            {tc.actionRequired}
          </span>
        )}
      </div>
    </button>
  )
}

export default function ChangelogPage() {
  const t = useT()
  const tc = t.changelog
  const router = useRouter()
  const { data: releases, isLoading, isError } = useChangelogReleases()
  const { data: me } = useMe()
  const [createOpen, setCreateOpen] = useState(false)

  // Una sola draft alla volta (vincolo DB) — la lista deriva quale entry point mostrare
  // dalle release già caricate, niente fetch dedicato.
  const draftRelease = releases?.find((r) => r.stato === 'draft') ?? null

  return (
    <div className="px-4 py-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-text">{tc.title}</h1>
          <p className="text-sm text-text-muted">{tc.subtitle}</p>
        </div>
        {!isLoading && !isError && me?.isAdmin && (
          draftRelease ? (
            <button
              onClick={() => router.push(`/changelog/${draftRelease.versione}`)}
              className="flex shrink-0 items-center gap-1.5 rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-sm font-medium text-warning hover:bg-warning/20"
            >
              {tc.continueDraft} {draftRelease.versione}
            </button>
          ) : (
            <button
              onClick={() => setCreateOpen(true)}
              className="flex shrink-0 items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" />
              {tc.newRelease}
            </button>
          )
        )}
      </div>

      <div className="mt-6 rounded-xl border border-border bg-surface">
        {isLoading && (
          <div className="p-6 text-center text-sm text-text-muted">{tc.loading}</div>
        )}
        {isError && (
          <div className="p-6 text-center text-sm text-error">{tc.error}</div>
        )}
        {!isLoading && !isError && (!releases || releases.length === 0) && (
          <div className="p-6 text-center text-sm text-text-muted">{tc.empty}</div>
        )}
        {!isLoading && !isError && releases && releases.length > 0 && (
          <div>
            {releases.map((release) => (
              <ReleaseRow
                key={release.id}
                release={release}
                tc={tc}
                onClick={() => router.push(`/changelog/${release.versione}`)}
              />
            ))}
          </div>
        )}
      </div>

      <CreateReleaseModal isOpen={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  )
}
