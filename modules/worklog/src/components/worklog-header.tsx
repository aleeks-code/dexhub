'use client'

import { useState, type ReactNode } from 'react'
import {
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Settings,
  Zap,
  CheckSquare,
  Search,
  MoreHorizontal,
  Download,
  LayoutTemplate,
  ArchiveRestore,
  Trash2,
  Sparkles,
  Printer,
  X,
  FileUp,
} from 'lucide-react'
import { Button } from '@dexhub/ui'
import { IconTooltip } from './icon-tooltip'
import { MonthYearPicker } from './month-year-picker'
import type { WorklogTranslations } from '../i18n'
import type { ContractConfig, MonthlySummary } from '../services/worklog-api'

export type ToolbarPanel = 'templates' | 'trash'

export function formatCcnlLabel(ccnlId?: string | null): string {
  if (!ccnlId) return 'CCNL non configurato'
  if (ccnlId === 'metalmeccanica-industria') return 'CCNL Metalmeccanico'
  if (ccnlId === 'commercio-terziario') return 'CCNL Commercio'
  if (ccnlId === 'chimico-farmaceutico') return 'CCNL Chimico'
  if (ccnlId === 'credito-bancari') return 'CCNL Bancari'
  return ccnlId.replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())
}

function parseYYYYMM(yyyymm: string): [number, number] {
  const parts = yyyymm.split('-')
  return [parseInt(parts[0] ?? '2000', 10), parseInt(parts[1] ?? '1', 10)]
}

function formatMonthLabel(yyyymm: string, locale: string): string {
  const [y, m] = parseYYYYMM(yyyymm)
  return new Date(y, m - 1, 1).toLocaleDateString(locale, { month: 'long', year: 'numeric' })
}

function todayYYYYMM(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function fill(template: string, vars: Record<string, number | string>): string {
  return template.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? 0))
}

function MenuItem({
  onClick,
  icon,
  label,
  danger = false,
}: {
  onClick: () => void
  icon: ReactNode
  label: string
  danger?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        danger
          ? 'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-medium text-error hover:bg-error/10 cursor-pointer transition-colors'
          : 'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-medium text-text hover:bg-surface-raised cursor-pointer transition-colors'
      }
    >
      {icon}
      <span>{label}</span>
    </button>
  )
}

interface WorklogHeaderProps {
  t: WorklogTranslations
  month: string
  onMonthChange: (delta: number) => void
  onMonthSelect: (yyyymm: string) => void
  onToday: () => void
  onOpenSettings: () => void
  contract?: ContractConfig | null
  summary?: MonthlySummary | null
  ccnlId?: string | null

  // Toolbar actions
  onWeekFill: () => void
  weekFillPending: boolean
  onMonthFill?: () => void
  monthFillPending?: boolean
  selectionMode: boolean
  onToggleSelectionMode: () => void
  selectedCount: number
  hasDaysToDelete: boolean
  onBulkDelete: () => void
  onBulkApply: () => void

  // Search
  searchQuery: string
  onSearchChange: (q: string) => void
  onSearchClear: () => void

  // More options
  onImportCedolino?: () => void
  onOpenWizard?: () => void
  onPrint?: () => void
  onExport: (format: 'csv' | 'json') => void
  onOpenPanel: (panel: ToolbarPanel) => void
  onDeleteMonth: () => void
}

