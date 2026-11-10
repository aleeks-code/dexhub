'use client'

import { useEffect, useState } from 'react'

type Lang = 'it' | 'en'

const STORE_KEY = 'dexhub-app-store'

const translations = {
  it: {
    locale: 'it-IT',
    // Intestazione
    title: 'To-Do',
    breadcrumbHome: 'Panoramica',
    subtitleCount: '{n} attività da completare · {x}/{y} oggi',
    subtitleDone: 'Tutto completato. Ottimo lavoro.',
    completed: 'COMPLETATO',
    // Modalità
    modePersonal: 'Personale',
    modeTogether: 'Together',
    // Quick add
    quickAddPersonal: "Aggiungi un'attività…",
    quickAddShared: "Aggiungi un'attività condivisa…",
    add: 'Aggiungi',
    // Smart list
    smartLists: 'SMART LIST',
    viewAll: 'Tutte',
    viewToday: 'Oggi',
    viewWeek: 'Questa settimana',
    viewImportant: 'Importanti',
    viewCompleted: 'Completate',
    priority: 'PRIORITÀ',
    prioLow: 'Bassa',
    prioMedium: 'Media',
    prioHigh: 'Alta',
    // Sezioni
    sectionToday: 'Oggi',
    sectionWeek: 'Questa settimana',
    sectionNext: 'Prossime',
    // Riga attività
    edit: 'Modifica',
    delete: 'Elimina',
    save: 'Salva',
    markImportant: 'Segna come importante',
    // Stato vuoto
    emptyTitle: 'Tutto fatto qui',
    emptyBody: 'Nessuna attività per questa lista o priorità.',
    // Workspace
    workspace: 'WORKSPACE',
    newWorkspace: 'Nuovo',
    joinWithCode: 'Unisciti con codice',
    sharedWorkspace: 'Workspace condiviso',
    membersCount: '{n} membri · Sincronizzato',
    invite: 'Invita',
    noWorkspaces: 'Nessun workspace condiviso. Creane uno o unisciti con un codice.',
    // Modale invito
    inviteTitle: 'Invita nel workspace',
    inviteSubtitle: 'Le persone invitate potranno vedere e modificare le attività condivise.',
    inviteEmailPlaceholder: 'nome@esempio.it',
    orShareCode: 'OPPURE CONDIVIDI IL CODICE',
    copy: 'Copia',
    copied: 'Copiato ✓',
    codeHint: 'Chi ha il codice può unirsi a questo workspace da Moduli → To-Do → Unisciti.',
    membersLabel: 'MEMBRI',
    you: '(tu)',
    roleOwner: 'Proprietario',
    rolePending: 'In attesa',
    removeMember: 'Rimuovi',
    dangerZone: 'Zona pericolo',
    deleteWorkspaceForAll: 'Elimina workspace per tutti',
    deleteWorkspaceConfirm:
      'Eliminare questo workspace per tutti i membri? Le attività condivise andranno perse.',
    leaveWorkspace: 'Esci dal workspace',
    leaveWorkspaceConfirm: 'Vuoi uscire da questo workspace?',
    // Modale nuovo workspace
    newWorkspaceTitle: 'Nuovo workspace',
    newWorkspaceSubtitle: 'Crea uno spazio condiviso. Ne generiamo un codice da condividere.',
    workspaceNamePlaceholder: 'Nome del workspace',
    cancel: 'Annulla',
    create: 'Crea workspace',
    // Modale join
    joinTitle: 'Unisciti con codice',
    joinSubtitle: 'Inserisci il codice ricevuto per entrare in un workspace condiviso.',
    joinCodePlaceholder: 'ES-12ABC',
    join: 'Unisciti',
    // Widget Panoramica
    widgetToday: 'Oggi',
    widgetOpen: 'Apri To-Do →',
    widgetEmpty: 'Nessuna attività per oggi.',
    // Generici
    loading: 'Caricamento…',
    deleteTaskConfirm: 'Eliminare questa attività?',
  },
  en: {
    locale: 'en-GB',
    title: 'To-Do',
    breadcrumbHome: 'Overview',
    subtitleCount: '{n} tasks to complete · {x}/{y} today',
    subtitleDone: 'All done. Great work.',
    completed: 'COMPLETED',
    modePersonal: 'Personal',
    modeTogether: 'Together',
    quickAddPersonal: 'Add a task…',
    quickAddShared: 'Add a shared task…',
    add: 'Add',
    smartLists: 'SMART LISTS',
    viewAll: 'All',
    viewToday: 'Today',
    viewWeek: 'This week',
    viewImportant: 'Important',
    viewCompleted: 'Completed',
    priority: 'PRIORITY',
    prioLow: 'Low',
    prioMedium: 'Medium',
    prioHigh: 'High',
    sectionToday: 'Today',
    sectionWeek: 'This week',
    sectionNext: 'Upcoming',
    edit: 'Edit',
    delete: 'Delete',
    save: 'Save',
    markImportant: 'Mark as important',
    emptyTitle: 'All clear here',
    emptyBody: 'No tasks for this list or priority.',
    workspace: 'WORKSPACE',
    newWorkspace: 'New',
    joinWithCode: 'Join with code',
    sharedWorkspace: 'Shared workspace',
    membersCount: '{n} members · Synced',
    invite: 'Invite',
    noWorkspaces: 'No shared workspaces yet. Create one or join with a code.',
    inviteTitle: 'Invite to workspace',
    inviteSubtitle: 'Invited people will be able to see and edit shared tasks.',
    inviteEmailPlaceholder: 'name@example.com',
    orShareCode: 'OR SHARE THE CODE',
    copy: 'Copy',
    copied: 'Copied ✓',
    codeHint: 'Anyone with the code can join this workspace from Modules → To-Do → Join.',
    membersLabel: 'MEMBERS',
    you: '(you)',
    roleOwner: 'Owner',
    rolePending: 'Pending',
    removeMember: 'Remove',
    dangerZone: 'Danger zone',
    deleteWorkspaceForAll: 'Delete workspace for everyone',
    deleteWorkspaceConfirm:
      'Delete this workspace for all members? Shared tasks will be lost.',
    leaveWorkspace: 'Leave workspace',
    leaveWorkspaceConfirm: 'Do you want to leave this workspace?',
    newWorkspaceTitle: 'New workspace',
    newWorkspaceSubtitle: 'Create a shared space. We generate a code you can share.',
    workspaceNamePlaceholder: 'Workspace name',
    cancel: 'Cancel',
    create: 'Create workspace',
    joinTitle: 'Join with code',
    joinSubtitle: 'Enter the code you received to join a shared workspace.',
    joinCodePlaceholder: 'EX-12ABC',
    join: 'Join',
    widgetToday: 'Today',
    widgetOpen: 'Open To-Do →',
    widgetEmpty: 'No tasks for today.',
    loading: 'Loading…',
    deleteTaskConfirm: 'Delete this task?',
  },
} as const

export type Translations = (typeof translations)['it']

function getLang(): Lang {
  try {
    const raw = localStorage.getItem(STORE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as { state?: { language?: string } }
      const lang = parsed.state?.language
      if (lang === 'en' || lang === 'it') return lang
    }
  } catch {
    // ignore
  }
  return 'it'
}

export function useTasksT(): Translations {
  const [lang, setLang] = useState<Lang>(getLang)

  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key === STORE_KEY) setLang(getLang())
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  return translations[lang] as Translations
}
