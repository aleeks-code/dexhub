'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { CSSProperties, ReactNode } from 'react'
import type { ModuleLifecycle } from '@dexhub/sdk'
import type { useT } from '@/i18n'
import { ModuleBadge } from './module-badge'

interface ModuleCardProps {
  moduleId: string
  href?: string
  name: string
  description?: string
  icon: LucideIcon
  lifecycle: ModuleLifecycle
  maintenance?: boolean
  t: ReturnType<typeof useT>
  children: ReactNode
}

// Stili nati come copia da page.tsx quando la Home aveva ancora 3 card mock: quelle sono state
// rimosse il 07-20, quindi qui vive ora l'unica definizione. Colori via token --home-* (globals.css).
const cardShell: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  background: 'var(--home-card-bg)',
  border: '1px solid rgb(var(--home-line) / .06)',
  borderRadius: 14,
  boxSizing: 'border-box',
}

const titleStyle: CSSProperties = {
  font: '600 16.5px var(--font-manrope)',
  color: 'var(--home-card-title)',
  margin: '0 0 4px',
  transition: 'color .18s ease',
}

const descStyle: CSSProperties = {
  font: '400 12px/1.55 var(--font-manrope)',
  color: 'rgb(var(--home-ink) / .40)',
  margin: 0,
}

export function ModuleCard({
  moduleId,
  href = `/${moduleId}`,
  name,
  description,
  icon: Icon,
  lifecycle,
  maintenance,
  t,
  children,
}: ModuleCardProps) {
  const router = useRouter()

  const handleCardClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (maintenance) return

    // Non reindirizzare se il click proviene da un elemento interattivo interno (es. pulsanti, checkbox o link del widget)
    const target = e.target as HTMLElement | null
    if (target && target.closest('button, a, input, select, textarea, [role="button"]')) {
      return
    }

    router.push(href)
  }

  return (
    <div
      onClick={handleCardClick}
      className={`dh-card ${maintenance ? 'cursor-not-allowed opacity-80' : 'dh-card-interactive'}`}
      style={{
        animationDelay: '.30s',
        padding: 22,
        ...cardShell,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        {maintenance ? (
          <div style={{ display: 'inline-flex', alignItems: 'center' }}>
            <Icon size={19} style={{ color: 'rgb(var(--home-ink) / .6)' }} />
          </div>
        ) : (
          <Link
            href={href}
            aria-label={name}
            tabIndex={-1}
            style={{ display: 'inline-flex', alignItems: 'center', textDecoration: 'none' }}
          >
            <Icon
              size={19}
              className="dh-card-icon"
              style={{ color: 'rgb(var(--home-ink) / .6)', transition: 'color .18s ease' }}
            />
          </Link>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <ModuleBadge state={lifecycle} maintenance={maintenance} t={t} />
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        {maintenance ? (
          <p style={titleStyle}>{name}</p>
        ) : (
          <Link
            href={href}
            style={{
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
            className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
          >
            <span style={titleStyle} className="dh-card-title">
              {name}
            </span>
            <ArrowUpRight
              size={15}
              className="dh-card-arrow"
              style={{
                color: 'rgb(var(--home-ink) / .35)',
                opacity: 0.45,
                transition: 'transform .18s ease, opacity .18s ease, color .18s ease',
              }}
            />
          </Link>
        )}
      </div>

      {description && <p style={descStyle}>{description}</p>}

      <div
        style={{
          marginTop: 12,
          flex: 1,
          borderTop: '1px solid rgb(var(--home-line) / .06)',
          paddingTop: 14,
        }}
      >
        {children}
      </div>
    </div>
  )
}

