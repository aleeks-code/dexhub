'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'
import { useT } from '@/i18n'
import { useCreateRelease } from '@/core/hooks/use-changelog'

interface CreateReleaseModalProps {
  isOpen: boolean
  onClose: () => void
}

export function CreateReleaseModal({ isOpen, onClose }: CreateReleaseModalProps) {
  const t = useT()
  const tc = t.changelog
  const router = useRouter()
  const [versione, setVersione] = useState('')
  const [titolo, setTitolo] = useState('')
  const [descrizione, setDescrizione] = useState('')
  const [error, setError] = useState('')
  const create = useCreateRelease()

  if (!isOpen) return null

  function handleClose() {
    setVersione('')
    setTitolo('')
    setDescrizione('')
    setError('')
    onClose()
  }

  async function handleSubmit() {
    if (!versione.trim() || !titolo.trim()) return
    setError('')
    try {
      const release = await create.mutateAsync({
        versione: versione.trim(),
        titolo: titolo.trim(),
        descrizione: descrizione.trim() || null,
      })
      handleClose()
      router.push(`/changelog/${release.versione}`)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl border border-border bg-surface shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h3 className="font-semibold text-text">{tc.newRelease}</h3>
          <button
            onClick={handleClose}
            className="rounded p-1 text-text-muted hover:bg-surface-raised hover:text-text"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 p-5">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-text-muted">{tc.versioneLbl}</label>
            <input
              value={versione}
              onChange={(e) => setVersione(e.target.value)}
              placeholder={tc.versionePh}
              className="w-full rounded-lg border border-border bg-bg px-3 py-2 font-mono text-sm text-text placeholder:text-text-subtle focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-text-muted">{tc.titoloLbl}</label>
            <input
              value={titolo}
              onChange={(e) => setTitolo(e.target.value)}
              placeholder={tc.titoloPh}
              maxLength={200}
              className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text placeholder:text-text-subtle focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-text-muted">{tc.descrizioneLbl}</label>
            <textarea
              value={descrizione}
              onChange={(e) => setDescrizione(e.target.value)}
              placeholder={tc.descrizionePh}
              rows={3}
              maxLength={2000}
              className="w-full resize-none rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text placeholder:text-text-subtle focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {error && <p className="text-sm text-error">{error}</p>}

          <div className="flex justify-end gap-2 pt-1">
            <button
              onClick={handleClose}
              className="rounded-lg border border-border px-4 py-2 text-sm text-text-muted hover:bg-surface-raised"
            >
              {tc.cancel}
            </button>
            <button
              onClick={() => void handleSubmit()}
              disabled={create.isPending || !versione.trim() || !titolo.trim()}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {create.isPending ? tc.creating : tc.createRelease}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
