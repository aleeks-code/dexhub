import type { ModuleManifest } from '@dexhub/sdk'

export const manifest: ModuleManifest = {
  id: 'tasks',
  name: 'To-Do',
  version: '0.3.0',
  sdkVersion: '^1.0.0',
  description: 'Gestisci le tue attività e collabora con il To-Do Together',
  icon: 'CheckSquare',
  category: 'productivity',
  navOrder: 20,
  lifecycle: 'active',
  routes: [
    {
      path: '/',
      component: () => import('./routes/tasks-page'),
      label: 'To-Do',
    },
  ],
  widgets: [
    {
      id: 'todo-summary',
      label: 'Attivita di oggi',
      sizes: ['2x1', '2x2'],
      defaultSize: '2x1',
      component: () => import('./widgets/todo-summary'),
    },
  ],
  permissions: [
    {
      id: 'tasks:spaces:read',
      label: 'Visualizza spaces e task',
      description: 'Permette di vedere gli spaces e i task associati',
    },
    {
      id: 'tasks:spaces:write',
      label: 'Gestisci spaces',
      description: 'Crea, modifica ed elimina spaces',
    },
    {
      id: 'tasks:tasks:read',
      label: 'Visualizza task',
      description: 'Permette di vedere i task e i loro dettagli',
    },
    {
      id: 'tasks:tasks:write',
      label: 'Gestisci task',
      description: 'Crea, modifica, completa ed elimina task',
    },
  ],
  settings: [],
  events: {
    emits: [
      'tasks:space.created',
      'tasks:space.updated',
      'tasks:space.joined',
      'tasks:space.left',
      'tasks:task.created',
      'tasks:task.updated',
      'tasks:task.completed',
      'tasks:task.reopened',
      'tasks:task.deleted',
    ],
    listens: [],
  },
  crossModuleAccess: [],
  commands: [
    {
      id: 'open',
      label: 'Apri To-Do',
      href: '/tasks',
      keywords: ['tasks', 'todo', 'to-do', 'attività', 'apri'],
    },
    {
      id: 'new-task',
      label: 'Nuova attività',
      href: '/tasks',
      shortcut: 'alt+t',
      keywords: ['new task', 'nuova task', 'crea task', 'add task', 'aggiungi'],
    },
    {
      id: 'today',
      label: 'Attività di oggi',
      href: '/tasks?view=today',
      keywords: ['today', 'oggi', 'giornata', 'daily'],
    },
  ],
}
