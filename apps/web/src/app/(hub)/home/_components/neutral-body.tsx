import type { useT } from '@/i18n'

export type NeutralVariant = 'soon' | 'no-preview' | 'error' | 'maintenance'

export function NeutralBody({ variant, t }: { variant: NeutralVariant; t: ReturnType<typeof useT> }) {
  const label =
    variant === 'soon' ? t.dashboard.previewSoon
    : variant === 'error' ? t.dashboard.previewError
    : variant === 'maintenance' ? t.dashboard.previewMaintenance
    : t.dashboard.previewNone

  return (
    <div
      className={`flex h-full min-h-16 items-center justify-center rounded-lg border border-dashed border-border text-center text-xs ${variant === 'maintenance' ? 'text-warning' : 'text-text-subtle'}`}
    >
      {label}
    </div>
  )
}
