'use client'

import { useEffect, useState } from 'react'
import { Button } from '@dexhub/ui'
import { useNettoReale, useUpdateNettoReale } from '../services/worklog-api'
import type { WorklogTranslations } from '../i18n'

interface Props {
  month: string  // 'YYYY-MM' — mese navigato, il pannello opera sempre su questo mese
  t: WorklogTranslations
}

export function NettoRealePanel({ month, t }: Props) {
  const { data: existing, isSuccess } = useNettoReale(month)
  const update = useUpdateNettoReale()

  const [nettoStr, setNettoStr] = useState<string>(existing?.netto != null ? String(existing.netto) : '')
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved'>('idle')

  // useState cattura `existing` solo al mount — se la query non è ancora in cache (primo open,
  // o cambio mese col pannello aperto), il form resta indietro. Risincronizza su isSuccess/month,
  // stesso guard già fixato in mensa/cig/sindacato/cometa.
  useEffect(() => {
    if (!isSuccess) return
    setNettoStr(existing?.netto != null ? String(existing.netto) : '')
  }, [isSuccess, existing, month])

  const netto = nettoStr !== '' ? parseFloat(nettoStr) : null
  const canSubmit = netto !== null && netto >= 0 && status !== 'saving'

  async function handleSave() {
    if (!canSubmit || netto === null) return
    setStatus('saving')
    await update.mutateAsync({ mese: month, netto })
    setStatus('saved')
    setTimeout(() => setStatus('idle'), 2000)
  }

  const saveLabel =
    status === 'saving' ? t.nettoRealeConfig.saving : status === 'saved' ? t.nettoRealeConfig.saved : t.nettoRealeConfig.save

  return (
    <div className="flex flex-col gap-4">
      <div className="space-y-1">
        <label className="text-xs font-medium text-text-muted">{t.nettoRealeConfig.netto}</label>
        <div className="relative w-[140px]">
          <input
            type="number"
            value={nettoStr}
            min={0}
            step={0.01}
            placeholder="0.00"
            onChange={(e) => setNettoStr(e.target.value)}
            className="w-full rounded-md border border-border bg-surface px-3 py-1.5 pr-7 text-sm text-text focus:border-primary focus:outline-none"
          />
          <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-xs text-text-muted">€</span>
        </div>
        <p className="text-xs text-text-muted opacity-70">{t.nettoRealeConfig.hint}</p>
      </div>

      <div className="flex justify-end border-t border-border pt-3">
        <Button variant="primary" size="sm" onClick={handleSave} disabled={!canSubmit}>
          {saveLabel}
        </Button>
      </div>
    </div>
  )
}
