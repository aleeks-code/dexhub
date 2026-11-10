import { validateManifest, validateSdkCompatibility, CORE_EVENTS } from '@dexhub/sdk'
import type { DexHubModule, CoreEventPayloads } from '@dexhub/sdk'
import type { EventBusImpl } from './event-bus'
import type { IMABroker } from './ima-broker'
import { ScopedEventBus } from './scoped-event-bus'
import { ModuleKVAdapterImpl } from './kv-adapter'
import { MemoryCacheAdapter } from './cache-adapter'
import { PermissionsContextImpl, fetchModulePermissions } from './permissions-context'
import { moduleRegistry } from '../registry/module-registry'

type AnyEvents = CoreEventPayloads & Record<string, unknown>

export type ModuleFactory = () => Promise<{ default: DexHubModule }>

export class ModuleLoader {
  constructor(
    private readonly eventBus: EventBusImpl<AnyEvents>,
    private readonly imaBroker: IMABroker,
  ) {}

  async load(factory: ModuleFactory): Promise<void> {
    const { default: dexModule } = await factory()

    const manifestResult = validateManifest(dexModule.manifest)
    if (!manifestResult.ok) {
      throw manifestResult.error
    }

    const compatResult = validateSdkCompatibility(dexModule.manifest)
    if (!compatResult.ok) {
      throw compatResult.error
    }

    const { manifest } = dexModule

    if (moduleRegistry.isRegistered(manifest.id)) {
      console.warn(`[ModuleLoader] Module "${manifest.id}" is already registered — skipping`)
      return
    }

    const scopedEventBus = new ScopedEventBus(
      this.eventBus,
      manifest.id,
      manifest.events?.emits ?? [],
    )

    const kv = new ModuleKVAdapterImpl(manifest.id)
    const cache = new MemoryCacheAdapter()
    const permissionIds = await fetchModulePermissions(manifest.id)
    const permissions = new PermissionsContextImpl(permissionIds)
    const ima = this.imaBroker.createIMAClient(manifest.id)

    const ctx = { moduleId: manifest.id, eventBus: scopedEventBus, kv, cache, permissions, ima }

    if (dexModule.publicApi) {
      this.imaBroker.register(
        manifest.id,
        dexModule.publicApi,
        manifest.crossModuleAccess ?? [],
      )
    }

    await dexModule.init?.(ctx)
    await dexModule.onEnable?.()

    moduleRegistry.register(dexModule)

    this.eventBus.emit(CORE_EVENTS.MODULE_REGISTERED, {
      moduleId: manifest.id,
      version: manifest.version,
    })

    console.info(`[ModuleLoader] Loaded module "${manifest.id}" v${manifest.version}`)
  }

  async unload(moduleId: string): Promise<void> {
    const entry = moduleRegistry.get(moduleId)
    if (!entry) return

    await entry.module.onDisable?.()

    this.imaBroker.unregister(moduleId)
    moduleRegistry.unregister(moduleId)

    this.eventBus.emit(CORE_EVENTS.MODULE_UNREGISTERED, { moduleId })
  }
}
