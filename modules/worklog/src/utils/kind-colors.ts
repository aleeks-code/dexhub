import type { EntryKind } from '../services/worklog-api'

/** Single source of truth for kind → color — EVERY place a kind is shown (cell, legend, select, summary) must read from here. Theme tokens only, never hardcoded. */
export const KIND_COLOR: Record<EntryKind, { dot: string; text: string }> = {
  work: { dot: 'bg-success', text: 'text-success' },
  vacation: { dot: 'bg-orange', text: 'text-orange' },
  leave: { dot: 'bg-info', text: 'text-info' },
  sick: { dot: 'bg-warning', text: 'text-warning' },
  overtime: { dot: 'bg-violet', text: 'text-violet' },
  holiday: { dot: 'bg-pink', text: 'text-pink' },
  cig: { dot: 'bg-error', text: 'text-error' },
  permesso_non_retribuito: { dot: 'bg-cyan', text: 'text-cyan' },
}
