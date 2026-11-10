'use client'

import { useEffect, useState } from 'react'
import { Button } from '@dexhub/ui'
import { useSindacatoConfig, useUpsertSindacatoConfig, type UpsertSindacatoConfigInput } from '../services/worklog-api'
import type { WorklogTranslations } from '../i18n'

interface Props {
  t: WorklogTranslations
}

export function SindacatoConfigPanel({ t }: Props) {
  const { data: existing, isSuccess } = useSindacatoConfig()
  const upsert = useUpsertSindacatoConfig()

  const [iscritto, setIscritto] = useState(existing?.iscritto ?? false)
  // coefficiente è 0-1 nel DB, mostrato come percentuale (es. 0.01 → "1") — stesso pattern CIG.
  const [coefficienteStr, setCoefficienteStr] = useState<string>(
    existing?.coefficiente != null ? String(existing.coefficiente * 100) : '1',
  )
  const [nome, setNome] = useState(existing?.nome ?? '')
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved'>('idle')

  // useState cattura `existing` solo al mount — se la query non è ancora in cache (primo open),
  // il form resta sul default anche dopo che il dato arriva. Risincronizza su isSuccess.
  useEffect(() => {
    if (!isSuccess) return
    setIscritto(existing?.iscritto ?? false)
    setCoefficienteStr(existing?.coefficiente != null ? String(existing.coefficiente * 100) : '1')
    setNome(existing?.nome ?? '')
  }, [isSuccess, existing])

  const coefficiente = coefficienteStr !== '' ? parseFloat(coefficienteStr) / 100 : null
  const canSubmit = coefficiente !== null && coefficiente >= 0 && coefficiente <= 1 && status !== 'saving'

  async function handleSave() {
    if (!canSubmit || coefficiente === null) return
    setStatus('saving')
    const body: UpsertSindacatoConfigInput = {
      iscritto,
      // Persistito as-is anche con iscritto=false — coefficiente è un numero dormiente, il
      // gating "si applica" vive tutto in `iscritto` (lato resolver). Mai forzato a 0 qui.
      coefficiente,
      nome: nome.trim() || null,
    }
    await upsert.mutateAsync(body)
    setStatus('saved')
    setTimeout(() => setStatus('idle'), 2000)
  }

  const saveLabel =
    status === 'saving' ? t.sindacatoConfig.saving : status === 'saved' ? t.sindacatoConfig.saved : t.sindacatoConfig.save

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
        {t.sindacatoConfig.iscritto}
      </label>

      {/* Coefficiente */}
      <div className="space-y-1">
        <label className="text-xs font-medium text-text-muted">{t.sindacatoConfig.coefficiente}</label>
        <input
          type="number"
          value={coefficienteStr}
          min={0}
          max={100}
          step={0.1}
          disabled={!iscritto}
          placeholder="1"
          onChange={(e) => setCoefficienteStr(e.target.value)}
          className="w-full rounded-md border border-border bg-surface px-3 py-1.5 text-sm text-text focus:border-primary focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed"
        />
        <p className="text-xs text-text-muted opacity-70">{t.sindacatoConfig.coefficienteHint}</p>
      </div>

      {/* Nome */}
      <div className="space-y-1">
        <input
          type="text"
          value={nome}
          disabled={!iscritto}
          placeholder={t.sindacatoConfig.nome}
          onChange={(e) => setNome(e.target.value)}
          className="w-full rounded-md border border-border bg-surface px-3 py-1.5 text-sm text-text focus:border-primary focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed"
        />
      </div>

      <Button variant="primary" size="sm" onClick={handleSave} disabled={!canSubmit}>
        {saveLabel}
      </Button>
    </div>
  )
}
