'use client'

import type { WorklogDay } from '../services/worklog-api'
import type { WorklogTranslations } from '../i18n'
import { DayCell } from './day-cell'

const WEEKDAY_LABELS_EN = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const WEEKDAY_LABELS_IT = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom']

function buildCalendarGrid(year: number, month: number): Array<string | null> {
  const firstDay = new Date(year, month - 1, 1)
  const totalDays = new Date(year, month, 0).getDate()
  const startOffset = (firstDay.getDay() + 6) % 7 // Mon=0

  const cells: Array<string | null> = Array(startOffset).fill(null)
  for (let d = 1; d <= totalDays; d++) {
    const dd = String(d).padStart(2, '0')
    const mm = String(month).padStart(2, '0')
    cells.push(`${year}-${mm}-${dd}`)
  }
  while (cells.length % 7 !== 0) cells.push(null)
  return cells
}

interface Props {
  year: number
  month: number
  days: WorklogDay[]
  workdays: number[] // ISO weekdays [1..7]
  holidays: Set<string>
  t: WorklogTranslations
  locale: string
  todayStr: string
  selectionMode: boolean
  selectedDates: Set<string>
  onDayClick: (date: string, shiftKey: boolean) => void
}

export function MonthCalendar({ year, month, days, workdays, holidays, t, locale, todayStr, selectionMode, selectedDates, onDayClick }: Props) {
  const grid = buildCalendarGrid(year, month)
  const dayMap = new Map(days.map((d) => [d.date, d]))
  const isItalian = locale.startsWith('it')
  const headers = isItalian ? WEEKDAY_LABELS_IT : WEEKDAY_LABELS_EN

  return (
    <div className="w-full">
      <div className="mb-1 grid grid-cols-7 gap-1">
        {headers.map((h, i) => (
          <div
            key={h}
            className={`py-1 text-center text-xs font-medium ${i >= 5 ? 'text-text-subtle' : 'text-text-muted'}`}
          >
            {h}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {grid.map((date, i) => {
          if (!date) return <div key={`empty-${i}`} className="min-h-[3.5rem] rounded-lg" />
          const jsDay = new Date(date + 'T00:00:00').getDay() || 7
          return (
            <DayCell
              key={date}
              date={date}
              day={dayMap.get(date)}
              isToday={date === todayStr}
              isWorkday={workdays.includes(jsDay)}
              isWeekend={jsDay === 6 || jsDay === 7}
              isHoliday={holidays.has(date)}
              selectionMode={selectionMode}
              isSelected={selectedDates.has(date)}
              t={t}
              onClick={(e) => onDayClick(date, e.shiftKey)}
            />
          )
        })}
      </div>
    </div>
  )
}
