import type { ModuleManifest } from '@dexhub/sdk'

export const manifest: ModuleManifest = {
  id: 'worklog',
  name: 'Cartellino',
  version: '0.1.0',
  sdkVersion: '^1.0.0',
  description: 'Tieni traccia del cartellino mese per mese',
  icon: 'Clock',
  category: 'productivity',
  navOrder: 30,
  lifecycle: 'active',
  routes: [
    {
      path: '/',
      component: () => import('./routes/worklog-page'),
      label: 'Cartellino',
    },
  ],
  widgets: [
    {
      id: 'worklog-summary',
      label: 'Riepilogo mese',
      sizes: ['2x1', '2x2'],
      defaultSize: '2x1',
      component: () => import('./widgets/worklog-summary'),
    },
  ],
  permissions: [
    {
      id: 'worklog:days:read',
      label: 'Visualizza giorni lavorativi',
      description: 'Permette di vedere i giorni e le ore registrate',
    },
    {
      id: 'worklog:days:write',
      label: 'Gestisci giorni lavorativi',
      description: 'Crea, modifica ed elimina registrazioni giornaliere',
    },
    {
      id: 'worklog:contract:read',
      label: 'Visualizza impostazioni contratto',
      description: 'Permette di vedere le impostazioni contrattuali',
    },
    {
      id: 'worklog:contract:write',
      label: 'Modifica impostazioni contratto',
      description: 'Modifica ore giornaliere, settimanali e giorni lavorativi',
    },
    {
      id: 'worklog:templates:read',
      label: 'Visualizza template turni',
      description: 'Permette di vedere i template turno salvati',
    },
    {
      id: 'worklog:templates:write',
      label: 'Gestisci template turni',
      description: 'Crea e cancella template turno',
    },
    {
      id: 'worklog:trash:read',
      label: 'Visualizza cestino',
      description: 'Permette di vedere i giorni eliminati nel cestino',
    },
    {
      id: 'worklog:trash:write',
      label: 'Ripristina dal cestino',
      description: 'Ripristina giorni eliminati',
    },
    {
      id: 'worklog:export',
      label: 'Esporta dati',
      description: 'Scarica i dati worklog in formato CSV o JSON',
    },
  ],
  settings: [],
  events: {
    emits: [
      'worklog:day.upserted',
      'worklog:day.deleted',
      'worklog:day.restored',
    ],
    listens: [],
  },
  crossModuleAccess: [],
  commands: [
    {
      id: 'open',
      label: 'Apri Cartellino',
      href: '/worklog',
      keywords: ['ore', 'lavoro', 'worklog', 'orario', 'timesheet', 'cartellino', 'apri'],
    },
    {
      id: 'today',
      label: 'Registra oggi',
      href: '/worklog',
      shortcut: 'alt+h',
      keywords: ['registra oggi', 'log today', 'ore oggi', 'timesheet oggi'],
    },
    {
      id: 'summary',
      label: 'Riepilogo mese',
      href: '/worklog',
      keywords: ['riepilogo', 'summary', 'mese', 'mensile', 'ore totali'],
    },
  ],
}
