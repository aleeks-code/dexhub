/**
 * Fase 4B — Addizionali regionali/comunali, funzionalità PONTE verso la Fase 5
 * (chiusura fiscale annuale). Pure, zero I/O.
 *
 * Questi importi sono un DATO INFORMATIVO (previsione o consuntivo dell'anno precedente),
 * MAI sottratti da `netto`/`imponibileIrpefMensile` in questa fase — `stimaBustaPaga` non li
 * consuma, il resolver li espone accanto all'output mensile. Nomi scelti apposta senza
 * "trattenuta": non è ancora un importo prelevato, è una previsione fiscale.
 *
 * FONTE DEL DATO
 * `TaxContext` porta un `taxableIncome` con provenienza esplicita (`TaxDataSource`):
 * - FINAL_PREVIOUS_YEAR: da uno snapshot fiscale chiuso dell'anno precedente — la persistenza
 *   di quello snapshot arriva in Fase 5, NON qui. In questa fase il ramo è raggiungibile SOLO
 *   per injection esplicita (test), mai da una query reale — vedi resolver, dove
 *   `previousYearSnapshot` è oggi sempre `null`.
 * - ESTIMATED_CURRENT_YEAR: da `StimaOutput.imponibileIrpefAnnuo` dell'anno corrente (teorico,
 *   già calcolato da `computeRalAnnuo`) — unico ramo raggiungibile in produzione oggi.
 */

export type TaxDataSource = 'FINAL_PREVIOUS_YEAR' | 'ESTIMATED_CURRENT_YEAR'

export interface TaxContext {
  fiscalYear: number
  taxableIncome: number
  source: TaxDataSource
}

export interface AddizionaliOutput {
  regionalAmount: number
  municipalAmount: number
  source: TaxDataSource
}

function r2(n: number): number {
  return Math.round(n * 100) / 100
}

/**
 * Sceglie la fonte: uno snapshot chiuso dell'anno precedente, se fornito, vince sempre sulla
 * stima dell'anno corrente. Nessuna query qui — chi chiama decide cosa passare (il resolver,
 * in questa fase, passa sempre `null` per il primo argomento: nessuna persistenza ancora).
 */
export function determineTaxDataSource(
  previousYearSnapshot: TaxContext | null,
  currentYearEstimate: TaxContext,
): TaxContext {
  return previousYearSnapshot ?? currentYearEstimate
}

/** Addizionali regionale/comunale = aliquota × imponibile della fonte scelta. Flat, nessuno scaglione. */
export function computeAddizionali(
  context: TaxContext,
  aliquotaRegionale: number,
  aliquotaComunale: number,
): AddizionaliOutput {
  return {
    regionalAmount: r2(context.taxableIncome * aliquotaRegionale),
    municipalAmount: r2(context.taxableIncome * aliquotaComunale),
    source: context.source,
  }
}
