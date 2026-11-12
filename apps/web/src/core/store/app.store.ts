import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Theme = 'dark' | 'light' | 'system'
export type Language = 'en' | 'it'
export type AccentColor = 'teal' | 'emerald' | 'indigo' | 'violet' | 'amber' | 'rose'
export type DensityMode = 'comfortable' | 'compact'
export type CurrencyFormat = 'EUR' | 'USD' | 'GBP' | 'CHF'
export type DateFormat = 'DD/MM/YYYY' | 'YYYY-MM-DD' | 'MM/DD/YYYY'

export interface AccentPalette {
  name: string
  color: string
  primary: string
  hover: string
  muted: string
  foreground: string
}

export const ACCENT_PALETTES: Record<AccentColor, AccentPalette> = {
  teal: {
    name: 'DexHub Teal',
    color: '#33C9B4',
    primary: 'hsl(172 60% 49%)',
    hover: 'hsl(172 60% 54%)',
    muted: 'hsl(172 60% 49% / 0.15)',
    foreground: 'hsl(174 40% 10%)',
  },
  emerald: {
    name: 'Smeraldo',
    color: '#10b981',
    primary: 'hsl(158 64% 45%)',
    hover: 'hsl(158 64% 50%)',
    muted: 'hsl(158 64% 45% / 0.15)',
    foreground: 'hsl(158 50% 10%)',
  },
  indigo: {
    name: 'Indaco',
    color: '#6366f1',
    primary: 'hsl(238 82% 64%)',
    hover: 'hsl(238 82% 70%)',
    muted: 'hsl(238 82% 64% / 0.15)',
    foreground: 'hsl(238 50% 10%)',
  },
  violet: {
    name: 'Viola',
    color: '#8b5cf6',
    primary: 'hsl(266 82% 64%)',
    hover: 'hsl(266 82% 70%)',
    muted: 'hsl(266 82% 64% / 0.15)',
    foreground: 'hsl(266 50% 10%)',
  },
  amber: {
    name: 'Ambra',
    color: '#f59e0b',
    primary: 'hsl(38 92% 50%)',
    hover: 'hsl(38 92% 56%)',
    muted: 'hsl(38 92% 50% / 0.15)',
    foreground: 'hsl(38 50% 10%)',
  },
  rose: {
    name: 'Rosa',
    color: '#f43f5e',
    primary: 'hsl(340 75% 55%)',
    hover: 'hsl(340 75% 62%)',
    muted: 'hsl(340 75% 55% / 0.15)',
    foreground: 'hsl(340 50% 10%)',
  },
}

const LANG_KEY = 'dexhub-language'

interface AppState {
  sidebarCollapsed: boolean
  theme: Theme
  language: Language
  accentColor: AccentColor
  defaultLandingPage: string
  density: DensityMode
  reduceMotion: boolean
  currency: CurrencyFormat
  dateFormat: DateFormat
  commandPaletteOpen: boolean
  moduleNavOrder: string[]

  toggleSidebar: () => void
  setSidebarCollapsed: (collapsed: boolean) => void
  setTheme: (theme: Theme) => void
  setLanguage: (lang: Language) => void
  setAccentColor: (color: AccentColor) => void
  setDefaultLandingPage: (path: string) => void
  setDensity: (density: DensityMode) => void
  setReduceMotion: (reduce: boolean) => void
  setCurrency: (currency: CurrencyFormat) => void
  setDateFormat: (format: DateFormat) => void
  openCommandPalette: () => void
  closeCommandPalette: () => void
  setModuleNavOrder: (order: string[]) => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      theme: 'dark',
      language: 'it',
      accentColor: 'teal',
      defaultLandingPage: '/home',
      density: 'comfortable',
      reduceMotion: false,
      currency: 'EUR',
      dateFormat: 'DD/MM/YYYY',
      commandPaletteOpen: false,
      moduleNavOrder: [],

      toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
      setTheme: (theme) => set({ theme }),
      setLanguage: (lang) => {
        if (typeof localStorage !== 'undefined') localStorage.setItem(LANG_KEY, lang)
        set({ language: lang })
      },
      setAccentColor: (accentColor) => set({ accentColor }),
      setDefaultLandingPage: (defaultLandingPage) => set({ defaultLandingPage }),
      setDensity: (density) => set({ density }),
      setReduceMotion: (reduceMotion) => set({ reduceMotion }),
      setCurrency: (currency) => set({ currency }),
      setDateFormat: (dateFormat) => set({ dateFormat }),
      openCommandPalette: () => set({ commandPaletteOpen: true }),
      closeCommandPalette: () => set({ commandPaletteOpen: false }),
      setModuleNavOrder: (moduleNavOrder) => set({ moduleNavOrder }),
    }),
    {
      name: 'dexhub-app-store',
      partialize: (state) => ({
        sidebarCollapsed: state.sidebarCollapsed,
        theme: state.theme,
        language: state.language,
        accentColor: state.accentColor,
        defaultLandingPage: state.defaultLandingPage,
        density: state.density,
        reduceMotion: state.reduceMotion,
        currency: state.currency,
        dateFormat: state.dateFormat,
        moduleNavOrder: state.moduleNavOrder,
      }),
    },
  ),
)
