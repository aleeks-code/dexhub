import type { ModuleManifest } from '@dexhub/sdk'

export const manifest: ModuleManifest = {
  id: 'pizza',
  name: 'CalcolaPizza',
  version: '1.0.0',
  sdkVersion: '^1.0.0',
  description: 'Calcolatore dosi impasto per pizza tonda e in teglia',
  icon: 'Pizza',
  category: 'productivity',
  navOrder: 35,
  routes: [
    {
      path: '/',
      component: () => import('./routes/pizza-page'),
      label: 'CalcolaPizza',
    },
  ],
  widgets: [
    {
      id: 'pizza-calc',
      label: 'CalcolaPizza Rapido',
      description: 'Dosi impasto pizza calcolate al volo',
      sizes: ['2x1', '2x2'],
      defaultSize: '2x1',
      component: () => import('./widgets/pizza-widget'),
    },
  ],
  permissions: [
    {
      id: 'pizza:recipes:write',
      label: 'Gestione ricette impasti',
      description: 'Salva ed elimina ricette dal ricettario personale',
    },
  ],
  settings: [
    {
      key: 'pizza.defaultHydration',
      label: 'Idratazione predefinita (%)',
      type: 'number',
      default: 65,
    },
  ],
  events: {
    emits: ['pizza:recipe.saved', 'pizza:recipe.deleted'],
    listens: [],
  },
}
