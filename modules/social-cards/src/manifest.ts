import type { ModuleManifest } from '@dexhub/sdk'

export const manifest: ModuleManifest = {
  id: 'social-cards',
  name: 'Carta Dedicata a Te',
  version: '1.0.0',
  sdkVersion: '^1.0.0',
  description:
    'Monitoraggio della Carta Dedicata a Te: saldo stimato, PIN e credenziali protette, scadenze di attivazione, sconti convenzione 15% e riconciliazione Postamat',
  icon: 'CreditCard',
  category: 'productivity',
  navOrder: 35,
  routes: [
    {
      path: '/',
      component: () => import('./routes/social-cards-page'),
      label: 'Dedicata a Te',
    },
  ],
  widgets: [
    {
      id: 'social-cards-summary',
      label: 'Carta Dedicata a Te',
      description: 'Saldo stimato, PIN protetto, scadenze primo acquisto e ultima spesa',
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
