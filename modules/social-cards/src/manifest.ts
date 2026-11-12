import type { ModuleManifest } from '@dexhub/sdk'

export const manifest: ModuleManifest = {
  id: 'social-cards',
  name: 'Carte & Bonus Sociali',
  version: '1.0.0',
  sdkVersion: '^1.0.0',
  description:
    'Monitoraggio agevolazioni e carte di spesa (Carta Dedicata a Te), con saldo stimato, gestione tranche FIFO, sconti convenzione 15% e riconciliazione Postamat',
  icon: 'Wallet',
  category: 'productivity',
  navOrder: 35,
  routes: [
    {
      path: '/',
      component: () => import('./routes/social-cards-page'),
      label: 'Carte & Bonus',
    },
  ],
  widgets: [
    {
      id: 'social-cards-summary',
      label: 'Carta Dedicata a Te',
      description: 'Saldo stimato, scadenze primo acquisto e ultima spesa',
      sizes: ['2x1', '2x2'],
      defaultSize: '2x1',
      component: () => import('./widgets/social-cards-widget'),
    },
  ],
  permissions: [
    {
      id: 'social-cards:write',
      label: 'Gestione spese e carte',
      description: 'Registra e modifica spese, carte e riconciliazioni Postamat',
    },
  ],
  events: {
    emits: ['social-cards:expense.added', 'social-cards:reconciliation.added'],
    listens: [],
  },
}
