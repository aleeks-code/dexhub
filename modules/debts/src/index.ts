import type { DexHubModule } from '@dexhub/sdk'
import { manifest } from './manifest'
import { initDebtsService } from './services/debts-service'

const debtsModule: DexHubModule = {
  manifest,

  async init(ctx) {
    initDebtsService(ctx)
  },

  async onEnable() {
    console.info('[Debiti & Crediti] Modulo abilitato')
  },

  async onDisable() {
    console.info('[Debiti & Crediti] Modulo disabilitato')
  },
}

export default debtsModule
export * from './services/debts-service'
export * from './types'

