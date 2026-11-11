import type { DexHubModule } from '@dexhub/sdk'
import { manifest } from './manifest'

const worklogModule: DexHubModule = {
  manifest,

  async init() {
    console.info('[Worklog] Module initialized')
  },

  async onEnable() {
    console.info('[Worklog] Module enabled')
  },

  async onDisable() {
    console.info('[Worklog] Module disabled')
  },
}

export default worklogModule
export * from './services/worklog-api'
export * from './engine/cedolino-parser'
export * from './engine/cedolino-importer'


