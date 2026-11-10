'use client'

import { useEffect, useState } from 'react'
import { AlertTriangle, Bell, CheckCircle2, Info, X } from 'lucide-react'
import { useActiveBroadcast } from '../hooks/use-admin'
import { cn } from '@dexhub/ui'

const ICONS = {
  info: Info,
  warning: AlertTriangle,
  alert: AlertTriangle,
  success: CheckCircle2,
}

const STYLES = {
  info: 'bg-primary/10 border-primary/20 text-text border-b',
  warning: 'bg-amber-500/15 border-amber-500/30 text-amber-200 border-b',
  alert: 'bg-rose-500/15 border-rose-500/30 text-rose-200 border-b',
  success: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-200 border-b',
}

const ICON_STYLES = {
  info: 'text-primary',
  warning: 'text-amber-400',
  alert: 'text-rose-400',
  success: 'text-emerald-400',
}

export function BroadcastBanner() {
  const { data: banner } = useActiveBroadcast()
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (!banner?.updatedAt) return
    const dismissedAt = sessionStorage.getItem(`dismissed_broadcast_${banner.updatedAt}`)
    if (dismissedAt) {
      setDismissed(true)
    } else {
      setDismissed(false)
    }
  }, [banner?.updatedAt])

  if (!banner || !banner.enabled || !banner.message.trim() || dismissed) {
    return null
  }

  const type = banner.type || 'info'
  const Icon = ICONS[type] || Bell

  const handleDismiss = () => {
    if (banner.updatedAt) {
      sessionStorage.setItem(`dismissed_broadcast_${banner.updatedAt}`, 'true')
    }
    setDismissed(true)
  }

  return (
    <aside
      role="alert"
      className={cn(
        'relative z-20 flex items-center justify-between px-4 py-2.5 text-xs sm:text-sm font-medium transition-all',
        STYLES[type],
      )}
    >
      <div className="mx-auto flex max-w-7xl items-center gap-2.5 pr-8 sm:pr-0">
        <Icon className={cn('h-4 w-4 shrink-0', ICON_STYLES[type])} />
        <span>{banner.message}</span>
      </div>
      {banner.dismissible && (
        <button
          onClick={handleDismiss}
          className="rounded p-1 text-text-muted transition-colors hover:bg-surface-raised hover:text-text"
          aria-label="Chiudi avviso"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </aside>
  )
}
