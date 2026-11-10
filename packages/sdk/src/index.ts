// Version
export { SDK_VERSION } from './version'

// Manifest
export type {
  ModuleManifest,
  DexHubModule,
  RouteDefinition,
  WidgetDefinition,
  WidgetProps,
  WidgetSize,
  PermissionDefinition,
  SettingDefinition,
  SettingType,
  SettingOption,
  CrossModuleAccessDefinition,
  ModuleEventDeclaration,
  ModuleCategory,
  CommandDefinition,
  ModuleLifecycle,
} from './manifest/types'
export { validateManifest, validateSdkCompatibility } from './manifest/validator'

// Events
export type { EventBus, Unsubscribe } from './events/types'
export { CORE_EVENTS } from './events/core-events'
export type { CoreEventName, CoreEventPayloads } from './events/core-events'

// Permissions
export type { PermissionsContext, PermissionAction } from './permissions/types'
export { buildPermissionId } from './permissions/types'

// Storage
export type {
  ModuleStorageAdapter,
  ModuleKVAdapter,
  CacheAdapter,
  QueryOptions,
} from './storage/types'

// API
export type {
  ApiMethod,
  ApiEndpointDefinition,
  ApiSuccessResponse,
  ApiErrorResponse,
  ApiPaginatedResponse,
  PaginationParams,
} from './api/types'

// Errors
export { ERROR_CODES } from './errors/codes'
export type { ErrorCode } from './errors/codes'
export {
  DexHubError,
  PermissionDeniedError,
  StorageNamespaceViolationError,
  EventEmitViolationError,
  IMAUnauthorizedAccessError,
  ModuleIncompatibleError,
} from './errors/types'

// Result
export type { Result } from './result'
export { ok, err, isOk, isErr } from './result'

// Runtime context
export type { ModuleContext, ModuleIMAClient } from './runtime/context'
