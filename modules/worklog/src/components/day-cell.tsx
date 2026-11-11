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

function getKindLabel(kind: EntryKind, t: WorklogTranslations): string {
  switch (kind) {
    case 'sick':
      return 'Malattia'
    case 'vacation':
      return 'Ferie'
    case 'leave':
      return 'Permesso'
    case 'cig':
      return 'CIG'
    case 'permesso_non_retribuito':
      return 'Non retrib.'
    case 'congedo_parentale_80':
      return 'Congedo 80%'
    case 'congedo_parentale_30':
      return 'Congedo 30%'
    case 'holiday':
      return 'Festivo'
    case 'overtime':
      return 'Straord.'
    default:
      return t.kind[kind] ?? kind
  }
}

function getSpecialKindBadgeClass(kind: EntryKind): string {
  switch (kind) {
    case 'sick':
      return 'bg-warning/10 text-warning border-warning/25'
    case 'vacation':
      return 'bg-orange-500/10 text-orange-400 border-orange-500/25'
    case 'leave':
      return 'bg-info/10 text-info border-info/25'
    case 'cig':
      return 'bg-error/10 text-error border-error/25'
    case 'permesso_non_retribuito':
      return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/25'
    case 'congedo_parentale_80':
      return 'bg-teal-500/10 text-teal-400 border-teal-500/25'
    case 'congedo_parentale_30':
      return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/25'
    case 'holiday':
      return 'bg-pink-500/10 text-pink-400 border-pink-500/25'
    default:
      return 'bg-surface text-text-muted border-border'
  }
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

export function DayCell({
  date,
  day,
  isToday,
  isWorkday,
  isWeekend: _isWeekend,
  isHoliday,
  selectionMode,
  isSelected,
  t,
  onClick,
}: Props) {
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
  const hasDayNote = !!day?.note
  const mealOverride = day?.mealOverride ?? null
  const autoMealCounted = entries.some((e) => e.kind === 'work' || e.kind === 'overtime')
  const mealCounted = mealOverride ?? autoMealCounted

  const jsDay = new Date(date + 'T00:00:00').getDay() || 7
  const isNonWorking = !isWorkday || isHoliday
  const specialKind = entries.find((e) => e.kind !== 'work' && e.kind !== 'overtime')?.kind

  // ── Differenziazione superfici e contrasti (punto C) ───────────────────────
  let surfaceClass = 'bg-surface border-border/80'
  let textDateClass = 'text-text'

  if (isHoliday) {
    // Festività: evidenziazione dedicata con tonalità arancione/warm
    surfaceClass = hasEntries
      ? 'bg-amber-500/[0.08] border-amber-500/30'
      : 'bg-amber-500/[0.04] border-amber-500/20'
    textDateClass = 'text-amber-400 font-bold'
  } else if (jsDay === 7) {
    // Domenica: superficie leggermente più scura e data più attenuata
    surfaceClass = hasEntries
      ? 'bg-surface-raised/60 border-border/60'
      : 'bg-surface/30 border-border/40'
    textDateClass = hasEntries ? 'text-text-muted font-medium' : 'text-text-subtle/70'
  } else if (jsDay === 6) {
    // Sabato: superficie leggermente più scura dei feriali
    surfaceClass = hasEntries
      ? 'bg-surface-raised/80 border-border/70'
      : 'bg-surface/50 border-border/50'
    textDateClass = hasEntries ? 'text-text font-semibold' : 'text-text-muted'
  } else {
    // Giorni feriali lavorativi
    if (hasEntries) {
      surfaceClass = 'bg-surface-raised border-border'
      textDateClass = 'text-text font-semibold'
    } else if (isWorkday) {
      surfaceClass = 'bg-surface border-border/80 border-dashed'
      textDateClass = 'text-text-muted font-medium'
    } else {
      surfaceClass = 'bg-surface/50 border-border/60'
      textDateClass = 'text-text-subtle'
    }
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'group relative flex flex-col justify-between rounded-xl p-2 text-left transition-all min-h-[78px] sm:min-h-[82px]',
        'hover:border-primary/60 hover:bg-surface-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
        surfaceClass,
        isToday ? 'ring-2 ring-primary ring-offset-1 ring-offset-bg' : '',
        selectionMode && isSelected ? 'ring-2 ring-primary ring-offset-1 ring-offset-bg bg-primary/10' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {/* ── Riga Superiore: Numero del Giorno + Badge (Oggi / Festivo / Checkbox) ── */}
      <div className="flex w-full items-center justify-between gap-1">
        <span className={`text-xs sm:text-sm tabular-nums ${textDateClass}`}>
          {dayNum}
        </span>

        {selectionMode ? (
          <span
            className={[
              'flex h-4 w-4 items-center justify-center rounded-md border transition-colors',
              isSelected ? 'border-primary bg-primary text-white' : 'border-border bg-bg',
            ].join(' ')}
          >
            {isSelected && <Check size={10} />}
          </span>
        ) : isToday ? (
          <span className="rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-primary/15 text-primary border border-primary/25">
            {t.today}
          </span>
        ) : isHoliday ? (
          <span
            className="truncate text-[9px] font-semibold text-amber-400 max-w-[85px]"
            title={getItalianHolidayName(date) ?? undefined}
          >
            {getItalianHolidayName(date)}
          </span>
        ) : null}
      </div>

      {/* ── Zona Centrale: Ore e Tipologia Anomalia / Stato (punto B) ── */}
      <div className="my-auto py-1 w-full space-y-1">
        {hasEntries ? (
          <>
            <div className="flex items-baseline gap-1">
              <span className="text-sm sm:text-base font-bold text-text tabular-nums leading-none">
                {displayHours.toFixed(displayHours % 1 === 0 ? 0 : 1)}
                <span className="text-xs font-normal text-text-muted ml-0.5">{t.hours}</span>
              </span>
              {displayDelta > 0 && (
                <span className="text-xs font-semibold text-warning tabular-nums">
                  +{displayDelta.toFixed(displayDelta % 1 === 0 ? 0 : 1)}
                </span>
              )}
            </div>

            {/* In evidenza le giornate anomale (Malattia, Ferie, Permesso, CIG, ecc.) */}
            {specialKind ? (
              <div className="flex items-center">
                <span
                  className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold leading-none border ${getSpecialKindBadgeClass(specialKind)}`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${KIND_COLOR[specialKind].dot}`} />
                  <span className="truncate max-w-[70px] sm:max-w-[90px]">
                    {getKindLabel(specialKind, t)}
                  </span>
                </span>
              </div>
            ) : shownKinds.length > 1 ? (
              <div className="flex items-center gap-1">
                {shownKinds.map((k) => (
                  <span key={k} className={`h-1.5 w-1.5 rounded-full ${KIND_COLOR[k].dot}`} />
                ))}
              </div>
            ) : null}
          </>
        ) : !isNonWorking ? (
          <div className="flex items-center justify-center py-1 text-text-subtle text-xs font-medium opacity-40 group-hover:opacity-100 transition-opacity">
            +
          </div>
        ) : null}
      </div>

      {/* ── Riga Inferiore: Metadati (Mensa, Note) ── */}
      <div className="flex w-full items-center justify-between text-[10px] min-h-[14px]">
        {hasEntries && mealCounted ? (
          <span
            className="inline-flex items-center gap-1 text-[10px] font-medium text-primary"
            title={
              mealOverride === true
                ? t.modal.mensaForcedAria
                : mealOverride === false
                  ? t.modal.mensaExcludedAria
                  : autoMealCounted
                    ? t.modal.mensaAutoCountedAria
                    : t.modal.mensaAutoNotCountedAria
            }
          >
            <Utensils size={10} />
            <span className="hidden sm:inline">Mensa</span>
          </span>
        ) : <span />}

        {hasDayNote && (
          <span className="text-text-muted hover:text-text cursor-default" title={day?.note ?? ''}>
            <StickyNote size={11} />
          </span>
        )}
      </div>
    </button>
  )
}
