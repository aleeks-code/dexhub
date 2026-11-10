import type { DexHubModule } from '@dexhub/sdk'
import { manifest } from './manifest'
import { initNotesService } from './services/notes-service'
import { publicApi } from './api/public-api'

const notesModule: DexHubModule = {
  manifest,
  publicApi,

  async init(ctx) {
    initNotesService(ctx)
  },

  async onEnable() {
    console.info('[Notes] Module enabled')
  },

  async onDisable() {
    console.info('[Notes] Module disabled')
  },
}

export default notesModule
export * from './services/notes-service'

