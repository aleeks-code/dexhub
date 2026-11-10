'use client'

import { useEffect, useState } from 'react'
import { Button } from '@dexhub/ui'
import { useCometaConfig, useUpdateCometaConfig, type CometaConfig } from '../services/worklog-api'
import type { WorklogTranslations } from '../i18n'

interface Props {
  t: WorklogTranslations
}

export function CometaConfigPanel({ t }: Props) {
  const { data: existing, isSuccess } = useCometaConfig()
  const update = useUpdateCometaConfig()

  const [iscritto, setIscritto] = useState(existing?.iscritto ?? false)
  // coefficiente è 0-1 nel DB, mostrato come percentuale — stesso pattern sindacato/CIG.
  // Nessun default/placeholder: a differenza della sindacale non c'è una % "tipica" da
  // presupporre, l'utente deve dichiararla esplicitamente — vuoto finché non lo fa.
  const [coefficienteStr, setCoefficienteStr] = useState<string>(
    existing?.coefficiente != null ? String(existing.coefficiente * 100) : '',
  )
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved'>('idle')

  // useState cattura `existing` solo al mount — se la query non è ancora in cache (primo open,
  // niente dato sincrono), il form resta sul default vuoto anche dopo che il dato arriva.
  // Risincronizza qui una volta risolta la query (isSuccess copre sia riga presente sia null).
  useEffect(() => {
    if (!isSuccess) return
    setIscritto(existing?.iscritto ?? false)
    setCoefficienteStr(existing?.coefficiente != null ? String(existing.coefficiente * 100) : '')
  }, [isSuccess, existing])

  const coefficiente = coefficienteStr !== '' ? parseFloat(coefficienteStr) / 100 : null
  const coefficienteValido = coefficiente === null || (coefficiente >= 0 && coefficiente <= 1)
  const canSubmit = coefficienteValido && status !== 'saving'

  async function handleSave() {
    if (!canSubmit) return
    setStatus('saving')
    const body: CometaConfig = {
      iscritto,
      // Persistito as-is anche con iscritto=false — coefficiente è un numero dormiente, il
      // gating "si applica" vive tutto in `iscritto` (lato resolver). Mai forzato a 0 qui.
      coefficiente,
    }
    await update.mutateAsync(body)
    setStatus('saved')
    setTimeout(() => setStatus('idle'), 2000)
  }

  const saveLabel =
    status === 'saving' ? t.cometaConfig.saving : status === 'saved' ? t.cometaConfig.saved : t.cometaConfig.save

  return (
    <div className="flex flex-col gap-4">
      {/* Iscritto */}
      <label className="flex cursor-pointer items-center gap-2 text-sm text-text">
        <input
          type="checkbox"
          checked={iscritto}
          onChange={(e) => setIscritto(e.target.checked)}
          className="accent-primary"
        />
        {t.cometaConfig.iscritto}
      </label>

      {/* Coefficiente */}
      <div className="space-y-1">
        <label className="text-xs font-medium text-text-muted">{t.cometaConfig.coefficiente}</label>
        <input
          type="number"
          value={coefficienteStr}
          min={0}
          max={100}
          step={0.1}
          disabled={!iscritto}
          onChange={(e) => setCoefficienteStr(e.target.value)}
          className="w-full rounded-md border border-border bg-surface px-3 py-1.5 text-sm text-text focus:border-primary focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed"
        />
        <p className="text-xs text-text-muted opacity-70">{t.cometaConfig.coefficienteHint}</p>
      </div>

      <Button variant="primary" size="sm" onClick={handleSave} disabled={!canSubmit}>
        {saveLabel}
      </Button>
    </div>
  )
}
