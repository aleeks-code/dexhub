'use client'

import { useState } from 'react'
import { X, FileText, Landmark, Wallet, TrendingUp, PiggyBank, Users, Utensils, Vault, Receipt, ScrollText } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { ContractConfig } from '../services/worklog-api'
import type { WorklogTranslations } from '../i18n'
import { ContractPanel } from './contract-panel'
import { FiscalConfigPanel } from './fiscal-config-panel'
import { RetribuzionePanel } from './retribuzione-panel'
import { VariabiliFlatPanel } from './variabili-flat-panel'
import { CigConfigPanel } from './cig-config-panel'
import { SindacatoConfigPanel } from './sindacato-config-panel'
import { MensaConfigPanel } from './mensa-config-panel'
import { CometaConfigPanel } from './cometa-config-panel'
import { AddizionaliConfigPanel } from './addizionali-config-panel'
import { NettoRealePanel } from './netto-reale-panel'

type SettingsTab =
  | 'contract' | 'fiscal-config' | 'retribuzione' | 'variabili-flat' | 'cig-config' | 'sindacato-config'
  | 'mensa-config' | 'cometa-config' | 'addizionali-config' | 'netto-reale'

interface Props {
  contract: ContractConfig
  month: string  // 'YYYY-MM' — mese navigato, default del form variabili flat
  t: WorklogTranslations
  onClose: () => void
}

export function SettingsPanel({ contract, month, t, onClose }: Props) {
  const [tab, setTab] = useState<SettingsTab>('contract')

  const tabs: { key: SettingsTab; label: string; icon: LucideIcon }[] = [
    { key: 'contract', label: t.contract.title, icon: FileText },
    { key: 'fiscal-config', label: t.fiscalConfig.title, icon: Landmark },
    { key: 'retribuzione', label: t.retribuzione.title, icon: Wallet },
    { key: 'variabili-flat', label: t.variabiliFlat.title, icon: TrendingUp },
    { key: 'cig-config', label: t.cigConfig.title, icon: PiggyBank },
    { key: 'sindacato-config', label: t.sindacatoConfig.title, icon: Users },
    { key: 'mensa-config', label: t.mensaConfig.title, icon: Utensils },
    { key: 'cometa-config', label: t.cometaConfig.title, icon: Vault },
    { key: 'addizionali-config', label: t.addizionaliConfig.title, icon: Receipt },
    { key: 'netto-reale', label: t.nettoRealeConfig.title, icon: ScrollText },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-xl border border-border bg-bg shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold text-text">{t.settings.title}</h2>
          <button type="button" onClick={onClose} className="rounded p-1 text-text-muted hover:bg-surface hover:text-text">
            <X size={16} />
          </button>
        </div>

        <div className="flex">
          {/* Sidebar — rotaia sole-icone sotto sm:, icona+label sopra. aria-label/title sempre
              presenti: sotto sm: l'icona è l'unico riferimento (tooltip long-press + screen reader). */}
          <nav className="flex w-11 shrink-0 flex-col gap-1 border-r border-border p-2 sm:w-36">
            {tabs.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                type="button"
                onClick={() => setTab(key)}
                aria-label={label}
                title={label}
                className={[
                  'flex items-center gap-2 rounded-md px-2 py-2 text-sm font-medium transition-colors',
                  tab === key ? 'bg-primary/10 text-primary' : 'text-text-muted hover:bg-surface hover:text-text',
                ].join(' ')}
              >
                <Icon size={16} className="shrink-0" />
                <span className="hidden truncate sm:inline">{label}</span>
              </button>
            ))}
          </nav>

          <div className="max-h-[70vh] flex-1 overflow-y-auto px-4 py-4">
            {/* All three stay mounted — switching tabs must not reset a panel's in-progress form. */}
            <div className={tab === 'contract' ? '' : 'hidden'}>
              <ContractPanel contract={contract} t={t} onClose={onClose} />
            </div>
            <div className={tab === 'fiscal-config' ? '' : 'hidden'}>
              <FiscalConfigPanel t={t} onClose={onClose} />
            </div>
            <div className={tab === 'retribuzione' ? '' : 'hidden'}>
              <RetribuzionePanel t={t} onClose={onClose} />
            </div>
            <div className={tab === 'variabili-flat' ? '' : 'hidden'}>
              <VariabiliFlatPanel month={month} t={t} />
            </div>
            <div className={tab === 'cig-config' ? '' : 'hidden'}>
              <CigConfigPanel t={t} />
            </div>
            <div className={tab === 'sindacato-config' ? '' : 'hidden'}>
              <SindacatoConfigPanel t={t} />
            </div>
            <div className={tab === 'mensa-config' ? '' : 'hidden'}>
              <MensaConfigPanel t={t} />
            </div>
            <div className={tab === 'cometa-config' ? '' : 'hidden'}>
              <CometaConfigPanel t={t} />
            </div>
            <div className={tab === 'addizionali-config' ? '' : 'hidden'}>
              <AddizionaliConfigPanel t={t} />
            </div>
            <div className={tab === 'netto-reale' ? '' : 'hidden'}>
              <NettoRealePanel month={month} t={t} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
