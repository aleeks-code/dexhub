export type ModuleLifecycle = 'active' | 'beta' | 'soon'

export type ModuleCategory =
  | 'productivity'
  | 'finance'
  | 'health'
  | 'collections'
  | 'tools'
  | 'ai'
  | 'utilities'

export type WidgetSize = '1x1' | '2x1' | '1x2' | '2x2' | '3x1' | '3x2'

export interface RouteDefinition {
  path: string
  component: () => Promise<{ default: unknown }>
  label?: string
  icon?: string
}

export interface WidgetProps {
  size: WidgetSize
  moduleId: string
}

export interface WidgetDefinition {
  id: string
  label: string
  description?: string
  sizes: WidgetSize[]
  defaultSize: WidgetSize
  component: () => Promise<{ default: unknown }>
}

export interface PermissionDefinition {
  id: string
  label: string
  description: string
  dangerous?: boolean
}

export type SettingType = 'boolean' | 'string' | 'number' | 'select' | 'json'

export interface SettingOption {
  label: string
  value: unknown
}

export interface SettingDefinition {
  key: string
  label: string
  description?: string
  type: SettingType
  default: unknown
  options?: SettingOption[]
}

export interface CrossModuleAccessDefinition {
  moduleId: string
  permissions: string[]
}

export interface CommandDefinition {
  id: string
  label: string
  href: string
  shortcut?: string
  keywords?: string[]
  icon?: string
}

export interface ModuleEventDeclaration {
  emits?: string[]
  listens?: string[]
}

export interface ModuleManifest {
  id: string
  name: string
  version: string
  sdkVersion: string
  description?: string
  icon: string
  category: ModuleCategory
  routes: RouteDefinition[]
  widgets?: WidgetDefinition[]
  permissions?: PermissionDefinition[]
  settings?: SettingDefinition[]
  dependencies?: string[]
  crossModuleAccess?: CrossModuleAccessDefinition[]
  events?: ModuleEventDeclaration
  commands?: CommandDefinition[]
  navOrder?: number
  /** Module maturity, declared by the module. Orthogonal to registry `status` (admin on/off). Default 'active' when omitted. */
  lifecycle?: ModuleLifecycle
}

export interface DexHubModule {
  manifest: ModuleManifest
  apiModule?: unknown
  publicApi?: Record<string, (...args: unknown[]) => unknown>
  init?: (ctx: import('../runtime/context').ModuleContext) => void | Promise<void>
  onInstall?: () => Promise<void>
  onUninstall?: () => Promise<void>
  onEnable?: () => Promise<void>
  onDisable?: () => Promise<void>
}
