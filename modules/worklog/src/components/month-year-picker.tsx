'use client'

import { useEffect, useState } from 'react'
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'

interface Props {
  label: string           // "Luglio 2026", già formattato dal chiamante
  month: string           // 'YYYY-MM' — mese attualmente navigato/selezionato
  todayYYYYMM: string     // 'YYYY-MM' di oggi — per evidenziare il mese corrente
  locale: string
  onSelect: (yyyymm: string) => void
}

export function MonthYearPicker({ label, month, todayYYYYMM, locale, onSelect }: Props) {
  const [open, setOpen] = useState(false)
  const [pickerYear, setPickerYear] = useState(() => parseInt(month.split('-')[0]!, 10))

  // Riallinea l'anno mostrato al mese navigato ogni volta che si riapre
  useEffect(() => {
    if (open) setPickerYear(parseInt(month.split('-')[0]!, 10))
  }, [open, month])

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const monthLabels = Array.from({ length: 12 }, (_, i) =>
    new Date(2000, i, 1).toLocaleDateString(locale, { month: 'short' }),
  )
  const [todayYear, todayMonthNum] = todayYYYYMM.split('-').map(Number)
  const [selectedYear, selectedMonthNum] = month.split('-').map(Number)

  return (
    <div className="relative flex-1">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-center gap-1 text-base font-semibold capitalize text-text hover:text-primary"
      >
        {label}
        <ChevronDown size={14} className={`text-text-muted transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-1/2 top-9 z-20 w-64 -translate-x-1/2 rounded-lg border border-border bg-bg p-3 shadow-lg">
            {/* Riga anno */}
            <div className="mb-2 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setPickerYear((y) => y - 1)}
                className="rounded-md p-1 text-text-muted hover:bg-surface hover:text-text"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-sm font-semibold tabular-nums text-text">{pickerYear}</span>
              <button
                type="button"
                onClick={() => setPickerYear((y) => y + 1)}
                className="rounded-md p-1 text-text-muted hover:bg-surface hover:text-text"
              >
                <ChevronRight size={16} />
              </button>
            </div>

            {/* Griglia 3×4 mesi — oggi = pieno, selezionato = anello */}
            <div className="grid grid-cols-3 gap-1.5">
              {monthLabels.map((ml, i) => {
                const m = i + 1
                const isCurrentMonth = pickerYear === todayYear && m === todayMonthNum
                const isSelectedMonth = pickerYear === selectedYear && m === selectedMonthNum
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => {
                      onSelect(`${pickerYear}-${String(m).padStart(2, '0')}`)
                      setOpen(false)
                    }}
                    className={[
                      'rounded-md py-1.5 text-sm capitalize transition-colors',
                      isCurrentMonth
                        ? 'bg-primary text-white font-semibold'
                        : isSelectedMonth
                          ? 'ring-2 ring-inset ring-primary text-text font-semibold'
                          : 'text-text hover:bg-surface',
                    ].join(' ')}
                  >
                    {ml}
                  </button>
                )
              })}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
