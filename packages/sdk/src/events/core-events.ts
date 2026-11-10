export const CORE_EVENTS = {
  USER_LOGIN: 'app:user:login',
  USER_LOGOUT: 'app:user:logout',
  USER_UPDATED: 'app:user:updated',
  MODULE_REGISTERED: 'app:module:registered',
  MODULE_ENABLED: 'app:module:enabled',
  MODULE_DISABLED: 'app:module:disabled',
  MODULE_UNREGISTERED: 'app:module:unregistered',
  SETTINGS_CHANGED: 'app:settings:changed',
  THEME_CHANGED: 'app:theme:changed',
  SIDEBAR_TOGGLED: 'app:sidebar:toggled',
  COMMAND_PALETTE_OPENED: 'app:command-palette:opened',
  COMMAND_PALETTE_CLOSED: 'app:command-palette:closed',
} as const

export type CoreEventName = (typeof CORE_EVENTS)[keyof typeof CORE_EVENTS]

export interface CoreEventPayloads {
  [CORE_EVENTS.USER_LOGIN]: { userId: string }
  [CORE_EVENTS.USER_LOGOUT]: { userId: string }
  [CORE_EVENTS.USER_UPDATED]: { userId: string }
  [CORE_EVENTS.MODULE_REGISTERED]: { moduleId: string; version: string }
  [CORE_EVENTS.MODULE_ENABLED]: { moduleId: string }
  [CORE_EVENTS.MODULE_DISABLED]: { moduleId: string }
  [CORE_EVENTS.MODULE_UNREGISTERED]: { moduleId: string }
  [CORE_EVENTS.SETTINGS_CHANGED]: { key: string; value: unknown }
  [CORE_EVENTS.THEME_CHANGED]: { theme: 'dark' | 'light' | 'system' }
  [CORE_EVENTS.SIDEBAR_TOGGLED]: { collapsed: boolean }
  [CORE_EVENTS.COMMAND_PALETTE_OPENED]: Record<string, never>
  [CORE_EVENTS.COMMAND_PALETTE_CLOSED]: Record<string, never>
}
