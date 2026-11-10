import type { ModuleManifest } from '@dexhub/sdk'

export const manifest: ModuleManifest = {
  id: 'subscriptions',
  name: 'Abbonamenti',
  version: '1.0.0',
  sdkVersion: '^1.0.0',
  description: 'Gestisci abbonamenti e spese ricorrenti, monitora i rinnovi e calcola la spesa mensile.',
  icon: 'Repeat',
  category: 'finance',
  navOrder: 25,
  routes: [
    {
      path: '/',
      component: () => import('./routes/subscriptions-page'),
      label: 'Abbonamenti',
    },
  ],
  widgets: [
    {
      id: 'subscriptions-summary',
      label: 'Rinnovi & Costi',
      description: 'Panoramica costi mensili e prossimi rinnovi',
      sizes: ['1x1', '2x1', '2x2'],
      defaultSize: '2x1',
      component: () => import('./widgets/subscriptions-widget'),
    },
  ],
  commands: [
    {
      id: 'open',
      label: 'Apri Abbonamenti',
      href: '/subscriptions',
      keywords: ['abbonamenti', 'subscriptions', 'ricorrenti', 'netflix', 'spotify', 'costi'],
    },
  ],
}
