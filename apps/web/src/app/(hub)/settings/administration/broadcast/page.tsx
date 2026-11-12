'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  AlertTriangle,
  ArrowLeft,
  Bell,
  CheckCircle2,
  Info,
  Megaphone,
  RefreshCw,
  Save,
  X,
} from 'lucide-react'
import { Button, cn } from '@dexhub/ui'
import { useT } from '@/i18n'
import {
  useBroadcastConfig,
  useUpdateBroadcastConfig,
  type BroadcastBannerConfig,
} from '@/core/hooks/use-admin'

const PREVIEW_STYLES = {
  info: 'bg-primary/10 border-primary/20 text-text border',
  warning: 'bg-yellow-500/15 border-yellow-500/30 text-yellow-200 border',
  alert: 'bg-rose-500/15 border-rose-500/30 text-rose-200 border',
  success: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-200 border',
}

const PREVIEW_ICONS = {
  info: Info,
  warning: AlertTriangle,
  alert: AlertTriangle,
  success: CheckCircle2,
}

export default function BroadcastPage() {
  const t = useT()
  const tb = t.admin.broadcast

  const { data: config, isLoading } = useBroadcastConfig()
  const updateConfig = useUpdateBroadcastConfig()

  const [enabled, setEnabled] = useState(false)
  const [message, setMessage] = useState('')
  const [type, setType] = useState<'info' | 'warning' | 'alert' | 'success'>('info')
  const [dismissible, setDismissible] = useState(true)
  const [successBanner, setSuccessBanner] = useState<string | null>(null)

  useEffect(() => {
    if (config) {
      setEnabled(config.enabled)
      setMessage(config.message || '')
      setType(config.type || 'info')
      setDismissible(config.dismissible ?? true)
    }
  }, [config])

  const handleSave = () => {
    updateConfig.mutate(
      {
        enabled,
        message,
        type,
        dismissible,
      },
      {
        onSuccess: () => {
          setSuccessBanner(tb.saved)
          setTimeout(() => setSuccessBanner(null), 3000)
        },
      },
    )
  }

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-text-muted">
        <RefreshCw className="mr-2 h-4 w-4 animate-spin text-primary" />
        Caricamento impostazioni broadcast…
      </div>
    )
  }

  const PreviewIcon = PREVIEW_ICONS[type] || Bell

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/settings/administration"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-text-muted transition-colors hover:text-text mb-3"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {t.admin.back}
        </Link>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-text flex items-center gap-2.5">
              <Megaphone className="h-6 w-6 text-primary" />
              {tb.title}
            </h1>
            <p className="mt-1 text-sm text-text-muted">{tb.subtitle}</p>
          </div>
        </div>
      </div>

      {/* Success Notification */}
      {successBanner && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-xs text-emerald-300">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
          <span>{successBanner}</span>
        </div>
      )}

      {/* Configuration Card */}
      <section className="space-y-5 rounded-xl border border-border bg-surface p-6">
        {/* Toggle Switch */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-text">{tb.enableSwitch}</p>
            <p className="text-xs text-text-muted">{tb.enableDesc}</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={enabled}
            onClick={() => setEnabled(!enabled)}
            className={cn(
              'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none',
              enabled ? 'bg-primary' : 'bg-surface-raised',
            )}
          >
            <span
              className={cn(
                'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out',
                enabled ? 'translate-x-5' : 'translate-x-0',
              )}
            />
          </button>
        </div>

        {/* Message Input */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-text">{tb.messageLabel}</label>
          <textarea
            rows={3}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={tb.messagePlaceholder}
            className="w-full rounded-lg border border-border bg-surface-raised p-3 text-xs text-text placeholder-text-muted focus:border-primary focus:outline-none leading-relaxed"
          />
        </div>

        {/* Type Selector */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-text">{tb.typeLabel}</label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <button
              type="button"
              onClick={() => setType('info')}
              className={cn(
                'rounded-lg border p-2.5 text-xs font-medium transition-colors text-center',
                type === 'info'
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border bg-surface-raised text-text-muted hover:text-text',
              )}
            >
              Informativo
            </button>
            <button
              type="button"
              onClick={() => setType('warning')}
              className={cn(
                'rounded-lg border p-2.5 text-xs font-medium transition-colors text-center',
                type === 'warning'
                  ? 'border-yellow-500 bg-yellow-500/10 text-yellow-300'
                  : 'border-border bg-surface-raised text-text-muted hover:text-text',
              )}
            >
              Attenzione
            </button>
            <button
              type="button"
              onClick={() => setType('alert')}
              className={cn(
                'rounded-lg border p-2.5 text-xs font-medium transition-colors text-center',
                type === 'alert'
                  ? 'border-rose-500 bg-rose-500/10 text-rose-300'
                  : 'border-border bg-surface-raised text-text-muted hover:text-text',
              )}
            >
              Emergenza
            </button>
            <button
              type="button"
              onClick={() => setType('success')}
              className={cn(
                'rounded-lg border p-2.5 text-xs font-medium transition-colors text-center',
                type === 'success'
                  ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300'
                  : 'border-border bg-surface-raised text-text-muted hover:text-text',
              )}
            >
              Successo
            </button>
          </div>
        </div>

        {/* Dismissible Checkbox */}
        <div className="flex items-center gap-2 pt-1">
          <input
            type="checkbox"
            id="dismissible"
            checked={dismissible}
            onChange={(e) => setDismissible(e.target.checked)}
            className="h-4 w-4 rounded border-border bg-surface-raised text-primary focus:ring-0"
          />
          <label htmlFor="dismissible" className="text-xs text-text select-none cursor-pointer">
            {tb.dismissibleLabel}
          </label>
        </div>

        {/* Live Preview Card */}
        <div className="space-y-2 pt-2 border-t border-border">
          <span className="text-xs font-semibold text-text-muted">{tb.previewTitle}</span>
          <div
            className={cn(
              'rounded-xl p-3 text-xs font-medium flex items-center justify-between gap-3',
              PREVIEW_STYLES[type],
            )}
          >
            <div className="flex items-center gap-2.5">
              <PreviewIcon className="h-4 w-4 shrink-0" />
              <span>{message.trim() || 'Il tuo messaggio di avviso apparirà qui…'}</span>
            </div>
            {dismissible && (
              <span className="rounded p-1 opacity-70">
                <X className="h-3.5 w-3.5" />
              </span>
            )}
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-2">
          <Button
            onClick={handleSave}
            disabled={updateConfig.isPending}
            className="w-full flex items-center justify-center gap-2 text-xs"
          >
            {updateConfig.isPending ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {updateConfig.isPending ? tb.saving : tb.save}
          </Button>
        </div>
      </section>
    </div>
  )
}
