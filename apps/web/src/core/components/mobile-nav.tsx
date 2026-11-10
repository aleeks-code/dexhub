'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  LayoutGrid,
  Settings,
  Box,
  Building2,
  CreditCard,
  Grid,
  X,
  LogOut,
  Users,
  Sparkles,
  MessageSquarePlus,
  Search,
} from 'lucide-react'
import { cn } from '@dexhub/ui'
import { useQueryClient } from '@tanstack/react-query'
import { useAppStore } from '@/core/store/app.store'
import { useVisibleModules } from '@/core/hooks/use-modules'
import { resolveModuleIcon } from '@/core/utils/module-icons'
import { useMe } from '@/core/hooks/use-me'
import { useT } from '@/i18n'

const API = process.env['NEXT_PUBLIC_API_URL'] ?? ''

export function MobileNav() {
  const pathname = usePathname()
  const router = useRouter()
  const t = useT()
  const { openCommandPalette } = useAppStore()
  const { data: modules = [] } = useVisibleModules()
  const { data: me } = useMe()
  const queryClient = useQueryClient()
  const [drawerOpen, setDrawerOpen] = useState(false)

  const activeModules = modules.filter((m) => m.enabled && !m.maintenance)

  async function handleLogout() {
    setDrawerOpen(false)
    await fetch(`${API}/api/v1/auth/logout`, { method: 'POST', credentials: 'include' })
    queryClient.clear()
    router.push('/')
    router.refresh()
  }

  const isHomeActive = pathname === '/home'
  const isLoansActive = pathname === '/loans' || pathname.startsWith('/loans/')
  const isDebtsActive = pathname === '/debts' || pathname.startsWith('/debts/')
  const isSettingsActive = pathname === '/settings' || pathname.startsWith('/settings/')

  const isOtherActive =
    !isHomeActive &&
    !isLoansActive &&
    !isDebtsActive &&
    !isSettingsActive

  return (
    <>
      {/* Bottom Sheet Drawer for All Modules */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          {/* Dimmed Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={() => setDrawerOpen(false)}
          />

          {/* Drawer Panel */}
          <div className="fixed inset-x-0 bottom-0 z-50 max-h-[82vh] overflow-y-auto rounded-t-3xl border-t border-border bg-surface p-5 shadow-2xl">
            {/* Pull handle */}
            <div className="mx-auto -mt-1 mb-4 h-1 w-10 rounded-full bg-border-strong" />

            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div>
                <h3 className="text-base font-bold text-text">Tutte le Applicazioni</h3>
                <p className="text-xs text-text-subtle mt-0.5">
                  Accedi a tutti i moduli e alle funzionalità di DexHub
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="rounded-full p-1.5 text-text-subtle hover:bg-surface-raised hover:text-text transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modules Grid */}
            <div className="py-4">
              <span className="text-[10px] font-bold text-text-subtle uppercase tracking-wider block mb-2.5">
                Moduli Personali ({activeModules.length})
              </span>
              <div className="grid grid-cols-2 gap-2.5">
                {activeModules.map((mod) => {
                  const ModIcon = resolveModuleIcon(mod.manifest.icon as string | undefined)
                  const isCurrent = pathname === `/${mod.id}` || pathname.startsWith(`/${mod.id}/`)
                  return (
                    <Link
                      key={mod.id}
                      href={`/${mod.id}`}
                      onClick={() => setDrawerOpen(false)}
                      className={cn(
                        'flex items-center gap-3 rounded-2xl border p-3.5 transition-all',
                        isCurrent
                          ? 'border-primary bg-primary-muted text-primary shadow-xs'
                          : 'border-border/80 bg-surface-raised text-text hover:border-border hover:bg-surface',
                      )}
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface border border-border/60 text-primary">
                        <ModIcon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-bold leading-tight">{mod.name}</p>
                        <p className="truncate text-[10px] text-text-subtle mt-0.5">
                          {mod.manifest.description ? String(mod.manifest.description) : 'Apri modulo'}
                        </p>
                      </div>
                    </Link>
                  )
                })}
              </div>
            </div>

            {/* Platform Utilities */}
            <div className="pt-2 border-t border-border space-y-1">
              <span className="text-[10px] font-bold text-text-subtle uppercase tracking-wider block mb-1.5">
                Piattaforma & Strumenti
              </span>
              <div className="grid grid-cols-2 gap-2">
                <Link
                  href="/modules"
                  onClick={() => setDrawerOpen(false)}
                  className="flex items-center gap-2.5 rounded-xl border border-border bg-surface-raised/50 p-2.5 text-xs text-text hover:bg-surface transition-colors"
                >
                  <LayoutGrid className="h-4 w-4 text-primary" />
                  <span>Catalogo Moduli</span>
                </Link>

                <button
                  type="button"
                  onClick={() => {
                    setDrawerOpen(false)
                    openCommandPalette()
                  }}
                  className="flex items-center gap-2.5 rounded-xl border border-border bg-surface-raised/50 p-2.5 text-xs text-text hover:bg-surface transition-colors text-left"
                >
                  <Search className="h-4 w-4 text-primary" />
                  <span>Cerca (Ctrl+K)</span>
                </button>

                <Link
                  href="/feedback"
                  onClick={() => setDrawerOpen(false)}
                  className="flex items-center gap-2.5 rounded-xl border border-border bg-surface-raised/50 p-2.5 text-xs text-text hover:bg-surface transition-colors"
                >
                  <MessageSquarePlus className="h-4 w-4 text-text-subtle" />
                  <span>Invia Feedback</span>
                </Link>

                <Link
                  href="/changelog"
                  onClick={() => setDrawerOpen(false)}
                  className="flex items-center gap-2.5 rounded-xl border border-border bg-surface-raised/50 p-2.5 text-xs text-text hover:bg-surface transition-colors"
                >
                  <Sparkles className="h-4 w-4 text-warning" />
                  <span>Changelog v2.0</span>
                </Link>

                {me?.isAdmin && (
                  <Link
                    href="/settings/administration"
                    onClick={() => setDrawerOpen(false)}
                    className="flex items-center gap-2.5 rounded-xl border border-border bg-surface-raised/50 p-2.5 text-xs text-text hover:bg-surface transition-colors col-span-2"
                  >
                    <Users className="h-4 w-4 text-primary" />
                    <span>Pannello Amministrazione</span>
                  </Link>
                )}
              </div>
            </div>

            {/* Logout button */}
            <div className="pt-4 mt-3 border-t border-border">
              <button
                type="button"
                onClick={handleLogout}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-error/30 bg-error/10 py-2.5 text-xs font-semibold text-error hover:bg-error/20 transition-colors"
              >
                <LogOut className="h-4 w-4" />
                <span>{t.sidebar.logout}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main 5-Slot Bottom Navigation Bar */}
      <nav className="fixed inset-x-0 bottom-0 z-sticky flex h-14 items-center justify-around border-t border-border bg-surface/95 backdrop-blur-md px-1 md:hidden">
        {/* 1. Home */}
        <Link
          href="/home"
          className={cn(
            'flex flex-1 flex-col items-center justify-center gap-1 py-1 text-[11px] font-semibold transition-colors',
            isHomeActive ? 'text-primary' : 'text-text-subtle hover:text-text',
          )}
        >
          <LayoutDashboard className="h-4.5 w-4.5" />
          <span>Home</span>
        </Link>

        {/* 2. Finanziamenti */}
        <Link
          href="/loans"
          className={cn(
            'flex flex-1 flex-col items-center justify-center gap-1 py-1 text-[11px] font-semibold transition-colors',
            isLoansActive ? 'text-primary font-bold' : 'text-text-subtle hover:text-text',
          )}
        >
          <Building2 className="h-4.5 w-4.5" />
          <span className="truncate max-w-[4.5rem]">Finanziamenti</span>
        </Link>

        {/* 3. Debiti */}
        <Link
          href="/debts"
          className={cn(
            'flex flex-1 flex-col items-center justify-center gap-1 py-1 text-[11px] font-semibold transition-colors',
            isDebtsActive ? 'text-primary font-bold' : 'text-text-subtle hover:text-text',
          )}
        >
          <CreditCard className="h-4.5 w-4.5" />
          <span>Debiti</span>
        </Link>

        {/* 4. Impostazioni */}
        <Link
          href="/settings"
          className={cn(
            'flex flex-1 flex-col items-center justify-center gap-1 py-1 text-[11px] font-semibold transition-colors',
            isSettingsActive ? 'text-primary font-bold' : 'text-text-subtle hover:text-text',
          )}
        >
          <Settings className="h-4.5 w-4.5" />
          <span>Impostaz.</span>
        </Link>

        {/* 5. Altri Moduli (Drawer Trigger) */}
        <button
          type="button"
          onClick={() => setDrawerOpen((v) => !v)}
          className={cn(
            'flex flex-1 flex-col items-center justify-center gap-1 py-1 text-[11px] font-semibold transition-colors cursor-pointer',
            drawerOpen || isOtherActive ? 'text-primary font-bold' : 'text-text-subtle hover:text-text',
          )}
          aria-label="Tutti i Moduli"
        >
          <Grid className="h-4.5 w-4.5" />
          <span>Moduli</span>
        </button>
      </nav>
    </>
  )
}
