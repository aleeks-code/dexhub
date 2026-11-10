import type { DexHubModule } from '@dexhub/sdk'
import { manifest } from './manifest'
import { initPizzaService } from './services/pizza-service'

const pizzaModule: DexHubModule = {
  manifest,

  async init(ctx) {
    initPizzaService(ctx)
  },

  async onEnable() {
    console.info('[CalcolaPizza] Modulo abilitato')
  },

  async onDisable() {
    console.info('[CalcolaPizza] Modulo disabilitato')
  },
}

export default pizzaModule
