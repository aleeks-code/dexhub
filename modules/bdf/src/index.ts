import type { DexHubModule } from '@dexhub/sdk'
import { manifest } from './manifest'
import { initBdfService } from './services/bdf-service'

const bdfModule: DexHubModule = {
  manifest,

  async init(ctx) {
    initBdfService(ctx)
  },

  async onEnable() {
    console.info('[BDF Training] Modulo abilitato')
  },

  async onDisable() {
    console.info('[BDF Training] Modulo disabilitato')
  },
}

export default bdfModule
export * from './services/bdf-service'
export * from './engine/pr-calculator'
export * from './config/bdf-exercises'
export * from './types'
