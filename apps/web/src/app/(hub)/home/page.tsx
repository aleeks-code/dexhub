'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useMe } from '@/core/hooks/use-me'
import { useVisibleModules } from '@/core/hooks/use-modules'
import { useAppStore } from '@/core/store/app.store'
import { useT } from '@/i18n'
import { moduleRegistry } from '@/core/registry/module-registry'
import { resolveModuleIcon } from '@/core/utils/module-icons'
import { LazyMount } from './_components/lazy-mount'
import { WidgetErrorBoundary } from './_components/widget-error-boundary'
import { NeutralBody } from './_components/neutral-body'
import { ModuleCard } from './_components/module-card'
import { DailyFocus } from './_components/daily-focus'
import { FinancialSynergyBanner } from './_components/financial-synergy'

const sans = 'var(--font-geist-sans), sans-serif'
const mono = 'var(--font-geist-mono), monospace'

function greetingFor(hour: number, t: ReturnType<typeof useT>): string {
  if (hour < 6) return t.dashboard.greetingNight
  if (hour < 12) return t.dashboard.greetingMorning
  if (hour < 18) return t.dashboard.greetingAfternoon
  return t.dashboard.greetingEvening
}

function timeString(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export default function HomePage() {
  // ponytail: null until mount avoids SSR/client clock hydration mismatch — presentational only.
  const [now, setNow] = useState<Date | null>(null)
  const t = useT()
  const lang = useAppStore((st) => st.language)
  const { data: me } = useMe()
  const { data: modules, isLoading: modulesLoading } = useVisibleModules()

  useEffect(() => {
    setNow(new Date())
    const id = setInterval(() => setNow(new Date()), 30_000)
    return () => clearInterval(id)
  }, [])

  const dateFormatter = new Intl.DateTimeFormat(lang === 'it' ? 'it-IT' : 'en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
  const dateLabel = now ? dateFormatter.format(now) : ''
  const timeLabel = now ? timeString(now) : ''
  const greeting = greetingFor(now?.getHours() ?? 12, t)
  const name = me?.name || me?.email.split('@')[0] || ''
  const enabledModules = (modules ?? []).filter((m) => m.enabled)
  const overviewModules = enabledModules.filter((m) => m.inOverview)
  // "Moduli attivi" nel saluto = realmente utilizzabili ora (enabled && non in manutenzione),
  // stessa semantica di prima (useActiveModules) anche se la card resta visibile in manutenzione.
  const moduleCount = enabledModules.filter((m) => !m.maintenance).length

  // ponytail: l'azione rapida è specifica di Notes su una pagina per il resto generalizzata —
  // si mostra solo se quel modulo è davvero raggiungibile, altrimenti sarebbe un link morto.
  const notesReachable = enabledModules.some((m) => m.id === 'notes' && !m.maintenance)

  const moduleCountLabel =
    moduleCount === 1
      ? t.dashboard.activeModulesOne
      : t.dashboard.activeModulesOther.replace('{n}', String(moduleCount))

  const ordered = [...overviewModules].sort((a, b) => {
    const oa = (a.manifest.navOrder as number | undefined) ?? Infinity
    const ob = (b.manifest.navOrder as number | undefined) ?? Infinity
    if (oa !== ob) return oa - ob
    return a.name.localeCompare(b.name)
  })

  return (
    <div
      style={
        {
          '--font-manrope': 'var(--font-geist-sans), system-ui, sans-serif',
          '--font-jetbrains-mono': 'var(--font-geist-mono), monospace',
          margin: '-1.5rem',
          padding: '58px 40px 40px',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100vh',
        } as React.CSSProperties
      }
    >
      <style>{`
        @keyframes dh-fadeup { from { opacity: 0; transform: translateY(8px) } to { opacity: 1; transform: none } }
        @keyframes dh-pulse { 0%, 100% { opacity: 1 } 50% { opacity: .35 } }
        .dh-card { animation: dh-fadeup .5s ease backwards; transition: transform .18s, border-color .18s, box-shadow .18s; }
        .dh-card:hover { transform: translateY(-2px); border-color: rgb(var(--home-accent) / .32); box-shadow: var(--home-card-shadow); }
        .dh-card-interactive { cursor: pointer; }
        .dh-card-interactive:hover .dh-card-title { color: rgb(var(--home-accent)); }
        .dh-card-interactive:hover .dh-card-icon { color: rgb(var(--home-accent)); }
        .dh-card-interactive:hover .dh-card-arrow { opacity: 1 !important; transform: translate(2px, -2px) !important; color: rgb(var(--home-accent)) !important; }
        .dh-qa:hover { color: var(--primary) !important; }
        .dh-catalog:hover { border-color: rgb(var(--home-accent) / .35); background: rgb(var(--home-accent) / .04); color: var(--primary) !important; }
        .dh-pulse-dot { animation: dh-pulse 2s ease-in-out infinite; }
        .dh-card-static { animation: dh-fadeup .5s ease backwards; }
      `}</style>

      {/* Header */}
      <span style={{ font: '500 11px var(--font-jetbrains-mono)', letterSpacing: '.12em', textTransform: 'uppercase', color: 'rgb(var(--home-ink) / .35)' }}>
        {dateLabel} · {timeLabel}
      </span>

      <h1 style={{ margin: '26px 0 12px' }}>
        <span style={{ display: 'block', font: '300 26px/1.2 var(--font-manrope)', letterSpacing: '-.01em', color: 'rgb(var(--home-ink) / .42)' }}>
          {greeting},
        </span>
        <span style={{ display: 'block', font: '300 44px/1.12 var(--font-manrope)', letterSpacing: '-.018em', color: 'var(--home-ink-strong)' }}>
          {name}.
        </span>
      </h1>

      <p style={{ font: '400 14.5px/1.6 var(--font-manrope)', color: 'rgb(var(--home-ink) / .48)', margin: 0 }}>
        {t.dashboard.welcomeBack}
        {!modulesLoading && ` ${moduleCountLabel}`}
      </p>

      <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginTop: 20, minHeight: 18 }}>
        {notesReachable && (
        <Link
          href="/notes"
          className="dh-qa"
          style={{ font: '500 12.5px var(--font-manrope)', color: 'rgb(var(--home-ink) / .5)', textDecoration: 'none', transition: 'color .15s' }}
        >
          {t.dashboard.quickAddNote}
        </Link>
        )}
      </div>

      {/* Daily Briefing & Focus */}
      <DailyFocus />

      {/* Financial Synergy Banner */}
      <FinancialSynergyBanner />

      {/* Section label */}
      <div style={{ margin: '58px 0 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
        <span style={{ font: '500 10px var(--font-jetbrains-mono)', letterSpacing: '.16em', textTransform: 'uppercase', color: 'rgb(var(--home-ink) / .32)' }}>
          {t.dashboard.sectionModules}
        </span>
        <span style={{ flex: 1, height: 1, background: 'rgb(var(--home-line) / .05)' }} />
      </div>

      {/* Grid */}
      {ordered.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gridAutoRows: 'minmax(200px, auto)', gap: 14 }}>
          {ordered.map((mod) => {
            const registered = moduleRegistry.get(mod.id)
            const widget = registered?.manifest.widgets?.[0]
            const lifecycle = registered?.manifest.lifecycle ?? 'active'
            const Icon = resolveModuleIcon(mod.manifest.icon as string | undefined)
            const description = mod.manifest.description as string | undefined
            return (
              <ModuleCard
                key={mod.id}
                moduleId={mod.id}
                name={mod.name}
                icon={Icon}
                lifecycle={lifecycle}
                maintenance={mod.maintenance}
                description={description}
                t={t}
              >
                {mod.maintenance ? (
                  <NeutralBody variant="maintenance" t={t} />
                ) : widget ? (
                  <WidgetErrorBoundary fallback={<NeutralBody variant="error" t={t} />}>
                    <LazyMount component={widget.component} size={widget.defaultSize} moduleId={mod.id} />
                  </WidgetErrorBoundary>
                ) : (
                  <NeutralBody variant="no-preview" t={t} />
                )}
              </ModuleCard>
            )
          })}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-border/80 p-8 text-center bg-surface/30 my-2">
          <p className="text-sm font-semibold text-text">Nessun modulo impostato nella Panoramica</p>
          <p className="text-xs text-text-muted mt-1.5 max-w-sm mx-auto leading-relaxed">
            {moduleCount > 0
              ? 'I tuoi moduli sono attivi, ma nessuno di essi è configurato per essere mostrato nella Panoramica. Puoi aggiungerli con lo switch dedicato dal Catalogo Moduli.'
              : 'I moduli sono disattivati di default. Vai nel Catalogo Moduli per attivare quelli che ti servono e decidere se visualizzarli nella Panoramica.'}
          </p>
        </div>
      )}

      {/* Catalog bar */}
      <Link
        href="/modules"
        className="dh-catalog"
        style={{
          marginTop: 14,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          border: '1px dashed rgb(var(--home-line) / .1)',
          borderRadius: 12,
          padding: '14px 20px',
          color: 'rgb(var(--home-ink) / .45)',
          textDecoration: 'none',
          transition: 'border-color .15s, background .15s, color .15s',
        }}
      >
        <span style={{ font: '300 18px var(--font-manrope)' }}>+</span>
        <span style={{ font: '500 13px var(--font-manrope)' }}>{t.dashboard.catalogCta}</span>
        <span style={{ font: '400 11px var(--font-jetbrains-mono)', opacity: 0.6, marginLeft: 'auto' }}>{t.dashboard.catalogHint}</span>
      </Link>

      {/* Footer */}
      <span style={{ marginTop: 'auto', paddingTop: 40, font: '400 10.5px var(--font-jetbrains-mono)', color: 'rgb(var(--home-ink) / .2)' }}>
        DexHub v2.0 · Sistema Modulare
      </span>
    </div>
  )
}