export function WorklogHeader({
  t,
  month,
  onMonthChange,
  onMonthSelect,
  onToday,
  onOpenSettings,
  contract,
  summary,
  ccnlId,
  onWeekFill,
  weekFillPending,
  onMonthFill,
  monthFillPending,
  selectionMode,
  onToggleSelectionMode,
  selectedCount,
  hasDaysToDelete,
  onBulkDelete,
  onBulkApply,
  searchQuery,
  onSearchChange,
  onSearchClear,
  onImportCedolino,
  onOpenWizard,
  onPrint,
  onExport,
  onOpenPanel,
  onDeleteMonth,
}: WorklogHeaderProps) {
  const [showMore, setShowMore] = useState(false)

  function runAndClose(action: () => void) {
    action()
    setShowMore(false)
  }

  const isPending = weekFillPending || !!monthFillPending
  const giorniLavorabili = summary?.giorniLavorabiliMese ?? 0
  const oreStandard = contract?.oreGiornaliereStandard ?? 8
  const orePreviste = giorniLavorabili * oreStandard
  const isCurrentMonth = month === todayYYYYMM()

  return (
    <header className="mb-6 rounded-2xl border border-border bg-surface/50 backdrop-blur-md p-4 sm:p-5 shadow-sm space-y-4">
      {/* ── Riga Superiore: Identità, Metadati Mensili Dinamici & Navigatore Mese ── */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        {/* Sinistra: Icona, Titolo e Informazioni Vive del Mese (Opzione 4) */}
        <div className="flex items-center gap-3.5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/25 via-primary/10 to-primary/5 text-primary border border-primary/30 shadow-md shadow-primary/10">
            <CalendarClock size={22} />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-text leading-tight">
              {t.title}
            </h1>
            {summary ? (
              <p className="text-xs text-text-muted mt-1 flex items-center gap-1.5 sm:gap-2 flex-wrap">
                <span className="font-medium text-text">
                  {summary.giorniLavorabiliMese} {t.summary.workableDays.toLowerCase()}
                </span>
                <span className="text-text-subtle">•</span>
                <span>
                  {orePreviste}h {t.locale.startsWith('it') ? 'previste' : 'expected'}
                </span>
                <span className="text-text-subtle">•</span>
                <span
                  className={
                    summary.giorniConBuco > 0
                      ? 'text-warning font-medium'
                      : isCurrentMonth
                        ? 'text-primary font-medium'
                        : 'text-text'
                  }
                >
                  {summary.giorniRegistrati} {t.locale.startsWith('it') ? 'di' : 'of'} {summary.giorniLavorabiliMese} {t.locale.startsWith('it') ? 'registrati' : 'logged'}
                </span>
                {isCurrentMonth && (
                  <>
                    <span className="text-text-subtle hidden sm:inline">•</span>
                    <span className="hidden sm:inline-flex items-center rounded-full bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 text-[10px] font-semibold">
                      {t.locale.startsWith('it') ? 'Mese in corso' : 'Current month'}
                    </span>
                  </>
                )}
              </p>
            ) : (
              <p className="text-xs text-text-muted mt-1">
                {t.subtitle}
              </p>
            )}
          </div>
        </div>

        {/* Destra: Segmented Month Navigator + Oggi + Impostazioni */}
        <div className="flex items-center gap-2 self-start lg:self-auto flex-wrap sm:flex-nowrap">
          {/* Segmented Month Navigation Pill */}
          <div className="inline-flex items-center rounded-xl border border-border bg-surface-raised/80 p-0.5 shadow-xs">
            <IconTooltip label={t.prevMonth}>
              <button
                type="button"
                onClick={() => onMonthChange(-1)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-text-muted hover:text-text hover:bg-surface transition-colors cursor-pointer"
                aria-label={t.prevMonth}
              >
                <ChevronLeft size={16} />
              </button>
            </IconTooltip>

            <div className="px-2">
              <MonthYearPicker
                label={formatMonthLabel(month, t.locale)}
                month={month}
                todayYYYYMM={todayYYYYMM()}
                locale={t.locale}
                onSelect={onMonthSelect}
              />
            </div>

            <IconTooltip label={t.nextMonth}>
              <button
                type="button"
                onClick={() => onMonthChange(1)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-text-muted hover:text-text hover:bg-surface transition-colors cursor-pointer"
                aria-label={t.nextMonth}
              >
                <ChevronRight size={16} />
              </button>
            </IconTooltip>
          </div>

          {/* Oggi button */}
          <button
            type="button"
            onClick={onToday}
            className="h-9 px-3 rounded-xl border border-border bg-surface-raised/80 hover:bg-surface text-xs font-semibold text-text transition-colors cursor-pointer shadow-xs active:scale-95"
          >
            {t.today}
          </button>

          {/* Settings button */}
          <IconTooltip label={t.settings.title}>
            <button
              type="button"
              onClick={onOpenSettings}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-surface-raised/80 hover:bg-surface text-text-muted hover:text-text transition-colors cursor-pointer shadow-xs active:scale-95"
              aria-label={t.settings.title}
            >
              <Settings size={16} />
            </button>
          </IconTooltip>
        </div>
      </div>

      {/* ── Riga Inferiore: Toolbar Azioni & Strumenti (o Barra Selezione) ── */}
      <div className="border-t border-border/50 pt-3">
        {selectionMode ? (
          /* Modalità Selezione Multipla Attiva */
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-primary/40 bg-primary/10 px-3.5 py-2">
            <span className="text-xs font-semibold text-primary">
              {fill(t.bulk.selected, { n: selectedCount })}
            </span>
            <div className="flex items-center gap-2">
              {selectedCount > 0 && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onBulkDelete}
                    disabled={!hasDaysToDelete}
                    className="h-7 text-xs text-error hover:bg-error/10 hover:text-error cursor-pointer"
                  >
                    {t.bulk.delete}
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={onBulkApply}
                    className="h-7 text-xs shadow-xs cursor-pointer"
                  >
                    {t.bulk.apply}
                  </Button>
                </>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={onToggleSelectionMode}
                className="h-7 text-xs cursor-pointer"
              >
                {t.bulk.cancelSelection}
              </Button>
            </div>
          </div>
        ) : (
          /* Toolbar Standard */
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Sinistra: Azioni Frequenti di Compilazione e Selezione */}
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant="primary"
                size="sm"
                onClick={onWeekFill}
                disabled={isPending}
                className="h-8 gap-1.5 px-3 text-xs font-semibold shadow-xs bg-primary hover:bg-primary/90 text-bg cursor-pointer"
              >
                <Zap size={13} className="fill-current" />
                <span>{t.commands.week}</span>
              </Button>

              {onMonthFill && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onMonthFill}
                  disabled={isPending}
                  className="h-8 text-xs font-medium border-border bg-surface-raised/40 hover:bg-surface-raised cursor-pointer"
                >
                  <span>{t.commands.month}</span>
                </Button>
              )}

              {onImportCedolino && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onImportCedolino}
                  className="h-8 gap-1.5 text-xs font-medium border-border bg-surface-raised/40 hover:bg-surface-raised cursor-pointer"
                >
                  <FileUp size={13} className="text-primary" />
                  <span className="hidden md:inline">Importa cedolino</span>
                </Button>
              )}

              <Button
                variant={selectionMode ? 'outline' : 'ghost'}
                size="sm"
                onClick={onToggleSelectionMode}
                className="h-8 gap-1.5 text-xs font-medium text-text-muted hover:text-text hover:bg-surface-raised cursor-pointer"
              >
                <CheckSquare size={14} />
                <span>{t.bulk.select}</span>
              </Button>
            </div>

            {/* Destra: Campo Ricerca & Menu Altre Opzioni */}
            <div className="flex items-center gap-2">
              {/* Ricerca Rapida */}
              <div className="relative">
                <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => onSearchChange(e.target.value)}
                  placeholder={t.search.placeholder}
                  className="h-8 w-44 sm:w-56 rounded-xl border border-border bg-surface-raised/70 pl-8 pr-7 text-xs text-text placeholder:text-text-muted focus:border-primary focus:bg-surface focus:outline-none transition-all shadow-xs"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={onSearchClear}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-text cursor-pointer p-0.5"
                    title="Cancella ricerca"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>

              {/* Menu Altre Opzioni */}
              <div className="relative">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowMore((v) => !v)}
                  className="h-8 gap-1 text-xs font-medium border-border bg-surface-raised/40 hover:bg-surface-raised cursor-pointer"
                >
                  <MoreHorizontal size={14} />
                  <span className="hidden sm:inline">{t.commands.more}</span>
                  <ChevronDown size={12} className={`text-text-muted transition-transform ${showMore ? 'rotate-180' : ''}`} />
                </Button>

                {showMore && (
                  <>
                    <div className="fixed inset-0 z-30" onClick={() => setShowMore(false)} />
                    <div className="absolute right-0 top-9.5 z-40 min-w-[220px] rounded-xl border border-border bg-bg py-1 shadow-xl">
                      {onOpenWizard && (
                        <>
                          <MenuItem
                            icon={<Sparkles size={14} className="text-primary" />}
                            label="Configurazione Guidata"
                            onClick={() => runAndClose(onOpenWizard)}
                          />
                          <div className="my-1 border-t border-border" />
                        </>
                      )}
                      {onImportCedolino && (
                        <MenuItem
                          icon={<FileUp size={14} className="text-primary" />}
                          label="Importa cedolino (PDF)"
                          onClick={() => runAndClose(onImportCedolino)}
                        />
                      )}
                      {onPrint && (
                        <MenuItem
                          icon={<Printer size={14} />}
                          label={t.export.pdf}
                          onClick={() => runAndClose(onPrint)}
                        />
                      )}
                      <MenuItem
                        icon={<Download size={14} />}
                        label={`${t.export.title} ${t.export.csv}`}
                        onClick={() => runAndClose(() => onExport('csv'))}
                      />
                      <MenuItem
                        icon={<Download size={14} />}
                        label={`${t.export.title} ${t.export.json}`}
                        onClick={() => runAndClose(() => onExport('json'))}
                      />
                      <MenuItem
                        icon={<LayoutTemplate size={14} />}
                        label={t.templates.title}
                        onClick={() => runAndClose(() => onOpenPanel('templates'))}
                      />
                      <div className="my-1 border-t border-border" />
                      <MenuItem
                        icon={<ArchiveRestore size={14} />}
                        label={t.trash.title}
                        onClick={() => runAndClose(() => onOpenPanel('trash'))}
                      />
                      <div className="my-1 border-t border-border" />
                      <MenuItem
                        icon={<Trash2 size={14} />}
                        label={t.trash.deleteMonth}
                        danger
                        onClick={() => runAndClose(onDeleteMonth)}
                      />
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  )
}
