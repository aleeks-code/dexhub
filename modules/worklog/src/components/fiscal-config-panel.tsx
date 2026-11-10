'use client'

import { useState } from 'react'
import { Button } from '@dexhub/ui'
import {
  useCcnlList,
  useFiscalConfig,
  useUpsertFiscalConfig,
  type UpsertFiscalConfigInput,
} from '../services/worklog-api'
import type { WorklogTranslations } from '../i18n'

interface Props {
  t: WorklogTranslations
  onClose: () => void
}

export function FiscalConfigPanel({ t, onClose }: Props) {
  const { data: ccnlList = [] } = useCcnlList()
  const { data: fiscalData } = useFiscalConfig()
  const upsert = useUpsertFiscalConfig()

  const existing = fiscalData?.config

  const [ccnlId, setCcnlId] = useState(existing?.ccnlId ?? '')
  const [tipoContratto, setTipoContratto] = useState<'ordinario' | 'apprendistato'>(
    existing?.tipoContratto ?? 'ordinario',
  )
  const [regione, setRegione] = useState(existing?.regione ?? '')
  const [comune, setComune] = useState(existing?.comune ?? '')
  const [addRegionale, setAddRegionale] = useState<string>(
    existing?.aliquotaAddRegionale != null
      ? String((existing.aliquotaAddRegionale * 100).toFixed(4))
      : '',
  )
  const [addComunale, setAddComunale] = useState<string>(
    existing?.aliquotaAddComunale != null
      ? String((existing.aliquotaAddComunale * 100).toFixed(4))
      : '',
  )
  const [mensilita, setMensilita] = useState<13 | 14>(
    existing?.mensilita === 14 ? 14 : 13,
  )
  const [inpsOverride, setInpsOverride] = useState<string>(
    existing?.contributiInpsOverride != null
      ? String((existing.contributiInpsOverride * 100).toFixed(4))
      : '',
  )

  const [status, setStatus] = useState<'idle' | 'saving' | 'saved'>('idle')

  async function handleSave() {
    if (!ccnlId) return
    setStatus('saving')
    const toRate = (s: string) => {
      const n = parseFloat(s)
      return isNaN(n) ? null : n / 100
    }
    const body: UpsertFiscalConfigInput = {
      ccnlId,
      tipoContratto,
      regione: regione.trim() || null,
      comune: comune.trim() || null,
      aliquotaAddRegionale: toRate(addRegionale),
      aliquotaAddComunale: toRate(addComunale),
      mensilita,
      contributiInpsOverride: toRate(inpsOverride),
    }
    await upsert.mutateAsync(body)
    setStatus('saved')
    setTimeout(() => setStatus('idle'), 2000)
  }

  const saveLabel =
    status === 'saving'
      ? t.fiscalConfig.saving
      : status === 'saved'
        ? t.fiscalConfig.saved
        : t.fiscalConfig.save

  return (
    <div className="flex flex-col gap-4">
      {/* CCNL */}
      <div className="space-y-1">
        <label className="text-xs font-medium text-text-muted">{t.fiscalConfig.ccnl}</label>
        <select
          value={ccnlId}
          onChange={(e) => setCcnlId(e.target.value)}
          className="w-full rounded-md border border-border bg-surface px-3 py-1.5 text-sm text-text focus:border-primary focus:outline-none [&>option]:bg-surface [&>option]:text-text"
        >
          <option value="">{t.fiscalConfig.ccnlPh}</option>
          {ccnlList.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nome}
            </option>
          ))}
        </select>
      </div>

      {/* Tipo contratto */}
      <div className="space-y-1">
        <label className="text-xs font-medium text-text-muted">{t.fiscalConfig.tipoContratto}</label>
        <div className="flex gap-3">
          {(['ordinario', 'apprendistato'] as const).map((v) => (
            <label key={v} className="flex cursor-pointer items-center gap-1.5 text-sm text-text">
              <input
                type="radio"
                name="tipoContratto"
                value={v}
                checked={tipoContratto === v}
                onChange={() => setTipoContratto(v)}
                className="accent-primary"
              />
              {v === 'ordinario' ? t.fiscalConfig.ordinario : t.fiscalConfig.apprendistato}
            </label>
          ))}
        </div>
      </div>

      {/* Mensilità */}
      <div className="space-y-1">
        <label className="text-xs font-medium text-text-muted">{t.fiscalConfig.mensilita}</label>
        <div className="flex gap-3">
          {([13, 14] as const).map((v) => (
            <label key={v} className="flex cursor-pointer items-center gap-1.5 text-sm text-text">
              <input
                type="radio"
                name="mensilita"
                value={v}
                checked={mensilita === v}
                onChange={() => setMensilita(v)}
                className="accent-primary"
              />
              {v}
            </label>
          ))}
        </div>
      </div>

      {/* INPS rate override (optional) */}
      <div className="space-y-1">
        <label className="text-xs font-medium text-text-muted">{t.fiscalConfig.inpsOverride}</label>
        <p className="text-xs text-text-muted opacity-70">{t.fiscalConfig.inpsOverrideHint}</p>
        <input
          type="number"
          value={inpsOverride}
          min={0}
          max={100}
          step={0.01}
          placeholder="9.19"
          onChange={(e) => setInpsOverride(e.target.value)}
          className="w-full rounded-md border border-border bg-surface px-2 py-1.5 text-sm text-text focus:border-primary focus:outline-none"
        />
      </div>

      {/* Addizionali (optional) */}
      <div className="space-y-2 rounded-lg border border-border p-3">
        <p className="text-xs font-medium text-text-muted">{t.fiscalConfig.addizionali}</p>
        <p className="text-xs text-text-muted opacity-70">{t.fiscalConfig.addizionaliHint}</p>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <label className="text-xs text-text-muted">{t.fiscalConfig.regione}</label>
            <input
              type="text"
              value={regione}
              placeholder={t.fiscalConfig.regionePh}
              onChange={(e) => setRegione(e.target.value)}
              className="w-full rounded-md border border-border bg-surface px-2 py-1.5 text-sm text-text focus:border-primary focus:outline-none"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-text-muted">{t.fiscalConfig.comune}</label>
            <input
              type="text"
              value={comune}
              placeholder={t.fiscalConfig.comunePh}
              onChange={(e) => setComune(e.target.value)}
              className="w-full rounded-md border border-border bg-surface px-2 py-1.5 text-sm text-text focus:border-primary focus:outline-none"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-text-muted">{t.fiscalConfig.aliquotaRegionale}</label>
            <input
              type="number"
              value={addRegionale}
              min={0}
              max={100}
              step={0.01}
              placeholder="0.00"
              onChange={(e) => setAddRegionale(e.target.value)}
              className="w-full rounded-md border border-border bg-surface px-2 py-1.5 text-sm text-text focus:border-primary focus:outline-none"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-text-muted">{t.fiscalConfig.aliquotaComunale}</label>
            <input
              type="number"
              value={addComunale}
              min={0}
              max={100}
              step={0.01}
              placeholder="0.00"
              onChange={(e) => setAddComunale(e.target.value)}
              className="w-full rounded-md border border-border bg-surface px-2 py-1.5 text-sm text-text focus:border-primary focus:outline-none"
            />
          </div>
        </div>
      </div>

      <Button
        variant="primary"
        size="sm"
        onClick={handleSave}
        disabled={!ccnlId || status === 'saving'}
      >
        {saveLabel}
      </Button>
    </div>
  )
}
