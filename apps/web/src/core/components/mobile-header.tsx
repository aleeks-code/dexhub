'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Search,
  Sun,
  Moon,
  Settings,
  LogOut,
  Users,
  MessageSquarePlus,
  Sparkles,
  ShieldCheck,
  ChevronRight,
  X,
} from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { NotificationsMenu } from './notifications-menu'
import { useAppStore } from '@/core/store/app.store'
import { useMe } from '@/core/hooks/use-me'
import { useInviteRequests } from '@/core/hooks/use-admin'
import { useT } from '@/i18n'

const API = process.env['NEXT_PUBLIC_API_URL'] ?? ''

export function MobileHeader() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { openCommandPalette, theme, setTheme, defaultLandingPage } = useAppStore()
  const { data: me } = useMe()
  const { data: inviteRequests } = useInviteRequests()
  const t = useT()
  const [accountMenuOpen, setAccountMenuOpen] = useState(false)

  const pendingInvitesCount = me?.isAdmin
    ? (inviteRequests?.filter((r) => r.status === 'pending' && !r.deletedAt).length ?? 0)
    : 0

  async function handleLogout() {
    setAccountMenuOpen(false)
    await fetch(`${API}/api/v1/auth/logout`, { method: 'POST', credentials: 'include' })
    queryClient.clear()
    router.push('/')
    router.refresh()
  }

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
          <div className="relative ml-1">
            <button
              type="button"
              onClick={() => setAccountMenuOpen((v) => !v)}
              className="flex h-7 w-7 items-center justify-center rounded-full bg-primary-muted text-xs font-bold text-primary border border-border/80 overflow-hidden cursor-pointer"
              aria-label="Menu account utente"
              aria-expanded={accountMenuOpen}
            >
              {me.image ? (
                <img src={me.image} alt={me.name} className="h-full w-full object-cover" />
              ) : (
                (me.name?.charAt(0) ?? me.email.charAt(0)).toUpperCase()
              )}
            </button>

            {accountMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-40 bg-black/50 backdrop-blur-xs"
                  onClick={() => setAccountMenuOpen(false)}
                />
                <div
                  role="menu"
                  className="absolute right-0 top-full mt-2 z-50 w-72 max-w-[calc(100vw-2rem)] rounded-2xl border border-border bg-surface p-4 shadow-2xl animate-in fade-in slide-in-from-top-2 duration-150"
                >
                  {/* User Profile Header */}
                  <div className="flex items-center gap-3 pb-3 border-b border-border">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-muted text-sm font-bold text-primary border border-border/80 overflow-hidden">
                      {me.image ? (
                        <img src={me.image} alt={me.name} className="h-full w-full object-cover" />
                      ) : (
                        (me.name?.charAt(0) ?? me.email.charAt(0)).toUpperCase()
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-bold text-text">{me.name || me.email}</p>
                      <p className="truncate text-[11px] text-text-subtle">{me.email}</p>
                      <span className="inline-flex items-center gap-1 rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary mt-1">
                        {me.isAdmin ? 'Amministratore' : 'Utente'}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAccountMenuOpen(false)}
                      className="rounded-full p-1 text-text-subtle hover:bg-surface-raised hover:text-text transition-colors"
                      aria-label="Chiudi"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Menu Items */}
                  <div className="py-2 space-y-0.5">
                    <Link
                      href="/settings"
                      onClick={() => setAccountMenuOpen(false)}
                      className="flex items-center justify-between rounded-xl p-2.5 text-xs font-medium text-text hover:bg-surface-raised transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <Settings className="h-4 w-4 text-primary" />
                        <span>{t.settings.title}</span>
                      </div>
                      <ChevronRight className="h-3.5 w-3.5 text-text-subtle" />
                    </Link>

                    {me.isAdmin && (
                      <Link
                        href="/settings/administration"
                        onClick={() => setAccountMenuOpen(false)}
                        className="flex items-center justify-between rounded-xl p-2.5 text-xs font-medium text-text hover:bg-surface-raised transition-colors"
                      >
                        <div className="flex items-center gap-2.5">
                          <Users className="h-4 w-4 text-primary" />
                          <span>Pannello Amministrazione</span>
                        </div>
                        {pendingInvitesCount > 0 ? (
                          <span className="rounded-full bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-bold text-amber-400">
                            {pendingInvitesCount}
                          </span>
                        ) : (
                          <ChevronRight className="h-3.5 w-3.5 text-text-subtle" />
                        )}
                      </Link>
                    )}

                    <Link
                      href="/changelog"
                      onClick={() => setAccountMenuOpen(false)}
                      className="flex items-center justify-between rounded-xl p-2.5 text-xs font-medium text-text hover:bg-surface-raised transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <Sparkles className="h-4 w-4 text-warning" />
                        <span>Novità & Changelog</span>
                      </div>
                      <ChevronRight className="h-3.5 w-3.5 text-text-subtle" />
                    </Link>

                    <Link
                      href="/feedback"
                      onClick={() => setAccountMenuOpen(false)}
                      className="flex items-center justify-between rounded-xl p-2.5 text-xs font-medium text-text hover:bg-surface-raised transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <MessageSquarePlus className="h-4 w-4 text-text-subtle" />
                        <span>Invia Feedback</span>
                      </div>
                      <ChevronRight className="h-3.5 w-3.5 text-text-subtle" />
                    </Link>

                    <Link
                      href="/cookie-policy"
                      onClick={() => setAccountMenuOpen(false)}
                      className="flex items-center justify-between rounded-xl p-2.5 text-xs font-medium text-text hover:bg-surface-raised transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <ShieldCheck className="h-4 w-4 text-text-subtle" />
                        <span>Privacy & Cookie</span>
                      </div>
                      <ChevronRight className="h-3.5 w-3.5 text-text-subtle" />
                    </Link>
                  </div>

                  {/* Logout Button */}
                  <div className="pt-2 border-t border-border">
                    <button
                      type="button"
                      onClick={() => void handleLogout()}
                      className="flex w-full items-center justify-center gap-2 rounded-xl border border-error/30 bg-error/10 py-2.5 text-xs font-bold text-error hover:bg-error/20 transition-colors cursor-pointer"
                    >
                      <LogOut className="h-4 w-4" />
                      <span>{t.sidebar.logout}</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </header>
  )
}
