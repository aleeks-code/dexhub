'use client'

import { useEffect, useState } from 'react'
import { Button } from '@dexhub/ui'
import { useCigConfig, useUpsertCigConfig, type UpsertCigConfigInput } from '../services/worklog-api'
import type { WorklogTranslations } from '../i18n'

interface Props {
  t: WorklogTranslations
}

export function CigConfigPanel({ t }: Props) {
  const { data: existing, isSuccess } = useCigConfig()
  const upsert = useUpsertCigConfig()

  // coefficiente è 0-1 nel DB, mostrato come percentuale (es. 0.596 → "59.6") — stesso pattern
  // delle addizionali regionali/comunali in fiscal-config-panel.
  const [coefficienteStr, setCoefficienteStr] = useState<string>(
    existing?.coefficiente != null ? String(existing.coefficiente * 100) : '59.6',
  )
  const [massimaleStr, setMassimaleStr] = useState<string>(
    existing?.massimaleMensile != null ? String(existing.massimaleMensile) : '',
  )
  const [note, setNote] = useState(existing?.note ?? '')
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved'>('idle')

  // useState cattura `existing` solo al mount — se la query non è ancora in cache (primo open),
  // il form resta sul default anche dopo che il dato arriva. Risincronizza su isSuccess.
  useEffect(() => {
    if (!isSuccess) return
    setCoefficienteStr(existing?.coefficiente != null ? String(existing.coefficiente * 100) : '59.6')
    setMassimaleStr(existing?.massimaleMensile != null ? String(existing.massimaleMensile) : '')
    setNote(existing?.note ?? '')
  }, [isSuccess, existing])

  const coefficiente = coefficienteStr !== '' ? parseFloat(coefficienteStr) / 100 : null
  const canSubmit = coefficiente !== null && coefficiente >= 0 && coefficiente <= 1 && status !== 'saving'

  async function handleSave() {
    if (!canSubmit || coefficiente === null) return
    setStatus('saving')
    const massimale = massimaleStr !== '' ? parseFloat(massimaleStr) : null
    const body: UpsertCigConfigInput = {
      tipo: 'solidarieta',
      coefficiente,
      massimaleMensile: massimale != null && !isNaN(massimale) ? massimale : null,
      note: note.trim() || null,
    }
    await upsert.mutateAsync(body)
    setStatus('saved')
    setTimeout(() => setStatus('idle'), 2000)
  }

  const saveLabel =
    status === 'saving' ? t.cigConfig.saving : status === 'saved' ? t.cigConfig.saved : t.cigConfig.save

  return (
    <div className="flex flex-col gap-4">
      {/* Coefficiente integrazione */}
      <div className="space-y-1">
        <label className="text-xs font-medium text-text-muted">{t.cigConfig.coefficiente}</label>
        <input
          type="number"
          value={coefficienteStr}
          min={0}
          max={100}
          step={0.1}
          placeholder="59.6"
          onChange={(e) => setCoefficienteStr(e.target.value)}
          className="w-full rounded-md border border-border bg-surface px-3 py-1.5 text-sm text-text focus:border-primary focus:outline-none"
        />
        <p className="text-xs text-text-muted opacity-70">{t.cigConfig.coefficienteHint}</p>
      </div>

      {/* Massimale mensile (predisposto, non usato v1) */}
      <div className="space-y-1">
        <label className="text-xs font-medium text-text-muted">{t.cigConfig.massimaleMensile}</label>
        <input
          type="number"
          value={massimaleStr}
          min={0}
          step={10}
          placeholder="0"
          onChange={(e) => setMassimaleStr(e.target.value)}
          className="w-full rounded-md border border-border bg-surface px-3 py-1.5 text-sm text-text focus:border-primary focus:outline-none"
        />
        <p className="text-xs text-text-muted opacity-70">{t.cigConfig.massimaleMensileHint}</p>
      </div>

      {/* Note */}
      <input
        type="text"
        value={note}
        placeholder={t.cigConfig.note}
        onChange={(e) => setNote(e.target.value)}
        className="w-full rounded-md border border-border bg-surface px-3 py-1.5 text-sm text-text focus:border-primary focus:outline-none"
      />

      <Button variant="primary" size="sm" onClick={handleSave} disabled={!canSubmit}>
        {saveLabel}
      </Button>
    </div>
  )
}
