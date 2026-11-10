import { createNote, deleteNote, searchNotes, getRecentNotes, toggleStar } from '../services/notes-service'
import type { Note } from '../services/notes-service'

export const publicApi: Record<string, (...args: unknown[]) => unknown> = {
  create: (title: unknown, content: unknown) =>
    createNote(title as string, content as string) as Promise<Note>,
  search: (query: unknown) => searchNotes(query as string) as Promise<Note[]>,
  getRecent: (limit?: unknown) => getRecentNotes(limit as number | undefined) as Promise<Note[]>,
  delete: (id: unknown) => deleteNote(id as string) as Promise<void>,
  toggleStar: (id: unknown) => toggleStar(id as string) as Promise<Note>,
}
