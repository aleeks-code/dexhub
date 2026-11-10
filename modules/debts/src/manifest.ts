import type { ModuleManifest } from '@dexhub/sdk'

export const manifest: ModuleManifest = {
  id: 'debts',
  name: 'Debiti & Crediti',
  version: '1.0.0',
  sdkVersion: '^1.0.0',
  description: 'Traccia debiti, crediti e spese condivise tra persone',
  icon: 'Wallet',
  category: 'productivity',
  navOrder: 38,
  routes: [
    {
      path: '/',
      component: () => import('./routes/debts-page'),
      label: 'Debiti & Crediti',
    },
  ],
  widgets: [
    {
      id: 'debts-summary',
      label: 'Saldo Debiti & Crediti',
      description: 'Panoramica saldi aperti con le persone',
      sizes: ['2x1', '2x2'],
      defaultSize: '2x1',
      component: () => import('./widgets/debts-widget'),
    },
  ],
  permissions: [
    {
      id: 'debts:write',
      label: 'Gestione debiti e crediti',
      description: 'Registra persone, transazioni e saldi',
    },
  ],
  settings: [
    {
      key: 'debts.currency',
      label: 'Valuta predefinita',
      type: 'select',
      default: '€',
      options: [
        { label: 'Euro (€)', value: '€' },
        { label: 'Dollaro ($)', value: '$' },
        { label: 'Sterlina (£)', value: '£' },
        { label: 'Franco Svizzero (CHF)', value: 'CHF' },
      ],
    },
  ],
  events: {
    emits: ['debts:transaction.created', 'debts:transaction.settled'],
    listens: [],
  },
}
