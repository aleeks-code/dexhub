'use client'

import type { Dispatch, SetStateAction } from 'react'
import { X, Plus, AlertTriangle, Moon, Sun, Clock } from 'lucide-react'
import type { EntryInput, EntryKind } from '../services/worklog-api'
import type { WorklogTranslations } from '../i18n'
import { KIND_COLOR } from '../utils/kind-colors'
import { IconTooltip } from './icon-tooltip'

export const ALL_KINDS: EntryKind[] = [
  'work', 'overtime', 'vacation', 'leave', 'sick', 'holiday', 'cig', 'permesso_non_retribuito',
]

const HOURS_WARN_THRESHOLD = 11

interface Props {
  entries: EntryInput[]
  setEntries: Dispatch<SetStateAction<EntryInput[]>>
  defaultHours: number
  t: WorklogTranslations
}

/** Orario esplicito (Step 5.4): attivarlo spegne i flag turno (mutua esclusione, stesso
 * pattern di notturno/pomeridiano) — disattivarlo pulisce i due campi, non li lascia dead. */
function orarioPrecisoAttivo(entry: EntryInput): boolean {
  return entry.modifiers?.orarioInizio !== undefined && entry.modifiers?.orarioFine !== undefined
}

export function EntryEditor({ entries, setEntries, defaultHours, t }: Props) {
  const totalHours = entries.reduce((s, e) => s + (Number(e.hours) || 0), 0)
  const overThreshold = totalHours > HOURS_WARN_THRESHOLD

  function updateEntry(i: number, patch: Partial<EntryInput>) {
    setEntries((prev) => prev.map((e, idx) => idx === i ? { ...e, ...patch } : e))
  }

  // Notturno e pomeridiano sono mutuamente esclusivi (stesse ore, un solo turno):
  // attivare l'uno spegne sempre l'altro.
  function toggleNotturno(i: number) {
    setEntries((prev) => prev.map((e, idx) =>
      idx === i ? { ...e, modifiers: { ...e.modifiers, notturno: !e.modifiers?.notturno, pomeridiano: false } } : e,
    ))
  }

  function togglePomeridiano(i: number) {
    setEntries((prev) => prev.map((e, idx) =>
      idx === i ? { ...e, modifiers: { ...e.modifiers, pomeridiano: !e.modifiers?.pomeridiano, notturno: false } } : e,
    ))
  }

  function toggleOrarioPreciso(i: number) {
    setEntries((prev) => prev.map((e, idx) => {
      if (idx !== i) return e
      if (orarioPrecisoAttivo(e)) {
        const { orarioInizio, orarioFine, ...rest } = e.modifiers ?? {}
        return { ...e, modifiers: rest }
      }
      return { ...e, modifiers: { ...e.modifiers, orarioInizio: '', orarioFine: '', notturno: false, pomeridiano: false } }
    }))
  }

  function addEntry() {
    setEntries((prev) => [...prev, { kind: 'work', hours: defaultHours }])
  }

  function removeEntry(i: number) {
    setEntries((prev) => prev.filter((_, idx) => idx !== i))
  }

  return (
    <div className="space-y-2">
      {entries.map((entry, i) => {
        const orarioAttivo = orarioPrecisoAttivo(entry)
        return (
          <div key={i} className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className={`h-2 w-2 shrink-0 rounded-full ${KIND_COLOR[entry.kind].dot}`} />
              <select
                value={entry.kind}
                onChange={(e) => updateEntry(i, { kind: e.target.value as EntryKind })}
                className="flex-1 rounded-md border border-border bg-surface px-2 py-1.5 text-sm text-text focus:border-primary focus:outline-none [&>option]:bg-surface [&>option]:text-text"
              >
                {ALL_KINDS.map((k) => (
                  <option key={k} value={k}>{t.kind[k]}</option>
                ))}
              </select>
              <input
                type="number"
                min={0}
                max={24}
                step={0.5}
                value={entry.hours}
                onChange={(e) => updateEntry(i, { hours: parseFloat(e.target.value) || 0 })}
                className="w-16 rounded-md border border-border bg-surface px-2 py-1.5 text-sm text-text focus:border-primary focus:outline-none"
              />
              <span className="text-xs text-text-muted">{t.hours}</span>
              {entry.kind === 'work' && (
                <>
                  <IconTooltip label={t.modal.orarioPrecisoModifier}>
                    <button
                      type="button"
                      onClick={() => toggleOrarioPreciso(i)}
                      className={`rounded p-1 ${orarioAttivo ? 'text-text' : 'text-text-muted hover:text-text'}`}
                    >
                      <Clock size={14} fill="none" />
                    </button>
                  </IconTooltip>
                  <IconTooltip label={t.modal.pomeridianoModifier}>
                    <button
                      type="button"
                      onClick={() => togglePomeridiano(i)}
                      disabled={orarioAttivo}
                      className={`rounded p-1 disabled:opacity-30 ${entry.modifiers?.pomeridiano ? 'text-warning' : 'text-text-muted hover:text-text'}`}
                    >
                      <Sun size={14} fill={entry.modifiers?.pomeridiano ? 'currentColor' : 'none'} />
                    </button>
                  </IconTooltip>
                  <IconTooltip label={t.modal.notturnoModifier}>
                    <button
                      type="button"
                      onClick={() => toggleNotturno(i)}
                      disabled={orarioAttivo}
                      className={`rounded p-1 disabled:opacity-30 ${entry.modifiers?.notturno ? 'text-violet' : 'text-text-muted hover:text-text'}`}
                    >
                      <Moon size={14} fill={entry.modifiers?.notturno ? 'currentColor' : 'none'} />
                    </button>
                  </IconTooltip>
                </>
              )}
              {entries.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeEntry(i)}
                  className="rounded p-1 text-text-muted hover:bg-surface hover:text-error"
                >
                  <X size={14} />
                </button>
              )}
            </div>
            {entry.kind === 'work' && orarioAttivo && (
              <div className="ml-4 flex items-center gap-2 rounded-lg bg-surface p-2">
                <input
                  type="time"
                  value={entry.modifiers?.orarioInizio ?? ''}
                  onChange={(e) => updateEntry(i, { modifiers: { ...entry.modifiers, orarioInizio: e.target.value } })}
                  className="rounded-md border border-border bg-bg px-2 py-1 text-sm text-text focus:border-primary focus:outline-none"
                />
                <span className="text-xs text-text-muted">–</span>
                <input
                  type="time"
                  value={entry.modifiers?.orarioFine ?? ''}
                  onChange={(e) => updateEntry(i, { modifiers: { ...entry.modifiers, orarioFine: e.target.value } })}
                  className="rounded-md border border-border bg-bg px-2 py-1 text-sm text-text focus:border-primary focus:outline-none"
                />
                <span className="flex-1 text-xs text-text-muted">{t.modal.orarioPrecisoNote}</span>
              </div>
            )}
          </div>
        )
      })}
      <button
        type="button"
        onClick={addEntry}
        className="flex items-center gap-1.5 text-xs text-text-muted hover:text-primary"
      >
        <Plus size={14} />
        {t.modal.addEntry}
      </button>
      {overThreshold && (
        <div className="flex items-center gap-2 rounded-lg bg-warning/10 px-3 py-2 text-xs text-warning">
          <AlertTriangle size={14} />
          {t.modal.warnOverLimit}
        </div>
      )}
    </div>
  )
}
