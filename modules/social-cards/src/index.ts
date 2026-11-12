import type { DexHubModule } from '@dexhub/sdk'
import { manifest } from './manifest'
import { initSocialCardsService } from './services/social-cards-service'

const socialCardsModule: DexHubModule = {
  manifest,

  async init(ctx) {
    initSocialCardsService(ctx)
  },

  async onEnable() {
    console.info('[Carte & Bonus Sociali] Modulo abilitato')
  },

  async onDisable() {
    console.info('[Carte & Bonus Sociali] Modulo disabilitato')
  },
}

export default socialCardsModule
export * from './services/social-cards-service'
export * from './engine/balance'
export * from './engine/discount'
export * from './config/dedicata-a-te'
export * from './types'
