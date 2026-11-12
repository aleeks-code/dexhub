import type { SocialBenefitProfile, EditionConfig } from '../types'

export const PARTNER_SUPERMARKETS: Array<{ name: string; isPartner: boolean; discountRate: number }> = [
  { name: 'Conad', isPartner: true, discountRate: 0.15 },
  { name: 'Coop', isPartner: true, discountRate: 0.15 },
  { name: 'Ipercoop', isPartner: true, discountRate: 0.15 },
  { name: 'Eurospin', isPartner: true, discountRate: 0.15 },
  { name: 'Rossetto', isPartner: true, discountRate: 0.15 },
  { name: 'Esselunga', isPartner: true, discountRate: 0.15 },
  { name: 'Carrefour', isPartner: true, discountRate: 0.15 },
  { name: 'MD Discount', isPartner: true, discountRate: 0.15 },
  { name: 'Lidl', isPartner: true, discountRate: 0.15 },
  { name: 'Tigros', isPartner: true, discountRate: 0.15 },
  { name: 'Bennet', isPartner: true, discountRate: 0.15 },
  { name: 'Despar / Eurospar', isPartner: true, discountRate: 0.15 },
  { name: 'Famila', isPartner: true, discountRate: 0.15 },
  { name: 'Pam Panorama', isPartner: true, discountRate: 0.15 },
  { name: 'Penny Market', isPartner: true, discountRate: 0.15 },
  { name: 'Crai', isPartner: true, discountRate: 0.15 },
  { name: 'Sigma', isPartner: true, discountRate: 0.15 },
]

export const EDITION_2026_2027: EditionConfig = {
  editionId: '2026-2027',
  year: 2026,
  label: 'Edizione 2026–2027 (Tranche 2026 + Tranche 2027)',
  description: '500 € erogati nel 2026 e ulteriori 500 € a partire da aprile 2027. Attivazione primo acquisto entro il 16/12/2026.',
  hasDiscountPartners: true,
  defaultDiscountRate: 0.15, // 15%
  tranches: [
    {
      id: 'tranche-2026',
      label: 'Ricarica Iniziale 2026 (500,00 €)',
      initialAmount: 500.0,
      availableDate: '2026-09-01',
      firstPurchaseDeadline: '2026-12-16',
      finalSpendingDeadline: '2027-02-28',
    },
    {
      id: 'tranche-2027',
      label: 'Seconda Ricarica Aprile 2027 (500,00 €)',
      initialAmount: 500.0,
      availableDate: '2027-04-01',
      firstPurchaseDeadline: null,
      finalSpendingDeadline: '2027-10-31',
    },
  ],
  allowedCategories: [
    {
      id: 'alimentari_prima_necessita',
      label: 'Beni alimentari di prima necessità',
      icon: 'ShoppingCart',
      description: 'Carne, pesce, latte e derivati, uova, oli, pane, pasta, riso, ortaggi, frutta, conserve, alimenti per prima infanzia.',
      isAllowed: true,
    },
    {
      id: 'carburante',
      label: 'Carburante',
      icon: 'Fuel',
      description: 'Non ammesso per questa edizione 2026.',
      isAllowed: false,
    },
    {
      id: 'trasporto_pubblico',
      label: 'Abbonamenti Trasporto Pubblico Locale',
      icon: 'Bus',
      description: 'Non ammesso per questa edizione 2026.',
      isAllowed: false,
    },
    {
      id: 'bevande_alcoliche',
      label: 'Bevande alcoliche',
      icon: 'Wine',
      description: 'Escluse per legge da tutte le edizioni.',
      isAllowed: false,
    },
  ],
}

export const DEDICATA_A_TE_PROFILE: SocialBenefitProfile = {
  id: 'dedicata-a-te',
  name: 'Carta Dedicata a Te',
  issuingAuthority: 'Ministero dell’Agricoltura, INPS & Poste Italiane',
  defaultIcon: 'Wallet',
  description: 'Carta prepagata governativa per l’acquisto di generi alimentari di prima necessità, riservata ai nuclei familiari ISEE ≤ 15.000 €.',
  currentEditionId: '2026-2027',
  editions: {
    '2026-2027': EDITION_2026_2027,
  },
}

export const KNOWN_PROFILES: Record<string, SocialBenefitProfile> = {
  'dedicata-a-te': DEDICATA_A_TE_PROFILE,
}

export function getProfile(id: string): SocialBenefitProfile | undefined {
  return KNOWN_PROFILES[id]
}

export function getEditionConfig(profileId: string, editionId: string): EditionConfig | undefined {
  return KNOWN_PROFILES[profileId]?.editions[editionId]
}
