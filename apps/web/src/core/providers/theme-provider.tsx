'use client'

import { useEffect } from 'react'
import { useAppStore, ACCENT_PALETTES } from '@/core/store/app.store'

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useAppStore((s) => s.theme)
  const accentColor = useAppStore((s) => s.accentColor)
  const density = useAppStore((s) => s.density)
  const reduceMotion = useAppStore((s) => s.reduceMotion)

  useEffect(() => {
    const root = document.documentElement
    const isDark =
      theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)

    root.classList.toggle('light', !isDark)

    // Apply accent color palette CSS variables
    const palette = ACCENT_PALETTES[accentColor] || ACCENT_PALETTES.teal
    root.style.setProperty('--primary', palette.primary)
    root.style.setProperty('--primary-hover', palette.hover)
    root.style.setProperty('--primary-muted', palette.muted)
    root.style.setProperty('--primary-foreground', palette.foreground)

    // Apply density & motion classes
    root.classList.toggle('compact-mode', density === 'compact')
    root.classList.toggle('reduce-motion', !!reduceMotion)
  }, [theme, accentColor, density, reduceMotion])

  return <>{children}</>
}
