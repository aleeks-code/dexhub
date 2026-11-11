'use client'

import { X } from 'lucide-react'
import { StoricoBustePagaView } from './storico-buste-paga-view'
import type { WorklogTranslations } from '../i18n'

interface Props {
  isOpen: boolean
  onClose: () => void
  initialYear: number
  t: WorklogTranslations
  onSelectMonth?: (month: string) => void
}

export function StoricoBustePagaModal({
  isOpen,
  onClose,
  initialYear,
  t,
  onSelectMonth,
}: Props) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl border border-border bg-surface p-5 sm:p-6 shadow-2xl z-10 space-y-4">
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1.5 text-text-muted hover:bg-surface-raised hover:text-text transition-colors cursor-pointer"
          aria-label="Chiudi"
        >
          <X size={18} />
        </button>

        <StoricoBustePagaView
          initialYear={initialYear}
          t={t}
          onSelectMonth={(m) => {
            onSelectMonth?.(m)
            onClose()
          }}
        />
      </div>
    </div>
  )
}
