'use client'

import { useState } from 'react'
import { Button } from '@dexhub/ui'
import type { Note } from '../services/notes-service'
import { useNoteT } from '../i18n'

interface NoteEditorProps {
  note?: Note
  onSave: (title: string, content: string) => Promise<void>
  onCancel: () => void
}

export function NoteEditor({ note, onSave, onCancel }: NoteEditorProps) {
  const t = useNoteT()
  const [title, setTitle] = useState(note?.title ?? '')
  const [content, setContent] = useState(note?.content ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    setSaving(true)
    setError('')
    try {
      await onSave(title.trim(), content.trim())
    } catch (err) {
      setError(err instanceof Error ? err.message : t.editor.saveFailed)
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder={t.editor.titlePh}
        required
        autoFocus
        className="w-full rounded-md border border-border bg-bg px-3 py-2 text-base font-medium text-text placeholder:text-text-subtle focus:outline-none focus:ring-2 focus:ring-primary"
      />
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={t.editor.contentPh}
        rows={12}
        className="w-full resize-none rounded-md border border-border bg-bg px-3 py-2 text-sm text-text placeholder:text-text-subtle focus:outline-none focus:ring-2 focus:ring-primary"
      />
      {error && <p className="text-sm text-error">{error}</p>}
      <div className="flex items-center justify-end gap-3">
        <button type="button" onClick={onCancel} className="text-sm text-text-muted hover:text-text">
          {t.editor.cancel}
        </button>
        <Button type="submit" disabled={saving || !title.trim()}>
          {saving ? t.editor.saving : note ? t.editor.save : t.editor.create}
        </Button>
      </div>
    </form>
  )
}
