import type { ModuleContext } from '@dexhub/sdk'

export interface Note {
  id: string
  title: string
  content: string
  starred: boolean
  createdAt: string
  updatedAt: string
}

interface NoteIndex {
  ids: string[]
}

export interface NotePrefs {
  view: 'list' | 'grid'
  sort: 'newest' | 'oldest' | 'title'
  onlyStarred: boolean
}

const KEY_INDEX = 'index'
const KEY_PREFS = 'prefs'
const CACHE_LIST = 'notes:list'
const CACHE_SEARCH = 'notes:search:'
const CACHE_TTL_LIST = 30
const CACHE_TTL_SEARCH = 5

let _ctx: ModuleContext

export function initNotesService(ctx: ModuleContext): void {
  _ctx = ctx
}

async function getIndex(): Promise<NoteIndex> {
  return (await _ctx.kv.get<NoteIndex>(KEY_INDEX)) ?? { ids: [] }
}

async function saveIndex(index: NoteIndex): Promise<void> {
  await _ctx.kv.set(KEY_INDEX, index)
}

function sortNotes(notes: Note[], sort: NotePrefs['sort']): Note[] {
  const comparator = (a: Note, b: Note): number => {
    if (sort === 'newest') return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    if (sort === 'oldest') return new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()
    return a.title.localeCompare(b.title)
  }
  const starred = notes.filter((n) => n.starred).sort(comparator)
  const unstarred = notes.filter((n) => !n.starred).sort(comparator)
  return [...starred, ...unstarred]
}

export async function listNotes(sort: NotePrefs['sort'] = 'newest'): Promise<Note[]> {
  const cached = await _ctx.cache.get<Note[]>(CACHE_LIST)
  if (cached) return sortNotes(cached, sort)

  const index = await getIndex()
  const notes = (
    await Promise.all(index.ids.map((id) => _ctx.kv.get<Note>(`note:${id}`)))
  ).filter((n): n is Note => n !== null)

  await _ctx.cache.set(CACHE_LIST, notes, CACHE_TTL_LIST)
  return sortNotes(notes, sort)
}

export async function getNote(id: string): Promise<Note | null> {
  return _ctx.kv.get<Note>(`note:${id}`)
}

export async function createNote(title: string, content: string): Promise<Note> {
  _ctx.permissions.require('notes:notes:write')

  const id = crypto.randomUUID()
  const now = new Date().toISOString()
  const note: Note = { id, title, content, starred: false, createdAt: now, updatedAt: now }

  await _ctx.kv.set(`note:${id}`, note)

  const index = await getIndex()
  index.ids.unshift(id)
  await saveIndex(index)

  await _ctx.cache.delete(CACHE_LIST)

  _ctx.eventBus.emit('notes:note.created', { id, title })

  return note
}

export async function updateNote(
  id: string,
  data: Partial<Pick<Note, 'title' | 'content'>>,
): Promise<Note> {
  _ctx.permissions.require('notes:notes:write')

  const existing = await getNote(id)
  if (!existing) throw new Error(`Note "${id}" not found`)

  const updated: Note = { ...existing, ...data, updatedAt: new Date().toISOString() }
  await _ctx.kv.set(`note:${id}`, updated)
  await _ctx.cache.delete(CACHE_LIST)
  await _ctx.cache.invalidatePattern(`${CACHE_SEARCH}*`)

  _ctx.eventBus.emit('notes:note.updated', { id, title: updated.title })

  return updated
}

export async function toggleStar(id: string): Promise<Note> {
  _ctx.permissions.require('notes:notes:write')

  const existing = await getNote(id)
  if (!existing) throw new Error(`Note "${id}" not found`)

  const updated: Note = { ...existing, starred: !existing.starred }
  await _ctx.kv.set(`note:${id}`, updated)
  await _ctx.cache.delete(CACHE_LIST)
  await _ctx.cache.invalidatePattern(`${CACHE_SEARCH}*`)

  return updated
}

export async function deleteNote(id: string): Promise<void> {
  _ctx.permissions.require('notes:notes:write')

  await _ctx.kv.delete(`note:${id}`)

  const index = await getIndex()
  index.ids = index.ids.filter((i) => i !== id)
  await saveIndex(index)

  await _ctx.cache.delete(CACHE_LIST)
  await _ctx.cache.invalidatePattern(`${CACHE_SEARCH}*`)

  _ctx.eventBus.emit('notes:note.deleted', { id })
}

export async function searchNotes(query: string): Promise<Note[]> {
  const key = `${CACHE_SEARCH}${query.toLowerCase()}`
  const cached = await _ctx.cache.get<Note[]>(key)
  if (cached) return cached

  const all = await listNotes()
  const q = query.toLowerCase()
  const results = all.filter(
    (n) => n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q),
  )

  await _ctx.cache.set(key, results, CACHE_TTL_SEARCH)
  return results
}

export async function getRecentNotes(limit = 5): Promise<Note[]> {
  const all = await listNotes('newest')
  return all.slice(0, limit)
}

export async function getPrefs(): Promise<NotePrefs> {
  return (await _ctx.kv.get<NotePrefs>(KEY_PREFS)) ?? { view: 'list', sort: 'newest', onlyStarred: false }
}

export async function setPrefs(prefs: Partial<NotePrefs>): Promise<void> {
  const current = await getPrefs()
  await _ctx.kv.set(KEY_PREFS, { ...current, ...prefs })
}
