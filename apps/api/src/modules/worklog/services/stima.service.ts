import { Injectable } from '@nestjs/common'
import type { StimaOutput } from '@dexhub/worklog-engine'
import { resolveStima, type AddizionaliAnnuali, type StimaBlocker, type StimaWarningCode } from './stima.resolver'
import { resolveConguaglioRaw, type ConguaglioRawOutput, type ConguaglioStatus } from './conguaglio.resolver'

export type StimaResponseData =
  | { stima: StimaOutput; stimaBlocker: null; stimaWarnings: StimaWarningCode[]; sindacatoNome: string | null; addizionali: AddizionaliAnnuali; nettoReale: number | null; scarto: number | null }
  | { stima: null; stimaBlocker: StimaBlocker; stimaWarnings: StimaWarningCode[] }

export type ConguaglioRawResponseData =
  | { conguaglioRaw: ConguaglioRawOutput; conguaglioStatus: 'ok'; stimaBlocker: null }
  | { conguaglioRaw: null; conguaglioStatus: 'dati_insufficienti'; mesiCompleti: number; mesiMinimi: number; stimaBlocker: null }
  | { conguaglioRaw: null; conguaglioStatus: Exclude<ConguaglioStatus, 'ok' | 'dati_insufficienti'>; stimaBlocker: null }
  | { conguaglioRaw: null; conguaglioStatus: null; stimaBlocker: StimaBlocker }

@Injectable()
export class StimaService {
  async getStima(userId: string, month: string): Promise<StimaResponseData> {
    const resolution = await resolveStima(userId, month)

    if (!resolution.ok) {
      return { stima: null, stimaBlocker: resolution.reason, stimaWarnings: resolution.warnings }
    }

    const warnings: StimaWarningCode[] = [...resolution.warnings]
    if (resolution.output.warningAnnualizzazione) warnings.push('annualizzazione')

    return {
      stima: resolution.output,
      stimaBlocker: null,
      stimaWarnings: warnings,
      sindacatoNome: resolution.sindacatoNome,
      addizionali: resolution.addizionali,
      nettoReale: resolution.nettoReale,
      scarto: resolution.scarto,
    }
  }

  async getConguaglioRaw(userId: string): Promise<ConguaglioRawResponseData> {
    const resolution = await resolveConguaglioRaw(userId)

    if (!resolution.ok) {
      return { conguaglioRaw: null, conguaglioStatus: null, stimaBlocker: resolution.reason }
    }
    if (resolution.status === 'dati_insufficienti') {
      return {
        conguaglioRaw: null,
        conguaglioStatus: 'dati_insufficienti',
        mesiCompleti: resolution.mesiCompleti,
        mesiMinimi: resolution.mesiMinimi,
        stimaBlocker: null,
      }
    }
    if (resolution.status !== 'ok') {
      return { conguaglioRaw: null, conguaglioStatus: resolution.status, stimaBlocker: null }
    }

    return { conguaglioRaw: resolution.output, conguaglioStatus: 'ok', stimaBlocker: null }
  }
}
