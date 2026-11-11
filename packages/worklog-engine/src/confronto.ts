/**
 * Confronto tra Netto Stimato e Netto Reale da cedolino.
 * Funzioni matematiche pure, deterministiche, senza I/O né dipendenze esterne.
 */

export type ValutazioneScostamento = 'excellent' | 'moderate' | 'significant'
export type VersoScostamento = 'overestimate' | 'underestimate' | 'exact'

export interface ScostamentoResult {
  delta: number // NettoStimato - NettoReale (positivo: sovrastima, negativo: sottostima)
  deltaAbs: number // |Delta|
  scostamentoPerc: number // (|Delta| / NettoReale) * 100 (gestisce nettoReale === 0)
  valutazione: ValutazioneScostamento
  verso: VersoScostamento
}

export interface MeseConfrontoInput {
  mese: string // 'YYYY-MM'
  nettoStimato: number | null
  nettoReale: number | null
}

export interface MetricheConfronto {
  mae: number | null // Mean Absolute Error in €
  mape: number | null // Mean Absolute Percentage Error in %
  bias: number | null // Mean Bias in € (positivo = sovrastima media, negativo = sottostima media)
  mesiValidi: number // Numero di mesi con entrambi i valori presenti
  totaleMesi: number // Totale mesi osservati (es. 12)
}

function r2(val: number): number {
  return Math.round(val * 100) / 100
}

/**
 * Valuta lo scostamento puntuale tra stima e busta paga reale.
 *
 * Formule:
 * - Delta = NettoStimato - NettoReale
 * - Scostamento % = (|Delta| / NettoReale) * 100
 *
 * Soglie:
 * - <= 1%: excellent
 * - <= 5%: moderate
 * - > 5%: significant
 */
export function valutaScostamento(nettoStimato: number, nettoReale: number): ScostamentoResult {
  const delta = r2(nettoStimato - nettoReale)
  const deltaAbs = r2(Math.abs(delta))

  let scostamentoPerc = 0
  if (nettoReale > 0) {
    scostamentoPerc = r2((deltaAbs / nettoReale) * 100)
  } else if (deltaAbs > 0) {
    scostamentoPerc = 100
  }

  let valutazione: ValutazioneScostamento = 'significant'
  if (scostamentoPerc <= 1) {
    valutazione = 'excellent'
  } else if (scostamentoPerc <= 5) {
    valutazione = 'moderate'
  }

  let verso: VersoScostamento = 'exact'
  if (delta > 0.005) {
    verso = 'overestimate'
  } else if (delta < -0.005) {
    verso = 'underestimate'
  }

  return {
    delta,
    deltaAbs,
    scostamentoPerc,
    valutazione,
    verso,
  }
}

/**
 * Calcola le metriche statistiche aggregate (MAE, MAPE, Bias) su un insieme di mesi.
 * Include esclusivamente i mesi con sia nettoStimato che nettoReale validi e numerici.
 */
export function calcolaMetricheConfronto(mesi: MeseConfrontoInput[]): MetricheConfronto {
  const validi = mesi.filter(
    (m): m is { mese: string; nettoStimato: number; nettoReale: number } =>
      m.nettoStimato !== null &&
      m.nettoReale !== null &&
      !Number.isNaN(m.nettoStimato) &&
      !Number.isNaN(m.nettoReale),
  )

  if (validi.length === 0) {
    return {
      mae: null,
      mape: null,
      bias: null,
      mesiValidi: 0,
      totaleMesi: mesi.length,
    }
  }

  const n = validi.length
  let sumDelta = 0
  let sumDeltaAbs = 0
  let sumPerc = 0
  let countPerc = 0

  for (const m of validi) {
    const sc = valutaScostamento(m.nettoStimato, m.nettoReale)
    sumDelta += sc.delta
    sumDeltaAbs += sc.deltaAbs
    if (m.nettoReale > 0) {
      sumPerc += sc.scostamentoPerc
      countPerc++
    }
  }

  const mae = r2(sumDeltaAbs / n)
  const bias = r2(sumDelta / n)
  const mape = countPerc > 0 ? r2(sumPerc / countPerc) : null

  return {
    mae,
    mape,
    bias,
    mesiValidi: n,
    totaleMesi: mesi.length,
  }
}
