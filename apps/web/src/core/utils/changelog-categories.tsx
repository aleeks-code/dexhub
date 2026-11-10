import { Sparkles, Wrench, Bug, Lock, AlertTriangle } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { ChangelogCategoria } from '@/core/hooks/use-changelog'

// Terza volta che questa mappa serve (lista, dettaglio, ora il modal add/edit) — estratta qui
// invece di duplicarla ancora.
export const CATEGORY_ICON: Record<ChangelogCategoria, LucideIcon> = {
  feature: Sparkles,
  improvement: Wrench,
  fix: Bug,
  security: Lock,
  breaking: AlertTriangle,
}

export const CATEGORY_ORDER: ChangelogCategoria[] = ['feature', 'improvement', 'fix', 'security', 'breaking']
