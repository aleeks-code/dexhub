'use client'

import { useEffect, useRef, useState } from 'react'
import { Check, GripVertical, Pencil, Star, Trash2 } from 'lucide-react'
import { cn } from '@dexhub/ui'
import type { Task, TaskPriority } from '../api/tasks-client'
import type { Translations } from '../i18n'

/** Bassa verde, Media giallo, Alta rosso (mockup, punto 16) — via token, non hex. */
const PRIO_CLASS: Record<TaskPriority, string> = {
  bassa: 'text-success border-success/30 bg-success/10',
  media: 'text-warning border-warning/30 bg-warning/10',
  alta: 'text-error border-error/30 bg-error/10',
  critica: 'text-error border-error/30 bg-error/10',
}

export interface Person {
  id: string
  name: string
  initial: string
}

/** Avatar dell'assegnatario. Il colore deriva dall'id, così la stessa persona ha sempre
 *  la stessa tinta senza che il backend debba memorizzarne una. */
const AVATAR_TONES = [
  'bg-primary/20 text-primary',
  'bg-warning/20 text-warning',
  'bg-info/20 text-info',
  'bg-violet/20 text-violet',
  'bg-pink/20 text-pink',
]

export function Avatar({ person, size = 22 }: { person: Person; size?: number }) {
  let hash = 0
  for (const ch of person.id) hash = (hash + ch.charCodeAt(0)) % AVATAR_TONES.length
  return (
    <span
      title={person.name}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full font-medium',
        AVATAR_TONES[hash],
      )}
      style={{ width: size, height: size, fontSize: size * 0.45 }}
    >
      {person.initial}
    </span>
  )
}

function formatDue(iso: string | undefined, locale: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' }).format(d)
}

/** input[type=date] vuole YYYY-MM-DD, non un ISO completo. */
export function toDateInput(iso: string | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toISOString().slice(0, 10)
}

interface Props {
  task: Task
  t: Translations
  assignee?: Person
  dragging: boolean
  onToggleDone: () => void
  onToggleStar: () => void
  onSave: (patch: { title: string; dueDate: string }) => void
  onDelete: () => void
  onDragStart: () => void
  onDragEnd: () => void
  onDragOver: (e: React.DragEvent) => void
  onDrop: () => void
}

export function TaskRow({
  task,
  t,
  assignee,
  dragging,
  onToggleDone,
  onToggleStar,
  onSave,
  onDelete,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
}: Props) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(task.title)
  const [draftDate, setDraftDate] = useState(toDateInput(task.dueDate))
  const inputRef = useRef<HTMLInputElement>(null)

  const done = task.status === 'completata'

  useEffect(() => {
    if (editing) inputRef.current?.focus()
  }, [editing])

  function startEdit() {
    setDraft(task.title)
    setDraftDate(toDateInput(task.dueDate))
    setEditing(true)
  }

  function commit() {
    const title = draft.trim()
    if (!title) return setEditing(false)
    onSave({ title, dueDate: draftDate })
    setEditing(false)
  }

  return (
    <div
      draggable={!editing}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDrop={onDrop}
      className={cn(
        'group flex items-center gap-2.5 rounded-lg border border-border bg-surface px-3 py-2.5 transition-colors',
        'hover:border-border-strong',
        dragging && 'opacity-40',
      )}
    >
      <GripVertical className="h-4 w-4 shrink-0 cursor-grab text-text-subtle opacity-0 transition-opacity group-hover:opacity-100" />

      <button
        onClick={onToggleDone}
        aria-label={task.title}
        className={cn(
          'flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[6px] border transition-colors',
          done
            ? 'border-primary bg-primary text-primary-foreground'
            : 'border-border-strong hover:border-primary',
        )}
      >
        {done && <Check className="h-3 w-3" strokeWidth={3} />}
      </button>

      {editing ? (
        <>
          <input
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commit()
              if (e.key === 'Escape') setEditing(false)
            }}
            className="min-w-0 flex-1 rounded-md border border-border bg-bg px-2 py-1 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <input
            type="date"
            value={draftDate}
            onChange={(e) => setDraftDate(e.target.value)}
            className="shrink-0 rounded-md border border-border bg-bg px-2 py-1 font-mono text-xs text-text-muted focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <button
            onClick={commit}
            title={t.save}
            className="shrink-0 rounded p-1 text-primary hover:bg-primary/10"
          >
            <Check className="h-4 w-4" />
          </button>
        </>
      ) : (
        <>
          <span
            className={cn(
              'min-w-0 flex-1 truncate text-sm',
              done ? 'text-text-subtle line-through' : 'text-text',
            )}
          >
            {task.title}
          </span>

          {assignee && <Avatar person={assignee} />}

          {/* Pill priorità: solo se non Bassa e non completata (mockup, punto 6) */}
          {!done && task.priority !== 'bassa' && (
            <span
              className={cn(
                'shrink-0 rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase',
                PRIO_CLASS[task.priority],
              )}
            >
              {task.priority === 'media' ? t.prioMedium : t.prioHigh}
            </span>
          )}

          {task.dueDate && (
            <span className="shrink-0 font-mono text-[11px] text-text-subtle">
              {formatDue(task.dueDate, t.locale)}
            </span>
          )}

          <button
            onClick={onToggleStar}
            title={t.markImportant}
            className="shrink-0 rounded p-1 transition-colors"
          >
            <Star
              className={cn(
                'h-3.5 w-3.5',
                task.favorite ? 'fill-warning text-warning' : 'text-text-subtle hover:text-warning',
              )}
            />
          </button>

          <button
            onClick={startEdit}
            title={t.edit}
            className="shrink-0 rounded p-1 text-text-subtle opacity-0 transition-opacity hover:text-text group-hover:opacity-100"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>

          <button
            onClick={onDelete}
            title={t.delete}
            className="shrink-0 rounded p-1 text-text-subtle opacity-0 transition-opacity hover:text-error group-hover:opacity-100"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </>
      )}
    </div>
  )
}
