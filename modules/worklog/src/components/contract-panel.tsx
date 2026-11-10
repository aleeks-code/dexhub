'use client'

import { useState } from 'react'
import { Button } from '@dexhub/ui'
import { useUpdateContract, type ContractConfig } from '../services/worklog-api'
import type { WorklogTranslations } from '../i18n'

const ISO_DAYS = [1, 2, 3, 4, 5, 6, 7] as const

function NumInput({
  label,
  value,
  onChange,
  step = 0.5,
  min = 0,
}: {
  label: string
  value: number | null
  onChange: (v: number | null) => void
  step?: number
  min?: number
}) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-text-muted">{label}</label>
      <input
        type="number"
        min={min}
        step={step}
        value={value ?? ''}
        placeholder="—"
        onChange={(e) => {
          const v = parseFloat(e.target.value)
          onChange(isNaN(v) ? null : v)
        }}
        className="w-full rounded-md border border-border bg-surface px-3 py-1.5 text-sm text-text focus:border-primary focus:outline-none"
      />
    </div>
  )
}

interface Props {
  contract: ContractConfig
  t: WorklogTranslations
  onClose: () => void
}

export function ContractPanel({ contract, t, onClose }: Props) {
  const [oreGiornaliere, setOreGiornaliere] = useState(contract.oreGiornaliereStandard)
  const [oreSettimanali, setOreSettimanali] = useState(contract.oreLavorativeSettimanali)
  const [giorni, setGiorni] = useState<number[]>(contract.giorniLavorativiSettimana)
  const [saldoAllaData, setSaldoAllaData] = useState(contract.saldoAllaData ?? '')
  const [ferieIniziali, setFerieIniziali] = useState<number | null>(contract.ferieResidueOreIniziali)
  const [permessiIniziali, setPermessiIniziali] = useState<number | null>(contract.permessiResiduiOreIniziali)
  const [rateoFerie, setRateoFerie] = useState<number | null>(contract.rateoFerieMensile)
  const [rateoPermessi, setRateoPermessi] = useState<number | null>(contract.rateoPermessiMensile)
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const update = useUpdateContract()

  function toggleDay(d: number) {
    setGiorni((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort((a, b) => a - b),
    )
  }

  async function handleSave() {
    setStatus('saving')
    await update.mutateAsync({
      oreGiornaliereStandard: oreGiornaliere,
      oreLavorativeSettimanali: oreSettimanali,
      giorniLavorativiSettimana: giorni,
      saldoAllaData: saldoAllaData || null,
      ferieResidueOreIniziali: ferieIniziali,
      permessiResiduiOreIniziali: permessiIniziali,
      rateoFerieMensile: rateoFerie,
      rateoPermessiMensile: rateoPermessi,
    })
    setStatus('saved')
    setTimeout(() => setStatus('idle'), 2000)
  }

  const saveLabel = status === 'saving' ? t.contract.saving : status === 'saved' ? t.contract.saved : t.contract.save

  return (
    <div>
      <div className="space-y-4">
        <NumInput label={t.contract.oreGiornaliere} value={oreGiornaliere} onChange={(v) => setOreGiornaliere(v ?? 8)} min={1} />
        <NumInput label={t.contract.oreSettimanali} value={oreSettimanali} onChange={(v) => setOreSettimanali(v ?? 40)} min={1} />

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-text-muted">{t.contract.giorniLavorativi}</label>
          <div className="flex gap-1.5 flex-wrap">
            {ISO_DAYS.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => toggleDay(d)}
                className={[
                  'rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                  giorni.includes(d)
                    ? 'bg-primary text-white'
                    : 'border border-border text-text-muted hover:bg-surface',
                ].join(' ')}
              >
                {t.contract.days[String(d)]}
              </button>
            ))}
          </div>
        </div>

        <div className="border-t border-border pt-4 space-y-3">
          <div className="space-y-1">
            <label className="text-xs font-medium text-text-muted">{t.contract.saldoAllaData}</label>
            <input
              type="date"
              value={saldoAllaData}
              onChange={(e) => setSaldoAllaData(e.target.value)}
              className="w-full rounded-md border border-border bg-surface px-3 py-1.5 text-sm text-text focus:border-primary focus:outline-none"
            />
          </div>
          <NumInput label={t.contract.ferieIniziali} value={ferieIniziali} onChange={setFerieIniziali} />
          <NumInput label={t.contract.permessiIniziali} value={permessiIniziali} onChange={setPermessiIniziali} />
          <NumInput label={t.contract.rateoFerie} value={rateoFerie} onChange={setRateoFerie} />
          <NumInput label={t.contract.rateoPermessi} value={rateoPermessi} onChange={setRateoPermessi} />
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 border-t border-border pt-3 mt-4">
        <Button variant="secondary" size="sm" onClick={onClose} disabled={update.isPending}>{t.modal.cancel}</Button>
        <Button variant="primary" size="sm" onClick={handleSave} disabled={update.isPending}>
          {saveLabel}
        </Button>
      </div>
    </div>
  )
}

