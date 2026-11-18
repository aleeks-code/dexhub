/**
 * Calcola il risparmio o cashback effettivo del 15% (o diverso tasso convenzione).
 *
 * Formula diretta del 15%:
 * Risparmio/Cashback = amount * discountRate
 *
 * Esempi:
 * - Su 100,00 € di spesa -> 15,00 € di risparmio/cashback (15%)
 * - Su 50,00 € di spesa -> 7,50 € di risparmio/cashback (15%)
 * - Su 20,00 € di spesa -> 3,00 € di risparmio/cashback (15%)
 */
export function calculateDiscountSavings(amount: number, discountRate: number = 0.15): number {
  if (amount <= 0 || discountRate <= 0) return 0
  const savings = amount * discountRate
  return Math.round(savings * 100) / 100
}

/**
 * Formula di scorporo inversa (se si desidera calcolare il risparmio a partire
 * da un importo netto già scontato alla cassa):
 * Lordo = netAmount / (1 - discountRate)
 * Risparmio = netAmount * (discountRate / (1 - discountRate))
 */
export function calculateScorporoSavings(netAmount: number, discountRate: number = 0.15): number {
  if (netAmount <= 0 || discountRate <= 0 || discountRate >= 1) return 0
  const savings = netAmount * (discountRate / (1 - discountRate))
  return Math.round(savings * 100) / 100
}

/**
 * Calcola il valore originario lordo della merce prima dello sconto convenzione.
 * Lordo = amount / (1 - discountRate)
 */
export function calculateGrossAmount(amount: number, discountRate: number = 0.15): number {
  if (amount <= 0) return 0
  if (discountRate <= 0 || discountRate >= 1) return amount
  const gross = amount / (1 - discountRate)
  return Math.round(gross * 100) / 100
}
