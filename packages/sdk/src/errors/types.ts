import type { ErrorCode } from './codes'

export class DexHubError extends Error {
  public readonly code: ErrorCode
  public readonly details?: unknown

  constructor(code: ErrorCode, message: string, details?: unknown) {
    super(message)
    this.name = 'DexHubError'
    this.code = code
    this.details = details
  }
}

export class PermissionDeniedError extends DexHubError {
  constructor(permission: string) {
    super('PERMISSION_DENIED', `Permission denied: ${permission}`)
    this.name = 'PermissionDeniedError'
  }
}

export class StorageNamespaceViolationError extends DexHubError {
  constructor(moduleId: string, table: string) {
    super(
      'STORAGE_NAMESPACE_VIOLATION',
      `Module "${moduleId}" attempted to access forbidden resource "${table}"`,
    )
    this.name = 'StorageNamespaceViolationError'
  }
}

export class EventEmitViolationError extends DexHubError {
  constructor(moduleId: string, event: string) {
    super(
      'EVENT_EMIT_VIOLATION',
      `Module "${moduleId}" attempted to emit undeclared event "${event}"`,
    )
    this.name = 'EventEmitViolationError'
  }
}

export class IMAUnauthorizedAccessError extends DexHubError {
  constructor(requestingModuleId: string, targetModuleId: string) {
    super(
      'IMA_UNAUTHORIZED_ACCESS',
      `Module "${requestingModuleId}" attempted to access "${targetModuleId}" API without declared permission`,
    )
    this.name = 'IMAUnauthorizedAccessError'
  }
}

export class ModuleIncompatibleError extends DexHubError {
  constructor(moduleId: string, required: string, current: string) {
    super(
      'MODULE_INCOMPATIBLE',
      `Module "${moduleId}" requires SDK ${required}, but current SDK is ${current}`,
    )
    this.name = 'ModuleIncompatibleError'
  }
}
