'use client'

import { useState } from 'react'
import { CalendarDays, Plus } from 'lucide-react'
import { cn } from '@dexhub/ui'
import type { TaskPriority } from '../api/tasks-client'
import type { Translations } from '../i18n'

const PRIO_ACTIVE: Record<'bassa' | 'media' | 'alta', string> = {
  bassa: 'border-success bg-success/15 text-success',
  media: 'border-warning bg-warning/15 text-warning',
  alta: 'border-error bg-error/15 text-error',
}

function todayInput(): string {
  const d = new Date()
  // Non toISOString(): quello passa per UTC e in Italia di sera darebbe il giorno dopo.
  const m = `${d.getMonth() + 1}`.padStart(2, '0')
  const day = `${d.getDate()}`.padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

export function QuickAddBar({
  t,
  shared,
  disabled,
  onAdd,
}: {
  t: Translations
  shared: boolean
  disabled?: boolean
  onAdd: (input: { title: string; dueDate: string; priority: TaskPriority }) => void
}) {
  const [title, setTitle] = useState('')
  const [date, setDate] = useState(todayInput)
  const [prio, setPrio] = useState<'bassa' | 'media' | 'alta'>('media')

  function submit() {
    const clean = title.trim()
    if (!clean || disabled) return
    onAdd({ title: clean, dueDate: date, priority: prio })
    setTitle('')
    setPrio('media')
    setDate(todayInput())
  }

  const prios: Array<{ id: 'bassa' | 'media' | 'alta'; label: string }> = [
    { id: 'bassa', label: t.prioLow },
    { id: 'media', label: t.prioMedium },
    { id: 'alta', label: t.prioHigh },
  ]

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-overlay-subtle px-3 py-2.5">
      <Plus className="h-4 w-4 shrink-0 text-primary" />

      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && submit()}
        disabled={disabled}
        placeholder={shared ? t.quickAddShared : t.quickAddPersonal}
        className="min-w-[160px] flex-1 bg-transparent text-sm text-text placeholder:text-text-subtle focus:outline-none disabled:opacity-50"
      />

      <label className="flex shrink-0 items-center gap-1.5 rounded-md border border-border bg-bg px-2 py-1">
        <CalendarDays className="h-3.5 w-3.5 text-text-subtle" />
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          disabled={disabled}
          className="bg-transparent font-mono text-xs text-text-muted focus:outline-none"
        />
      </label>

      <span className="hidden h-5 w-px shrink-0 bg-border sm:block" />

      <div className="flex shrink-0 items-center gap-1">
        {prios.map((p) => (
          <button
            key={p.id}
            onClick={() => setPrio(p.id)}
            disabled={disabled}
            className={cn(
              'rounded-full border px-2.5 py-1 text-[11px] transition-colors disabled:opacity-50',
              prio === p.id
                ? PRIO_ACTIVE[p.id]
                : 'border-border text-text-subtle hover:text-text',
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      <button
        onClick={submit}
        disabled={disabled || !title.trim()}
        className="shrink-0 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-40"
      >
        {t.add}
      </button>
    </div>
  )
}
