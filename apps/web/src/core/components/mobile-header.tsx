'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Search, Sun, Moon } from 'lucide-react'
import { NotificationsMenu } from './notifications-menu'
import { useAppStore } from '@/core/store/app.store'
import { useMe } from '@/core/hooks/use-me'
import { useT } from '@/i18n'

export function MobileHeader() {
  const { openCommandPalette, theme, setTheme, defaultLandingPage } = useAppStore()
  const { data: me } = useMe()
  const t = useT()

  return (
    <header className="flex h-13 shrink-0 items-center justify-between border-b border-border bg-surface/95 backdrop-blur-md px-4 sticky top-0 z-sticky md:hidden">
      {/* Brand logo */}
      <Link href={defaultLandingPage || '/home'} className="flex items-center gap-2">
        <Image
          src="/dexhub-mark.png"
          alt="DexHub"
          width={28}
          height={28}
          unoptimized
          priority
          className="h-7 w-7 shrink-0 object-contain drop-shadow-sm"
        />
        <span className="text-base font-bold tracking-tight text-text">DexHub</span>
      </Link>

      {/* Quick mobile actions */}
      <div className="flex items-center gap-1.5">
        <NotificationsMenu align="right" />

        <button
          type="button"
          onClick={openCommandPalette}
          className="rounded-xl p-2 text-text-subtle hover:bg-surface-raised hover:text-text transition-colors"
          title={`${t.sidebar.search} (Ctrl+K)`}
          aria-label={t.sidebar.search}
        >
          <Search className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
          className="rounded-xl p-2 text-text-subtle hover:bg-surface-raised hover:text-text transition-colors"
          title={theme === 'light' ? t.settings.appearance.dark : t.settings.appearance.light}
          aria-label={theme === 'light' ? t.settings.appearance.dark : t.settings.appearance.light}
        >
          {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
        </button>

        {me && (
          <Link
            href="/settings"
            className="ml-1 flex h-7 w-7 items-center justify-center rounded-full bg-primary-muted text-xs font-bold text-primary border border-border/80 overflow-hidden"
            title={me.name || me.email}
          >
            {me.image ? (
              <img src={me.image} alt={me.name} className="h-full w-full object-cover" />
            ) : (
              (me.name?.charAt(0) ?? me.email.charAt(0)).toUpperCase()
            )}
          </Link>
        )}
      </div>
    </header>
  )
}
