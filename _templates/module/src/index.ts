import type { DexHubModule } from '@dexhub/sdk'
import { manifest } from './manifest'

const module: DexHubModule = {
  manifest,

  async onInstall() {
    // Run on first install (e.g., create DB tables via migration)
  },

  async onUninstall() {
    // Clean up module data
  },

  async onEnable() {
    // Called when module is enabled
  },

  async onDisable() {
    // Called when module is disabled
  },
}

export default module
