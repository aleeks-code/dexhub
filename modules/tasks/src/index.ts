import type { DexHubModule } from '@dexhub/sdk'
import { manifest } from './manifest'
import { publicAPI } from './api/public-api'

const tasksModule: DexHubModule = {
  manifest,
  publicApi: publicAPI,

  async init() {
    console.info('[Tasks] Module initialized')
  },

  async onEnable() {
    console.info('[Tasks] Module enabled')
  },

  async onDisable() {
    console.info('[Tasks] Module disabled')
  },
}

export default tasksModule
export * from './api/tasks-client'
export * from './hooks/use-tasks'
export * from './hooks/use-spaces'

