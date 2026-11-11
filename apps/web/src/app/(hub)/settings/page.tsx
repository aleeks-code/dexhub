'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import {
  User,
  Palette,
  Compass,
  ShieldCheck,
  Database,
  Moon,
  Sun,
  Monitor,
  KeyRound,
  Trash2,
  HardDrive,
  Download,
  RotateCcw,
  Upload,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Laptop,
  Smartphone,
  Shield,
  Layers,
  Calendar,
  DollarSign,
  Clock,
  LogOut,
  ExternalLink,
  ChevronRight,
  Sliders,
  Check,
  X,
  CreditCard,
  Building2,
  Briefcase,
  CheckSquare,
  FileText,
  LayoutDashboard,
} from 'lucide-react'
import { Button, cn } from '@dexhub/ui'
import {
  useAppStore,
  ACCENT_PALETTES,
  type AccentColor,
  type DensityMode,
  type CurrencyFormat,
  type DateFormat,
  type Language,
  type Theme,
} from '@/core/store/app.store'
import { useMe, useUpdateMe } from '@/core/hooks/use-me'
import { useRegisterPasskey, useMyPasskeys, useDeletePasskey } from '@/core/hooks/use-auth'
import { useT } from '@/i18n'
import { useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'

const API = process.env['NEXT_PUBLIC_API_URL'] ?? ''

type SettingsTab = 'profile' | 'appearance' | 'preferences' | 'security' | 'data'

const AVATAR_PRESETS = [
  { id: 'robot', label: 'Robot', emoji: '🤖', bg: '#064e3b' },
  { id: 'astronaut', label: 'Cosmo', emoji: '🚀', bg: '#1e3a8a' },
  { id: 'dev', label: 'Dev', emoji: '💻', bg: '#312e81' },
  { id: 'finance', label: 'Finanza', emoji: '📈', bg: '#134e4a' },
  { id: 'wizard', label: 'Mago', emoji: '🧙‍♂️', bg: '#4c1d95' },
  { id: 'cat', label: 'Gatto', emoji: '🐱', bg: '#78350f' },
  { id: 'fire', label: 'Fuoco', emoji: '🔥', bg: '#881337' },
  { id: 'shield', label: 'Guardiano', emoji: '🛡️', bg: '#164e63' },
]

function makeSvgAvatar(emoji: string, bgColor: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
    <rect width="100" height="100" rx="50" fill="${bgColor}"/>
    <text x="50" y="62" font-size="52" text-anchor="middle" dominant-baseline="central">${emoji}</text>
  </svg>`
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}

function getClientDeviceInfo(): { os: string; browser: string; isMobile: boolean } {
  if (typeof window === 'undefined') return { os: 'Dispositivo', browser: 'Browser', isMobile: false }
  const ua = navigator.userAgent
  let os = 'Dispositivo'
  if (ua.includes('Win')) os = 'Windows'
  else if (ua.includes('Mac')) os = 'macOS'
  else if (ua.includes('Linux')) os = 'Linux'
  else if (ua.includes('Android')) os = 'Android'
  else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS (Apple)'

  let browser = 'Browser Web'
  if (ua.includes('Edg/')) browser = 'Microsoft Edge'
  else if (ua.includes('Chrome/')) browser = 'Google Chrome'
  else if (ua.includes('Firefox/')) browser = 'Mozilla Firefox'
  else if (ua.includes('Safari/') && !ua.includes('Chrome')) browser = 'Apple Safari'

  const isMobile = /Mobi|Android|iPhone/i.test(ua)
  return { os, browser, isMobile }
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile')
  const t = useT()
  const { data: me, isLoading: meLoading } = useMe()
  const updateMe = useUpdateMe()
  const queryClient = useQueryClient()
  const router = useRouter()

  // App Store values
  const {
    theme,
    setTheme,
    language,
    setLanguage,
    accentColor,
    setAccentColor,
    defaultLandingPage,
    setDefaultLandingPage,
    density,
    setDensity,
    reduceMotion,
    setReduceMotion,
    currency,
    setCurrency,
    dateFormat,
    setDateFormat,
    sidebarCollapsed,
    setSidebarCollapsed,
  } = useAppStore()

  // Passkey hooks
  const registerPasskey = useRegisterPasskey()
  const { data: myPasskeys = [] } = useMyPasskeys()
  const deletePasskey = useDeletePasskey()
  const [passkeyMsg, setPasskeyMsg] = useState<{ ok: boolean; text: string } | null>(null)

  // Profile Form state
  const [name, setName] = useState('')
  const [avatar, setAvatar] = useState<string | null>(null)
  const [profileSaved, setProfileSaved] = useState(false)
  const [avatarUpdating, setAvatarUpdating] = useState(false)

  // System & Export states
  const [cacheCleared, setCacheCleared] = useState(false)
  const [exportSuccess, setExportSuccess] = useState(false)

  const deviceInfo = useMemo(() => getClientDeviceInfo(), [])

  useEffect(() => {
    if (me) {
      setName(me.name)
      setAvatar(me.image ?? null)
    }
  }, [me])

  async function handleProfileSave(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    await updateMe.mutateAsync({ name: name.trim(), image: avatar })
    setProfileSaved(true)
    setTimeout(() => setProfileSaved(false), 2500)
  }

  async function handleSelectPreset(preset: (typeof AVATAR_PRESETS)[0]) {
    setAvatarUpdating(true)
    const svgUrl = makeSvgAvatar(preset.emoji, preset.bg)
    setAvatar(svgUrl)
    try {
      await updateMe.mutateAsync({ image: svgUrl })
    } finally {
      setAvatarUpdating(false)
    }
  }

  async function handleRemoveAvatar() {
    setAvatarUpdating(true)
    setAvatar(null)
    try {
      await updateMe.mutateAsync({ image: null })
    } finally {
      setAvatarUpdating(false)
    }
  }

  function handleAvatarFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 250 * 1024) {
      alert("L'immagine è troppo grande (max 250 KB). Scegli una foto più piccola o usa uno dei preset.")
      return
    }

    const reader = new FileReader()
    reader.onload = async () => {
      const dataUrl = reader.result as string
      setAvatar(dataUrl)
      setAvatarUpdating(true)
      try {
        await updateMe.mutateAsync({ image: dataUrl })
      } finally {
        setAvatarUpdating(false)
      }
    }
    reader.readAsDataURL(file)
  }

  async function handleDeletePasskey(id: string) {
    if (!confirm(t.settings.passkey.confirmDelete)) return
    try {
      await deletePasskey.mutateAsync(id)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t.settings.passkey.deleteFailed
      setPasskeyMsg({ ok: false, text: msg })
      setTimeout(() => setPasskeyMsg(null), 4000)
    }
  }

  async function handleRegisterPasskey() {
    setPasskeyMsg(null)
    try {
      await registerPasskey.mutateAsync()
      setPasskeyMsg({ ok: true, text: t.settings.passkey.success })
      setTimeout(() => setPasskeyMsg(null), 4000)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : ''
      if (msg === 'cancelled') {
        setPasskeyMsg({ ok: false, text: t.settings.passkey.cancelled })
      } else {
        setPasskeyMsg({ ok: false, text: msg || 'Errore durante la registrazione passkey' })
      }
      setTimeout(() => setPasskeyMsg(null), 4000)
    }
  }

  async function handleLogout() {
    await fetch(`${API}/api/v1/auth/logout`, { method: 'POST', credentials: 'include' })
    queryClient.clear()
    router.push('/')
    router.refresh()
  }

  function handleExportPersonalData() {
    try {
      const exportData: Record<string, unknown> = {
        meta: {
          app: 'DexHub',
          version: '2.0',
          exportedAt: new Date().toISOString(),
          title: 'Esportazione Dati Utente DexHub',
        },
        user: {
          id: me?.id,
          name: me?.name,
          email: me?.email,
          isAdmin: me?.isAdmin,
          registeredAt: me?.createdAt,
        },
        preferences: {
          theme,
          accentColor,
          language,
          defaultLandingPage,
          density,
          currency,
          dateFormat,
        },
        localStores: {},
      }

      if (typeof window !== 'undefined') {
        const localObj: Record<string, unknown> = {}
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i)
          if (k && (k.startsWith('dexhub:') || k.startsWith('dexhub-'))) {
            try {
              localObj[k] = JSON.parse(localStorage.getItem(k) ?? 'null')
            } catch {
              localObj[k] = localStorage.getItem(k)
            }
          }
        }
        exportData['localStores'] = localObj
      }

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `dexhub-export-${(me?.name ?? 'user').toLowerCase().replace(/\s+/g, '_')}-${new Date().toISOString().slice(0, 10)}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      setExportSuccess(true)
      setTimeout(() => setExportSuccess(false), 3000)
    } catch (err) {
      console.error('Export failed:', err)
    }
  }

  function handleClearClientCache() {
    if (
      !confirm(
        'Vuoi davvero ripulire la cache locale del browser? Le preferenze salvate verranno ripristinate ai valori predefiniti (i dati sul database rimarranno intatti).',
      )
    )
      return

    try {
      sessionStorage.clear()
      setCacheCleared(true)
      setTimeout(() => setCacheCleared(false), 3000)
    } catch {
      // Ignore
    }
  }

  const tabs: { id: SettingsTab; label: string; icon: React.ElementType }[] = [
    { id: 'profile', label: 'Profilo & Account', icon: User },
    { id: 'appearance', label: 'Aspetto & Colori', icon: Palette },
    { id: 'preferences', label: 'Navigazione & Formati', icon: Compass },
    { id: 'security', label: 'Sicurezza & Passkey', icon: ShieldCheck },
    { id: 'data', label: 'Dati & Privacy', icon: Database },
  ]

  const landingPageOptions = [
    { path: '/home', label: 'Panoramica Hub', desc: 'Riepilogo widget, scadenze e accesso rapido', icon: LayoutDashboard },
    { path: '/loans', label: 'Finanziamenti & Prestiti', desc: 'Ammortamento, rate domiciliate e simulatore', icon: Building2 },
    { path: '/debts', label: 'Prestiti & Debiti', desc: 'Debiti verso persone e tracciamento rimborsi', icon: CreditCard },
    { path: '/worklog', label: 'Worklog & Buste Paga', desc: 'Ore lavorative, stipendio e calcolo netto', icon: Briefcase },
    { path: '/tasks', label: 'Attività & Task', desc: 'Gestione progetti personali e to-do list', icon: CheckSquare },
    { path: '/notes', label: 'Note Personali', desc: 'Appunti rapidi e memo organizzati', icon: FileText },
  ]

  return (
    <div className="mx-auto max-w-3xl space-y-7 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text">{t.settings.title}</h1>
          <p className="mt-1 text-sm text-text-muted">{t.settings.subtitle}</p>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="self-start sm:self-auto inline-flex items-center gap-1.5 rounded-xl border border-error/30 bg-error/10 px-3.5 py-1.5 text-xs font-semibold text-error hover:bg-error/20 transition-colors cursor-pointer"
        >
          <LogOut className="h-3.5 w-3.5" />
          <span>{t.sidebar.logout}</span>
        </button>
      </div>

      {/* Minimal Underline Tabs Bar (Stile GitHub / Threads) */}
      <div className="border-b border-border/80">
        <nav
          className="flex items-center gap-6 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          aria-label="Tabs Impostazioni"
        >
          {tabs.map(({ id, label, icon: Icon }) => {
            const isActive = activeTab === id
            return (
              <button
                key={id}
                type="button"
                onClick={() => setActiveTab(id)}
                className={cn(
                  'group relative flex items-center gap-2 pb-3.5 pt-1 text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer',
                  isActive ? 'text-primary font-bold' : 'text-text-muted hover:text-text',
                )}
              >
                <Icon
                  className={cn(
                    'h-4 w-4 shrink-0 transition-transform group-hover:scale-110',
                    isActive ? 'text-primary' : 'text-text-subtle group-hover:text-text-muted',
                  )}
                />
                <span>{label}</span>

                {/* Active Indicator Underline */}
                {isActive && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-primary" />
                )}
              </button>
            )
          })}
        </nav>
      </div>

      {/* TAB 1: PROFILO & ACCOUNT */}
      {activeTab === 'profile' && (
        <div className="space-y-6">
          {/* Avatar & Identità */}
          <section className="rounded-2xl border border-border bg-surface p-6 space-y-6">
            <div>
              <h2 className="text-sm font-bold text-text">Foto Profilo & Avatar</h2>
              <p className="text-xs text-text-muted mt-0.5">
                Scegli un avatar personalizzato o carica una foto dal tuo dispositivo.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-6">
              {/* Avatar Preview */}
              <div className="relative group shrink-0">
                <div className="h-24 w-24 rounded-full border-2 border-primary/40 bg-surface-raised flex items-center justify-center overflow-hidden shadow-inner">
                  {avatar ? (
                    <img src={avatar} alt="Avatar" className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-3xl font-extrabold text-primary">
                      {(name.charAt(0) || me?.name?.charAt(0) || 'U').toUpperCase()}
                    </span>
                  )}
                </div>
                {avatar && (
                  <button
                    type="button"
                    onClick={handleRemoveAvatar}
                    title="Rimuovi avatar"
                    className="absolute -top-1 -right-1 h-6 w-6 rounded-full bg-surface-raised border border-border text-text-muted hover:text-error flex items-center justify-center shadow-sm"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {/* Upload & Presets */}
              <div className="flex-1 space-y-3 w-full">
                <div className="flex flex-wrap items-center gap-2">
                  <label className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface-raised px-3 py-1.5 text-xs font-medium text-text hover:bg-surface cursor-pointer transition-colors shadow-xs">
                    <Upload className="h-3.5 w-3.5 text-primary" />
                    <span>Carica foto (PNG, JPG, WebP)</span>
                    <input
                      type="file"
                      accept="image/png, image/jpeg, image/webp"
                      onChange={handleAvatarFileUpload}
                      className="hidden"
                    />
                  </label>
                  {avatar && (
                    <button
                      type="button"
                      onClick={handleRemoveAvatar}
                      className="rounded-xl border border-border px-3 py-1.5 text-xs text-text-subtle hover:text-error hover:bg-error-muted/20 transition-colors"
                    >
                      Ripristina iniziale
                    </button>
                  )}
                </div>

                {/* Preset Avatars */}
                <div>
                  <span className="text-[11px] font-semibold text-text-subtle block mb-2">
                    Oppure scegli un preset DexHub:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {AVATAR_PRESETS.map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => handleSelectPreset(preset)}
                        className="h-9 w-9 rounded-full border border-border/80 bg-surface-raised hover:scale-110 hover:border-primary transition-all flex items-center justify-center text-base shadow-xs"
                        title={preset.label}
                      >
                        {preset.emoji}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Dati Profilo */}
          <section className="rounded-2xl border border-border bg-surface p-6 space-y-4">
            <h2 className="text-sm font-bold text-text">Dettagli Utente</h2>

            {meLoading ? (
              <div className="space-y-3">
                <div className="h-4 w-28 animate-pulse rounded bg-surface-raised" />
                <div className="h-9 animate-pulse rounded-md bg-surface-raised" />
              </div>
            ) : (
              <form onSubmit={handleProfileSave} className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-text">
                    {t.settings.profile.nameLabel}
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    placeholder="es. Mario Rossi"
                    className="w-full rounded-xl border border-border bg-bg px-3.5 py-2 text-sm text-text placeholder:text-text-subtle focus:outline-none focus:ring-2 focus:ring-primary/60"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-text">
                    {t.settings.profile.emailLabel}
                  </label>
                  <div className="flex items-center justify-between rounded-xl border border-border bg-surface-raised px-3.5 py-2 text-sm text-text-muted">
                    <span>{me?.email}</span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-400">
                      <Check className="h-3 w-3" /> Verificata
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-1">
                  <Button
                    type="submit"
                    disabled={updateMe.isPending || !name.trim()}
                    className="text-xs font-semibold gap-1.5"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {updateMe.isPending ? t.settings.profile.saving : t.settings.profile.save}
                  </Button>
                  {profileSaved && (
                    <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1">
                      <Check className="h-3.5 w-3.5" /> Modifiche salvate con successo!
                    </span>
                  )}
                  {updateMe.isError && (
                    <span className="text-xs text-error">{updateMe.error?.message}</span>
                  )}
                </div>
              </form>
            )}
          </section>

          {/* Account Meta & Ruolo */}
          <section className="rounded-2xl border border-border bg-surface p-6">
            <h2 className="text-sm font-bold text-text mb-4">Informazioni Account</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-xl border border-border/70 bg-surface-raised p-3.5">
                <span className="text-[11px] font-medium text-text-subtle">Ruolo Sistema</span>
                <p className="text-sm font-bold text-text mt-1 flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  {me?.isAdmin ? 'Amministratore' : 'Utente Standard'}
                </p>
              </div>

              <div className="rounded-xl border border-border/70 bg-surface-raised p-3.5">
                <span className="text-[11px] font-medium text-text-subtle">Data Iscrizione</span>
                <p className="text-sm font-bold text-text mt-1 flex items-center gap-1.5">
                  <Calendar className="h-4 w-4 text-text-muted" />
                  {me?.createdAt
                    ? new Date(me.createdAt).toLocaleDateString('it-IT', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })
                    : 'Recente'}
                </p>
              </div>

              <div className="rounded-xl border border-border/70 bg-surface-raised p-3.5">
                <span className="text-[11px] font-medium text-text-subtle">Stato Account</span>
                <p className="text-sm font-bold text-emerald-400 mt-1 flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4" />
                  Attivo & Protetto
                </p>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* TAB 2: ASPETTO & COLORI */}
      {activeTab === 'appearance' && (
        <div className="space-y-6">
          {/* Modalità Tema */}
          <section className="space-y-4 rounded-2xl border border-border bg-surface p-6">
            <div>
              <h2 className="text-sm font-bold text-text">{t.settings.appearance.title}</h2>
              <p className="text-xs text-text-muted mt-0.5">{t.settings.appearance.desc}</p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {[
                { value: 'dark' as Theme, label: t.settings.appearance.dark, icon: Moon },
                { value: 'light' as Theme, label: t.settings.appearance.light, icon: Sun },
                { value: 'system' as Theme, label: t.settings.appearance.system, icon: Monitor },
              ].map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setTheme(value)}
                  className={cn(
                    'flex flex-col items-center gap-2 rounded-xl border p-4 text-xs font-semibold transition-all cursor-pointer',
                    theme === value
                      ? 'border-primary bg-primary-muted text-primary shadow-xs'
                      : 'border-border bg-surface-raised text-text-muted hover:border-border-strong hover:text-text',
                  )}
                >
                  <Icon className="h-5 w-5" />
                  {label}
                </button>
              ))}
            </div>
          </section>

          {/* Colori Primari / Accento */}
          <section className="space-y-4 rounded-2xl border border-border bg-surface p-6">
            <div>
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-bold text-text">Colore d'Accento DexHub</h2>
              </div>
              <p className="text-xs text-text-muted mt-0.5">
                Personalizza la tonalità dominante dell'interfaccia, dei pulsanti e degli indicatori attivi.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {(Object.entries(ACCENT_PALETTES) as [AccentColor, (typeof ACCENT_PALETTES)[AccentColor]][]).map(
                ([key, palette]) => {
                  const isSelected = accentColor === key
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setAccentColor(key)}
                      className={cn(
                        'flex items-center gap-3 rounded-xl border p-3 text-xs font-semibold transition-all cursor-pointer text-left',
                        isSelected
                          ? 'border-primary bg-surface-raised text-text shadow-sm'
                          : 'border-border bg-surface-raised/50 text-text-muted hover:border-border-strong hover:text-text',
                      )}
                    >
                      <span
                        className="h-5 w-5 rounded-full shrink-0 shadow-inner flex items-center justify-center text-white"
                        style={{ backgroundColor: palette.color }}
                      >
                        {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-xs font-bold text-text">{palette.name}</p>
                      </div>
                    </button>
                  )
                },
              )}
            </div>
          </section>

          {/* Densità Interfaccia */}
          <section className="space-y-4 rounded-2xl border border-border bg-surface p-6">
            <div>
              <h2 className="text-sm font-bold text-text">Densità Interfaccia</h2>
              <p className="text-xs text-text-muted mt-0.5">
                Regola la spaziatura degli elementi per visualizzare più dati o avere una navigazione più ariosa.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setDensity('comfortable')}
                className={cn(
                  'flex flex-col items-start gap-1.5 rounded-xl border p-4 text-left transition-all cursor-pointer',
                  density === 'comfortable'
                    ? 'border-primary bg-primary-muted text-primary shadow-xs'
                    : 'border-border bg-surface-raised text-text-muted hover:border-border-strong hover:text-text',
                )}
              >
                <span className="text-xs font-bold">Confortevole (Predefinita)</span>
                <span className="text-[11px] text-text-subtle">
                  Spaziature ampie, ottimale per la lettura quotidiana e l'uso da mobile.
                </span>
              </button>

              <button
                type="button"
                onClick={() => setDensity('compact')}
                className={cn(
                  'flex flex-col items-start gap-1.5 rounded-xl border p-4 text-left transition-all cursor-pointer',
                  density === 'compact'
                    ? 'border-primary bg-primary-muted text-primary shadow-xs'
                    : 'border-border bg-surface-raised text-text-muted hover:border-border-strong hover:text-text',
                )}
              >
                <span className="text-xs font-bold">Compatta (Data-Dense)</span>
                <span className="text-[11px] text-text-subtle">
                  Più informazioni a schermo, perfetta per tabelle di ammortamento e buste paga.
                </span>
              </button>
            </div>
          </section>

          {/* Movimento Ridotto / Animazioni */}
          <section className="rounded-2xl border border-border bg-surface p-6 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-sm font-bold text-text">Riduci Movimento & Animazioni</h2>
              <p className="text-xs text-text-muted mt-0.5">
                Disattiva le transizioni animate per un'esperienza immediata e a basso consumo energetico.
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={reduceMotion}
              onClick={() => setReduceMotion(!reduceMotion)}
              className={cn(
                'relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors',
                reduceMotion ? 'bg-primary' : 'bg-surface-raised border border-border',
              )}
            >
              <span
                className={cn(
                  'inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform',
                  reduceMotion ? 'translate-x-6' : 'translate-x-1',
                )}
              />
            </button>
          </section>
        </div>
      )}

      {/* TAB 3: NAVIGAZIONE & FORMATI */}
      {activeTab === 'preferences' && (
        <div className="space-y-6">
          {/* Pagina Iniziale Predefinita */}
          <section className="space-y-4 rounded-2xl border border-border bg-surface p-6">
            <div>
              <h2 className="text-sm font-bold text-text">Pagina Iniziale Predefinita</h2>
              <p className="text-xs text-text-muted mt-0.5">
                Scegli quale modulo o sezione aprire automaticamente quando avvii DexHub o clicchi sul logo.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {landingPageOptions.map(({ path, label, desc, icon: Icon }) => {
                const isSelected = defaultLandingPage === path
                return (
                  <button
                    key={path}
                    type="button"
                    onClick={() => setDefaultLandingPage(path)}
                    className={cn(
                      'flex items-start gap-3 rounded-xl border p-3.5 text-left transition-all cursor-pointer',
                      isSelected
                        ? 'border-primary bg-primary-muted text-text shadow-xs'
                        : 'border-border bg-surface-raised text-text-muted hover:border-border-strong hover:text-text',
                    )}
                  >
                    <Icon className={cn('h-5 w-5 shrink-0 mt-0.5', isSelected ? 'text-primary' : 'text-text-subtle')} />
                    <div className="min-w-0">
                      <p className={cn('text-xs font-bold', isSelected ? 'text-primary' : 'text-text')}>
                        {label}
                      </p>
                      <p className="text-[11px] text-text-subtle mt-0.5 line-clamp-1">{desc}</p>
                    </div>
                  </button>
                )
              })}
            </div>
          </section>

          {/* Barra Laterale Predefinita */}
          <section className="rounded-2xl border border-border bg-surface p-6 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-sm font-bold text-text">Barra Laterale Ridotta</h2>
              <p className="text-xs text-text-muted mt-0.5">
                Mantieni la barra laterale minimizzata a icone per massimizzare lo spazio di lavoro.
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={sidebarCollapsed}
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className={cn(
                'relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors',
                sidebarCollapsed ? 'bg-primary' : 'bg-surface-raised border border-border',
              )}
            >
              <span
                className={cn(
                  'inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform',
                  sidebarCollapsed ? 'translate-x-6' : 'translate-x-1',
                )}
              />
            </button>
          </section>

          {/* Formati Regionali & Valuta */}
          <section className="space-y-4 rounded-2xl border border-border bg-surface p-6">
            <h2 className="text-sm font-bold text-text">Formati Regionali</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-text mb-1.5 block">Valuta Predefinita</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { code: 'EUR' as CurrencyFormat, label: '€ Euro (EUR)' },
                    { code: 'USD' as CurrencyFormat, label: '$ Dollaro (USD)' },
                    { code: 'GBP' as CurrencyFormat, label: '£ Sterlina (GBP)' },
                    { code: 'CHF' as CurrencyFormat, label: 'CHF Franco (CHF)' },
                  ].map(({ code, label }) => (
                    <button
                      key={code}
                      type="button"
                      onClick={() => setCurrency(code)}
                      className={cn(
                        'rounded-xl border px-3 py-2 text-xs font-semibold transition-all cursor-pointer text-center',
                        currency === code
                          ? 'border-primary bg-primary-muted text-primary shadow-xs'
                          : 'border-border bg-surface-raised text-text-muted hover:border-border-strong hover:text-text',
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-text mb-1.5 block">Formato Data</label>
                <div className="grid grid-cols-1 gap-2">
                  {[
                    { code: 'DD/MM/YYYY' as DateFormat, label: 'GG/MM/AAAA (es. 10/11/2026 - Standard IT)' },
                    { code: 'YYYY-MM-DD' as DateFormat, label: 'AAAA-MM-GG (es. 2026-11-10 - ISO)' },
                  ].map(({ code, label }) => (
                    <button
                      key={code}
                      type="button"
                      onClick={() => setDateFormat(code)}
                      className={cn(
                        'rounded-xl border px-3 py-2 text-xs font-semibold transition-all cursor-pointer text-left',
                        dateFormat === code
                          ? 'border-primary bg-primary-muted text-primary shadow-xs'
                          : 'border-border bg-surface-raised text-text-muted hover:border-border-strong hover:text-text',
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Lingua Interfaccia */}
          <section className="space-y-4 rounded-2xl border border-border bg-surface p-6">
            <div>
              <h2 className="text-sm font-bold text-text">{t.settings.language.title}</h2>
              <p className="text-xs text-text-muted mt-0.5">{t.settings.language.desc}</p>
            </div>

            <div className="flex gap-3">
              {[
                { value: 'it' as Language, label: 'Italiano (IT)' },
                { value: 'en' as Language, label: 'English (EN)' },
              ].map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setLanguage(value)}
                  className={cn(
                    'flex flex-1 items-center justify-center rounded-xl border px-4 py-2.5 text-xs font-bold transition-all cursor-pointer',
                    language === value
                      ? 'border-primary bg-primary-muted text-primary shadow-xs'
                      : 'border-border bg-surface-raised text-text-muted hover:border-border-strong hover:text-text',
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </section>
        </div>
      )}

      {/* TAB 4: SICUREZZA & PASSKEY */}
      {activeTab === 'security' && (
        <div className="space-y-6">
          {/* Sessione Corrente */}
          <section className="rounded-2xl border border-border bg-surface p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-text">Sessione Corrente</h2>
                <p className="text-xs text-text-muted mt-0.5">
                  Dispositivo e browser attualmente in uso per accedere a DexHub.
                </p>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2.5 py-1 text-[11px] font-bold text-emerald-400">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                Attiva ora
              </span>
            </div>

            <div className="rounded-xl border border-border/80 bg-surface-raised p-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-surface border border-border/60 flex items-center justify-center text-primary">
                  {deviceInfo.isMobile ? <Smartphone className="h-5 w-5" /> : <Laptop className="h-5 w-5" />}
                </div>
                <div>
                  <p className="text-xs font-bold text-text">
                    {deviceInfo.browser} su {deviceInfo.os}
                  </p>
                  <p className="text-[11px] text-text-subtle mt-0.5">
                    Connessione sicura HTTPS protetta da credenziali WebAuthn
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleLogout}
                className="rounded-xl border border-border px-3 py-1.5 text-xs font-medium text-text-muted hover:bg-error-muted/20 hover:text-error transition-colors flex items-center gap-1.5"
              >
                <LogOut className="h-3.5 w-3.5" />
                Disconnetti
              </button>
            </div>
          </section>

          {/* Passkey WebAuthn */}
          <section className="space-y-4 rounded-2xl border border-border bg-surface p-6">
            <div>
              <h2 className="text-sm font-bold text-text">{t.settings.passkey.title}</h2>
              <p className="text-xs text-text-muted mt-0.5">{t.settings.passkey.desc}</p>
            </div>

            {myPasskeys.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-text">{t.settings.passkey.yourPasskeys}</p>
                {myPasskeys.map((pk) => (
                  <div
                    key={pk.id}
                    className="flex items-center justify-between rounded-xl border border-border/80 bg-surface-raised px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-surface flex items-center justify-center text-primary border border-border/50">
                        <KeyRound className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-text">{pk.name ?? pk.deviceType ?? 'Chiave FIDO2'}</p>
                        <p className="text-[11px] text-text-subtle">
                          {pk.deviceType} · Creata il{' '}
                          {new Date(pk.createdAt).toLocaleDateString('it-IT', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                          })}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleDeletePasskey(pk.id)}
                      disabled={deletePasskey.isPending}
                      title={t.settings.passkey.delete}
                      className="rounded-lg p-2 text-text-subtle transition-colors hover:bg-error-muted hover:text-error disabled:opacity-50 cursor-pointer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center gap-3 pt-2">
              <Button
                type="button"
                onClick={handleRegisterPasskey}
                disabled={registerPasskey.isPending}
                className="text-xs font-semibold gap-1.5"
              >
                <KeyRound className="h-3.5 w-3.5" />
                {registerPasskey.isPending ? t.settings.passkey.registering : t.settings.passkey.register}
              </Button>
              {passkeyMsg && (
                <span
                  className={cn(
                    'text-xs font-medium',
                    passkeyMsg.ok ? 'text-emerald-400' : 'text-error',
                  )}
                >
                  {passkeyMsg.text}
                </span>
              )}
            </div>
          </section>

          {/* Accesso di Emergenza */}
          <section className="rounded-2xl border border-border bg-surface p-6 space-y-2">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-bold text-text">Accesso di Emergenza</h2>
            </div>
            <p className="text-xs text-text-muted leading-relaxed">
              In caso di smarrimento del dispositivo o dell'autenticatore hardware, DexHub supporta il login di
              emergenza tramite codice monouso crittografato (Recovery Code). Se hai bisogno di reimpostare l'accesso,
              puoi accedere alla schermata di recupero o contattare l'amministratore dell'istanza.
            </p>
          </section>
        </div>
      )}

      {/* TAB 5: DATI & PRIVACY */}
      {activeTab === 'data' && (
        <div className="space-y-6">
          {/* Esportazione Archivio Personale */}
          <section className="space-y-4 rounded-2xl border border-border bg-surface p-6">
            <div>
              <div className="flex items-center gap-2">
                <Download className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-bold text-text">Esporta i Tuoi Dati (.JSON)</h2>
              </div>
              <p className="text-xs text-text-muted mt-0.5">
                Scarica una copia completa di tutti i tuoi dati memorizzati (finanziamenti, piani di ammortamento, registro debiti, preferenze).
              </p>
            </div>

            <div className="rounded-xl border border-border/80 bg-surface-raised p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="text-xs font-bold text-text">Archivio Dati Portabile DexHub</p>
                <p className="text-[11px] text-text-subtle mt-0.5">
                  Formato JSON standard leggibile e conservabile in sicurezza offline.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  onClick={handleExportPersonalData}
                  className="text-xs font-semibold gap-1.5"
                >
                  <Download className="h-3.5 w-3.5" />
                  Scarica Archivio JSON
                </Button>
              </div>
            </div>

            {exportSuccess && (
              <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1">
                <Check className="h-3.5 w-3.5" /> File scaricato con successo nella cartella Download!
              </span>
            )}
          </section>

          {/* Backup Completo di Sistema */}
          <section className="space-y-4 rounded-2xl border border-border bg-surface p-6">
            <div>
              <h2 className="text-sm font-bold text-text">{t.settings.backup.title}</h2>
              <p className="text-xs text-text-muted mt-0.5">{t.settings.backup.desc}</p>
            </div>

            <Link
              href="/settings/backup"
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface-raised px-4 py-2.5 text-xs font-bold text-text transition-colors hover:bg-surface hover:border-primary/60"
            >
              <HardDrive className="h-4 w-4 text-primary" />
              {t.settings.backup.manage}
              <ChevronRight className="h-3.5 w-3.5 ml-1 text-text-subtle" />
            </Link>
          </section>

          {/* Pulizia Cache Locale */}
          <section className="rounded-2xl border border-border bg-surface p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-sm font-bold text-text">Cache & Storage Locale</h2>
              <p className="text-xs text-text-muted mt-0.5">
                Ripulisci lo storage temporaneo del browser se noti disallineamenti nell'interfaccia.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleClearClientCache}
                className="text-xs font-medium gap-1.5"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Ripristina Cache Locale
              </Button>
              {cacheCleared && (
                <span className="text-xs font-semibold text-emerald-400">Cache pulita!</span>
              )}
            </div>
          </section>

          {/* Cookie & Informativa Privacy */}
          <section className="rounded-2xl border border-border bg-surface p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-bold text-text">Informativa Cookie & Privacy (GDPR)</h2>
              </div>
              <p className="text-xs text-text-muted mt-0.5">
                DexHub utilizza esclusivamente cookie tecnici essenziali e storage locale per il funzionamento della piattaforma. Zero cookie di profilazione o tracciamento pubblicitario.
              </p>
            </div>

            <Link
              href="/cookie-policy"
              className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-surface-raised px-4 py-2.5 text-xs font-semibold text-text hover:bg-surface hover:border-primary/60 transition-colors shrink-0"
            >
              Informativa Privacy & Cookie
              <ChevronRight className="h-3.5 w-3.5 text-text-subtle" />
            </Link>
          </section>
        </div>
      )}
    </div>
  )
}
