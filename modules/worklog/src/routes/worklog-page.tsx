'use client'

import { useState, useCallback, useMemo, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Settings } from 'lucide-react'
import { Button } from '@dexhub/ui'
import { useWorklogT } from '../i18n'
import {
  useWorklogDays,
  useMonthlySummary,
  useStima,
  useWorklogContract,
  useFiscalConfig,
  useRetribuzione,
  useWorklogTemplates,
  useWorklogSearch,
  useUpsertDay,
  useEnsureHolidayDay,
  useDeleteDay,
  worklogApi,
  type EntryInput,
  type ContractConfig,
} from '../services/worklog-api'
import { getItalianHolidays, isItalianHoliday, getItalianHolidayName } from '../utils/holidays'
import { MonthCalendar } from '../components/month-calendar'
import { MonthSummary } from '../components/month-summary'
import { StimaCard } from '../components/stima-card'
import { DayModal } from '../components/day-modal'
import { TemplatesPanel } from '../components/templates-panel'
import { TrashPanel } from '../components/trash-panel'
import { BulkModal } from '../components/bulk-modal'
import { SettingsPanel } from '../components/settings-panel'
import { WorklogToolbar, type ToolbarPanel } from '../components/worklog-toolbar'
import { WorklogSetupWizard } from '../components/worklog-setup-wizard'
import { IconTooltip } from '../components/icon-tooltip'
import { MonthYearPicker } from '../components/month-year-picker'

function parseYYYYMM(yyyymm: string): [number, number] {
  const parts = yyyymm.split('-')
  return [parseInt(parts[0] ?? '2000', 10), parseInt(parts[1] ?? '1', 10)]
}

