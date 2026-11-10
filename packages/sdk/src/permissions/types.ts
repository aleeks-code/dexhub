export type PermissionAction = 'read' | 'write' | 'delete' | 'manage'

export interface PermissionsContext {
  has(permission: string): boolean
  hasAll(permissions: string[]): boolean
  hasAny(permissions: string[]): boolean
  require(permission: string): void
}

export function buildPermissionId(
  moduleId: string,
  resource: string,
  action: PermissionAction,
): string {
  return `${moduleId}:${resource}:${action}`
}
