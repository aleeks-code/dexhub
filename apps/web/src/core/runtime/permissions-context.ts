import type { PermissionsContext } from '@dexhub/sdk'
import { PermissionDeniedError } from '@dexhub/sdk'

export class PermissionsContextImpl implements PermissionsContext {
  constructor(private readonly granted: Set<string>) {}

  has(permission: string): boolean {
    return this.granted.has(permission)
  }

  hasAll(permissions: string[]): boolean {
    return permissions.every((p) => this.has(p))
  }

  hasAny(permissions: string[]): boolean {
    return permissions.some((p) => this.has(p))
  }

  require(permission: string): void {
    if (!this.has(permission)) throw new PermissionDeniedError(permission)
  }
}

const API = process.env['NEXT_PUBLIC_API_URL'] ?? ''

export async function fetchModulePermissions(moduleId: string): Promise<Set<string>> {
  try {
    const res = await fetch(`${API}/api/v1/permissions/me`, { credentials: 'include' })
    if (!res.ok) return new Set()
    const json = (await res.json()) as { data: { id: string; moduleId: string }[] }
    return new Set(
      json.data.filter((p) => p.moduleId === moduleId).map((p) => p.id),
    )
  } catch {
    return new Set()
  }
}
