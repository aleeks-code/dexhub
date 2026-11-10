import type { CoreEventPayloads } from '@dexhub/sdk'
import { EventBusImpl } from './event-bus'
import { IMABroker } from './ima-broker'
import { ModuleLoader } from './module-loader'

type AnyEvents = CoreEventPayloads & Record<string, unknown>

export const coreEventBus = new EventBusImpl<AnyEvents>()
export const imaBroker = new IMABroker()
export const moduleLoader = new ModuleLoader(coreEventBus, imaBroker)

export { EventBusImpl } from './event-bus'
export { ScopedEventBus } from './scoped-event-bus'
export { ModuleKVAdapterImpl } from './kv-adapter'
export { MemoryCacheAdapter } from './cache-adapter'
export { PermissionsContextImpl } from './permissions-context'
export { IMABroker } from './ima-broker'
export { ModuleLoader } from './module-loader'
export type { ModuleFactory } from './module-loader'
