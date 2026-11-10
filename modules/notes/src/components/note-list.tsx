'use client'

import { FileText } from 'lucide-react'
import type { Note } from '../services/notes-service'
import { NoteCard } from './note-card'
import { useNoteT } from '../i18n'

interface NoteListProps {
  notes: Note[]
  onEdit: (note: Note) => void
  onDelete: (id: string) => void
  onToggleStar: (id: string) => void
  view: 'list' | 'grid'
  onlyStarred: boolean
}

export function NoteList({ notes, onEdit, onDelete, onToggleStar, view, onlyStarred }: NoteListProps) {
  const t = useNoteT()

  if (notes.length === 0) {
    return (
      <div className="flex h-48 flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border text-center">
        <FileText className="h-8 w-8 text-text-subtle" />
        <p className="text-sm text-text-muted">{onlyStarred ? t.emptyStarred : t.empty}</p>
      </div>
    )
  }

  return (
    <div
      className={
        view === 'grid'
          ? 'grid grid-cols-2 gap-3 md:grid-cols-3'
          : 'flex flex-col gap-2'
      }
    >
      {notes.map((note) => (
        <NoteCard key={note.id} note={note} onEdit={onEdit} onDelete={onDelete} onToggleStar={onToggleStar} />
      ))}
    </div>
  )
}
