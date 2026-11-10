import type { EventBus } from '../events/types'
import type { ModuleKVAdapter, CacheAdapter } from '../storage/types'
import type { PermissionsContext } from '../permissions/types'
import type { CoreEventPayloads } from '../events/core-events'

export interface ModuleIMAClient {
  call<T = unknown>(targetModuleId: string, method: string, ...args: unknown[]): Promise<T>
}

export interface ModuleContext {
  readonly moduleId: string
  readonly eventBus: EventBus<CoreEventPayloads & Record<string, unknown>>
  readonly kv: ModuleKVAdapter
  readonly cache: CacheAdapter
  readonly permissions: PermissionsContext
  readonly ima: ModuleIMAClient
}
