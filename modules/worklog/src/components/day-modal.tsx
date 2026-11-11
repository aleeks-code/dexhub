'use client'

import { useEffect, useState } from 'react'
import { X, Trash2, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, AlertTriangle, LayoutTemplate } from 'lucide-react'
import { Button } from '@dexhub/ui'
import type { WorklogDay, EntryInput, WorklogTemplate } from '../services/worklog-api'
import type { WorklogTranslations } from '../i18n'
import { EntryEditor } from './entry-editor'

interface Props {
  date: string // 'YYYY-MM-DD'
  existingDay: WorklogDay | undefined
  defaultHours: number
  isHoliday: boolean
  isWorkday: boolean
  templates: WorklogTemplate[]
  t: WorklogTranslations
  locale: string
  onSave: (date: string, note: string, entries: EntryInput[], mealOverride: boolean | null) => Promise<void>
  onDelete: () => Promise<void>
  onClose: () => void
  onNavigate?: (newDate: string) => void
}

function shiftDate(dateStr: string, deltaDays: number): string {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + deltaDays)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function defaultEntries(isHoliday: boolean, isWorkday: boolean, defaultHours: number): EntryInput[] {
  if (isHoliday) return [{ kind: 'holiday', hours: defaultHours }]
  if (!isWorkday) return [{ kind: 'overtime', hours: defaultHours }]
  return [{ kind: 'work', hours: defaultHours }]
}

