'use client'

import { useState, useEffect } from 'react'
import { FileText, CheckSquare, X, Plus, Sparkles, Loader2 } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { createNote } from '@dexhub/notes'
import { tasksApi, useSpaces } from '@dexhub/tasks'
import type { TaskPriority, TaskSection } from '@dexhub/tasks'

interface QuickCaptureModalProps {
  open: boolean
  initialTab?: 'note' | 'task'
  onClose: () => void
}

export function QuickCaptureModal({ open, initialTab = 'note', onClose }: QuickCaptureModalProps) {
  const [activeTab, setActiveTab] = useState<'note' | 'task'>(initialTab)
  const queryClient = useQueryClient()

  // Note fields
  const [noteTitle, setNoteTitle] = useState('')
  const [noteContent, setNoteContent] = useState('')

  // Task fields
  const [taskTitle, setTaskTitle] = useState('')
  const [taskSection, setTaskSection] = useState<TaskSection>('oggi')
  const [taskPriority, setTaskPriority] = useState<TaskPriority>('media')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { data: spaces = [] } = useSpaces()
  const personalSpace = spaces.find((s) => s.type === 'personal') ?? spaces[0] ?? null

  useEffect(() => {
    if (open) {
      setActiveTab(initialTab)
      setError(null)
    }
  }, [open, initialTab])

  if (!open) return null

  async function handleSaveNote(e: React.FormEvent) {
    e.preventDefault()
    if (!noteTitle.trim()) {
      setError('Inserisci un titolo per la nota')
      return
    }

    setLoading(true)
    setError(null)
    try {
      await createNote(noteTitle.trim(), noteContent.trim())
      await queryClient.invalidateQueries({ queryKey: ['notes'] })
      setNoteTitle('')
      setNoteContent('')
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore nel salvataggio della nota')
    } finally {
      setLoading(false)
    }
  }

  async function handleSaveTask(e: React.FormEvent) {
    e.preventDefault()
    if (!taskTitle.trim()) {
      setError('Inserisci il nome del task')
      return
    }
    if (!personalSpace) {
      setError('Nessuno spazio task trovato')
      return
    }

    setLoading(true)
    setError(null)
    try {
      await tasksApi.create(personalSpace.id, {
        title: taskTitle.trim(),
        section: taskSection,
        priority: taskPriority,
      })
      await queryClient.invalidateQueries({ queryKey: ['tasks'] })
      setTaskTitle('')
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore nella creazione del task')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-modal flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className="relative w-full max-w-lg rounded-2xl border border-border bg-surface-raised p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header & Tabs */}
        <div className="flex items-center justify-between border-b border-border/70 pb-4 mb-5">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => { setActiveTab('note'); setError(null) }}
              className={`flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
                activeTab === 'note'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-text-muted hover:bg-surface hover:text-text'
              }`}
            >
              <FileText className="h-3.5 w-3.5" />
              <span>Nuova Nota</span>
            </button>
            <button
              type="button"
              onClick={() => { setActiveTab('task'); setError(null) }}
              className={`flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
                activeTab === 'task'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-text-muted hover:bg-surface hover:text-text'
              }`}
            >
              <CheckSquare className="h-3.5 w-3.5" />
              <span>Nuovo Task</span>
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-text-subtle hover:bg-surface hover:text-text transition-colors"
            aria-label="Chiudi"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-xl bg-rose-500/10 border border-rose-500/20 px-3.5 py-2 text-xs text-rose-500">
            {error}
          </div>
        )}

        {/* Note Form */}
        {activeTab === 'note' && (
          <form onSubmit={handleSaveNote} className="space-y-4">
            <div>
              <label className="block text-[11px] font-semibold text-text-subtle uppercase tracking-wider mb-1.5">
                Titolo
              </label>
              <input
                type="text"
                value={noteTitle}
                onChange={(e) => setNoteTitle(e.target.value)}
                placeholder="Es. Idee progetto, appunto rapido..."
                autoFocus
                className="w-full rounded-xl border border-border bg-bg px-3.5 py-2.5 text-sm text-text placeholder:text-text-subtle focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-text-subtle uppercase tracking-wider mb-1.5">
                Contenuto
              </label>
              <textarea
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                placeholder="Scrivi qui gli appunti..."
                rows={4}
                className="w-full rounded-xl border border-border bg-bg px-3.5 py-2.5 text-sm text-text placeholder:text-text-subtle focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/50">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl px-4 py-2 text-xs font-medium text-text-muted hover:bg-surface hover:text-text transition-colors"
              >
                Annulla
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-sm hover:opacity-90 disabled:opacity-50 transition-all"
              >
                {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                <span>Salva Nota</span>
              </button>
            </div>
          </form>
        )}

        {/* Task Form */}
        {activeTab === 'task' && (
          <form onSubmit={handleSaveTask} className="space-y-4">
            <div>
              <label className="block text-[11px] font-semibold text-text-subtle uppercase tracking-wider mb-1.5">
                Cosa devi fare?
              </label>
              <input
                type="text"
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                placeholder="Es. Pagare bolletta luce, fare la spesa..."
                autoFocus
                className="w-full rounded-xl border border-border bg-bg px-3.5 py-2.5 text-sm text-text placeholder:text-text-subtle focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-text-subtle uppercase tracking-wider mb-1.5">
                  Quando
                </label>
                <select
                  value={taskSection}
                  onChange={(e) => setTaskSection(e.target.value as TaskSection)}
                  className="w-full rounded-xl border border-border bg-bg px-3 py-2 text-xs text-text focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="oggi">Oggi</option>
                  <option value="settimana">Questa settimana</option>
                  <option value="prossime">Prossimamente</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-text-subtle uppercase tracking-wider mb-1.5">
                  Priorità
                </label>
                <select
                  value={taskPriority}
                  onChange={(e) => setTaskPriority(e.target.value as TaskPriority)}
                  className="w-full rounded-xl border border-border bg-bg px-3 py-2 text-xs text-text focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="bassa">Bassa</option>
                  <option value="media">Media</option>
                  <option value="alta">Alta</option>
                  <option value="critica">Critica</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/50">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl px-4 py-2 text-xs font-medium text-text-muted hover:bg-surface hover:text-text transition-colors"
              >
                Annulla
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-sm hover:opacity-90 disabled:opacity-50 transition-all"
              >
                {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                <span>Crea Task</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
