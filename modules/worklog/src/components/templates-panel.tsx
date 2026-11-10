'use client'

import { useState } from 'react'
import { X, Plus, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@dexhub/ui'
import {
  useWorklogTemplates,
  useCreateTemplate,
  useUpdateTemplate,
  useDeleteTemplate,
  type EntryInput,
  type EntryKind,
  type WorklogTemplate,
} from '../services/worklog-api'
import type { WorklogTranslations } from '../i18n'
import { KIND_COLOR } from '../utils/kind-colors'

const ALL_KINDS: EntryKind[] = [
  'work', 'overtime', 'vacation', 'leave', 'sick', 'holiday', 'permesso_non_retribuito',
]

interface Props {
  defaultHours: number
  t: WorklogTranslations
  onClose: () => void
}

export function TemplatesPanel({ defaultHours, t, onClose }: Props) {
  const { data: templates = [] } = useWorklogTemplates()
  const createTemplate = useCreateTemplate()
  const updateTemplate = useUpdateTemplate()
  const deleteTemplate = useDeleteTemplate()

  const [creating, setCreating] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [entries, setEntries] = useState<EntryInput[]>([{ kind: 'work', hours: defaultHours }])
  const [confirmId, setConfirmId] = useState<string | null>(null)

  const submitMutation = editingId ? updateTemplate : createTemplate

  function updateEntry(i: number, patch: Partial<EntryInput>) {
    setEntries((prev) => prev.map((e, idx) => (idx === i ? { ...e, ...patch } : e)))
  }

  function startCreate() {
    setEditingId(null)
    setName('')
    setEntries([{ kind: 'work', hours: defaultHours }])
    setCreating(true)
  }

  function startEdit(tpl: WorklogTemplate) {
    setEditingId(tpl.id)
    setName(tpl.name)
    setEntries(tpl.entries.map((e) => ({ ...e })))
    setCreating(true)
  }

  function cancelForm() {
    setCreating(false)
    setEditingId(null)
  }

  async function handleSubmit() {
    if (!name.trim() || entries.length === 0) return
    if (editingId) {
      await updateTemplate.mutateAsync({ id: editingId, name: name.trim(), entries })
    } else {
      await createTemplate.mutateAsync({ name: name.trim(), entries })
    }
    setCreating(false)
    setEditingId(null)
    setName('')
    setEntries([{ kind: 'work', hours: defaultHours }])
  }

  async function handleConfirmDelete() {
    if (!confirmId) return
    await deleteTemplate.mutateAsync(confirmId)
    setConfirmId(null)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl border border-border bg-bg shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold text-text">{t.templates.title}</h2>
          <button type="button" onClick={onClose} className="rounded p-1 text-text-muted hover:bg-surface hover:text-text">
            <X size={16} />
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto px-4 py-3 space-y-2">
          {templates.length === 0 && !creating && (
            <p className="text-sm text-text-muted">{t.templates.empty}</p>
          )}

          {templates.map((tpl) => (
            <div key={tpl.id} className="flex items-center gap-2 rounded-lg border border-border px-3 py-2">
              <div className="flex-1">
                <div className="text-sm font-medium text-text">{tpl.name}</div>
                <div className="text-xs text-text-muted">
                  {tpl.entries.map((e) => `${t.kind[e.kind]} ${e.hours}h`).join(' + ')}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => startEdit(tpl)}
                  className="rounded p-1 text-text-muted hover:text-primary"
                >
                  <Pencil size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmId(tpl.id)}
                  className="rounded p-1 text-text-muted hover:text-error"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}

          {creating && (
            <div className="space-y-2 rounded-lg border border-primary/30 bg-surface p-3">
              <input
                autoFocus
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t.templates.namePh}
                className="w-full rounded-md border border-border bg-bg px-3 py-1.5 text-sm text-text placeholder:text-text-muted focus:border-primary focus:outline-none"
              />
              {entries.map((entry, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className={`h-2 w-2 shrink-0 rounded-full ${KIND_COLOR[entry.kind].dot}`} />
                  <select
                    value={entry.kind}
                    onChange={(e) => updateEntry(i, { kind: e.target.value as EntryKind })}
                    className="flex-1 rounded-md border border-border bg-surface px-2 py-1.5 text-sm text-text focus:border-primary focus:outline-none [&>option]:bg-surface [&>option]:text-text"
                  >
                    {ALL_KINDS.map((k) => (
                      <option key={k} value={k}>{t.kind[k]}</option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min={0}
                    max={24}
                    step={0.5}
                    value={entry.hours}
                    onChange={(e) => updateEntry(i, { hours: parseFloat(e.target.value) || 0 })}
                    className="w-16 rounded-md border border-border bg-bg px-2 py-1.5 text-sm text-text focus:border-primary focus:outline-none"
                  />
                  {entries.length > 1 && (
                    <button type="button" onClick={() => setEntries((p) => p.filter((_, idx) => idx !== i))} className="text-text-muted hover:text-error">
                      <X size={14} />
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={() => setEntries((p) => [...p, { kind: 'work', hours: defaultHours }])}
                className="flex items-center gap-1 text-xs text-text-muted hover:text-primary"
              >
                <Plus size={13} /> {t.modal.addEntry}
              </button>
              <div className="flex gap-2 pt-1">
                <Button variant="secondary" size="sm" onClick={cancelForm}>{t.templates.cancel}</Button>
                <Button variant="primary" size="sm" onClick={handleSubmit} disabled={!name.trim() || submitMutation.isPending}>
                  {submitMutation.isPending ? '…' : t.templates.save}
                </Button>
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-border px-4 py-3">
          {!creating && (
            <Button variant="outline" size="sm" onClick={startCreate}>
              <Plus size={14} />
              {t.templates.new}
            </Button>
          )}
        </div>
      </div>

      {/* Delete confirm — standard del modulo, identico a bulk-delete/delete-month */}
      {confirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-xl border border-border bg-bg shadow-xl">
            <div className="px-4 py-4 space-y-2">
              <p className="text-sm font-semibold text-text">{t.templates.confirmDelete}</p>
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-border px-4 py-3">
              <Button variant="secondary" size="sm" onClick={() => setConfirmId(null)} disabled={deleteTemplate.isPending}>
                {t.modal.cancel}
              </Button>
              <Button variant="danger" size="sm" onClick={handleConfirmDelete} disabled={deleteTemplate.isPending}>
                {deleteTemplate.isPending ? '…' : t.modal.confirm}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
