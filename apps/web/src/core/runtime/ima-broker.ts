import { DexHubError, IMAUnauthorizedAccessError } from '@dexhub/sdk'
import type { CrossModuleAccessDefinition, ModuleIMAClient } from '@dexhub/sdk'

interface ModuleEntry {
  publicApi: Record<string, (...args: unknown[]) => unknown>
  crossModuleAccess: CrossModuleAccessDefinition[]
}

export class IMABroker {
  private readonly modules = new Map<string, ModuleEntry>()

  register(
    moduleId: string,
    publicApi: Record<string, (...args: unknown[]) => unknown>,
    crossModuleAccess: CrossModuleAccessDefinition[],
  ): void {
    this.modules.set(moduleId, { publicApi, crossModuleAccess })
  }

  unregister(moduleId: string): void {
    this.modules.delete(moduleId)
  }

  async call(
    requestingModuleId: string,
    targetModuleId: string,
    method: string,
    ...args: unknown[]
  ): Promise<unknown> {
    const requester = this.modules.get(requestingModuleId)
    if (!requester) {
      throw new DexHubError('MODULE_NOT_FOUND', `Requesting module "${requestingModuleId}" is not registered`)
    }

    const cma = requester.crossModuleAccess.find((c) => c.moduleId === targetModuleId)
    if (!cma || !cma.permissions.includes(method)) {
      throw new IMAUnauthorizedAccessError(requestingModuleId, targetModuleId)
    }

    const target = this.modules.get(targetModuleId)
    if (!target) {
      throw new DexHubError('MODULE_NOT_FOUND', `Target module "${targetModuleId}" is not registered`)
    }

    const fn = target.publicApi[method]
    if (typeof fn !== 'function') {
      throw new DexHubError('NOT_FOUND', `Method "${method}" not found in module "${targetModuleId}"`)
    }

    return fn(...args)
  }

  createIMAClient(requestingModuleId: string): ModuleIMAClient {
    return {
      call: <T>(targetModuleId: string, method: string, ...args: unknown[]) =>
        this.call(requestingModuleId, targetModuleId, method, ...args) as Promise<T>,
    }
  }
}
