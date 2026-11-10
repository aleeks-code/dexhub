import { satisfies, valid } from 'semver'
import { z } from 'zod'
import { SDK_VERSION } from '../version'
import { DexHubError, ModuleIncompatibleError } from '../errors/types'
import type { Result } from '../result'
import { ok, err } from '../result'
import type { ModuleManifest } from './types'

const MODULE_ID_REGEX = /^[a-z][a-z0-9-]*$/
const SEMVER_REGEX = /^\d+\.\d+\.\d+/

const ManifestSchema = z.object({
  id: z.string().min(1).max(50).regex(MODULE_ID_REGEX, 'ID must be lowercase kebab-case'),
  name: z.string().min(1).max(100),
  version: z.string().regex(SEMVER_REGEX, 'Must be a valid semver version'),
  sdkVersion: z.string().min(1),
  description: z.string().optional(),
  icon: z.string().min(1),
  category: z.enum(['productivity', 'finance', 'health', 'collections', 'tools', 'ai', 'utilities']),
  routes: z.array(z.object({ path: z.string(), component: z.function().optional(), label: z.string().optional(), icon: z.string().optional() })).min(1),
  widgets: z.array(z.unknown()).optional(),
  permissions: z.array(z.unknown()).optional(),
  settings: z.array(z.unknown()).optional(),
  dependencies: z.array(z.string()).optional(),
  crossModuleAccess: z.array(z.unknown()).optional(),
  events: z
    .object({ emits: z.array(z.string()).optional(), listens: z.array(z.string()).optional() })
    .optional(),
  commands: z
    .array(
      z.object({
        id: z.string().min(1),
        label: z.string().min(1),
        href: z.string().min(1),
        shortcut: z.string().optional(),
        keywords: z.array(z.string()).optional(),
        icon: z.string().optional(),
      }),
    )
    .optional(),
  navOrder: z.number().optional(),
  lifecycle: z.enum(['active', 'beta', 'soon']).optional(),
})

export function validateManifest(manifest: unknown): Result<ModuleManifest> {
  const parsed = ManifestSchema.safeParse(manifest)

  if (!parsed.success) {
    return err(new DexHubError('VALIDATION_ERROR', parsed.error.message, parsed.error.issues))
  }

  return ok(parsed.data as ModuleManifest)
}

export function validateSdkCompatibility(manifest: ModuleManifest): Result<true> {
  if (!valid(SDK_VERSION)) {
    return err(new DexHubError('INTERNAL_ERROR', `Invalid SDK version: ${SDK_VERSION}`))
  }

  if (!satisfies(SDK_VERSION, manifest.sdkVersion)) {
    return err(new ModuleIncompatibleError(manifest.id, manifest.sdkVersion, SDK_VERSION))
  }

  return ok(true)
}
