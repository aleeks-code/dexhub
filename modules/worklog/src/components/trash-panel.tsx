'use client'

import { X, RotateCcw } from 'lucide-react'
import { Button } from '@dexhub/ui'
import { useWorklogTrash, useRestoreDay } from '../services/worklog-api'
import type { WorklogTranslations } from '../i18n'

interface Props {
  t: WorklogTranslations
  locale: string
  onClose: () => void
}

export function TrashPanel({ t, locale, onClose }: Props) {
  const { data: days = [], isLoading } = useWorklogTrash()
  const restoreDay = useRestoreDay()

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl border border-border bg-bg shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold text-text">{t.trash.title}</h2>
          <button type="button" onClick={onClose} className="rounded p-1 text-text-muted hover:bg-surface hover:text-text">
            <X size={16} />
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto px-4 py-3 space-y-2">
          {isLoading && <p className="text-sm text-text-muted">{t.loading}</p>}
          {!isLoading && days.length === 0 && (
            <p className="text-sm text-text-muted">{t.trash.empty}</p>
          )}
          {days.map((day) => {
            const deletedAt = day.deletedAt
              ? new Date(day.deletedAt).toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' })
              : ''
            const totalHours = day.entries.reduce((s, e) => s + e.hours, 0)
            return (
              <div key={day.id} className="flex items-center gap-3 rounded-lg border border-border px-3 py-2">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-text">
                    {new Date(day.date + 'T00:00:00').toLocaleDateString(locale, {
                      weekday: 'short', day: 'numeric', month: 'short',
                    })}
                    {totalHours > 0 && (
                      <span className="ml-2 text-xs text-text-muted">{totalHours.toFixed(1)}h</span>
                    )}
                  </div>
                  {deletedAt && (
                    <div className="text-xs text-text-muted">{t.trash.deletedOn} {deletedAt}</div>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={() => restoreDay.mutate(day.id)}
                  disabled={restoreDay.isPending}
                >
                  <RotateCcw size={13} />
                  {t.trash.restore}
                </Button>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
