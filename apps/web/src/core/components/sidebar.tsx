'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { LayoutDashboard, LayoutGrid, Settings, ChevronLeft, ChevronRight, Search, LogOut, Users, MessageSquarePlus, Sparkles, Sun, Moon } from 'lucide-react'
import { cn } from '@dexhub/ui'
import { useQueryClient } from '@tanstack/react-query'
import { useAppStore } from '@/core/store/app.store'
import { useVisibleModules } from '@/core/hooks/use-modules'
import { resolveModuleIcon } from '@/core/utils/module-icons'
import { NotificationsMenu } from './notifications-menu'
import { useMe } from '@/core/hooks/use-me'
import { useT } from '@/i18n'

const API = process.env['NEXT_PUBLIC_API_URL'] ?? ''

function BrandMark() {
  return (
    <Image
      src="/dexhub-mark.png"
      alt="DexHub"
      width={28}
      height={28}
      unoptimized
      priority
      className="h-7 w-7 shrink-0 object-contain drop-shadow-sm hover:scale-105 transition-transform"
    />
  )
}

function NavDot({ active, warning }: { active: boolean; warning?: boolean }) {
  return (
    <span
      className={cn(
        'h-1.5 w-1.5 shrink-0 rounded-full',
        warning ? 'bg-warning' : active ? 'bg-primary' : 'bg-transparent',
      )}
    />
  )
}

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const t = useT()
  const { sidebarCollapsed, toggleSidebar, openCommandPalette, theme, setTheme, defaultLandingPage } = useAppStore()
  const { data: me } = useMe()
  const queryClient = useQueryClient()
  const [accountMenuOpen, setAccountMenuOpen] = useState(false)
  const accountTriggerRef = useRef<HTMLButtonElement>(null)
  const firstMenuItemRef = useRef<HTMLAnchorElement>(null)

  async function handleLogout() {
    await fetch(`${API}/api/v1/auth/logout`, { method: 'POST', credentials: 'include' })
    queryClient.clear()
    router.push('/')
    router.refresh()
  }
  const { data: modules, isLoading } = useVisibleModules()
  const visibleModules = (modules ?? []).filter((mod) => mod.enabled)

  useEffect(() => {
    if (!accountMenuOpen) return
    firstMenuItemRef.current?.focus()
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setAccountMenuOpen(false)
        accountTriggerRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [accountMenuOpen])

  const settingsActive = pathname === '/settings' || pathname.startsWith('/settings/')

  return (
    <aside
      className={cn(
        'hidden md:flex flex-col border-r border-border bg-surface transition-all duration-200',
        sidebarCollapsed ? 'w-14' : 'w-60',
      )}
    >
      {/* Brand */}
      <div className={cn('flex h-12 items-center gap-2 px-3', sidebarCollapsed && 'justify-center')}>
        <Link
          href={defaultLandingPage || '/home'}
          className={cn(
            'flex items-center gap-2.5 min-w-0 hover:opacity-90 transition-opacity',
            !sidebarCollapsed && 'flex-1',
          )}
        >
          <BrandMark />
          {!sidebarCollapsed && (
            <span className="truncate text-base font-semibold tracking-tight text-text">DexHub</span>
          )}
        </Link>
        <div className={cn('flex items-center gap-0.5', sidebarCollapsed && 'hidden')}>
          <NotificationsMenu align="left" />
          <button
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            className="rounded-md p-1.5 text-text-subtle transition-colors hover:bg-surface-raised hover:text-text"
            aria-label={theme === 'light' ? t.settings.appearance.dark : t.settings.appearance.light}
            title={theme === 'light' ? t.settings.appearance.dark : t.settings.appearance.light}
          >
            {theme === 'light' ? <Moon size={15} /> : <Sun size={15} />}
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="flex h-14 items-center border-b border-border px-3">
        <button
          onClick={openCommandPalette}
          className={cn(
            'flex items-center gap-2 rounded-md text-text-subtle transition-colors hover:bg-surface-raised hover:text-text',
            sidebarCollapsed ? 'p-2' : 'flex-1 px-2 py-1.5 text-xs',
          )}
          title={`${t.sidebar.search} (Ctrl+K)`}
        >
          <Search className="h-3.5 w-3.5 shrink-0" />
          {!sidebarCollapsed && <span>{t.sidebar.search}</span>}
          {!sidebarCollapsed && (
            <span className="ml-auto flex items-center gap-0.5">
              <kbd className="rounded border border-border px-1 py-0.5 text-[10px]">Ctrl</kbd>
              <kbd className="rounded border border-border px-1 py-0.5 text-[10px]">K</kbd>
            </span>
          )}
        </button>
      </div>

      {/* Navigation */}
      <div className="relative min-h-0 flex-1">
        <nav className="h-full overflow-y-auto py-4">
        {/* Core */}
        <ul className="space-y-0.5 px-2">
          {[
            { href: '/home', icon: LayoutDashboard, label: t.dashboard.title },
            { href: '/modules', icon: LayoutGrid, label: t.modules.nav },
            { href: '/feedback', icon: MessageSquarePlus, label: t.feedback.nav },
            { href: '/changelog', icon: Sparkles, label: t.changelog.nav },
          ].map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 rounded-md px-2 py-2 text-sm font-medium transition-colors',
                    active
                      ? 'bg-primary-muted text-primary'
                      : 'text-text-muted hover:bg-surface-raised hover:text-text',
                    sidebarCollapsed && 'justify-center px-0',
                  )}
                  title={sidebarCollapsed ? item.label : undefined}
                >
                  {!sidebarCollapsed && <NavDot active={active} />}
                  <item.icon className="h-4 w-4 shrink-0" />
                  {!sidebarCollapsed && <span>{item.label}</span>}
                </Link>
              </li>
            )
          })}
        </ul>

        {/* Administration section (admins only) */}
        {me?.isAdmin && (
          <>
            <div className={cn('my-4 border-t border-border', sidebarCollapsed && 'mx-2')} />
            {!sidebarCollapsed && (
              <p className="mb-2 px-4 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-text-subtle">
                {t.admin.section}
              </p>
            )}
            <ul className="space-y-0.5 px-2">
              {[
                { href: '/settings/administration', icon: Users, label: t.admin.section },
              ].map((item) => {
                const active = pathname === item.href || pathname.startsWith(item.href + '/')
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        'flex items-center gap-3 rounded-md px-2 py-2 text-sm font-medium transition-colors',
                        active
                          ? 'bg-primary-muted text-primary'
                          : 'text-text-muted hover:bg-surface-raised hover:text-text',
                        sidebarCollapsed && 'justify-center px-0',
                      )}
                      title={sidebarCollapsed ? item.label : undefined}
                    >
                      {!sidebarCollapsed && <NavDot active={active} />}
                      <item.icon className="h-4 w-4 shrink-0" />
                      {!sidebarCollapsed && <span>{item.label}</span>}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </>
        )}

        {/* Modules section */}
        {(isLoading || visibleModules.length > 0) && (
          <>
            <div className={cn('my-4 border-t border-border', sidebarCollapsed && 'mx-2')} />
            {!sidebarCollapsed && (
              <p className="mb-2 px-4 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-text-subtle">
                {t.sidebar.modules}
              </p>
            )}
            <ul className="space-y-0.5 px-2">
              {isLoading
                ? Array.from({ length: 2 }).map((_, i) => (
                    <li key={i} className="h-8 animate-pulse rounded-md bg-surface-raised" />
                  ))
                : [...visibleModules]
                    .sort((a, b) => {
                      const ao = (a.manifest['navOrder'] as number | undefined) ?? 100
                      const bo = (b.manifest['navOrder'] as number | undefined) ?? 100
                      return ao - bo
                    })
                    .map((mod) => {
                      const href = `/${mod.id}`
                      const active = pathname === href || pathname.startsWith(href + '/')
                      const ModIcon = resolveModuleIcon(mod.manifest['icon'] as string | undefined)

                      if (mod.maintenance) {
                        return (
                          <li key={mod.id}>
                            <span
                              aria-disabled="true"
                              title={sidebarCollapsed ? mod.name : undefined}
                              className={cn(
                                'flex cursor-not-allowed items-center gap-3 rounded-md px-2 py-2 text-sm font-medium text-text-muted opacity-60',
                                sidebarCollapsed && 'justify-center px-0',
                              )}
                            >
                              {!sidebarCollapsed && <NavDot active={false} warning />}
                              <ModIcon className="h-4 w-4 shrink-0" />
                              {!sidebarCollapsed && (
                                <span className="truncate">{mod.name}</span>
                              )}
                            </span>
                          </li>
                        )
                      }

                      return (
                        <li key={mod.id}>
                          <Link
                            href={href}
                            className={cn(
                              'flex items-center gap-3 rounded-md px-2 py-2 text-sm font-medium transition-colors',
                              active
                                ? 'bg-primary-muted text-primary'
                                : 'text-text-muted hover:bg-surface-raised hover:text-text',
                              sidebarCollapsed && 'justify-center px-0',
                            )}
                            title={sidebarCollapsed ? mod.name : undefined}
                          >
                            {!sidebarCollapsed && <NavDot active={active} />}
                            <ModIcon className="h-4 w-4 shrink-0" />
                            {!sidebarCollapsed && (
                              <span className="truncate">{mod.name}</span>
                            )}
                          </Link>
                        </li>
                      )
                    })}
            </ul>
          </>
        )}
        </nav>

        {/* Collapse/expand handle — panel infrastructure, not a nav item: straddles the right edge */}
        <button
          onClick={toggleSidebar}
          aria-label={sidebarCollapsed ? t.sidebar.expand : t.sidebar.collapse}
          className="absolute right-0 top-1/2 z-30 flex h-8 w-8 -translate-y-1/2 translate-x-1/2 items-center justify-center rounded-full border border-border bg-surface text-text-subtle shadow-sm transition-colors hover:border-primary hover:bg-surface-raised hover:text-primary"
        >
          {sidebarCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* User block — click opens account menu (Settings + Logout) */}
      {me && (
        <div className="relative border-t border-border px-3 py-3">
          {accountMenuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setAccountMenuOpen(false)} />
              <div
                role="menu"
                className="absolute bottom-full left-3 z-20 mb-1 w-44 overflow-hidden rounded-md border border-border bg-surface-raised py-1 shadow-lg"
              >
                <Link
                  ref={firstMenuItemRef}
                  href="/settings"
                  role="menuitem"
                  onClick={() => setAccountMenuOpen(false)}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 text-sm transition-colors',
                    settingsActive
                      ? 'bg-primary-muted text-primary'
                      : 'text-text-muted hover:bg-surface hover:text-text',
                  )}
                >
                  <Settings className="h-4 w-4 shrink-0" />
                  {t.settings.title}
                </Link>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => { setAccountMenuOpen(false); void handleLogout() }}
                  className="flex w-full items-center gap-3 px-3 py-2 text-sm text-text-muted transition-colors hover:bg-surface hover:text-error"
                >
                  <LogOut className="h-4 w-4 shrink-0" />
                  {t.sidebar.logout}
                </button>
              </div>
            </>
          )}

          <button
            ref={accountTriggerRef}
            type="button"
            onClick={() => setAccountMenuOpen((v) => !v)}
            aria-haspopup="menu"
            aria-expanded={accountMenuOpen}
            className={cn(
              'flex w-full items-center gap-2.5 rounded-md p-1 transition-colors hover:bg-surface-raised',
              sidebarCollapsed && 'justify-center',
            )}
            title={sidebarCollapsed ? me.name || me.email : undefined}
          >
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-muted text-xs font-semibold text-primary overflow-hidden">
              {me.image ? (
                <img src={me.image} alt={me.name} className="h-full w-full object-cover" />
              ) : (
                (me.name?.charAt(0) ?? me.email.charAt(0)).toUpperCase()
              )}
            </div>
            {!sidebarCollapsed && (
              <div className="min-w-0 flex-1 text-left">
                <p className="truncate text-xs font-semibold text-text">{me.name || me.email}</p>
                <p className="truncate text-[10px] text-text-subtle">{t.sidebar.workspace}</p>
              </div>
            )}
          </button>
        </div>
      )}
    </aside>
  )
}
