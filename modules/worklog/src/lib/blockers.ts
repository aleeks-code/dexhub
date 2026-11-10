import type { StimaBlocker } from '../services/worklog-api'
import type { WorklogTranslations } from '../i18n'

export function blockerMessage(blocker: StimaBlocker, t: WorklogTranslations): string {
  const messages: Record<StimaBlocker, string> = {
    no_user_config: t.stima.blocker_no_user_config,
    no_retribuzione: t.stima.blocker_no_retribuzione,
    no_ccnl_profile: t.stima.blocker_no_ccnl_profile,
    no_fiscal_profile: t.stima.blocker_no_fiscal_profile,
    no_contract: t.stima.blocker_no_contract,
    no_turni_config: t.stima.blocker_no_turni_config,
    no_cig_config: t.stima.blocker_no_cig_config,
    buco_mese: t.stima.blocker_buco_mese,
  }
  return messages[blocker]
}

export interface BlockerShortInfo {
  label: string
  action?: string
}

// Versione compatta di blockerMessage, per le card della Panoramica (leggibile a colpo
// d'occhio). Stessi codici StimaBlocker, stesso modulo — un blocker nuovo va aggiunto in
// entrambe le mappe qui sopra/sotto, non altrove.
export function blockerShortLabel(blocker: StimaBlocker, t: WorklogTranslations): BlockerShortInfo {
  const short: Record<StimaBlocker, BlockerShortInfo> = {
    no_user_config: { label: t.stima.blocker_short_no_user_config, action: t.stima.blocker_action_no_user_config },
    no_retribuzione: { label: t.stima.blocker_short_no_retribuzione, action: t.stima.blocker_action_no_retribuzione },
    no_ccnl_profile: { label: t.stima.blocker_short_no_ccnl_profile, action: t.stima.blocker_action_no_ccnl_profile },
    no_fiscal_profile: { label: t.stima.blocker_short_no_fiscal_profile, action: t.stima.blocker_action_no_fiscal_profile },
    no_contract: { label: t.stima.blocker_short_no_contract, action: t.stima.blocker_action_no_contract },
    no_turni_config: { label: t.stima.blocker_short_no_turni_config, action: t.stima.blocker_action_no_turni_config },
    no_cig_config: { label: t.stima.blocker_short_no_cig_config, action: t.stima.blocker_action_no_cig_config },
    buco_mese: { label: t.stima.blocker_short_buco_mese, action: t.stima.blocker_action_buco_mese },
  }
  return short[blocker]
}
