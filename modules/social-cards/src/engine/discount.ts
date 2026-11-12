/**
 * Calcola il risparmio effettivo ottenuto tramite lo sconto convenzione applicato alla cassa.
 *
 * L'importo (amount) inserito dall'utente rappresenta il totale pagato sullo scontrino,
 * ovvero il prezzo finale già decurtato dello sconto del 15% (o diverso tasso).
 *
 * Formula di scorporo:
 * Risparmio = amount * (discountRate / (1 - discountRate))
 *
 * Esempio:
 * Se il lordo era 100 € e lo sconto del 15% è 15 €, l'utente ha pagato 85 €.
 * Risparmio = 85 * (0.15 / 0.85) = 15,00 €.
 */
export function calculateDiscountSavings(amount: number, discountRate: number = 0.15): number {
  if (amount <= 0 || discountRate <= 0 || discountRate >= 1) return 0
  const savings = amount * (discountRate / (1 - discountRate))
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
