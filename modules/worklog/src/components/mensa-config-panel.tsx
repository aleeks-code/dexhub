'use client'

import { useEffect, useState } from 'react'
import { Receipt } from 'lucide-react'
import { Button } from '@dexhub/ui'
import { useMensaConfig, useUpdateMensaConfig, type MensaConfig } from '../services/worklog-api'
import type { WorklogTranslations } from '../i18n'

interface Props {
  t: WorklogTranslations
}

export function MensaConfigPanel({ t }: Props) {
  const { data: existing, isSuccess } = useMensaConfig()
  const update = useUpdateMensaConfig()

  const [attivo, setAttivo] = useState(existing?.attivo ?? false)
  const [importoStr, setImportoStr] = useState<string>(
    existing?.importo != null ? String(existing.importo) : '0.77',
  )
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved'>('idle')

  // useState cattura `existing` solo al mount — se la query non è ancora in cache (primo open),
  // il form resta sul default anche dopo che il dato arriva. Risincronizza su isSuccess.
  useEffect(() => {
    if (!isSuccess) return
    setAttivo(existing?.attivo ?? false)
    setImportoStr(existing?.importo != null ? String(existing.importo) : '0.77')
  }, [isSuccess, existing])

  const importo = importoStr !== '' ? parseFloat(importoStr) : null
  const canSubmit = importo !== null && importo >= 0 && status !== 'saving'

  async function handleSave() {
    if (!canSubmit || importo === null) return
    setStatus('saving')
    const body: MensaConfig = {
      attivo,
      // Persistito as-is anche con attivo=false — importo è un numero dormiente, il gating
      // "si applica" vive tutto in `attivo` (lato resolver). Mai forzato a 0 qui.
      importo,
    }
    await update.mutateAsync(body)
    setStatus('saved')
    setTimeout(() => setStatus('idle'), 2000)
  }

  const saveLabel =
    status === 'saving' ? t.mensaConfig.saving : status === 'saved' ? t.mensaConfig.saved : t.mensaConfig.save

  return (
    <div className="flex flex-col gap-4">
      {/* Attivo */}
      <div className="space-y-1">
        <label className="flex cursor-pointer items-center gap-2 text-sm text-text">
          <input
            type="checkbox"
            checked={attivo}
            onChange={(e) => setAttivo(e.target.checked)}
            className="accent-primary"
          />
          {t.mensaConfig.attivo}
        </label>
        <p className="text-xs text-text-muted opacity-70">{t.mensaConfig.attivoHint}</p>
      </div>

      {/* Importo pasto */}
      <div className="space-y-1">
        <label className="text-xs font-medium text-text-muted">{t.mensaConfig.importo}</label>
        <div className="relative w-[140px]">
          <input
            type="number"
            value={importoStr}
            min={0}
            step={0.01}
            disabled={!attivo}
            placeholder="0.77"
            onChange={(e) => setImportoStr(e.target.value)}
            className="w-full rounded-md border border-border bg-surface px-3 py-1.5 pr-7 text-sm text-text focus:border-primary focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed"
          />
          <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-xs text-text-muted">€</span>
        </div>
        <p className="flex items-center gap-1 text-xs text-text-muted opacity-70">
          <Receipt size={12} className="shrink-0" />
          {t.mensaConfig.importoHint}
        </p>
      </div>

      <div className="flex justify-end border-t border-border pt-3">
        <Button variant="primary" size="sm" onClick={handleSave} disabled={!canSubmit}>
          {saveLabel}
        </Button>
      </div>
    </div>
  )
}
