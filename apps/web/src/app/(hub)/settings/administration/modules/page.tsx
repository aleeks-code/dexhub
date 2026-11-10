'use client'

import { useState } from 'react'
import Link from 'next/link'
import { X } from 'lucide-react'
import { cn } from '@dexhub/ui'
import { useT } from '@/i18n'
import { useModules, useSetModuleStatus, type ApiModule } from '@/core/hooks/use-modules'
import { resolveModuleIcon } from '@/core/utils/module-icons'
import { Switch } from '@/core/components/switch'

// NOTE: mirror di Modal/ConfirmModal da users/page.tsx (2° uso). Al 3° uso estrarre in core/components/ e ricablare entrambi i call-site (rule-of-three).
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

function ConfirmModal({
  title,
  desc,
  onConfirm,
  onClose,
  loading,
}: {
  title: string
  desc: string
  onConfirm: () => void
  onClose: () => void
  loading: boolean
}) {
  const t = useT()
  const tm = t.admin.modules
  return (
    <Modal title={title} onClose={onClose}>
      <div className="space-y-4">
        <p className="text-sm text-text-muted">{desc}</p>
        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="rounded-lg border border-border px-4 py-2 text-sm text-text-muted hover:bg-surface-raised">
            {tm.cancel}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="rounded-lg bg-error px-4 py-2 text-sm font-medium text-white hover:bg-error/90 disabled:opacity-50"
          >
            {loading ? '…' : tm.disable}
          </button>
        </div>
      </div>
    </Modal>
  )
}

function StatusPill({ status, tm }: { status: 'error' | 'incompatible'; tm: ReturnType<typeof useT>['admin']['modules'] }) {
  return (
    <span
      className={cn(
        'rounded-full px-2 py-0.5 text-xs font-medium',
        status === 'error' ? 'bg-warning/10 text-warning' : 'bg-surface-raised text-text-muted',
      )}
    >
      {status === 'error' ? tm.badgeError : tm.badgeIncompatible}
    </span>
  )
}

export default function AdminModulesPage() {
  const t = useT()
  const ta = t.admin
  const tm = t.admin.modules
  const { data: modules, isLoading } = useModules()
  const setStatus = useSetModuleStatus()
  const [disableTarget, setDisableTarget] = useState<ApiModule | null>(null)

  const sorted = [...(modules ?? [])].sort((a, b) => {
    const ao = (a.manifest['navOrder'] as number | undefined) ?? Infinity
    const bo = (b.manifest['navOrder'] as number | undefined) ?? Infinity
    if (ao !== bo) return ao - bo
    return a.name.localeCompare(b.name)
  })

  function handleToggle(mod: ApiModule, next: boolean) {
    if (next) {
      setStatus.mutate({ id: mod.id, action: 'enable' })
    } else {
      setDisableTarget(mod)
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link
        href="/settings/administration"
        className="inline-flex items-center text-sm text-text-muted hover:text-text transition-colors"
      >
        {ta.back}
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-text">{tm.title}</h1>
        <p className="mt-1 text-sm text-text-muted">{tm.subtitle}</p>
      </div>

      <div className="space-y-3">
        {isLoading &&
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-surface-raised" />
          ))}

        {!isLoading && sorted.length === 0 && (
          <p className="text-sm text-text-muted">{tm.empty}</p>
        )}

        {!isLoading &&
          sorted.map((mod) => {
            const Icon = resolveModuleIcon(mod.manifest['icon'] as string | undefined)
            const description = mod.manifest['description'] as string | undefined
            const pending = setStatus.isPending && setStatus.variables?.id === mod.id
            const togglable = mod.status === 'active' || mod.status === 'disabled'

            return (
              <div
                key={mod.id}
                className="flex items-center gap-4 rounded-xl border border-border bg-surface p-4"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-muted">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-text">{mod.name}</p>
                  {description && <p className="text-xs text-text-muted">{description}</p>}
                </div>
                {togglable ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-text-muted">
                      {mod.status === 'active' ? tm.statusActive : tm.statusDisabled}
                    </span>
                    <Switch
                      checked={mod.status === 'active'}
                      onChange={(next) => handleToggle(mod, next)}
                      disabled={pending}
                      aria-label={mod.name}
                    />
                  </div>
                ) : (
                  <StatusPill status={mod.status as 'error' | 'incompatible'} tm={tm} />
                )}
              </div>
            )
          })}
      </div>

      {disableTarget && (
        <ConfirmModal
          title={tm.confirmDisableTitle}
          desc={tm.confirmDisableDesc}
          loading={setStatus.isPending && setStatus.variables?.id === disableTarget.id}
          onClose={() => setDisableTarget(null)}
          onConfirm={() => {
            setStatus.mutate(
              { id: disableTarget.id, action: 'disable' },
              { onSuccess: () => setDisableTarget(null) },
            )
          }}
        />
      )}
    </div>
  )
}
