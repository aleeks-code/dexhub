import type { ModuleManifest } from '@dexhub/sdk'

export const manifest: ModuleManifest = {
  id: 'module-template',
  name: 'Module Template',
  version: '0.1.0',
  sdkVersion: '^1.0.0',
  description: 'A template for building DexHub modules',
  icon: 'Box',
  category: 'utilities',
  routes: [
    {
      path: '/',
      component: () => import('./routes/index'),
      label: 'Home',
    },
  ],
  widgets: [],
  permissions: [],
  settings: [],
  events: {
    emits: [],
    listens: [],
  },
}
