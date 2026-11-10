import type { ModuleManifest } from '@dexhub/sdk'

export const manifest: ModuleManifest = {
  id: 'notes',
  name: 'Note',
  version: '0.2.0',
  sdkVersion: '^1.0.0',
  description: 'Crea e gestisci note personali',
  icon: 'FileText',
  category: 'productivity',
  navOrder: 10,
  routes: [
    {
      path: '/',
      component: () => import('./routes/notes-page'),
      label: 'Notes',
    },
  ],
  widgets: [
    {
      id: 'recent-notes',
      label: 'Recent Notes',
      description: 'Your most recently modified notes',
      sizes: ['1x1', '2x1', '2x2'],
      defaultSize: '2x1',
      component: () => import('./widgets/recent-notes'),
    },
  ],
  permissions: [
    {
      id: 'notes:notes:write',
      label: 'Manage notes',
      description: 'Create, edit, and delete notes',
    },
  ],
  settings: [
    {
      key: 'notes.defaultView',
      label: 'Default view',
      type: 'select',
      default: 'list',
      options: [
        { label: 'List', value: 'list' },
        { label: 'Grid', value: 'grid' },
      ],
    },
  ],
  events: {
    emits: ['notes:note.created', 'notes:note.updated', 'notes:note.deleted'],
    listens: [],
  },
  crossModuleAccess: [],
  commands: [
    {
      id: 'open',
      label: 'Open Notes',
      href: '/notes',
      keywords: ['notes', 'note', 'apri', 'appunti'],
    },
    {
      id: 'new',
      label: 'New Note',
      href: '/notes/new',
      shortcut: 'alt+n',
      keywords: ['new note', 'nuova nota', 'crea nota', 'create note', 'add note'],
    },
    {
      id: 'search',
      label: 'Search Notes',
      href: '/notes',
      keywords: ['search', 'find', 'cerca', 'trova', 'notes'],
    },
  ],
}
