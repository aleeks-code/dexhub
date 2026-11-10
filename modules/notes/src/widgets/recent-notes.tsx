'use client'

import { useEffect, useState } from 'react'
import { FileText } from 'lucide-react'
import { getRecentNotes } from '../services/notes-service'
import type { Note } from '../services/notes-service'

export default function RecentNotesWidget() {
  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getRecentNotes(5)
      .then(setNotes)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="flex h-full flex-col gap-3">
      {loading ? (
        <div className="flex flex-1 items-center justify-center text-xs text-text-subtle">
          Loading…
        </div>
      ) : notes.length === 0 ? (
        <div className="flex flex-1 items-center justify-center text-xs text-text-subtle">
          No notes yet
        </div>
      ) : (
        <ul className="flex flex-col gap-2 overflow-hidden">
          {notes.map((note) => (
            <li key={note.id} className="flex items-center gap-2 rounded-[9px] bg-overlay-subtle px-3 py-2.5">
              <FileText className="h-[15px] w-[15px] shrink-0 text-primary" />
              <span className="min-w-0 flex-1 truncate text-xs text-text-muted">{note.title}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
