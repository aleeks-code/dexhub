import type { DexHubModule } from '@dexhub/sdk'
import { manifest } from './manifest'
import { initSubscriptionsService } from './services/subscriptions-service'

const subscriptionsModule: DexHubModule = {
  manifest,

  async init(ctx) {
    initSubscriptionsService(ctx)
  },

  async onEnable() {
    console.info('[Abbonamenti] Modulo abilitato')
  },

  async onDisable() {
    console.info('[Abbonamenti] Modulo disabilitato')
  },
}

export default subscriptionsModule
export * from './services/subscriptions-service'
export * from './types'
