import path from 'path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      '@dexhub/worklog-engine': path.resolve(__dirname, '../../packages/worklog-engine/src/index.ts'),
    },
  },
})
