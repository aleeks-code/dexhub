'use client'

import { useCallback, useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Grid, List, Plus, Search, Star } from 'lucide-react'
import { Button, cn } from '@dexhub/ui'
import {
  createNote,
  deleteNote,
  getPrefs,
  listNotes,
  searchNotes,
  setPrefs,
  toggleStar,
  updateNote,
} from '../services/notes-service'
import type { Note, NotePrefs } from '../services/notes-service'
import { NoteEditor } from '../components/note-editor'
import { NoteList } from '../components/note-list'
import { useNoteT } from '../i18n'

export default function NotesPage() {
  const pathname = usePathname()
  const router = useRouter()
  const t = useNoteT()
  const isNewRoute = pathname?.endsWith('/new') ?? false

  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Note | null>(null)
  const [creating, setCreating] = useState(isNewRoute)
  const [query, setQuery] = useState('')
  const [view, setView] = useState<NotePrefs['view']>('list')
  const [sort, setSort] = useState<NotePrefs['sort']>('newest')
  const [onlyStarred, setOnlyStarred] = useState(false)

  useEffect(() => {
    setCreating(isNewRoute)
  }, [isNewRoute])

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      const prefs = await getPrefs()
      setView(prefs.view)
      setSort(prefs.sort)
      setOnlyStarred(prefs.onlyStarred ?? false)
      let data = query ? await searchNotes(query) : await listNotes(prefs.sort)
      if (prefs.onlyStarred) data = data.filter((n) => n.starred)
      setNotes(data)
    } finally {
      setLoading(false)
    }
  }, [query])

  useEffect(() => {
    void reload()
  }, [reload])

  async function handleCreate(title: string, content: string) {
    await createNote(title, content)
    if (isNewRoute) {
      router.push('/notes')
    } else {
      setCreating(false)
      await reload()
    }
  }

  async function handleUpdate(title: string, content: string) {
    if (!editing) return
    await updateNote(editing.id, { title, content })
    setEditing(null)
    await reload()
  }

  async function handleDelete(id: string) {
    await deleteNote(id)
    await reload()
  }

  async function handleToggleStar(id: string) {
    await toggleStar(id)
    await reload()
  }

  async function handleSortChange(next: NotePrefs['sort']) {
    setSort(next)
    await setPrefs({ sort: next })
    await reload()
  }

  async function handleViewChange(next: NotePrefs['view']) {
    setView(next)
    await setPrefs({ view: next })
  }

  async function handleOnlyStarredToggle() {
    const next = !onlyStarred
    setOnlyStarred(next)
    await setPrefs({ onlyStarred: next })
    await reload()
  }

  if (creating) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <h1 className="text-2xl font-bold text-text">{t.newNote}</h1>
        <NoteEditor onSave={handleCreate} onCancel={() => setCreating(false)} />
      </div>
    )
  }

  if (editing) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <h1 className="text-2xl font-bold text-text">{t.editNote}</h1>
        <NoteEditor note={editing} onSave={handleUpdate} onCancel={() => setEditing(null)} />
      </div>
    )
  }

  const noteCount = notes.length === 1 ? t.noteCountOne : t.noteCountOther

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text">{t.title}</h1>
          <p className="mt-1 text-sm text-text-muted">
            {notes.length} {noteCount}
          </p>
        </div>
        <Button onClick={() => setCreating(true)} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          {t.newNote}
        </Button>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-subtle" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t.searchPh}
            className="w-full rounded-md border border-border bg-bg py-2 pl-9 pr-3 text-sm text-text placeholder:text-text-subtle focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <select
          value={sort}
          onChange={(e) => void handleSortChange(e.target.value as NotePrefs['sort'])}
          className="rounded-md border border-border bg-surface px-2 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary [&>option]:bg-surface [&>option]:text-text"
          aria-label={t.sortLabel}
        >
          <option value="newest">{t.sortNewest}</option>
          <option value="oldest">{t.sortOldest}</option>
          <option value="title">{t.sortTitle}</option>
        </select>

        {/* Only starred toggle */}
        <button
          onClick={() => void handleOnlyStarredToggle()}
          className={cn(
            'flex items-center gap-1.5 rounded-md border px-2 py-2 text-sm transition-colors',
            onlyStarred
              ? 'border-yellow-400 bg-yellow-400/10 text-yellow-400'
              : 'border-border text-text-muted hover:border-yellow-400 hover:text-yellow-400',
          )}
          aria-label={t.onlyStarred}
          title={t.onlyStarred}
        >
          <Star className={cn('h-4 w-4', onlyStarred && 'fill-yellow-400')} />
          <span className="hidden sm:inline text-xs">{t.onlyStarred}</span>
        </button>

        <div className="flex rounded-md border border-border">
          <button
            onClick={() => void handleViewChange('list')}
            className={cn(
              'rounded-l-md p-2 transition-colors',
              view === 'list' ? 'bg-primary-muted text-primary' : 'text-text-muted hover:text-text',
            )}
            aria-label={t.listView}
          >
            <List className="h-4 w-4" />
          </button>
          <button
            onClick={() => void handleViewChange('grid')}
            className={cn(
              'rounded-r-md p-2 transition-colors',
              view === 'grid' ? 'bg-primary-muted text-primary' : 'text-text-muted hover:text-text',
            )}
            aria-label={t.gridView}
          >
            <Grid className="h-4 w-4" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex h-32 items-center justify-center text-sm text-text-muted">{t.loading}</div>
      ) : (
        <NoteList
          notes={notes}
          onEdit={setEditing}
          onDelete={handleDelete}
          onToggleStar={handleToggleStar}
          view={view}
          onlyStarred={onlyStarred}
        />
      )}
    </div>
  )
}
