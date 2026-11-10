'use client'

import { useState } from 'react'
import { X, LayoutTemplate, ChevronDown, AlertTriangle } from 'lucide-react'
import { Button } from '@dexhub/ui'
import type { EntryInput, WorklogTemplate } from '../services/worklog-api'
import type { WorklogTranslations } from '../i18n'
import { EntryEditor } from './entry-editor'

function fill(template: string, vars: Record<string, number>): string {
  return template.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? 0))
}

interface Props {
  selectedCount: number
  daysWithEntries: number
  defaultHours: number
  homogeneousFeriale: boolean // true solo se OGNI data selezionata è feriale non festiva — precompila "lavoro"
  templates: WorklogTemplate[]
  t: WorklogTranslations
  onApply: (entries: EntryInput[], note: string, onlyEmpty: boolean) => Promise<void>
  onClose: () => void
}

export function BulkModal({ selectedCount, daysWithEntries, defaultHours, homogeneousFeriale, templates, t, onApply, onClose }: Props) {
  const [entries, setEntries] = useState<EntryInput[]>(() =>
    homogeneousFeriale ? [{ kind: 'work', hours: defaultHours }] : [],
  )
  const [note, setNote] = useState('')
  const [showTemplates, setShowTemplates] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const hasConflict = daysWithEntries > 0

  function applyTemplate(tpl: WorklogTemplate) {
    setEntries(tpl.entries.map((e) => ({ ...e })))
    setShowTemplates(false)
  }

  async function handleApply(onlyEmpty: boolean) {
    if (entries.length === 0) {
      setError(t.bulk.noEntries)
      return
    }
    setSaving(true)
    setError(null)
    try {
      await onApply(entries, note, onlyEmpty)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl border border-border bg-bg shadow-xl">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-border px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold text-text">
              {fill(t.bulk.applyTitle, { n: selectedCount })}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-text-muted hover:bg-surface hover:text-text"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="px-4 py-3 space-y-3">
          {/* Template picker */}
          {templates.length > 0 && (
            <div className="relative flex justify-end">
              <button
                type="button"
                onClick={() => setShowTemplates((v) => !v)}
                className="flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs font-medium text-text hover:border-primary/60 hover:bg-surface hover:text-primary transition-colors"
              >
                <LayoutTemplate size={13} />
                {t.templates.applyTemplate}
                <ChevronDown size={12} className={showTemplates ? 'rotate-180 transition-transform' : 'transition-transform'} />
              </button>
              {showTemplates && (
                <div className="absolute right-0 top-9 z-10 min-w-[180px] rounded-lg border border-border bg-bg shadow-lg">
                  {templates.map((tpl) => (
                    <button
                      key={tpl.id}
                      type="button"
                      onClick={() => applyTemplate(tpl)}
                      className="w-full px-3 py-2 text-left text-sm text-text hover:bg-surface"
                    >
                      {tpl.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Entries */}
          {entries.length === 0 && (
            <p className="text-xs text-text-muted py-1">{t.bulk.noEntries}</p>
          )}
          <EntryEditor entries={entries} setEntries={setEntries} defaultHours={defaultHours} t={t} />

          {/* Note */}
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={t.modal.notePh}
            rows={2}
            className="w-full resize-none rounded-md border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-text-muted focus:border-primary focus:outline-none"
          />

          {/* Conflict warning */}
          {hasConflict && entries.length > 0 && (
            <div className="flex items-center gap-2 rounded-lg bg-warning/10 px-3 py-2 text-xs text-warning">
              <AlertTriangle size={14} />
              {fill(t.bulk.conflict, { x: daysWithEntries, n: selectedCount })}
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-error/10 px-3 py-2 text-xs text-error">
              <AlertTriangle size={14} />
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-border px-4 py-3">
          <Button variant="secondary" size="sm" onClick={onClose} disabled={saving}>
            {t.modal.cancel}
          </Button>
          {hasConflict ? (
            <>
              <Button
                variant="primary"
                size="sm"
                onClick={() => handleApply(true)}
                disabled={saving}
              >
                {saving ? t.bulk.saving : t.bulk.onlyEmpty}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleApply(false)}
                disabled={saving}
              >
                {t.bulk.overwriteAll}
              </Button>
            </>
          ) : (
            <Button
              variant="primary"
              size="sm"
              onClick={() => handleApply(false)}
              disabled={saving}
            >
              {saving ? t.bulk.saving : t.bulk.apply}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
