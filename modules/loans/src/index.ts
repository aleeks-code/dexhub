import type { DexHubModule } from '@dexhub/sdk'
import { manifest } from './manifest'
import { initLoansService } from './services/loans-service'

const loansModule: DexHubModule = {
  manifest,

  async init(ctx) {
    initLoansService(ctx)
  },

  async onEnable() {
    console.info('[Finanziamenti] Modulo abilitato')
  },

  async onDisable() {
    console.info('[Finanziamenti] Modulo disabilitato')
  },
}

export default loansModule
export * from './services/loans-service'
export * from './engine/amortization'
export * from './types'
