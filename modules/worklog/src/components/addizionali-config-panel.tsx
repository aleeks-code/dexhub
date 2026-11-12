'use client'

import { useEffect, useState } from 'react'
import { Receipt } from 'lucide-react'
import { Button } from '@dexhub/ui'
import { useAddizionaliConfig, useUpdateAddizionaliConfig, type AddizionaliConfig } from '../services/worklog-api'
import type { WorklogTranslations } from '../i18n'

interface Props {
  t: WorklogTranslations
}

export function AddizionaliConfigPanel({ t }: Props) {
  const { data: existing, isSuccess } = useAddizionaliConfig()
  const update = useUpdateAddizionaliConfig()

  const [attivo, setAttivo] = useState(existing?.attivo ?? false)
  const [regionaleStr, setRegionaleStr] = useState<string>(
    existing?.addizionaleRegionale != null ? String(existing.addizionaleRegionale) : '0',
  )
  const [comunaleStr, setComunaleStr] = useState<string>(
    existing?.addizionaleComunale != null ? String(existing.addizionaleComunale) : '0',
  )
  const [accontoStr, setAccontoStr] = useState<string>(
    existing?.accontoComunale != null ? String(existing.accontoComunale) : '0',
  )
  const [meseInizio, setMeseInizio] = useState<number>(existing?.meseInizio ?? 3)
  const [meseFine, setMeseFine] = useState<number>(existing?.meseFine ?? 11)
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved'>('idle')

  // useState cattura `existing` solo al mount — se la query non è ancora in cache (primo open),
  // il form resta sul default anche dopo che il dato arriva. Risincronizza su isSuccess.
  useEffect(() => {
    if (!isSuccess) return
    setAttivo(existing?.attivo ?? false)
    setRegionaleStr(existing?.addizionaleRegionale != null ? String(existing.addizionaleRegionale) : '0')
    setComunaleStr(existing?.addizionaleComunale != null ? String(existing.addizionaleComunale) : '0')
    setAccontoStr(existing?.accontoComunale != null ? String(existing.accontoComunale) : '0')
    setMeseInizio(existing?.meseInizio ?? 3)
    setMeseFine(existing?.meseFine ?? 11)
  }, [isSuccess, existing])

  const MONTHS = [
    { value: 1, label: 'Gennaio (01)' },
    { value: 2, label: 'Febbraio (02)' },
    { value: 3, label: 'Marzo (03)' },
    { value: 4, label: 'Aprile (04)' },
    { value: 5, label: 'Maggio (05)' },
    { value: 6, label: 'Giugno (06)' },
    { value: 7, label: 'Luglio (07)' },
    { value: 8, label: 'Agosto (08)' },
    { value: 9, label: 'Settembre (09)' },
    { value: 10, label: 'Ottobre (10)' },
    { value: 11, label: 'Novembre (11)' },
    { value: 12, label: 'Dicembre (12)' },
  ]

  const regionale = regionaleStr !== '' ? parseFloat(regionaleStr) : null
  const comunale = comunaleStr !== '' ? parseFloat(comunaleStr) : null
  const acconto = accontoStr !== '' ? parseFloat(accontoStr) : null
  const canSubmit =
    regionale !== null && regionale >= 0 &&
    comunale !== null && comunale >= 0 &&
    acconto !== null && acconto >= 0 &&
    meseInizio >= 1 && meseInizio <= 12 &&
    meseFine >= 1 && meseFine <= 12 &&
    meseInizio <= meseFine &&
    status !== 'saving'

  async function handleSave() {
    if (!canSubmit || regionale === null || comunale === null || acconto === null) return
    setStatus('saving')
    const body: AddizionaliConfig = {
      attivo,
      // Persistiti as-is anche con attivo=false — sono importi dormienti, il gating "si applica"
      // vive tutto in `attivo` (lato resolver). Mai forzati a 0 qui.
      addizionaleRegionale: regionale,
      addizionaleComunale: comunale,
      accontoComunale: acconto,
      meseInizio,
      meseFine,
    }
    await update.mutateAsync(body)
    setStatus('saved')
    setTimeout(() => setStatus('idle'), 2000)
  }

  const saveLabel =
    status === 'saving' ? t.addizionaliConfig.saving : status === 'saved' ? t.addizionaliConfig.saved : t.addizionaliConfig.save

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
          {t.addizionaliConfig.attivo}
        </label>
        <p className="text-xs text-text-muted opacity-70">{t.addizionaliConfig.attivoHint}</p>
      </div>

      {/* Addizionale regionale */}
      <div className="space-y-1">
        <label className="text-xs font-medium text-text-muted">{t.addizionaliConfig.addizionaleRegionale}</label>
        <div className="relative w-[140px]">
          <input
            type="number"
            value={regionaleStr}
            min={0}
            step={0.01}
            disabled={!attivo}
            placeholder="0.00"
            onChange={(e) => setRegionaleStr(e.target.value)}
            className="w-full rounded-md border border-border bg-surface px-3 py-1.5 pr-7 text-sm text-text focus:border-primary focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed"
          />
          <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-xs text-text-muted">€</span>
        </div>
      </div>

      {/* Addizionale comunale */}
      <div className="space-y-1">
        <label className="text-xs font-medium text-text-muted">{t.addizionaliConfig.addizionaleComunale}</label>
        <div className="relative w-[140px]">
          <input
            type="number"
            value={comunaleStr}
            min={0}
            step={0.01}
            disabled={!attivo}
            placeholder="0.00"
            onChange={(e) => setComunaleStr(e.target.value)}
            className="w-full rounded-md border border-border bg-surface px-3 py-1.5 pr-7 text-sm text-text focus:border-primary focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed"
          />
          <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-xs text-text-muted">€</span>
        </div>
      </div>

      {/* Acconto comunale */}
      <div className="space-y-1">
        <label className="text-xs font-medium text-text-muted">{t.addizionaliConfig.accontoComunale}</label>
        <div className="relative w-[140px]">
          <input
            type="number"
            value={accontoStr}
            min={0}
            step={0.01}
            disabled={!attivo}
            placeholder="0.00"
            onChange={(e) => setAccontoStr(e.target.value)}
            className="w-full rounded-md border border-border bg-surface px-3 py-1.5 pr-7 text-sm text-text focus:border-primary focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed"
          />
          <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-xs text-text-muted">€</span>
        </div>
        <p className="flex items-center gap-1 text-xs text-text-muted opacity-70">
          <Receipt size={12} className="shrink-0" />
          {t.addizionaliConfig.importoHint}
        </p>
      </div>

      {/* Finestra temporale di applicazione */}
      <div className="space-y-2 border-t border-border/50 pt-3">
        <label className="text-xs font-semibold text-text">{t.addizionaliConfig.periodoTitle}</label>
        <p className="text-xs text-text-muted opacity-75">{t.addizionaliConfig.periodoHint}</p>
        <div className="flex flex-wrap items-center gap-3 pt-1">
          <div className="space-y-1">
            <span className="text-[11px] text-text-muted">{t.addizionaliConfig.meseInizio}</span>
            <select
              value={meseInizio}
              disabled={!attivo}
              onChange={(e) => setMeseInizio(parseInt(e.target.value, 10))}
              className="rounded-md border border-border bg-surface px-2.5 py-1.5 text-xs text-text focus:border-primary focus:outline-none disabled:opacity-60"
            >
              {MONTHS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
          <span className="text-xs text-text-muted self-end pb-2">→</span>
          <div className="space-y-1">
            <span className="text-[11px] text-text-muted">{t.addizionaliConfig.meseFine}</span>
            <select
              value={meseFine}
              disabled={!attivo}
              onChange={(e) => setMeseFine(parseInt(e.target.value, 10))}
              className="rounded-md border border-border bg-surface px-2.5 py-1.5 text-xs text-text focus:border-primary focus:outline-none disabled:opacity-60"
            >
              {MONTHS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        {meseInizio > meseFine && (
          <p className="text-xs text-rose-500 font-medium pt-1">
            Il mese di inizio deve essere antecedente o uguale al mese di fine.
          </p>
        )}
      </div>

      <div className="flex justify-end border-t border-border pt-3">
        <Button variant="primary" size="sm" onClick={handleSave} disabled={!canSubmit}>
          {saveLabel}
        </Button>
      </div>
    </div>
  )
}
