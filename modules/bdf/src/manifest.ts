import type { ModuleManifest } from '@dexhub/sdk'

export const manifest: ModuleManifest = {
  id: 'bdf',
  name: 'BDF Training',
  version: '1.0.0',
  sdkVersion: '^1.0.0',
  description:
    'Monitoraggio allenamenti di Braccio di Ferro: vettori di forza, isometriche, carichi judo belt, preparazione gara e salute tendinea',
  icon: 'Flame',
  category: 'productivity',
  navOrder: 38,
  routes: [
    {
      path: '/',
      component: () => import('./routes/bdf-page'),
      label: 'BDF Training',
    },
  ],
  widgets: [
    {
      id: 'bdf-summary',
      label: 'BDF Training',
      description: 'Stato gomito/tendini, ultimo allenamento svolto e top PR',
      sizes: ['2x1', '2x2'],
      defaultSize: '2x1',
      component: () => import('./widgets/bdf-widget'),
    },
  ],
  permissions: [
    {
      id: 'bdf:write',
      label: 'Gestione allenamenti BDF',
      description: 'Registra e modifica sessioni, carichi e log tendinei',
    },
  ],
  events: {
    emits: ['bdf:session.saved', 'bdf:pr.new'],
    listens: [],
  },
}
