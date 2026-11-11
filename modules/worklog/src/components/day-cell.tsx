'use client'

import React from 'react'
import { Check, StickyNote, Utensils } from 'lucide-react'
import type { WorklogDay, EntryKind } from '../services/worklog-api'
import type { WorklogTranslations } from '../i18n'
import { KIND_COLOR } from '../utils/kind-colors'
import { getItalianHolidayName } from '../utils/holidays'

const MAX_KIND_DOTS = 3

/** Kind unici del giorno (dedup, non le entry) — overtime resta fuori, va nel delta "+Nh",
 * mai un suo pallino. Giorno tutto-overtime (nessuna entry non-overtime): fallback 'work',
 * stesso comportamento del vecchio dominantKind (mostra comunque un pallino). */
function uniqueKinds(entries: WorklogDay['entries']): EntryKind[] {
  const nonOvertime = Array.from(new Set(entries.filter((e) => e.kind !== 'overtime').map((e) => e.kind)))
  if (nonOvertime.length > 0) return nonOvertime
  return entries.length > 0 ? ['work'] : []
}

interface Props {
  date: string // 'YYYY-MM-DD'
  day: WorklogDay | undefined
  isToday: boolean
  isWorkday: boolean
  isWeekend: boolean
  isHoliday: boolean
  selectionMode: boolean
  isSelected: boolean
  t: WorklogTranslations
  onClick: (e: React.MouseEvent) => void
}

export function DayCell({ date, day, isToday, isWorkday, isWeekend, isHoliday, selectionMode, isSelected, t, onClick }: Props) {
  const dayNum = parseInt(date.slice(8), 10)
  const entries = day?.entries ?? []
  const hasEntries = entries.length > 0
  const mainEntries = entries.filter((e) => e.kind !== 'overtime')
  const overtimeHours = entries.filter((e) => e.kind === 'overtime').reduce((s, e) => s + e.hours, 0)
  const mainHours = mainEntries.reduce((s, e) => s + e.hours, 0)
  // All-overtime day (e.g. worked a non-workday) — show the total plainly as a worked day, no "+" delta.
  const displayHours = mainHours > 0 ? mainHours : overtimeHours
  const displayDelta = mainHours > 0 ? overtimeHours : 0

  const kinds = uniqueKinds(entries)
  const shownKinds = kinds.slice(0, MAX_KIND_DOTS)
  const hasMoreKinds = kinds.length > MAX_KIND_DOTS
  const hasDayNote = !!day?.note
  const mealOverride = day?.mealOverride ?? null
  // Mirror deriveMeal (resolver, stima.resolver.ts) — client-side preview only, mai il server.
  const autoMealCounted = entries.some((e) => e.kind === 'work' || e.kind === 'overtime')
  const mealCounted = mealOverride ?? autoMealCounted

  // Non-working day (weekend or holiday) with nothing logged is recessed/muted — festivo counts as non-working
  // even if it falls on a weekday, which plain isWorkday (weekday-only) would miss.
  const isNonWorking = !isWorkday || isHoliday
  const isRecessed = !hasEntries && isNonWorking
  // Literal Sat/Sun (not the contract's isWorkday pattern) recedes into the page background
  // instead of the standard recessed surface — visually distinct from a non-weekend rest day.
  const recessedBg = isWeekend ? 'bg-bg' : 'bg-surface'

  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'group relative flex flex-col items-start rounded-lg p-1.5 text-left transition-colors min-h-[3.5rem]',
        'hover:border-primary/60 hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
        isRecessed
          ? `border border-border ${recessedBg}`
          : hasEntries
            ? 'border border-border bg-surface-raised'
            : 'border border-dashed border-border bg-surface',
        isToday ? 'ring-2 ring-primary ring-offset-1 ring-offset-bg' : '',
        selectionMode && isSelected ? 'ring-2 ring-primary ring-offset-1 ring-offset-bg' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {/* Selection checkbox */}
      {selectionMode && (
        <span
          className={[
            'absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full border transition-colors',
            isSelected ? 'border-primary bg-primary text-white' : 'border-border bg-bg',
          ].join(' ')}
        >
          {isSelected && <Check size={10} />}
        </span>
      )}

      {isToday && !selectionMode && (
        <span className="absolute top-1 right-1.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
          {t.today}
        </span>
      )}

      <div className="flex w-full items-baseline justify-between gap-1 overflow-hidden">
        <span className={['text-xs font-semibold', isRecessed ? 'text-text-subtle' : 'text-text-muted'].join(' ')}>
          {dayNum}
        </span>
        {isHoliday && (
          <span
            className="truncate text-[9px] font-medium text-amber-500 leading-tight"
            title={getItalianHolidayName(date) ?? undefined}
          >
            {getItalianHolidayName(date)}
          </span>
        )}
      </div>

      {hasEntries && shownKinds.length > 0 ? (
        <div className="mt-1 flex items-center gap-1.5 text-xs">
          <div className="flex items-center gap-0.5">
            {shownKinds.map((k) => (
              <span key={k} className={`h-1.5 w-1.5 shrink-0 rounded-full ${KIND_COLOR[k].dot}`} />
            ))}
            {hasMoreKinds && <span className="text-text-subtle leading-none">…</span>}
          </div>
          <span className="font-medium text-text">
            {displayHours.toFixed(displayHours % 1 === 0 ? 0 : 1)}{t.hours}
          </span>
          {displayDelta > 0 && (
            <span className={`font-medium ${KIND_COLOR.overtime.text}`}>
              +{displayDelta.toFixed(displayDelta % 1 === 0 ? 0 : 1)}
            </span>
          )}
        </div>
      ) : !isNonWorking ? (
        <div className="flex flex-1 items-center justify-center self-stretch text-sm text-text-subtle">+</div>
      ) : null}

      {hasDayNote && (
        <StickyNote size={10} className="absolute bottom-1 right-1 text-text-subtle" />
      )}

      {hasEntries && (
        <Utensils
          size={10}
          aria-label={
            mealOverride === true
              ? t.modal.mensaForcedAria
              : mealOverride === false
                ? t.modal.mensaExcludedAria
                : autoMealCounted
                  ? t.modal.mensaAutoCountedAria
                  : t.modal.mensaAutoNotCountedAria
          }
          className={['absolute bottom-1 left-1', mealCounted ? 'text-primary' : 'text-text-muted'].join(' ')}
        />
      )}
    </button>
  )
}
