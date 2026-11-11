'use client'

import { StoricoBustePagaView } from './storico-buste-paga-view'
import type { WorklogTranslations } from '../i18n'

interface Props {
  month: string // 'YYYY-MM'
  t: WorklogTranslations
}

export function NettoRealePanel({ month, t }: Props) {
  const initialYear = parseInt(month.slice(0, 4), 10) || new Date().getFullYear()

  return (
    <div className="py-1">
      <StoricoBustePagaView initialYear={initialYear} t={t} />
    </div>
  )
}
