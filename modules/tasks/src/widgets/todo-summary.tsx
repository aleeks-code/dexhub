'use client'

import Link from 'next/link'
import { Check } from 'lucide-react'
import { cn } from '@dexhub/ui'
import { useSpaces } from '../hooks/use-spaces'
import { useTasks, useCompleteTask, useReopenTask } from '../hooks/use-tasks'
import { useTasksT } from '../i18n'

/**
 * Anteprima in Panoramica (mockup, punto 15). Riflette SEMPRE la lista personale:
 * la dashboard e' una vista privata, i workspace condivisi si aprono dal modulo.
 *
 * Il guscio della card (bordo, icona, titolo) appartiene alla dashboard: qui dentro
 * si disegna solo il contenuto (vedi handoff §3.2).
 */
export default function TodoSummary() {
  const t = useTasksT()
  const { data: spaces = [] } = useSpaces()
  const personal = spaces.find((s) => s.type === 'personal') ?? null

  const { data: tasks = [] } = useTasks(
    personal ? { spaceId: personal.id } : { spaceId: '__none__' },
  )
  const complete = useCompleteTask()
  const reopen = useReopenTask()

  const today = tasks.filter((x) => x.section === 'oggi')
  const done = today.filter((x) => x.status === 'completata').length
  const percent = today.length === 0 ? 0 : (done / today.length) * 100
  const preview = [...today].sort((a, b) => a.sortOrder - b.sortOrder).slice(0, 3)

  return (
    <div className="flex h-full flex-col gap-2.5">
      <div className="flex items-baseline justify-between">
        <span className="font-mono text-[10px] tracking-[0.12em] text-text-subtle">
          {t.widgetToday.toUpperCase()}
        </span>
        <span className="font-mono text-xs text-text-muted">
          {done}/{today.length}
        </span>
      </div>

      <div className="h-1 w-full overflow-hidden rounded-full bg-overlay-subtle">
        <div
          className="h-full rounded-full bg-primary"
          style={{ width: `${percent}%`, transition: 'width .3s ease' }}
        />
      </div>

      {preview.length === 0 ? (
        <p className="text-xs text-text-subtle">{t.widgetEmpty}</p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {preview.map((task) => {
            const isDone = task.status === 'completata'
            return (
              <li key={task.id} className="flex items-center gap-2">
                <button
                  onClick={() => (isDone ? reopen.mutate(task.id) : complete.mutate(task.id))}
                  aria-label={task.title}
                  className={cn(
                    'flex h-[15px] w-[15px] shrink-0 items-center justify-center rounded-[5px] border transition-colors',
                    isDone
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border-strong hover:border-primary',
                  )}
                >
                  {isDone && <Check className="h-2.5 w-2.5" strokeWidth={3} />}
                </button>
                <span
                  className={cn(
                    'min-w-0 flex-1 truncate text-xs',
                    isDone ? 'text-text-subtle line-through' : 'text-text-muted',
                  )}
                >
                  {task.title}
                </span>
              </li>
            )
          })}
        </ul>
      )}

      <Link
        href="/tasks"
        className="mt-auto text-xs text-primary transition-opacity hover:opacity-80"
      >
        {t.widgetOpen}
      </Link>
    </div>
  )
}
