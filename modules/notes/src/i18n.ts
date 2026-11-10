'use client'

import { useEffect, useState } from 'react'

export type Lang = 'en' | 'it'

const LANG_KEY = 'dexhub-language'

const translations = {
  en: {
    title: 'Notes',
    newNote: 'New Note',
    editNote: 'Edit Note',
    searchPh: 'Search notes…',
    sortNewest: 'Newest first',
    sortOldest: 'Oldest first',
    sortTitle: 'Title A–Z',
    loading: 'Loading…',
    noteCountOne: 'note',
    noteCountOther: 'notes',
    empty: 'No notes yet. Create your first one!',
    emptyStarred: 'No starred notes.',
    editor: {
      titlePh: 'Note title',
      contentPh: 'Write something…',
      cancel: 'Cancel',
      save: 'Save changes',
      create: 'Create note',
      saving: 'Saving…',
      saveFailed: 'Save failed',
    },
    listView: 'List view',
    gridView: 'Grid view',
    sortLabel: 'Sort notes',
    editAria: 'Edit note',
    deleteAria: 'Delete note',
    starAria: 'Add to favorites',
    unstarAria: 'Remove from favorites',
    onlyStarred: 'Starred only',
    locale: 'en-US',
  },
  it: {
    title: 'Note',
    newNote: 'Nuova nota',
    editNote: 'Modifica nota',
    searchPh: 'Cerca note…',
    sortNewest: 'Più recenti prima',
    sortOldest: 'Meno recenti prima',
    sortTitle: 'Titolo A–Z',
    loading: 'Caricamento…',
    noteCountOne: 'nota',
    noteCountOther: 'note',
    empty: 'Nessuna nota. Crea la tua prima nota!',
    emptyStarred: 'Nessuna nota nei preferiti.',
    editor: {
      titlePh: 'Titolo della nota',
      contentPh: 'Scrivi qualcosa…',
      cancel: 'Annulla',
      save: 'Salva modifiche',
      create: 'Crea nota',
      saving: 'Salvataggio…',
      saveFailed: 'Salvataggio non riuscito',
    },
    listView: 'Vista lista',
    gridView: 'Vista griglia',
    sortLabel: 'Ordina note',
    editAria: 'Modifica nota',
    deleteAria: 'Elimina nota',
    starAria: 'Aggiungi ai preferiti',
    unstarAria: 'Rimuovi dai preferiti',
    onlyStarred: 'Solo preferiti',
    locale: 'it-IT',
  },
}

export type NoteTranslations = (typeof translations)['en']

function getLang(): Lang {
  if (typeof localStorage === 'undefined') return 'it'
  const v = localStorage.getItem(LANG_KEY)
  return v === 'en' ? 'en' : 'it'
}

export function useNoteT(): NoteTranslations {
  const [lang, setLang] = useState<Lang>(getLang)

  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key === LANG_KEY) setLang(e.newValue === 'it' ? 'it' : 'en')
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  return translations[lang]
}
