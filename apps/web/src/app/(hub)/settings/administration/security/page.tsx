'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useT } from '@/i18n'
import { useAdminSecuritySettings, useUpdateSecuritySettings } from '@/core/hooks/use-admin'

export default function AdminSecurityPage() {
  const t = useT()
  const ts = t.admin.security
  const { data, isLoading } = useAdminSecuritySettings()
  const update = useUpdateSecuritySettings()

  const [allowNonAdmin, setAllowNonAdmin] = useState(true)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (data) setAllowNonAdmin(data.allowNonAdminLogins)
  }, [data])

  async function handleSave() {
    setError('')
    setSaved(false)
    try {
      await update.mutateAsync({ allowNonAdminLogins: allowNonAdmin })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error')
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link
        href="/settings/administration"
        className="inline-flex items-center text-sm text-text-muted hover:text-text transition-colors"
      >
        {t.admin.back}
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-text">{ts.title}</h1>
        <p className="mt-1 text-sm text-text-muted">{ts.subtitle}</p>
      </div>

      <div className="rounded-xl border border-border bg-surface p-6 space-y-5">
        {isLoading ? (
          <div className="h-8 w-48 animate-pulse rounded-lg bg-surface-raised" />
        ) : (
          <div className="flex items-start justify-between gap-6">
            <div className="space-y-1 flex-1">
              <p className="text-sm font-medium text-text">{ts.allowNonAdminLogins}</p>
              <p className="text-xs text-text-muted">{ts.allowNonAdminLoginsDesc}</p>
            </div>
            <button
              onClick={() => setAllowNonAdmin((v) => !v)}
              className={[
                'relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors',
                allowNonAdmin ? 'bg-primary' : 'bg-surface-raised border border-border',
              ].join(' ')}
              role="switch"
              aria-checked={allowNonAdmin}
            >
              <span
                className={[
                  'inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform',
                  allowNonAdmin ? 'translate-x-6' : 'translate-x-1',
                ].join(' ')}
              />
            </button>
          </div>
        )}

        {error && <p className="text-sm text-error">{error}</p>}

        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={handleSave}
            disabled={update.isPending || isLoading}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {update.isPending ? ts.saving : saved ? ts.saved : ts.save}
          </button>
        </div>
      </div>
    </div>
  )
}