function todayYYYYMM(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function todayStr(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

function monthRange(month: string): { from: string; to: string } {
  const [y, m] = parseYYYYMM(month)
  const lastDay = new Date(y, m, 0).getDate()
  return { from: `${month}-01`, to: `${month}-${String(lastDay).padStart(2, '0')}` }
}

const MONTH_STORAGE_KEY = 'dexhub-worklog-month'

function persistMonth(m: string) {
  localStorage.setItem(MONTH_STORAGE_KEY, m)
}

function addMonths(yyyymm: string, delta: number): string {
  const [y, m] = parseYYYYMM(yyyymm)
  const d = new Date(y, m - 1 + delta, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function formatMonthLabel(yyyymm: string, locale: string): string {
  const [y, m] = parseYYYYMM(yyyymm)
  return new Date(y, m - 1, 1).toLocaleDateString(locale, { month: 'long', year: 'numeric' })
}

function fill(template: string, vars: Record<string, number | string>): string {
  return template.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? 0))
}

function dateRange(a: string, b: string): string[] {
  const start = new Date(a + 'T00:00:00')
  const end = new Date(b + 'T00:00:00')
  if (start > end) return dateRange(b, a)
  const dates: string[] = []
  const cur = new Date(start)
  while (cur <= end) {
    const y = cur.getFullYear()
    const m = String(cur.getMonth() + 1).padStart(2, '0')
    const d = String(cur.getDate()).padStart(2, '0')
    dates.push(`${y}-${m}-${d}`)
    cur.setDate(cur.getDate() + 1)
  }
  return dates
}

const DEFAULT_CONTRACT: ContractConfig = {
  oreGiornaliereStandard: 8,
  oreLavorativeSettimanali: 40,
  giorniLavorativiSettimana: [1, 2, 3, 4, 5],
  saldoAllaData: null,
  ferieResidueOreIniziali: null,
  permessiResiduiOreIniziali: null,
  rateoFerieMensile: null,
  rateoPermessiMensile: null,
}

type Panel = 'templates' | 'trash' | null

export default function WorklogPage() {
  const t = useWorklogT()
  const [month, setMonth] = useState(todayYYYYMM)
  useEffect(() => {
    const stored = localStorage.getItem(MONTH_STORAGE_KEY)
    if (stored && /^\d{4}-(0[1-9]|1[0-2])$/.test(stored)) setMonth(stored)
  }, [])
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [panel, setPanel] = useState<Panel>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [showSearch, setShowSearch] = useState(false)

  // Selection mode state
  const [selectionMode, setSelectionMode] = useState(false)
  const [selectedDates, setSelectedDates] = useState<Set<string>>(new Set())
  const [lastClickAnchor, setLastClickAnchor] = useState<string | null>(null)
  const [showBulkApply, setShowBulkApply] = useState(false)
  const [showBulkDelete, setShowBulkDelete] = useState(false)
  const [bulkDeleting, setBulkDeleting] = useState(false)

  // Range dialog (shift-click)
  type RangeDialog = { allDates: string[]; includeWeekends: boolean; includeHolidays: boolean }
  const [rangeDialog, setRangeDialog] = useState<RangeDialog | null>(null)

  // Delete current month
  const [showDeleteMonth, setShowDeleteMonth] = useState(false)
  const [deletingMonth, setDeletingMonth] = useState(false)

  const { from, to } = monthRange(month)
  const [y] = parseYYYYMM(month)

  const { data: days = [], isLoading, isError } = useWorklogDays(from, to)
  const { data: summary } = useMonthlySummary(month)
  // Stessa queryKey già usata da <StimaCard month={month}> sotto — React Query dedupe,
  // zero richiesta di rete in più. Solo per esporre oreNotturne/orePomeridiane a MonthSummary,
  // niente ricalcolo motore duplicato lato backend (vedi discussione Diff 16A Step 2).
  const { data: stimaData } = useStima(month)
  const { data: contract, isLoading: isLoadingContract } = useWorklogContract()
  const { data: fiscalData, isLoading: isLoadingFiscal } = useFiscalConfig()
  const { data: retribuzioni = [], isLoading: isLoadingRetribuzione } = useRetribuzione()
  const { data: templates = [] } = useWorklogTemplates()
  const { data: searchResults = [] } = useWorklogSearch(searchQuery)

  const [forceShowWizard, setForceShowWizard] = useState(false)

  const isProfileLoading = isLoadingContract || isLoadingFiscal || isLoadingRetribuzione
  // A cartellino is considered fully configured when contract, ccnl and compensation exist
  const isConfigured = Boolean(
    contract &&
    fiscalData?.config?.ccnlId &&
    retribuzioni &&
    retribuzioni.length > 0
  )

  const upsertDay = useUpsertDay()
  const deleteDay = useDeleteDay()
  const ensureHolidayDay = useEnsureHolidayDay()

  const defaultHours = contract?.oreGiornaliereStandard ?? 8
  const workdays = contract?.giorniLavorativiSettimana ?? [1, 2, 3, 4, 5]
  const holidays = useMemo(() => getItalianHolidays(y), [y])

  const selectedDay = selectedDate ? days.find((d) => d.date === selectedDate) : undefined

  // Computed values for bulk operations
  const selectedDatesArr = useMemo(() => Array.from(selectedDates), [selectedDates])
  const daysMap = useMemo(() => new Map(days.map((d) => [d.date, d])), [days])

  // Festivi (Fix C / C-bis): auto-registra 'holiday' sui giorni festivi del mese visibile SENZA
  // click utente. Solo se il profilo è configurato.
  const missingHolidayDates = useMemo(() => {
    if (isLoading || !isConfigured) return []
    return Array.from(holidays).filter((d) => {
      if (d < from || d > to || daysMap.has(d)) return false
      const dow = new Date(d + 'T00:00:00').getDay()
      return dow >= 1 && dow <= 5
    })
  }, [isLoading, isConfigured, holidays, from, to, daysMap])

  useEffect(() => {
    if (!isConfigured) return
    for (const date of missingHolidayDates) {
      ensureHolidayDay.mutateAsync({ date, hours: defaultHours })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [missingHolidayDates, isConfigured])

  const daysWithEntriesCount = useMemo(
    () => selectedDatesArr.filter((date) => {
      const d = daysMap.get(date)
      return d && d.entries.length > 0
    }).length,
    [selectedDatesArr, daysMap],
  )
  const daysToDelete = useMemo(
    () => selectedDatesArr.filter((date) => {
      const d = daysMap.get(date)
      return d && d.entries.length > 0
    }),
    [selectedDatesArr, daysMap],
  )
  const emptySelectedCount = selectedDatesArr.length - daysToDelete.length
  const selectionAllFeriale = useMemo(() => {
    function isFerialeNonFestivo(date: string): boolean {
      const jsDay = new Date(date + 'T00:00:00').getDay() || 7
      return workdays.includes(jsDay) && !holidays.has(date)
    }
    return selectedDatesArr.length > 0 && selectedDatesArr.every(isFerialeNonFestivo)
  }, [selectedDatesArr, workdays, holidays])

  const printDays = useMemo(() => {
    const [y, m] = parseYYYYMM(month)
    const yStr = String(y)
    const mStr = String(m).padStart(2, '0')
    const totalDays = new Date(y, m, 0).getDate()
    const list = []
    for (let day = 1; day <= totalDays; day++) {
      const dateStr = `${yStr}-${mStr}-${String(day).padStart(2, '0')}`
      const d = new Date(dateStr + 'T00:00:00')
      const dow = d.toLocaleDateString(t.locale, { weekday: 'short' })
      const isHol = isItalianHoliday(dateStr)
      const holName = isHol ? getItalianHolidayName(dateStr) : null
      const dayData = daysMap.get(dateStr)
      const entries = dayData?.entries ?? []
      const ordHours = entries.filter((e) => e.kind !== 'overtime').reduce((s, e) => s + e.hours, 0)
      const otHours = entries.filter((e) => e.kind === 'overtime').reduce((s, e) => s + e.hours, 0)
      const kinds = Array.from(new Set(entries.map((e) => e.kind)))
      const autoMeal = entries.some((e) => e.kind === 'work' || e.kind === 'overtime')
      const meal = dayData?.mealOverride ?? autoMeal

      list.push({
        dateStr,
        dayNum: day,
        dow,
        isHol,
        holName,
        kinds,
        ordHours,
        otHours,
        meal: entries.length > 0 && meal,
        note: dayData?.note ?? '',
      })
    }
    return list
  }, [month, daysMap, t.locale])

  function handleMonthChange(delta: number) {
    const next = addMonths(month, delta)
    setMonth(next)
    persistMonth(next)
  }

  function toggleSelectionMode() {
    if (selectionMode) {
      setSelectionMode(false)
      setSelectedDates(new Set())
      setLastClickAnchor(null)
    } else {
      setSelectionMode(true)
    }
  }

  function handleDayClick(date: string, shiftKey: boolean) {
    if (!selectionMode) {
      setSelectedDate(date)
      return
    }

    if (shiftKey && lastClickAnchor && lastClickAnchor !== date) {
      const allDates = dateRange(lastClickAnchor, date)
      setRangeDialog({ allDates, includeWeekends: false, includeHolidays: false })
      return
    }

    // Normal click: toggle + update anchor
    setLastClickAnchor(date)
    setSelectedDates((prev) => {
      const next = new Set(prev)
      if (next.has(date)) next.delete(date)
      else next.add(date)
      return next
    })
  }

  function confirmRangeSelection() {
    if (!rangeDialog) return
    const { allDates, includeWeekends, includeHolidays } = rangeDialog
    const toAdd = allDates.filter((d) => {
      const dow = new Date(d + 'T00:00:00').getDay()
      const isWeekend = dow === 0 || dow === 6
      const isHoliday = isItalianHoliday(d)
      if (isWeekend && !includeWeekends) return false
      if (isHoliday && !includeHolidays) return false
      return true
    })
    setSelectedDates((prev) => {
      const next = new Set(prev)
      toAdd.forEach((d) => next.add(d))
      return next
    })
    // Anchor = last date of the range
    setLastClickAnchor(allDates.at(-1) ?? null)
    setRangeDialog(null)
  }

  async function handleDeleteMonth() {
    setDeletingMonth(true)
    try {
      await Promise.all(days.map((d) => deleteDay.mutateAsync(d.id)))
      setShowDeleteMonth(false)
    } finally {
      setDeletingMonth(false)
    }
  }

  const handleSave = useCallback(
    async (date: string, note: string, entries: EntryInput[], mealOverride: boolean | null) => {
      await upsertDay.mutateAsync({ date, note, entries, mealOverride })
    },
    [upsertDay],
  )

  const handleDelete = useCallback(async () => {
    if (!selectedDay) return
    await deleteDay.mutateAsync(selectedDay.id)
  }, [deleteDay, selectedDay])

  async function handleBulkApply(entries: EntryInput[], note: string, onlyEmpty: boolean) {
    const targets = onlyEmpty
      ? selectedDatesArr.filter((date) => !daysMap.has(date) || (daysMap.get(date)?.entries.length ?? 0) === 0)
      : selectedDatesArr
    await Promise.all(
      targets.map((date) => upsertDay.mutateAsync({ date, note: note || undefined, entries }))
    )
    setSelectedDates(new Set())
    setSelectionMode(false)
  }

  async function handleBulkDelete() {
    setBulkDeleting(true)
    try {
      await Promise.all(daysToDelete.map((date) => {
        const day = daysMap.get(date)
        if (day) return deleteDay.mutateAsync(day.id)
        return Promise.resolve()
      }))
      setSelectedDates(new Set())
      setSelectionMode(false)
      setShowBulkDelete(false)
    } finally {
      setBulkDeleting(false)
    }
  }

  async function handleWeekFill() {
    const today = new Date()
    const weekStart = new Date(today)
    weekStart.setDate(today.getDate() - ((today.getDay() + 6) % 7))
    const existingDates = new Set(days.map((d) => d.date))
    const promises: Promise<unknown>[] = []
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart)
      d.setDate(weekStart.getDate() + i)
      const isoDay = d.getDay() || 7
      if (!workdays.includes(isoDay)) continue
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      if (existingDates.has(dateStr)) continue
      const kind = isItalianHoliday(dateStr) ? 'holiday' : 'work'
      promises.push(upsertDay.mutateAsync({ date: dateStr, entries: [{ kind, hours: defaultHours }] }))
    }
    await Promise.all(promises)
  }

  async function handleMonthFill() {
    const [y, m] = parseYYYYMM(month)
    const yearStr = String(y)
    const monthStr = String(m).padStart(2, '0')
    const daysInMonth = new Date(y, m, 0).getDate()

    const existingDates = new Set(days.map((d) => d.date))
    const promises: Promise<unknown>[] = []

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${yearStr}-${monthStr}-${String(day).padStart(2, '0')}`
      const d = new Date(dateStr + 'T00:00:00')
      const isoDay = d.getDay() || 7
      if (!workdays.includes(isoDay)) continue
      if (existingDates.has(dateStr)) continue
      const kind = isItalianHoliday(dateStr) ? 'holiday' : 'work'
      promises.push(upsertDay.mutateAsync({ date: dateStr, entries: [{ kind, hours: defaultHours }] }))
    }

    if (promises.length > 0) {
      await Promise.all(promises)
    }
  }

  function handlePrint() {
    window.print()
  }

  function handleExport(format: 'csv' | 'json') {
    const url = worklogApi.exportUrl(format, from, to)
    const a = document.createElement('a')
    a.href = url
    a.download = `worklog_${from}_${to}.${format}`
    a.click()
  }

  const displayDays = showSearch && searchQuery.length >= 2 ? searchResults : days

  if (isProfileLoading) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <p className="text-sm font-medium text-text-muted">{t.loading}</p>
      </div>
    )
  }

  if (!isConfigured || forceShowWizard) {
    return (
      <div className="px-4 py-6">
        <WorklogSetupWizard
          initialContract={contract}
          initialCcnlId={fiscalData?.config?.ccnlId}
          currentMonth={month}
          isConfigured={isConfigured}
          t={t}
          onComplete={() => {
            setForceShowWizard(false)
          }}
          onCancel={() => {
            setForceShowWizard(false)
          }}
        />
      </div>
    )
  }

  return (
    <div className="px-4 py-6">
      <div className="print:hidden">
        {/* Header — band 1: identity */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text">{t.title}</h1>
          <p className="text-sm text-text-muted">{t.subtitle}</p>
        </div>
        <IconTooltip label={t.settings.title}>
          <Button variant="ghost" size="icon" onClick={() => setShowSettings(true)}>
            <Settings size={18} />
          </Button>
        </IconTooltip>
      </div>

      <div className="my-4 border-t border-border" />

      {/* Header — band 2: action toolbar */}
      <div className="mb-6">
        <WorklogToolbar
          t={t}
          onWeekFill={handleWeekFill}
          weekFillPending={upsertDay.isPending}
          onMonthFill={handleMonthFill}
          monthFillPending={upsertDay.isPending}
          onPrint={handlePrint}
          selectionMode={selectionMode}
          onToggleSelectionMode={toggleSelectionMode}
          showSearch={showSearch}
          onToggleSearch={() => setShowSearch((v) => !v)}
          onExport={handleExport}
          onOpenPanel={(panel: ToolbarPanel) => setPanel(panel)}
          onDeleteMonth={() => setShowDeleteMonth(true)}
          onOpenWizard={() => setForceShowWizard(true)}
        />
      </div>

      {/* Search bar */}
      {showSearch && (
        <div className="mb-4">
          <input
            autoFocus
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t.search.placeholder}
            className="w-full max-w-sm rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-text-muted focus:border-primary focus:outline-none"
          />
          {searchQuery.length > 0 && searchQuery.length < 2 && (
            <p className="mt-1 text-xs text-text-muted">{t.search.minChars}</p>
          )}
        </div>
      )}

      {/* Month navigation — hidden during search */}
      {!showSearch && (
        <div className="mb-4 flex items-center gap-3">
          <IconTooltip label={t.prevMonth}>
            <Button variant="ghost" size="icon" onClick={() => handleMonthChange(-1)}>
              <ChevronLeft size={18} />
            </Button>
          </IconTooltip>
          <MonthYearPicker
            label={formatMonthLabel(month, t.locale)}
            month={month}
            todayYYYYMM={todayYYYYMM()}
            locale={t.locale}
            onSelect={(m) => { setMonth(m); persistMonth(m) }}
          />
          <IconTooltip label={t.nextMonth}>
            <Button variant="ghost" size="icon" onClick={() => handleMonthChange(1)}>
              <ChevronRight size={18} />
            </Button>
          </IconTooltip>
          <Button variant="outline" size="sm" onClick={() => { const m = todayYYYYMM(); setMonth(m); persistMonth(m) }}>
            {t.today}
          </Button>
        </div>
      )}

      {/* Selection action bar */}
      {selectionMode && !showSearch && (
        <div className="mb-4 flex items-center justify-between rounded-lg border border-primary/30 bg-primary/5 px-3 py-2">
          <span className="text-xs font-medium text-text">
            {fill(t.bulk.selected, { n: selectedDates.size })}
          </span>
          <div className="flex items-center gap-1.5">
            {selectedDates.size > 0 && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowBulkDelete(true)}
                  disabled={daysToDelete.length === 0}
                >
                  {t.bulk.delete}
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setShowBulkApply(true)}
                >
                  {t.bulk.apply}
                </Button>
              </>
            )}
            <Button variant="ghost" size="sm" onClick={toggleSelectionMode}>
              {t.bulk.cancelSelection}
            </Button>
          </div>
        </div>
      )}

      {/* Content */}
      {isLoading ? (
        <p className="py-12 text-center text-sm text-text-muted">{t.loading}</p>
      ) : isError ? (
        <p className="py-12 text-center text-sm text-error">{t.errorLoad}</p>
      ) : showSearch && searchQuery.length >= 2 ? (
        // Search results list
        <div className="space-y-2">
          {displayDays.length === 0 ? (
            <p className="py-8 text-center text-sm text-text-muted">{t.search.empty}</p>
          ) : (
            displayDays.map((day) => (
              <button
                key={day.id}
                type="button"
                onClick={() => { setSelectedDate(day.date); setShowSearch(false) }}
                className="w-full flex items-center gap-3 rounded-lg border border-border bg-surface-raised px-3 py-2 text-left hover:border-primary/50 hover:bg-surface"
              >
                <span className="text-sm font-medium text-text">
                  {new Date(day.date + 'T00:00:00').toLocaleDateString(t.locale, {
                    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
                  })}
                </span>
                {day.note && <span className="flex-1 truncate text-xs text-text-muted">{day.note}</span>}
              </button>
            ))
          )}
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
          <MonthCalendar
            year={parseYYYYMM(month)[0]}
            month={parseYYYYMM(month)[1]}
            days={days}
            workdays={workdays}
            holidays={holidays}
            t={t}
            locale={t.locale}
            todayStr={todayStr()}
            selectionMode={selectionMode}
            selectedDates={selectedDates}
            onDayClick={handleDayClick}
          />
          <div className="space-y-4">
            <MonthSummary
              summary={summary}
              oreNotturne={stimaData?.stima?.oreNotturne ?? 0}
              orePomeridiane={stimaData?.stima?.orePomeridiane ?? 0}
              t={t}
            />
            <StimaCard month={month} t={t} onSelectMonth={setMonth} />
          </div>
        </div>
      )}

      {/* Day modal — blocked in selection mode */}
      {selectedDate && !selectionMode && (
        <DayModal
          key={selectedDate}
          date={selectedDate}
          existingDay={selectedDay}
          defaultHours={defaultHours}
          isHoliday={isItalianHoliday(selectedDate)}
          isWorkday={workdays.includes(new Date(selectedDate + 'T00:00:00').getDay() || 7)}
          templates={templates}
          t={t}
          locale={t.locale}
          onSave={handleSave}
          onDelete={handleDelete}
          onClose={() => setSelectedDate(null)}
          onNavigate={(targetDate) => setSelectedDate(targetDate)}
        />
      )}

      {/* Bulk apply modal */}
      {showBulkApply && (
        <BulkModal
          selectedCount={selectedDates.size}
          daysWithEntries={daysWithEntriesCount}
          defaultHours={defaultHours}
          homogeneousFeriale={selectionAllFeriale}
          templates={templates}
          t={t}
          onApply={handleBulkApply}
          onClose={() => setShowBulkApply(false)}
        />
      )}

      {/* Bulk delete confirm */}
      {showBulkDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-xl border border-border bg-bg shadow-xl">
            <div className="px-4 py-4 space-y-2">
              <p className="text-sm font-semibold text-text">
                {fill(t.bulk.deleteConfirmFull, { n: daysToDelete.length, x: daysWithEntriesCount })}
              </p>
              {emptySelectedCount > 0 && (
                <p className="text-xs text-text-muted">
                  {fill(t.bulk.deleteConfirmEmpty, { e: emptySelectedCount })}
                </p>
              )}
              <p className="text-xs text-text-muted">{t.bulk.deleteTrashHint}</p>
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-border px-4 py-3">
              <Button variant="secondary" size="sm" onClick={() => setShowBulkDelete(false)} disabled={bulkDeleting}>
                {t.modal.cancel}
              </Button>
              <Button variant="danger" size="sm" onClick={handleBulkDelete} disabled={bulkDeleting}>
                {bulkDeleting ? '…' : t.modal.confirm}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete current month confirm */}
      {showDeleteMonth && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-xl border border-border bg-bg shadow-xl">
            <div className="px-4 py-4 space-y-2">
              <p className="text-sm font-semibold text-text">
                {fill(t.trash.deleteMonthConfirm, {
                  n: days.length,
                  month: formatMonthLabel(month, t.locale),
                })}
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-border px-4 py-3">
              <Button variant="secondary" size="sm" onClick={() => setShowDeleteMonth(false)} disabled={deletingMonth}>
                {t.modal.cancel}
              </Button>
              <Button variant="danger" size="sm" onClick={handleDeleteMonth} disabled={deletingMonth || days.length === 0}>
                {deletingMonth ? '…' : t.modal.confirm}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Range selection dialog (shift-click) */}
      {rangeDialog && (() => {
        const filtered = rangeDialog.allDates.filter((d) => {
          const dow = new Date(d + 'T00:00:00').getDay()
          const isWeekend = dow === 0 || dow === 6
          const isHoliday = isItalianHoliday(d)
          if (isWeekend && !rangeDialog.includeWeekends) return false
          if (isHoliday && !rangeDialog.includeHolidays) return false
          return true
        })
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-sm rounded-xl border border-border bg-bg shadow-xl">
              <div className="px-4 py-4 space-y-3">
                <p className="text-sm font-semibold text-text">{t.bulk.rangeTitle}</p>
                <label className="flex items-center gap-2 text-sm text-text cursor-pointer">
                  <input
                    type="checkbox"
                    className="accent-primary"
                    checked={rangeDialog.includeWeekends}
                    onChange={(e) => setRangeDialog((r) => r && { ...r, includeWeekends: e.target.checked })}
                  />
                  {t.bulk.rangeIncludeWeekends}
                </label>
                <label className="flex items-center gap-2 text-sm text-text cursor-pointer">
                  <input
                    type="checkbox"
                    className="accent-primary"
                    checked={rangeDialog.includeHolidays}
                    onChange={(e) => setRangeDialog((r) => r && { ...r, includeHolidays: e.target.checked })}
                  />
                  {t.bulk.rangeIncludeHolidays}
                </label>
                <p className="text-xs text-text-muted">
                  {fill(t.bulk.rangeDays, { n: filtered.length })}
                </p>
              </div>
              <div className="flex items-center justify-end gap-2 border-t border-border px-4 py-3">
                <Button variant="secondary" size="sm" onClick={() => setRangeDialog(null)}>
                  {t.modal.cancel}
                </Button>
                <Button variant="primary" size="sm" onClick={confirmRangeSelection} disabled={filtered.length === 0}>
                  {t.bulk.rangeConfirm}
                </Button>
              </div>
            </div>
          </div>
        )
      })()}

      {/* Panels */}
      {panel === 'templates' && (
        <TemplatesPanel defaultHours={defaultHours} t={t} onClose={() => setPanel(null)} />
      )}
      {panel === 'trash' && (
        <TrashPanel t={t} locale={t.locale} onClose={() => setPanel(null)} />
      )}
      {showSettings && (
        <SettingsPanel
          contract={contract ?? DEFAULT_CONTRACT}
          month={month}
          t={t}
          onClose={() => setShowSettings(false)}
          onOpenWizard={() => {
            setShowSettings(false)
            setForceShowWizard(true)
          }}
        />
      )}
      </div>

      {/* ── Official Printable Timesheet Sheet (A4 print layout) ── */}
      <div className="hidden print:block font-sans text-black bg-white p-6 min-h-screen">
        {/* Print Header */}
        <div className="flex items-start justify-between border-b-2 border-black pb-4 mb-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight">DexHub — Cartellino Presenze</h1>
            <p className="text-sm font-semibold text-gray-700 mt-1 capitalize">
              Mese di competenza: {formatMonthLabel(month, t.locale)}
            </p>
          </div>
          <div className="text-right text-xs text-gray-600">
            <p>Data stampa: {new Date().toLocaleDateString(t.locale)}</p>
            <p>Orario contrattuale: {defaultHours} ore/giorno</p>
          </div>
        </div>

        {/* Totals Summary */}
        <div className="grid grid-cols-4 gap-2 border border-gray-300 bg-gray-50 p-3 rounded mb-4 text-xs">
          <div>
            <span className="text-gray-500 block">Giorni Lavorati</span>
            <span className="text-base font-bold text-black">{summary?.daysWorked ?? 0} gg</span>
          </div>
          <div>
            <span className="text-gray-500 block">Ore Totali Registrate</span>
            <span className="text-base font-bold text-black">{summary?.totaleRegistrate.toFixed(1) ?? 0} h</span>
          </div>
          <div>
            <span className="text-gray-500 block">Ore Straordinario</span>
            <span className="text-base font-bold text-black">{summary?.oreStraordinario.toFixed(1) ?? 0} h</span>
          </div>
          <div>
            <span className="text-gray-500 block">Buoni Pasto / Mensa</span>
            <span className="text-base font-bold text-black">{summary?.numeroPasti ?? 0}</span>
          </div>
        </div>

        {/* Printable Timesheet Table */}
        <table className="w-full text-xs border-collapse border border-gray-300">
          <thead>
            <tr className="bg-gray-100 border-b border-gray-300 font-semibold text-gray-700">
              <th className="border border-gray-300 p-1.5 text-center w-12">Data</th>
              <th className="border border-gray-300 p-1.5 text-left w-20">Giorno</th>
              <th className="border border-gray-300 p-1.5 text-left">Tipologia / Causale</th>
              <th className="border border-gray-300 p-1.5 text-center w-16">Ordinarie</th>
              <th className="border border-gray-300 p-1.5 text-center w-16">Straord.</th>
              <th className="border border-gray-300 p-1.5 text-center w-12">Mensa</th>
              <th className="border border-gray-300 p-1.5 text-left">Note</th>
            </tr>
          </thead>
          <tbody>
            {printDays.map((d) => (
              <tr key={d.dateStr} className={`border-b border-gray-200 ${d.isHol ? 'bg-amber-50/50' : ''}`}>
                <td className="border border-gray-300 p-1 text-center tabular-nums font-medium">{d.dayNum}</td>
                <td className="border border-gray-300 p-1 capitalize text-gray-600">{d.dow}</td>
                <td className="border border-gray-300 p-1">
                  {d.isHol && !d.kinds.length ? (
                    <span className="text-amber-700 font-medium">{d.holName ?? 'Festivo'}</span>
                  ) : d.kinds.length > 0 ? (
                    <span>
                      {d.kinds.map((k) => t.kind[k] ?? k).join(', ')}
                      {d.isHol && d.holName && <span className="text-amber-700 ml-1">({d.holName})</span>}
                    </span>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </td>
                <td className="border border-gray-300 p-1 text-center tabular-nums font-semibold">
                  {d.ordHours > 0 ? `${d.ordHours.toFixed(1)}h` : '—'}
                </td>
                <td className="border border-gray-300 p-1 text-center tabular-nums text-primary font-semibold">
                  {d.otHours > 0 ? `+${d.otHours.toFixed(1)}h` : '—'}
                </td>
                <td className="border border-gray-300 p-1 text-center text-gray-700">
                  {d.meal ? '✓' : '—'}
                </td>
                <td className="border border-gray-300 p-1 text-gray-500 text-[11px] truncate max-w-xs">
                  {d.note || '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Signatures */}
        <div className="mt-8 pt-6 border-t border-gray-300 grid grid-cols-2 gap-12 text-xs">
          <div className="space-y-8">
            <p className="font-semibold">Firma del Lavoratore:</p>
            <div className="border-b border-dashed border-gray-400 w-48" />
          </div>
          <div className="space-y-8 text-right">
            <p className="font-semibold">Firma del Datore di Lavoro / Responsabile:</p>
            <div className="border-b border-dashed border-gray-400 w-48 ml-auto" />
          </div>
        </div>
      </div>
    </div>
  )
}
