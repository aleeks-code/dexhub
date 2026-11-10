'use client'

import { useState } from 'react'
import { AlertTriangle, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@dexhub/ui'
import {
  useFiscalConfig,
  useRetribuzione,
  useCreateRetribuzione,
  useUpdateRetribuzione,
  useDeleteRetribuzione,
  type CreateRetribuzioneInput,
  type RetribuzioneEntry,
} from '../services/worklog-api'
import type { WorklogTranslations } from '../i18n'
import { ComponentAutocomplete } from './component-autocomplete'

// Soft sanity thresholds — warn but never block
const MONTHLY_MIN = 500
const MONTHLY_MAX = 15_000
const HOURLY_MIN = 5
const HOURLY_MAX = 100

function importoWarning(tipo: 'monthly' | 'hourly', importo: number | null, t: WorklogTranslations): string | null {
  if (importo === null) return null
  if (tipo === 'monthly' && (importo < MONTHLY_MIN || importo > MONTHLY_MAX)) return t.retribuzione.warnImportoMonthly
  if (tipo === 'hourly' && (importo < HOURLY_MIN || importo > HOURLY_MAX)) return t.retribuzione.warnImportoHourly
  return null
}

function distinctValues(entries: RetribuzioneEntry[], key: keyof RetribuzioneEntry): number[] {
  const set = new Set<number>()
  for (const e of entries) {
    const v = e[key]
    if (typeof v === 'number') set.add(Math.round(v * 100) / 100)
  }
  return [...set].sort((a, b) => a - b)
}

function fiscalYearWarning(decorrenza: string, availableYears: number[], t: WorklogTranslations): string | null {
  const year = parseInt(decorrenza.slice(0, 4), 10)
  if (!year || availableYears.includes(year)) return null
  return t.retribuzione.warnFiscalYear.replace('{year}', String(year))
}

interface Props {
  t: WorklogTranslations
  onClose: () => void
}

export function RetribuzionePanel({ t, onClose }: Props) {
  const { data: fiscalData } = useFiscalConfig()
  const { data: entries = [] } = useRetribuzione()
  const create = useCreateRetribuzione()
  const update = useUpdateRetribuzione()
  const remove = useDeleteRetribuzione()

  const availableYears = fiscalData?.availableFiscalYears ?? []

  const [editingId, setEditingId] = useState<string | null>(null)
  const [decorrenza, setDecorrenza] = useState('')
  const [tipo, setTipo] = useState<'monthly' | 'hourly'>('monthly')
  const [importoStr, setImportoStr] = useState('')
  const [saving, setSaving] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  // Modalità 1 — scomposizione dichiarata (obbligatoria, solo tipo monthly)
  const [minimoTabellareStr, setMinimoTabellareStr] = useState('')
  const [superminimoStr, setSuperminimoStr] = useState('')
  const [scattiAnzianitaStr, setScattiAnzianitaStr] = useState('')
  const [premioProduzioneFissoStr, setPremioProduzioneFissoStr] = useState('')

  const importo = importoStr !== '' ? parseFloat(importoStr) : null

  const componentiSomma = [minimoTabellareStr, superminimoStr, scattiAnzianitaStr, premioProduzioneFissoStr]
    .reduce((acc, s) => acc + (s !== '' ? parseFloat(s) || 0 : 0), 0)
  const componentiCompleti = tipo !== 'monthly' ||
    [minimoTabellareStr, superminimoStr, scattiAnzianitaStr, premioProduzioneFissoStr].every((s) => s !== '')
  const componentiQuadra = tipo !== 'monthly' ||
    (importo !== null && componentiCompleti && Math.abs(componentiSomma - importo) <= 0.01)

  const minimiSuggeriti = distinctValues(entries, 'minimoTabellare')
  const superminimiSuggeriti = distinctValues(entries, 'superminimo')
  const scattiSuggeriti = distinctValues(entries, 'scattiAnzianita')
  const premiSuggeriti = distinctValues(entries, 'premioProduzioneFisso')

  const fiscalWarn = decorrenza.length >= 4 ? fiscalYearWarning(decorrenza, availableYears, t) : null
  const importoWarn = importo !== null ? importoWarning(tipo, importo, t) : null

  const canSubmit =
    /^\d{4}-(0[1-9]|1[0-2])$/.test(decorrenza) &&
    importo !== null &&
    importo > 0 &&
    componentiCompleti &&
    componentiQuadra &&
    !saving

  function resetForm() {
    setDecorrenza('')
    setImportoStr('')
    setMinimoTabellareStr('')
    setSuperminimoStr('')
    setScattiAnzianitaStr('')
    setPremioProduzioneFissoStr('')
  }

  function startEdit(entry: RetribuzioneEntry) {
    setEditingId(entry.id)
    setDecorrenza(entry.decorrenza)
    setTipo(entry.tipo)
    setImportoStr(String(entry.importo))
    setMinimoTabellareStr(entry.minimoTabellare != null ? String(entry.minimoTabellare) : '')
    setSuperminimoStr(entry.superminimo != null ? String(entry.superminimo) : '')
    setScattiAnzianitaStr(entry.scattiAnzianita != null ? String(entry.scattiAnzianita) : '')
    setPremioProduzioneFissoStr(entry.premioProduzioneFisso != null ? String(entry.premioProduzioneFisso) : '')
  }

  function cancelEdit() {
    setEditingId(null)
    resetForm()
  }

  async function handleSubmit() {
    if (!canSubmit || importo === null) return
    setSaving(true)
    const body: CreateRetribuzioneInput = {
      decorrenza,
      tipo,
      importo,
      ...(tipo === 'monthly' ? {
        minimoTabellare: parseFloat(minimoTabellareStr),
        superminimo: parseFloat(superminimoStr),
        scattiAnzianita: parseFloat(scattiAnzianitaStr),
        premioProduzioneFisso: parseFloat(premioProduzioneFissoStr),
      } : {}),
    }
    if (editingId) {
      await update.mutateAsync({ id: editingId, ...body })
    } else {
      await create.mutateAsync(body)
    }
    setEditingId(null)
    resetForm()
    setSaving(false)
  }

  async function handleDelete(id: string) {
    await remove.mutateAsync(id)
    setConfirmDeleteId(null)
    // Riga in editing cancellata — form altrimenti resterebbe precompilato su un id morto (Salva → 404).
    if (editingId === id) cancelEdit()
  }

  return (
    <div className="flex flex-col gap-4">
      {/* History */}
      {entries.length === 0 ? (
        <p className="text-sm text-text-muted">{t.retribuzione.empty}</p>
      ) : (
        <div className="space-y-1.5">
          {entries.map((e) => (
            <div
              key={e.id}
              className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2"
            >
              <div className="flex-1 min-w-0">
                <span className="text-xs font-semibold text-text">
                  {t.retribuzione.decorrenzaFmt.replace('{month}', e.decorrenza)}
                </span>
                <span className="ml-2 text-xs text-text-muted">
                  {e.tipo === 'monthly' ? t.retribuzione.monthly : t.retribuzione.hourly}
                  {' '}
                  {new Intl.NumberFormat(t.locale, { style: 'currency', currency: 'EUR' }).format(e.importo)}
                  {e.premioFisso != null && (
                    <> + {new Intl.NumberFormat(t.locale, { style: 'currency', currency: 'EUR' }).format(e.premioFisso)}</>
                  )}
                </span>
              </div>
              {confirmDeleteId === e.id ? (
                <div className="flex items-center gap-1">
                  <span className="text-xs text-error">{t.retribuzione.confirmDelete}</span>
                  <Button variant="danger" size="xs" onClick={() => handleDelete(e.id)}>
                    {t.retribuzione.delete}
                  </Button>
                  <Button variant="ghost" size="xs" onClick={() => setConfirmDeleteId(null)}>
                    {t.modal.cancel}
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" onClick={() => startEdit(e)}>
                    <Pencil size={14} className="text-text-muted" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => setConfirmDeleteId(e.id)}>
                    <Trash2 size={14} className="text-text-muted" />
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add form */}
      <div className="space-y-3 rounded-lg border border-border p-3">
        {/* Decorrenza */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-text-muted">{t.retribuzione.decorrenza}</label>
          <input
            type="text"
            value={decorrenza}
            placeholder={t.retribuzione.decorrenzaPh}
            maxLength={7}
            disabled={editingId !== null}
            onChange={(e) => {
              const digits = e.target.value.replace(/\D/g, '').slice(0, 6)
              setDecorrenza(digits.length > 4 ? `${digits.slice(0, 4)}-${digits.slice(4)}` : digits)
            }}
            className="w-full rounded-md border border-border bg-surface px-3 py-1.5 text-sm text-text focus:border-primary focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed"
          />
          {fiscalWarn && (
            <div className="flex gap-1.5 text-xs text-warning">
              <AlertTriangle size={12} className="mt-0.5 shrink-0" />
              <span>{fiscalWarn}</span>
            </div>
          )}
        </div>

        {/* Tipo */}
        <div className="flex gap-3">
          {(['monthly', 'hourly'] as const).map((v) => (
            <label key={v} className="flex cursor-pointer items-center gap-1.5 text-sm text-text">
              <input
                type="radio"
                name="tipo"
                value={v}
                checked={tipo === v}
                onChange={() => setTipo(v)}
                className="accent-primary"
              />
              {v === 'monthly' ? t.retribuzione.monthly : t.retribuzione.hourly}
            </label>
          ))}
        </div>

        {/* Importo */}
        <div className="space-y-1">
          <input
            type="number"
            value={importoStr}
            min={0}
            step={tipo === 'monthly' ? 50 : 0.5}
            placeholder="0"
            onChange={(e) => setImportoStr(e.target.value)}
            className="w-full rounded-md border border-border bg-surface px-3 py-1.5 text-sm text-text focus:border-primary focus:outline-none"
          />
          {importoWarn && (
            <div className="flex gap-1.5 text-xs text-warning">
              <AlertTriangle size={12} className="mt-0.5 shrink-0" />
              <span>{importoWarn}</span>
            </div>
          )}
        </div>

        {/* Modalità 1 — scomposizione dichiarata (obbligatoria, solo monthly) */}
        {tipo === 'monthly' && (
          <div className="space-y-2 border-t border-border pt-3">
            <p className="text-xs font-medium text-text-muted">{t.retribuzione.componentiTitle}</p>
            <div className="space-y-2 rounded-md bg-surface/50 p-2">
              {([
                [t.retribuzione.minimoTabellare, minimoTabellareStr, setMinimoTabellareStr, minimiSuggeriti],
                [t.retribuzione.superminimo, superminimoStr, setSuperminimoStr, superminimiSuggeriti],
                [t.retribuzione.scattiAnzianita, scattiAnzianitaStr, setScattiAnzianitaStr, scattiSuggeriti],
                [t.retribuzione.premioProduzioneFisso, premioProduzioneFissoStr, setPremioProduzioneFissoStr, premiSuggeriti],
              ] as const).map(([label, value, setter, suggestions]) => (
                <div key={label} className="space-y-1">
                  <label className="text-xs text-text-muted after:ml-0.5 after:text-error after:content-['*']">{label}</label>
                  <ComponentAutocomplete
                    value={value}
                    onChange={setter}
                    suggestions={suggestions}
                    placeholder="0"
                    className="w-full rounded-md border border-border bg-surface px-3 py-1.5 text-sm text-text focus:border-primary focus:outline-none"
                  />
                </div>
              ))}
              <div className="flex items-center justify-between text-xs">
                <span className="text-text-muted">{t.retribuzione.componentiSomma}</span>
                <span className="tabular-nums text-text">
                  {new Intl.NumberFormat(t.locale, { style: 'currency', currency: 'EUR' }).format(componentiSomma)}
                </span>
              </div>
              {componentiCompleti && importo !== null && (
                <div className={`flex gap-1.5 text-xs ${componentiQuadra ? 'text-success' : 'text-error'}`}>
                  {!componentiQuadra && <AlertTriangle size={12} className="mt-0.5 shrink-0" />}
                  <span>
                    {componentiQuadra
                      ? t.retribuzione.componentiQuadra
                      : t.retribuzione.componentiBloccato
                          .replace('{somma}', new Intl.NumberFormat(t.locale, { style: 'currency', currency: 'EUR' }).format(componentiSomma))
                          .replace('{totale}', new Intl.NumberFormat(t.locale, { style: 'currency', currency: 'EUR' }).format(importo))}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="flex gap-2">
          {editingId && (
            <Button variant="secondary" size="sm" onClick={cancelEdit}>
              {t.retribuzione.cancel}
            </Button>
          )}
          <Button
            variant="primary"
            size="sm"
            onClick={handleSubmit}
            disabled={!canSubmit}
          >
            {saving ? t.retribuzione.saving : editingId ? t.retribuzione.save : t.retribuzione.add}
          </Button>
        </div>
      </div>
    </div>
  )
}
