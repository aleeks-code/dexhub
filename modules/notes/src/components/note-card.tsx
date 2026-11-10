'use client'

import { Pencil, Star, Trash2 } from 'lucide-react'
import { cn } from '@dexhub/ui'
import type { Note } from '../services/notes-service'
import { useNoteT } from '../i18n'

interface NoteCardProps {
  note: Note
  onEdit: (note: Note) => void
  onDelete: (id: string) => void
  onToggleStar: (id: string) => void
  className?: string
}

export function NoteCard({ note, onEdit, onDelete, onToggleStar, className }: NoteCardProps) {
  const t = useNoteT()
  const preview = note.content.slice(0, 120).trim()
  const date = new Date(note.updatedAt).toLocaleDateString(t.locale, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  return (
    <div
      className={cn(
        'group relative rounded-lg border border-border bg-surface p-4 transition-shadow hover:shadow-sm',
        className,
      )}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <h3 className="truncate text-sm font-medium text-text">{note.title}</h3>
        <div className="flex shrink-0 items-center gap-1">
          {/* Star: always visible */}
          <button
            onClick={() => onToggleStar(note.id)}
            className={cn(
              'rounded p-1 transition-colors',
              note.starred
                ? 'text-yellow-400 hover:text-yellow-500'
                : 'text-text-subtle hover:text-yellow-400',
            )}
            aria-label={note.starred ? t.unstarAria : t.starAria}
          >
            <Star
              className={cn('h-3.5 w-3.5', note.starred && 'fill-yellow-400')}
            />
          </button>
          {/* Edit/Delete: always visible on mobile, hover-only on desktop */}
          <button
            onClick={() => onEdit(note)}
            className="rounded p-1 text-text-muted transition-colors hover:bg-surface-raised hover:text-text"
            aria-label={t.editAria}
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => onDelete(note.id)}
            className="rounded p-1 text-text-muted transition-colors hover:bg-error-muted hover:text-error"
            aria-label={t.deleteAria}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      {preview && <p className="line-clamp-3 text-xs text-text-muted">{preview}</p>}
      <p className="mt-2 text-[10px] text-text-subtle">{date}</p>
    </div>
  )
}
