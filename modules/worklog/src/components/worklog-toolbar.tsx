'use client'

import { useState, type ReactNode } from 'react'
import {
  CheckSquare, Search, MoreHorizontal, Download, LayoutTemplate,
  ArchiveRestore, Trash2,
} from 'lucide-react'
import { Button } from '@dexhub/ui'
import { IconTooltip } from './icon-tooltip'
import type { WorklogTranslations } from '../i18n'

export type ToolbarPanel = 'templates' | 'trash'

interface Props {
  t: WorklogTranslations
  onWeekFill: () => void
  weekFillPending: boolean
  selectionMode: boolean
  onToggleSelectionMode: () => void
  showSearch: boolean
  onToggleSearch: () => void
  onExport: (format: 'csv' | 'json') => void
  onOpenPanel: (panel: ToolbarPanel) => void
  onDeleteMonth: () => void
}

function Divider() {
  return <span className="mx-2 h-5 w-px shrink-0 bg-border" aria-hidden="true" />
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
          ? 'flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-error hover:bg-error/10'
          : 'flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-text hover:bg-surface'
      }
    >
      {icon}
      {label}
    </button>
  )
}

export function WorklogToolbar({
  t, onWeekFill, weekFillPending, selectionMode, onToggleSelectionMode,
  showSearch, onToggleSearch, onExport, onOpenPanel, onDeleteMonth,
}: Props) {
  const [showMore, setShowMore] = useState(false)

  function runAndClose(action: () => void) {
    action()
    setShowMore(false)
  }

  return (
    <div className="flex w-full flex-wrap items-center gap-2">
      {/* Group A — frequent actions */}
      <Button variant="primary" size="sm" onClick={onWeekFill} disabled={weekFillPending}>
        {t.commands.week}
      </Button>
      <IconTooltip label={t.bulk.select}>
        <Button variant={selectionMode ? 'outline' : 'ghost'} size="icon" onClick={onToggleSelectionMode}>
          <CheckSquare size={16} />
        </Button>
      </IconTooltip>
      <IconTooltip label={t.search.placeholder}>
        <Button variant={showSearch ? 'outline' : 'ghost'} size="icon" onClick={onToggleSearch}>
          <Search size={16} />
        </Button>
      </IconTooltip>

      <Divider />

      {/* Group B — infrequent actions, tucked behind overflow */}
      <div className="relative">
        <IconTooltip label={t.commands.more}>
          <Button variant="ghost" size="icon" onClick={() => setShowMore((v) => !v)}>
            <MoreHorizontal size={16} />
          </Button>
        </IconTooltip>
        {showMore && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setShowMore(false)} />
            <div className="absolute left-0 top-9 z-20 min-w-[220px] rounded-lg border border-border bg-bg py-1 shadow-lg">
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
  )
}
