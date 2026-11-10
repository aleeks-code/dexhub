import type { ModuleManifest } from '@dexhub/sdk'

export const manifest: ModuleManifest = {
  id: 'loans',
  name: 'Finanziamenti & Ammortamenti',
  version: '1.0.0',
  sdkVersion: '^1.0.0',
  description: 'Traccia prestiti, mutui e piani di ammortamento con estrazione PDF e domiciliazioni automatiche',
  icon: 'Landmark',
  category: 'productivity',
  navOrder: 39,
  routes: [
    {
      path: '/',
      component: () => import('./routes/loans-page'),
      label: 'Finanziamenti',
    },
  ],
  widgets: [
    {
      id: 'loans-summary',
      label: 'Riepilogo Finanziamenti',
      description: 'Debito residuo totale e prossime rate in scadenza',
      sizes: ['2x1', '2x2'],
      defaultSize: '2x1',
      component: () => import('./widgets/loans-widget'),
    },
  ],
  permissions: [
    {
      id: 'loans:write',
      label: 'Gestione finanziamenti',
      description: 'Crea, modifica e simula piani di ammortamento e finanziamenti',
    },
  ],
  settings: [
    {
      key: 'loans.currency',
      label: 'Valuta predefinita',
      type: 'select',
      default: '€',
      options: [
        { label: 'Euro (€)', value: '€' },
        { label: 'Dollaro ($)', value: '$' },
        { label: 'Franco Svizzero (CHF)', value: 'CHF' },
      ],
    },
  ],
  events: {
    emits: ['loans:loan.created', 'loans:loan.updated', 'loans:repayment.added'],
    listens: [],
  },
}
