'use client'

import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { Button } from '@dexhub/ui'
import {
  useVariabiliFlat,
  useCreateVariabileFlat,
  useDeleteVariabileFlat,
  type VariabileFlatTipo,
} from '../services/worklog-api'
import type { WorklogTranslations } from '../i18n'

interface Props {
  month: string  // 'YYYY-MM' — mese navigato, default del form
  t: WorklogTranslations
}

export function VariabiliFlatPanel({ month, t }: Props) {
  const { data: entries = [] } = useVariabiliFlat()
  const create = useCreateVariabileFlat()
  const remove = useDeleteVariabileFlat()

  const [mese, setMese] = useState(month)
  const [tipo, setTipo] = useState<VariabileFlatTipo>('premio_produzione_feriale')
  const [importoStr, setImportoStr] = useState('')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const importo = importoStr !== '' ? parseFloat(importoStr) : null
  const canSubmit = /^\d{4}-(0[1-9]|1[0-2])$/.test(mese) && importo !== null && importo >= 0 && !saving

  async function handleAdd() {
    if (!canSubmit || importo === null) return
    setSaving(true)
    await create.mutateAsync({ mese, tipo, importo, note: note.trim() || null })
    setImportoStr('')
    setNote('')
    setSaving(false)
  }

  async function handleDelete(id: string) {
    await remove.mutateAsync(id)
    setConfirmDeleteId(null)
  }

  return (
    <div className="flex flex-col gap-4">
      {/* History */}
      {entries.length === 0 ? (
        <p className="text-sm text-text-muted">{t.variabiliFlat.empty}</p>
      ) : (
        <div className="space-y-1.5">
          {entries.map((e) => (
            <div
              key={e.id}
              className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2"
            >
              <div className="flex-1 min-w-0">
                <span className="text-xs font-semibold text-text">{e.mese}</span>
                <span className="ml-2 text-xs text-text-muted">
                  {t.variabiliFlat.tipo[e.tipo]}
                  {' '}
                  {new Intl.NumberFormat(t.locale, { style: 'currency', currency: 'EUR' }).format(e.importo)}
                  {e.note && <> — {e.note}</>}
                </span>
              </div>
              {confirmDeleteId === e.id ? (
                <div className="flex items-center gap-1">
                  <span className="text-xs text-error">{t.variabiliFlat.confirmDelete}</span>
                  <Button variant="danger" size="xs" onClick={() => handleDelete(e.id)}>
                    {t.variabiliFlat.delete}
                  </Button>
                  <Button variant="ghost" size="xs" onClick={() => setConfirmDeleteId(null)}>
                    {t.modal.cancel}
                  </Button>
                </div>
              ) : (
                <Button variant="ghost" size="icon" onClick={() => setConfirmDeleteId(e.id)}>
                  <Trash2 size={14} className="text-text-muted" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add form */}
      <div className="space-y-3 rounded-lg border border-border p-3">
        {/* Mese */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-text-muted">{t.variabiliFlat.mese}</label>
          <input
            type="text"
            value={mese}
            placeholder="YYYY-MM"
            maxLength={7}
            onChange={(e) => {
              const digits = e.target.value.replace(/\D/g, '').slice(0, 6)
              setMese(digits.length > 4 ? `${digits.slice(0, 4)}-${digits.slice(4)}` : digits)
            }}
            className="w-full rounded-md border border-border bg-surface px-3 py-1.5 text-sm text-text focus:border-primary focus:outline-none"
          />
        </div>

        {/* Tipo */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-text-muted">{t.variabiliFlat.tipoLabel}</label>
          <select
            value={tipo}
            onChange={(e) => setTipo(e.target.value as VariabileFlatTipo)}
            className="w-full rounded-md border border-border bg-surface px-3 py-1.5 text-sm text-text focus:border-primary focus:outline-none [&>option]:bg-surface [&>option]:text-text"
          >
            <option value="premio_produzione_feriale">{t.variabiliFlat.tipo.premio_produzione_feriale}</option>
            <option value="premio_produzione_variabile">{t.variabiliFlat.tipo.premio_produzione_variabile}</option>
          </select>
        </div>

        {/* Importo */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-text-muted">{t.variabiliFlat.importo}</label>
          <input
            type="number"
            value={importoStr}
            min={0}
            step={10}
            placeholder="0"
            onChange={(e) => setImportoStr(e.target.value)}
            className="w-full rounded-md border border-border bg-surface px-3 py-1.5 text-sm text-text focus:border-primary focus:outline-none"
          />
        </div>

        {/* Note */}
        <input
          type="text"
          value={note}
          placeholder={t.variabiliFlat.note}
          onChange={(e) => setNote(e.target.value)}
          className="w-full rounded-md border border-border bg-surface px-3 py-1.5 text-sm text-text focus:border-primary focus:outline-none"
        />

        <Button variant="primary" size="sm" onClick={handleAdd} disabled={!canSubmit}>
          {saving ? t.variabiliFlat.saving : t.variabiliFlat.add}
        </Button>
      </div>
    </div>
  )
}
