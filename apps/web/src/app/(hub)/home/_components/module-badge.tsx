import type { ModuleLifecycle } from '@dexhub/sdk'
import type { useT } from '@/i18n'

const STATE_STYLE: Record<ModuleLifecycle, { text: string; bg: string; dot: 'solid' | 'ring' }> = {
  active: { text: 'text-primary', bg: 'bg-primary-muted', dot: 'solid' },
  beta: { text: 'text-warning', bg: 'bg-warning-muted', dot: 'solid' },
  soon: { text: 'text-text-muted', bg: 'bg-surface-raised', dot: 'ring' },
}

const LABEL_KEY = {
  active: 'badgeActive',
  beta: 'badgeBeta',
  soon: 'badgeSoon',
} as const satisfies Record<ModuleLifecycle, keyof ReturnType<typeof useT>['dashboard']>

export function ModuleBadge({
  state,
  maintenance,
  t,
}: {
  state: ModuleLifecycle
  maintenance?: boolean
  t: ReturnType<typeof useT>
}) {
  // maintenance ha precedenza sul lifecycle: stesso stato operativo mostrato ovunque nell'arco.
  if (maintenance) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 font-mono text-[9.5px] font-medium uppercase tracking-wider text-warning bg-warning-muted">
        <span className="h-1 w-1 rounded-full bg-current" />
        {t.dashboard.badgeMaintenance}
      </span>
    )
  }

  const s = STATE_STYLE[state] ?? STATE_STYLE.active
  const labelKey = LABEL_KEY[state] ?? LABEL_KEY.active
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 font-mono text-[9.5px] font-medium uppercase tracking-wider ${s.text} ${s.bg}`}
    >
      <span
        className={`h-1 w-1 rounded-full ${s.dot === 'solid' ? 'bg-current' : 'border border-current bg-transparent'}`}
      />
      {t.dashboard[labelKey]}
    </span>
  )
}
