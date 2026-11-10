'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { useT } from '@/i18n'
import {
  useCreateChange,
  useUpdateChange,
  type ChangelogChange,
  type ChangelogCategoria,
  type ChangelogVisibilita,
} from '@/core/hooks/use-changelog'
import { CATEGORY_ICON, CATEGORY_ORDER } from '@/core/utils/changelog-categories'
import { ModuleAutocomplete } from '@/core/components/module-autocomplete'

const CURATED_MODULES = ['worklog', 'shell', 'changelog']

interface Props {
  onClose: () => void
  releaseId: string
  mode: 'create' | 'edit'
  change?: ChangelogChange
  existingChanges: ChangelogChange[]
}

export function ChangeEditorModal({ onClose, releaseId, mode, change, existingChanges }: Props) {
  const t = useT()
  const tc = t.changelog
  const createChange = useCreateChange(releaseId)
  const updateChange = useUpdateChange()
  const submitMutation = mode === 'edit' ? updateChange : createChange

  const [categoria, setCategoria] = useState<ChangelogCategoria>(change?.categoria ?? 'feature')
  const [titolo, setTitolo] = useState(change?.titolo ?? '')
  const [descrizione, setDescrizione] = useState(change?.descrizione ?? '')
  const [modulo, setModulo] = useState(change?.modulo ?? '')
  const [visibilita, setVisibilita] = useState<ChangelogVisibilita>(change?.visibilita ?? 'user')
  const [migrationNote, setMigrationNote] = useState(change?.migrationNote ?? '')
  const [error, setError] = useState('')

  // Modulo già presenti a DB nei change della release + una lista curata di base — la
  // combobox permette comunque di digitare uno slug nuovo (salvato as-is, mai forzato a match).
  const moduloSuggestions = Array.from(
    new Set([...CURATED_MODULES, ...existingChanges.map((c) => c.modulo).filter((m): m is string => m != null)]),
  )

  // "Ultimo + 1": il backend defaulterebbe a 0 se omesso, collidendo tutti sullo stesso ordine.
  const nextOrdine = existingChanges.length > 0 ? Math.max(...existingChanges.map((c) => c.ordine)) + 1 : 0

  async function handleSubmit() {
    if (!titolo.trim()) return
    setError('')
    const body = {
      categoria,
      visibilita,
      modulo: modulo.trim() || null,
      titolo: titolo.trim(),
      descrizione: descrizione.trim() || null,
      linkWiki: null,
      migrationNote: migrationNote.trim() || null,
      ordine: mode === 'edit' ? change!.ordine : nextOrdine,
    }
    try {
      if (mode === 'edit') {
        await updateChange.mutateAsync({ changeId: change!.id, ...body })
      } else {
        await createChange.mutateAsync(body)
      }
      onClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-border bg-surface shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h3 className="font-semibold text-text">
            {mode === 'edit' ? tc.editChange : tc.addChange}
          </h3>
          <button onClick={onClose} className="rounded p-1 text-text-muted hover:bg-surface-raised hover:text-text">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 p-5">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-text-muted">{tc.categoriaLbl}</label>
            <div className="flex flex-wrap gap-1.5">
              {CATEGORY_ORDER.map((cat) => {
                const Icon = CATEGORY_ICON[cat]
                const active = categoria === cat
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategoria(cat)}
                    className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                      active
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border text-text-muted hover:bg-surface-raised'
                    }`}
                  >
                    <Icon size={12} />
                    {tc.categories[cat]}
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-text-muted">{tc.titoloLbl}</label>
            <input
              value={titolo}
              onChange={(e) => setTitolo(e.target.value)}
              placeholder={tc.changeTitoloPh}
              maxLength={200}
              className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text placeholder:text-text-subtle focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-text-muted">{tc.descrizioneLbl}</label>
            <textarea
              value={descrizione}
              onChange={(e) => setDescrizione(e.target.value)}
              placeholder={tc.changeDescrizionePh}
              rows={2}
              maxLength={2000}
              className="w-full resize-none rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text placeholder:text-text-subtle focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-text-muted">{tc.moduloLbl}</label>
              <ModuleAutocomplete
                value={modulo}
                onChange={setModulo}
                suggestions={moduloSuggestions}
                placeholder={tc.moduloPh}
                className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text placeholder:text-text-subtle focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-text-muted">{tc.visibilitaLbl}</label>
              <select
                value={visibilita}
                onChange={(e) => setVisibilita(e.target.value as ChangelogVisibilita)}
                className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="user">{tc.visibilityUser}</option>
                <option value="developer">{tc.visibilityDeveloper}</option>
                <option value="internal">{tc.visibilityInternal}</option>
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-text-muted">{tc.migrationNoteLbl}</label>
            <textarea
              value={migrationNote}
              onChange={(e) => setMigrationNote(e.target.value)}
              placeholder={tc.migrationNotePh}
              rows={2}
              maxLength={1000}
              className="w-full resize-none rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text placeholder:text-text-subtle focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {error && <p className="text-sm text-error">{error}</p>}

          <div className="flex justify-end gap-2 pt-1">
            <button onClick={onClose} className="rounded-lg border border-border px-4 py-2 text-sm text-text-muted hover:bg-surface-raised">
              {tc.cancel}
            </button>
            <button
              onClick={() => void handleSubmit()}
              disabled={submitMutation.isPending || !titolo.trim()}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {submitMutation.isPending ? tc.saving : tc.saveChanges}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