export function DayModal({
  date,
  existingDay,
  defaultHours,
  isHoliday,
  isWorkday,
  templates,
  t,
  locale,
  onSave,
  onDelete,
  onClose,
  onNavigate,
}: Props) {
  const isNew = !existingDay || existingDay.entries.length === 0

  const [entries, setEntries] = useState<EntryInput[]>(() => {
    if (existingDay && existingDay.entries.length > 0) {
      return existingDay.entries.map((e) => ({
        kind: e.kind,
        hours: e.hours,
        modifiers: e.modifiers,
        note: e.note,
      }))
    }
    return defaultEntries(isHoliday, isWorkday, defaultHours)
  })

  const [note, setNote] = useState(existingDay?.note ?? '')
  const [mealOverride, setMealOverride] = useState<boolean | null>(existingDay?.mealOverride ?? null)
  const [expanded, setExpanded] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [showTemplates, setShowTemplates] = useState(false)

  // Overtime derivation: suggest split when a single work entry exceeds daily standard
  const isSunday = new Date(date + 'T00:00:00').getDay() === 0
  const isFestivo = isHoliday || isSunday
  const workEntries = entries.filter((e) => e.kind === 'work')
  const workHours = workEntries.reduce((s, e) => s + (Number(e.hours) || 0), 0)
  // Mirror deriveMeal (resolver, stima.resolver.ts) — client-side preview only, mai chiamato il server.
  const autoMealCounted = entries.some((e) => e.kind === 'work' || e.kind === 'overtime')
  const overtimeExcess = workHours - defaultHours
  const showSplitSuggestion =
    expanded &&
    overtimeExcess > 0 &&
    workEntries.length === 1 &&
    !entries.some((e) => e.kind === 'overtime')

  function applySplit() {
    setEntries((prev) =>
      prev
        .map((e) => (e.kind === 'work' ? { ...e, hours: defaultHours } : e))
        .concat([{
          kind: 'overtime',
          hours: overtimeExcess,
          modifiers: isFestivo ? { festivoLavorato: true } : undefined,
        }]),
    )
  }

  const formattedDate = new Date(date + 'T00:00:00').toLocaleDateString(locale, {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
      if (onNavigate && e.altKey && e.key === 'ArrowLeft') {
        e.preventDefault()
        onNavigate(shiftDate(date, -1))
      }
      if (onNavigate && e.altKey && e.key === 'ArrowRight') {
        e.preventDefault()
        onNavigate(shiftDate(date, 1))
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose, onNavigate, date])

  function applyTemplate(tpl: WorklogTemplate) {
    setEntries(tpl.entries.map((e) => ({ ...e })))
    setShowTemplates(false)
    setExpanded(true)
  }

  async function handleSave() {
    if (saving || entries.length === 0) return
    setSaving(true)
    setSaveError(null)
    try {
      await onSave(date, note, entries, mealOverride)
      onClose()
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Error')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (deleting) return
    setDeleting(true)
    try {
      await onDelete()
      onClose()
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl border border-border bg-bg shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            {onNavigate && (
              <div className="flex items-center gap-0.5 border-r border-border pr-2 mr-1">
                <button
                  type="button"
                  title="Giorno precedente (Alt + ←)"
                  onClick={() => onNavigate(shiftDate(date, -1))}
                  className="rounded p-1 text-text-muted hover:bg-surface hover:text-text transition-colors"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  type="button"
                  title="Giorno successivo (Alt + →)"
                  onClick={() => onNavigate(shiftDate(date, 1))}
                  className="rounded p-1 text-text-muted hover:bg-surface hover:text-text transition-colors"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
            <div>
              <h2 className="text-sm font-semibold text-text">
                {existingDay && existingDay.entries.length > 0 ? t.modal.titleEdit : t.modal.titleNew}
              </h2>
              <p className="mt-0.5 text-xs text-text-muted capitalize">{formattedDate}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-text-muted hover:bg-surface hover:text-text"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="px-4 py-3 space-y-3">
          {/* Template picker */}
          {templates.length > 0 && (
            <div className="relative flex justify-end">
              <button
                type="button"
                onClick={() => setShowTemplates((v) => !v)}
                className="flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs font-medium text-text hover:border-primary/60 hover:bg-surface hover:text-primary transition-colors"
              >
                <LayoutTemplate size={13} />
                {t.templates.applyTemplate}
                <ChevronDown size={12} className={showTemplates ? 'rotate-180 transition-transform' : 'transition-transform'} />
              </button>
              {showTemplates && (
                <div className="absolute right-0 top-9 z-10 min-w-[180px] rounded-lg border border-border bg-bg shadow-lg">
                  {templates.map((tpl) => (
                    <button
                      key={tpl.id}
                      type="button"
                      onClick={() => applyTemplate(tpl)}
                      className="w-full px-3 py-2 text-left text-sm text-text hover:bg-surface"
                    >
                      {tpl.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Entries */}
          {expanded ? (
            <EntryEditor entries={entries} setEntries={setEntries} defaultHours={defaultHours} t={t} />
          ) : (
            <div className="flex items-center gap-2 rounded-lg bg-surface p-3">
              <span className="flex-1 text-sm text-text">
                {t.kind[entries[0]?.kind ?? 'work']} — {entries[0]?.hours ?? defaultHours}{t.hours}
              </span>
            </div>
          )}

          {/* Overtime split suggestion */}
          {showSplitSuggestion && (
            <div className="flex items-center gap-3 rounded-lg bg-primary/10 px-3 py-2">
              <div className="flex-1 min-w-0">
                <p className="text-xs text-text">
                  {t.modal.splitSuggestion
                    .replace('{std}', String(defaultHours))
                    .replace('{excess}', String(overtimeExcess))}
                </p>
                <p className="text-xs text-text-muted mt-0.5">
                  {t.modal.splitNote.replace('{std}', String(defaultHours))}
                </p>
              </div>
              <Button variant="outline" size="xs" onClick={applySplit}>
                {t.modal.splitApply}
              </Button>
            </div>
          )}

          {/* Save error */}
          {saveError && (
            <div className="flex items-center gap-2 rounded-lg bg-error/10 px-3 py-2 text-xs text-error">
              <AlertTriangle size={14} />
              {saveError}
            </div>
          )}

          {/* Mensa — attributo di giorno, vicino a note, mai tra le entries */}
          {expanded && (
            <div className="space-y-1">
              <label className="text-xs font-medium text-text-muted">{t.modal.mensaLabel}</label>
              <div className="inline-flex rounded-md border border-border overflow-hidden">
                {(
                  [
                    { value: null, label: t.modal.mensaAuto },
                    { value: true, label: t.modal.mensaYes },
                    { value: false, label: t.modal.mensaNo },
                  ] as const
                ).map(({ value, label }) => (
                  <button
                    key={String(value)}
                    type="button"
                    onClick={() => setMealOverride(value)}
                    className={[
                      'border-r border-border px-3 py-1.5 text-xs font-medium transition-colors last:border-r-0',
                      mealOverride === value
                        ? 'bg-primary/10 text-primary'
                        : 'text-text-muted hover:bg-surface hover:text-text',
                    ].join(' ')}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {mealOverride === null && (
                <p className="text-xs text-text-muted opacity-70">
                  {autoMealCounted ? t.modal.mensaAutoMeal : t.modal.mensaAutoNoMeal}
                </p>
              )}
            </div>
          )}

          {/* Note */}
          {expanded && (
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t.modal.notePh}
              rows={2}
              className="w-full resize-none rounded-md border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-text-muted focus:border-primary focus:outline-none"
            />
          )}
        </div>

        {/* Footer */}
        {confirmDelete ? (
          <div className="flex items-center justify-between border-t border-border bg-error/5 px-4 py-3">
            <span className="text-xs text-text-muted">{t.modal.confirmDelete}</span>
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" onClick={() => setConfirmDelete(false)}>
                {t.modal.cancel}
              </Button>
              <Button variant="danger" size="sm" onClick={handleDelete} disabled={deleting}>
                {deleting ? '…' : t.modal.confirm}
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between border-t border-border px-4 py-3">
            <div>
              {existingDay && existingDay.entries.length > 0 && (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  className="flex items-center gap-1 text-xs text-text-muted hover:text-error"
                >
                  <Trash2 size={12} />
                  {t.modal.deleteDay}
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              {!expanded && isNew && (
                <button
                  type="button"
                  onClick={() => setExpanded(true)}
                  className="flex items-center gap-1 text-xs text-text-muted hover:text-text"
                >
                  <ChevronDown size={14} />
                  {t.modal.expand}
                </button>
              )}
              {expanded && isNew && (
                <button
                  type="button"
                  onClick={() => setExpanded(false)}
                  className="flex items-center gap-1 text-xs text-text-muted hover:text-text"
                >
                  <ChevronUp size={14} />
                  {t.modal.collapse}
                </button>
              )}
              <Button variant="secondary" size="sm" onClick={onClose} disabled={saving}>
                {t.modal.cancel}
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleSave}
                disabled={saving || entries.length === 0}
              >
                {saving ? t.modal.saving : expanded ? t.modal.save : t.modal.confirm}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
