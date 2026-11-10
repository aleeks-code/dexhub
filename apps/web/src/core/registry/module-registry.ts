import type { DexHubModule, ModuleManifest } from '@dexhub/sdk'
import { validateManifest, validateSdkCompatibility } from '@dexhub/sdk'

export interface RegisteredModule {
  manifest: ModuleManifest
  module: DexHubModule
}

class ModuleRegistry {
  private readonly modules = new Map<string, RegisteredModule>()
  private readonly shortcutMap = new Map<string, string>() // shortcut → 'moduleId:commandId'

  register(module: DexHubModule): void {
    const manifestResult = validateManifest(module.manifest)
    if (!manifestResult.ok) {
      console.error(`[ModuleRegistry] Invalid manifest for module:`, manifestResult.error.message)
      return
    }

    const compatResult = validateSdkCompatibility(module.manifest)
    if (!compatResult.ok) {
      console.error(`[ModuleRegistry] SDK incompatible:`, compatResult.error.message)
      return
    }

    const manifest = module.manifest
    let effectiveCommands = manifest.commands

    if (effectiveCommands) {
      effectiveCommands = effectiveCommands.map((cmd) => {
        if (!cmd.shortcut) return cmd
        const owner = this.shortcutMap.get(cmd.shortcut)
        if (owner) {
          console.warn(
            `[ModuleRegistry] Shortcut "${cmd.shortcut}" already claimed by "${owner}". ` +
              `Command "${manifest.id}:${cmd.id}" will be registered without it.`,
          )
          const { shortcut: _, ...rest } = cmd
          return rest
        }
        this.shortcutMap.set(cmd.shortcut, `${manifest.id}:${cmd.id}`)
        return cmd
      })
    }

    const effectiveManifest: ModuleManifest =
      effectiveCommands !== manifest.commands
        ? { ...manifest, commands: effectiveCommands }
        : manifest

    this.modules.set(manifest.id, {
      manifest: effectiveManifest,
      module,
    })
  }

  unregister(moduleId: string): void {
    const entry = this.modules.get(moduleId)
    if (entry?.manifest.commands) {
      for (const cmd of entry.manifest.commands) {
        if (cmd.shortcut) {
          const owner = this.shortcutMap.get(cmd.shortcut)
          if (owner === `${moduleId}:${cmd.id}`) {
            this.shortcutMap.delete(cmd.shortcut)
          }
        }
      }
    }
    this.modules.delete(moduleId)
  }

  get(moduleId: string): RegisteredModule | undefined {
    return this.modules.get(moduleId)
  }

  getAll(): RegisteredModule[] {
    return Array.from(this.modules.values())
  }

  isRegistered(moduleId: string): boolean {
    return this.modules.has(moduleId)
  }

  getShortcutOwner(shortcut: string): string | undefined {
    return this.shortcutMap.get(shortcut)
  }
}

export const moduleRegistry = new ModuleRegistry()
