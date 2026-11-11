import { describe, expect, it } from 'vitest'
import {
  stimaBustaPaga, marginalRate, computeFissaMaturata, computeOreInFascia, computeStornoCig,
  computeStornoPermesso, computeCometaMensile, computeCometaAnnuo, computeIrpefMensile, type StimaInput,
} from '@dexhub/worklog-engine'

// Bucket unico: riproduce esattamente il vecchio `retribuzioneMensile: number` come
// scomposizione a 1 componente. Modalità 1 (quadratura) ha i suoi test a parte.
const fissaBucket = (importo: number): StimaInput['retribuzioneFissaComponenti'] => ({
  minimoTabellare: importo, superminimo: 0, scattiAnzianita: 0, premioProduzioneFisso: 0,
})

// ─── Fixtures ─────────────────────────────────────────────────────────────────
// Values mirror the seeded data in worklog_ccnl_profile + worklog_fiscal_profile (anno=2026).
// If the seed changes, update these fixtures to match.

const MAGGIORAZIONI_METALMECCANICA: StimaInput['maggiorazioni'] = {
  straordinarioDiurnoFeriale:    0.25,
  straordinarioNotturno:          0.55,
  straordinarioFestivo:           0.50,
  straordinarioFestivoNotturno:   0.75,
  notturnoOrdinarioInTurno:       0.15,
  pomeridianoInTurno:             0.065,
}

const FISCAL_2026: Pick<StimaInput,
  'contributiInpsRate' | 'scaglioni' | 'detrazioniLavoro' | 'trattamentoIntegrativo'
> = {
  // Fonte: Circolare INPS n.6/2026 — dipendente ordinario
  contributiInpsRate: 0.0919,

  // Fonte: L.199/2025 art.1 co.3
  scaglioni: [
    { fino: 28000, aliquota: 0.23 },
    { fino: 50000, aliquota: 0.33 },
    { fino: null,  aliquota: 0.43 },
  ],

  // Fonte: art.13 TUIR vigente
  detrazioniLavoro: {
    fasce: [
      { tipo: 'flat',              reddito_fino: 15000, valore_base: 1955 },
      { tipo: 'lineare',           reddito_da: 15001, reddito_fino: 28000, base: 1910, aggiunta: 1190, denominatore: 13000 },
      { tipo: 'lineare_solo_base', reddito_da: 28001, reddito_fino: 50000, base: 1910, denominatore: 22000 },
    ],
    bonus: [
      { reddito_da: 25001, reddito_fino: 35000, importo: 65 },
    ],
  },

  // Fonte: fiscomania.com (L.199/2025) — da verificare contro cedolino reale
  trattamentoIntegrativo: {
    fasce_non_imponibili: [
      { reddito_da: 0,     reddito_fino: 8500,  percentuale: 0.071 },
      { reddito_da: 8501,  reddito_fino: 15000, percentuale: 0.053 },
      { reddito_da: 15001, reddito_fino: 20000, percentuale: 0.048 },
    ],
    detrazione_da: 20001,
    detrazione_piatto_fino: 32000,
    detrazione_importo: 1000,
    detrazione_zero_a: 40000,
  },
}

// Turni standard (soli inizi) + fasce maggiorate (0.20/0.20, seed "da confermare") — vedi
// packages/db/src/seed.ts. Percentuali vive per l'ordinario ora QUI, non più in MAGGIORAZIONI_*.
const TURNI_E_FASCE: Pick<StimaInput, 'turniStandard' | 'fasceMaggiorate'> = {
  turniStandard: {
    mattino: { inizio: '06:00' },
    pomeriggio: { inizio: '14:00' },
    notte: { inizio: '22:00' },
  },
  fasceMaggiorate: {
    notturnoOrdinarioInTurno: { da: '22:00', a: '06:00', percentuale: 0.20 },
    pomeridianoInTurno: { da: '18:00', a: '22:00', percentuale: 0.20 },
  },
}

// ─── computeFissaMaturata — Stadio 5a, pro-quota su giorni lavorabili (Step 4) ────────────

describe('computeFissaMaturata', () => {
  it('mese pieno (giorni=lavorabili) → fissa esatta', () => {
    expect(computeFissaMaturata(2249, 23, 23)).toBe(2249)
  })
  it('mese parziale → pro-quota', () => {
    expect(computeFissaMaturata(2249, 5, 23)).toBe(488.91) // 2249×5/23 = 488.9130... → 488.91
  })
  it('zero giorni lavorabili → 0 (guard ÷0)', () => {
    expect(computeFissaMaturata(2000, 0, 0)).toBe(0)
  })
})

// ─── computeStornoCig — Stadio 5c, CIG Step 2 (Strada A: termine a valle, mai sulla fissa) ────
// Divisore CIG-specifico = giorniLavorabiliMese×8, DIVERSO da divisoreOrario CCNL (173) e
// dinamico per mese (non un valore fisso) — verificato sui due mesi reali della busta.

describe('computeStornoCig', () => {
  it('aprile reale: 64h, fissa 2248.97, 22gg lavorabili → −817.81', () => {
    // 64 × 2248.97 / (22×8) = 64 × 2248.97 / 176 = 817.8072... → 817.81
    expect(computeStornoCig(64, 2248.97, 22)).toBe(817.81)
  })
  it('maggio reale: 32h, fissa 2248.97, 21gg lavorabili → −428.38', () => {
    // 32 × 2248.97 / (21×8) = 32 × 2248.97 / 168 = 428.3752... → 428.38
    expect(computeStornoCig(32, 2248.97, 21)).toBe(428.38)
  })
  it('zero ore CIG → 0', () => {
    expect(computeStornoCig(0, 2248.97, 22)).toBe(0)
  })
  it('zero giorni lavorabili → 0 (guard ÷0)', () => {
    expect(computeStornoCig(64, 2248.97, 0)).toBe(0)
  })
})

// ─── computeStornoPermesso — Step 1b (Strada A: termine a valle, mai sulla fissa) ───────────
// Divisore FISSO = divisoreOrario CCNL (173), DIVERSO dal divisore CIG dinamico
// (giorniFerialiMese×8) — non riusare tariffaOraria: nel ramo hourly non è 173-based.

describe('computeStornoPermesso', () => {
  it('30/04 reale: 1.5h permesso, fissa 2248.97, divisore 173 → −19.50', () => {
    // 1.5 × 2248.97 / 173 = 19.49974... → 19.50
    expect(computeStornoPermesso(1.5, 2248.97, 173)).toBe(19.50)
  })
  it('zero ore permesso → 0', () => {
    expect(computeStornoPermesso(0, 2248.97, 173)).toBe(0)
  })
  it('zero divisore → 0 (guard ÷0)', () => {
    expect(computeStornoPermesso(1.5, 2248.97, 0)).toBe(0)
  })
})

// ─── computeCometaMensile — quota Cometa deducibile (forma, mirror computeTrattenutaSindacale) ──

describe('computeCometaMensile', () => {
  it('coefficiente 0 → 0 (non iscritto)', () => {
    expect(computeCometaMensile(0, 1975.68)).toBe(0)
  })
  it('minimoTabellareReale null → 0 (componenti non dichiarati/ramo orario)', () => {
    expect(computeCometaMensile(0.012, null)).toBe(0)
  })
  it('iscritto + minimo dichiarato → coefficiente × minimoTabellareReale (calcolato a mano)', () => {
    // 1975.68 × 0.012 = 23.70816 → 23.71
    expect(computeCometaMensile(0.012, 1975.68)).toBe(23.71)
  })
})

// ─── computeCometaAnnuo — deduzione annua, valori GREZZI, un solo r2 finale (clamp tetto) ────

describe('computeCometaAnnuo', () => {
  it('coefficiente 0 → 0', () => {
    expect(computeCometaAnnuo(0, 1975.68, 13)).toBe(0)
  })
  it('minimoTabellareReale null → 0', () => {
    expect(computeCometaAnnuo(0.012, null, 13)).toBe(0)
  })
  it('caso pieno: 0.012 × 1975.68 × 13 = 308.20608 → 308.21 (un solo arrotondamento, MAI 23.71×13)', () => {
    expect(computeCometaAnnuo(0.012, 1975.68, 13)).toBe(308.21)
  })
  it('clamp: valore che supererebbe 5164.57 viene tagliato al tetto', () => {
    // 0.05 × 30000 × 14 = 21000, ben oltre il tetto di deducibilità fiscale
    expect(computeCometaAnnuo(0.05, 30000, 14)).toBe(5164.57)
  })
  it('mensilita 14 (campo reale, non 13 hardcoded)', () => {
    // 0.012 × 1975.68 × 14 = 331.91424 → 331.91
    expect(computeCometaAnnuo(0.012, 1975.68, 14)).toBe(331.91)
  })
})

// ─── computeIrpefMensile — modello-busta: imponibile unico × aliquota media LORDA − ────────
// detrazioni/12 esplicito. Sostituisce lo split ord/extra + aliquota media NETTA (diagnosi:
// quel modello sotto-accreditava le detrazioni sulla quota variabile/extra, mai coperta dal
// rapporto netta/annua). aliquotaMediaLorda = SOLA progressività scaglioni (irpefLordaAnnua/
// imponibileIrpefAnnuo), le detrazioni entrano SOLO nel termine .../12 esplicito (mai /mensilita
// — le detrazioni si spalmano sui 12 mesi ordinari, la tredicesima ha detrazioni proprie).

describe('computeIrpefMensile', () => {
  it('aprile reale: imp.mensile 1798.35, annuo 26153.85, lorda annua 6015.39, art13 2143.99, cuneo 1000 → 151.62', () => {
    // aliquotaMediaLorda = 6015.39/26153.85 ≈ 0.230000172 (≈23%, rc<28000)
    // irpefLordaMensile  = 1798.35×0.230000172 ≈ 413.6208
    // detrazioniMensili  = (2143.99+1000)/12 = 3143.99/12 = 261.991666...
    // irpefNettaMensile  = r2(413.6208 − 261.991666) = r2(151.6291) = 151.62
    // NOTA: il prompt originale stimava 151,63 a mano — la chiamata diretta alla funzione
    // (e la riverifica manuale indipendente) danno 151.62, scarto di 1 centesimo, segnalato
    // non forzato.
    expect(computeIrpefMensile(1798.35, 26153.85, 6015.39, 2143.99, 1000)).toBe(151.62)
  })
  it('gate anti-regressione multi-scaglione: annuo 32000 (>28k), lorda 7760 (23%×28k+33%×4k), detrazioni isolate a 0 → aliquota media 24.25% sale correttamente', () => {
    // aliquotaMediaLorda = 7760/32000 = 0.2425 esatto (progressività: sopra 28k pesa il 33%)
    // irpefLordaMensile  = 1000×0.2425 = 242.50, detrazioniMensili = 0/12 = 0
    // irpefNettaMensile  = r2(242.50 − 0) = 242.50 — detrazioni a 0 per isolare SOLO la
    // progressività (mirror del pattern "isola una sola variabile" di TC-M/TC-O)
    expect(computeIrpefMensile(1000, 32000, 7760, 0, 0)).toBe(242.50)
  })
  it('clamp incapienza: detrazioni > lorda mensile (mese parziale) → 0, mai negativo', () => {
    // Stessi numeri di TC-NEW-3: lorda mensile 239.74 < detrazioni mensili 263.39 → senza clamp
    // darebbe −23.65. Math.max(0,...) azzera, non genera IRPEF negativa.
    expect(computeIrpefMensile(1042.34, 25971.66, 5973.48, 2160.67, 1000)).toBe(0)
  })
  it('clamp no-op su mese capiente (aprile, lorda > detrazioni) → invariato 151.62', () => {
    expect(computeIrpefMensile(1798.35, 26153.85, 6015.39, 2143.99, 1000)).toBe(151.62)
  })
})

// ─── Modello Step 4: lordo = fissoMaturato (GIORNI) + variabili (ORE) ────────────────────
//
// fissoMaturato = retribuzioneFissaMensile × giorniPagatiEffettivi/giorniLavorabiliMese —
// matura sui GIORNI lavorabili registrati (pesati kind%), MAI sulle ore reali battute in un
// giorno. Un mese pieno dà SEMPRE la fissa esatta, qualunque sia il conteggio ore del giorno.
// Sostituisce il modello ore×tariffa di Fase-3-passo-3 (quel modello faceva variare il fisso
// con le ore reali — non realistico per un cedolino mensile).
// tariffaOraria/ore[]/maggiorazioni restano SOLO per lo straordinario (variabile, invariato).

// TC-A/TC-B: TEST DECISIVO — mese pieno vs parziale, stessa fissa → lordo diverso.

describe('TC-A – mese pieno (23/23 gg, fissa 2000, zero straord)', () => {
  const input: StimaInput = {
    retribuzioneFissaComponenti: fissaBucket(2000),
    mensilita: 13,
    giorniPagatiEffettivi: 23,
    giorniLavorabiliMese: 23,
    giorniFerialiMese: 23,
    tariffaOraria: 2000 / 173,
    ore: [],
    entriesOrdinarieMaggiorate: [],
    maggiorazioni: MAGGIORAZIONI_METALMECCANICA,
    variabiliFlat: 0,
    oreCig: 0,
    orePermessoNonRetribuito: 0,
    divisoreOrario: 173,
    coefficienteSolidarieta: 0,
    coefficienteSindacale: 0,
    coefficienteCometa: 0,
    minimoTabellareReale: null,
    numeroPasti: 0,
    importoMensa: 0,
    addizionaleRegionale: 0,
    addizionaleComunale: 0,
    accontoComunale: 0,
    ...TURNI_E_FASCE,
    ...FISCAL_2026,
  }
  const out = stimaBustaPaga(input)

  it('lordo = 2000.00 (mese pieno = fissa esatta)', () => expect(out.lordo).toBe(2000.00))
  // Ricalcolato per il modello-busta (imponibile unico × aliquota media LORDA − detrazioni/12):
  // rc=23610.60 (<28000) → irpefLorda=5430.44, detrazioniArt13=2311.80 (lineare 15001-28000),
  // beneficioCuneo=1000 (tier2 piatto, rc≤32000). imponibileIrpefMensile=2000−183.80(INPS)=1816.20.
  // aliquotaMediaLorda=5430.44/23610.60≈0.230000847. irpefLordaMensile≈1816.20×0.230000847≈417.73.
  // detrazioniMensili=(2311.80+1000)/12=275.98333. irpefNettaMensile≈r2(417.73−275.98)=141.74.
  // netto=r2(1816.20−141.74)=1674.46 — verificato contro il motore (entro 1 centesimo di
  // precisione manuale, stessa tolleranza già accettata da TC-Q su una catena a 5+ stadi).
  it('irpefNettaMensile = 141.74 (1816.20×0.230000847 − 275.98333, calcolato dal modello)', () =>
    expect(out.irpefNettaMensile).toBe(141.74))
  it('netto = 1674.46', () => expect(out.netto).toBe(1674.46))
})

describe('TC-ADD – trattenuta addizionali IRPEF (regionale+comunale+acconto, sindacato/mensa spenti)', () => {
  // Stessa retribuzioneMensile/fissaBucket di TC-A — lordo/imponibili/IRPEF identici per
  // costruzione, isola la trattenuta addizionali come unica variabile (mirror TC-M/TC-O).
  const input: StimaInput = {
    retribuzioneFissaComponenti: fissaBucket(2000),
    mensilita: 13,
    giorniPagatiEffettivi: 23,
    giorniLavorabiliMese: 23,
    giorniFerialiMese: 23,
    tariffaOraria: 2000 / 173,
    ore: [],
    entriesOrdinarieMaggiorate: [],
    maggiorazioni: MAGGIORAZIONI_METALMECCANICA,
    variabiliFlat: 0,
    oreCig: 0,
    orePermessoNonRetribuito: 0,
    divisoreOrario: 173,
    coefficienteSolidarieta: 0,
    coefficienteSindacale: 0,
    coefficienteCometa: 0,
    minimoTabellareReale: null,
    numeroPasti: 0,
    importoMensa: 0,
    addizionaleRegionale: 37.38,
    addizionaleComunale: 14.72,
    accontoComunale: 6.41,
    ...TURNI_E_FASCE,
    ...FISCAL_2026,
  }
  const out = stimaBustaPaga(input)

  it('lordo = 2000.00 (identico a TC-A)', () => expect(out.lordo).toBe(2000.00))
  it('irpefNettaMensile = 141.74 (identico a TC-A — addizionali sono netta pura, non toccano IRPEF)', () =>
    expect(out.irpefNettaMensile).toBe(141.74))
  it('trattenutaAddizionali = 58.51 (37.38 + 14.72 + 6.41, calcolato a mano)', () =>
    expect(out.trattenutaAddizionali).toBe(58.51))
  it('netto = 1615.95 (netto TC-A 1674.46 − 58.51, ricalcolato indipendentemente — trattenuta netta pura)', () =>
    expect(out.netto).toBe(1615.95))
})

describe('TC-M – trattenuta sindacale (dichiarato, coefficiente attivo)', () => {
  // Stessa retribuzioneMensile di TC-A (1975.68+24.32=2000.00) — lordo/imponibili/IRPEF
  // identici a TC-A per costruzione, isola la trattenuta come unica variabile.
  const input: StimaInput = {
    retribuzioneFissaComponenti: {
      minimoTabellare: 1975.68, superminimo: 24.32, scattiAnzianita: 0, premioProduzioneFisso: 0,
    },
    mensilita: 13,
    giorniPagatiEffettivi: 23,
    giorniLavorabiliMese: 23,
    giorniFerialiMese: 23,
    tariffaOraria: 2000 / 173,
    ore: [],
    entriesOrdinarieMaggiorate: [],
    maggiorazioni: MAGGIORAZIONI_METALMECCANICA,
    variabiliFlat: 0,
    oreCig: 0,
    orePermessoNonRetribuito: 0,
    divisoreOrario: 173,
    coefficienteSolidarieta: 0,
    coefficienteSindacale: 0.01,
    coefficienteCometa: 0,
    minimoTabellareReale: 1975.68,
    numeroPasti: 0,
    importoMensa: 0,
    addizionaleRegionale: 0,
    addizionaleComunale: 0,
    accontoComunale: 0,
    ...TURNI_E_FASCE,
    ...FISCAL_2026,
  }
  const out = stimaBustaPaga(input)

  it('trattenutaSindacale = 19.76 (1975.68 × 0.01, calcolato a mano)', () =>
    expect(out.trattenutaSindacale).toBe(19.76))
  it('irpefNettaMensile = 141.74 (identico a TC-A — stessa retribuzioneMensile 2000.00, stessa rc)', () =>
    expect(out.irpefNettaMensile).toBe(141.74))
  it('netto = 1654.70 (netto TC-A 1674.46 − 19.76, ricalcolato indipendentemente — trattenuta netta pura, non tocca il modello IRPEF)', () =>
    expect(out.netto).toBe(1654.70))
  it('warningTrattenutaSindacaleNonDisponibile = false (minimo reale presente)', () =>
    expect(out.warningTrattenutaSindacaleNonDisponibile).toBe(false))
})

describe('TC-N – trattenuta sindacale, caso limite (iscritto ma minimo non dichiarato)', () => {
  // Stessi identici valori di TC-A, SOLO coefficienteSindacale acceso — minimoTabellareReale
  // resta null (bucket fissaBucket(2000), mai dichiarato). Se il canale fosse contaminato
  // (componenti.minimoTabellare=2000 riusato) darebbe trattenuta=20.00: qui deve dare 0.
  const input: StimaInput = {
    retribuzioneFissaComponenti: fissaBucket(2000),
    mensilita: 13,
    giorniPagatiEffettivi: 23,
    giorniLavorabiliMese: 23,
    giorniFerialiMese: 23,
    tariffaOraria: 2000 / 173,
    ore: [],
    entriesOrdinarieMaggiorate: [],
    maggiorazioni: MAGGIORAZIONI_METALMECCANICA,
    variabiliFlat: 0,
    oreCig: 0,
    orePermessoNonRetribuito: 0,
    divisoreOrario: 173,
    coefficienteSolidarieta: 0,
    coefficienteSindacale: 0.01,
    coefficienteCometa: 0,
    minimoTabellareReale: null,
    numeroPasti: 0,
    importoMensa: 0,
    addizionaleRegionale: 0,
    addizionaleComunale: 0,
    accontoComunale: 0,
    ...TURNI_E_FASCE,
    ...FISCAL_2026,
  }
  const out = stimaBustaPaga(input)

  it('trattenutaSindacale = 0 (non 1% del bucket, non crash)', () =>
    expect(out.trattenutaSindacale).toBe(0))
  it('irpefNettaMensile = 141.74 (identico a TC-A, canale sindacale/mensa non tocca imponibili)', () =>
    expect(out.irpefNettaMensile).toBe(141.74))
  it('netto = 1674.46 (identico a TC-A, zero sottrazione — canale pulito regge)', () =>
    expect(out.netto).toBe(1674.46))
  it('warningTrattenutaSindacaleNonDisponibile = true (iscritto senza minimo reale)', () =>
    expect(out.warningTrattenutaSindacaleNonDisponibile).toBe(true))
})

describe('TC-O – trattenuta mensa isolata (sindacato spento)', () => {
  // Stessa retribuzione di TC-A, coefficienteSindacale: 0 isola la mensa come unica variabile.
  const input: StimaInput = {
    retribuzioneFissaComponenti: fissaBucket(2000),
    mensilita: 13,
    giorniPagatiEffettivi: 23,
    giorniLavorabiliMese: 23,
    giorniFerialiMese: 23,
    tariffaOraria: 2000 / 173,
    ore: [],
    entriesOrdinarieMaggiorate: [],
    maggiorazioni: MAGGIORAZIONI_METALMECCANICA,
    variabiliFlat: 0,
    oreCig: 0,
    orePermessoNonRetribuito: 0,
    divisoreOrario: 173,
    coefficienteSolidarieta: 0,
    coefficienteSindacale: 0,
    coefficienteCometa: 0,
    minimoTabellareReale: null,
    numeroPasti: 12,
    importoMensa: 0.77,
    addizionaleRegionale: 0,
    addizionaleComunale: 0,
    accontoComunale: 0,
    ...TURNI_E_FASCE,
    ...FISCAL_2026,
  }
  const out = stimaBustaPaga(input)

  it('trattenutaMensa = 9.24 (12 × 0.77, calcolato a mano)', () =>
    expect(out.trattenutaMensa).toBe(9.24))
  it('irpefNettaMensile = 141.74 (identico a TC-A — mensa è trattenuta netta pura, non tocca imponibili)', () =>
    expect(out.irpefNettaMensile).toBe(141.74))
  it('netto = 1665.22 (netto TC-A 1674.46 − 9.24, ricalcolato indipendentemente)', () =>
    expect(out.netto).toBe(1665.22))
})

describe('TC-P – coesistenza sindacato + mensa (stacking due trattenute nette)', () => {
  // Stessi input di TC-M (sindacato 19.76) + numeroPasti/importoMensa di TC-O.
  const input: StimaInput = {
    retribuzioneFissaComponenti: {
      minimoTabellare: 1975.68, superminimo: 24.32, scattiAnzianita: 0, premioProduzioneFisso: 0,
    },
    mensilita: 13,
    giorniPagatiEffettivi: 23,
    giorniLavorabiliMese: 23,
    giorniFerialiMese: 23,
    tariffaOraria: 2000 / 173,
    ore: [],
    entriesOrdinarieMaggiorate: [],
    maggiorazioni: MAGGIORAZIONI_METALMECCANICA,
    variabiliFlat: 0,
    oreCig: 0,
    orePermessoNonRetribuito: 0,
    divisoreOrario: 173,
    coefficienteSolidarieta: 0,
    coefficienteSindacale: 0.01,
    coefficienteCometa: 0,
    minimoTabellareReale: 1975.68,
    numeroPasti: 12,
    importoMensa: 0.77,
    addizionaleRegionale: 0,
    addizionaleComunale: 0,
    accontoComunale: 0,
    ...TURNI_E_FASCE,
    ...FISCAL_2026,
  }
  const out = stimaBustaPaga(input)

  it('trattenutaMensa = 9.24 (12 × 0.77, calcolato a mano)', () =>
    expect(out.trattenutaMensa).toBe(9.24))
  it('trattenutaSindacale = 19.76 (1975.68 × 0.01, calcolato a mano)', () =>
    expect(out.trattenutaSindacale).toBe(19.76))
  it('irpefNettaMensile = 141.74 (identico a TC-A/TC-M — sindacale+mensa nette pure, non toccano imponibili)', () =>
    expect(out.irpefNettaMensile).toBe(141.74))
  it('netto = 1645.46 (1674.46 − 19.76 − 9.24, ricalcolato indipendentemente)', () =>
    expect(out.netto).toBe(1645.46))
})

describe('TC-Q – Cometa (valore, mensile + annuo): deduzione a Stadio 7/8, ralLordo intatto', () => {
  // Stessa retribuzioneFissaComponenti di TC-M (1975.68+24.32=2000.00, minimoTabellareReale
  // dichiarato) — sindacato/mensa spenti per isolare Cometa come unica variabile. coefficiente
  // 0.012 scelto solo per il calcolo a mano, NON un default applicativo (config-driven a runtime).
  //
  // A mano — MENSILE (Stadio 7): imponibileIrpefMensile = 1816.20 (TC-A/TC-M) − 23.71 = 1792.49
  // (stesso pattern del riferimento busta reale 1822.06−23.71=1798.35).
  //
  // A mano — ANNUO (Stadio 8a): ralLordo = 2000×13 = 26000.00, INTATTO (Step 5, mai toccato).
  // cometaAnnuo = 0.012×1975.68×13 = 308.20608 → 308.21 (un solo r2 sui valori grezzi, MAI
  // 23.71×13). imponibileIrpefAnnuo = 26000.00 − 2389.40 (INPS annuo) − 308.21 = 23302.39
  // (era 23610.60 senza Cometa — TC-A/TC-E/TC-F).
  //
  // Cascata IRPEF su rc=23302.39 (scaglioni/detrazioni/cuneo FISCAL_2026, calcolata a mano —
  // computeIrpefAnnua invariata da questo diff, questi 3 valori restano identici a prima):
  //   irpefLorda = 23302.39×0.23 = 5359.55 (primo scaglione, rc<28000)
  //   detrazioniArt13 (fascia lineare 15001-28000) = 1910 + 1190×(28000-23302.39)/13000
  //     = 1910 + 430.01 = 2340.01
  //   cuneo (tier2 detrazione, rc<=32000 piatto) = 1000
  //
  // Modello-busta (nuovo, imponibile unico × aliquota media LORDA − detrazioni/12):
  //   aliquotaMediaLorda = 5359.55/23302.39 ≈ 0.230000 (SOLA progressività, mai le detrazioni —
  //     differenza chiave dal vecchio aliquotaMediaNetta che le incorporava)
  //   irpefLordaMensile = 1792.49×0.230000 ≈ 412.27
  //   detrazioniMensili = (2340.01+1000)/12 = 3340.01/12 = 278.33
  //   irpefNettaMensile ≈ r2(412.27 − 278.33) = 133.94
  // netto = 1792.49 − 133.94 = 1658.55 (arrotondamenti in cascata — verificato contro il motore,
  // entro 1 centesimo di precisione manuale, come atteso su una catena a 5+ stadi).
  const input: StimaInput = {
    retribuzioneFissaComponenti: {
      minimoTabellare: 1975.68, superminimo: 24.32, scattiAnzianita: 0, premioProduzioneFisso: 0,
    },
    mensilita: 13,
    giorniPagatiEffettivi: 23,
    giorniLavorabiliMese: 23,
    giorniFerialiMese: 23,
    tariffaOraria: 2000 / 173,
    ore: [],
    entriesOrdinarieMaggiorate: [],
    maggiorazioni: MAGGIORAZIONI_METALMECCANICA,
    variabiliFlat: 0,
    oreCig: 0,
    orePermessoNonRetribuito: 0,
    divisoreOrario: 173,
    coefficienteSolidarieta: 0,
    coefficienteSindacale: 0,
    coefficienteCometa: 0.012,
    minimoTabellareReale: 1975.68,
    numeroPasti: 0,
    importoMensa: 0,
    addizionaleRegionale: 0,
    addizionaleComunale: 0,
    accontoComunale: 0,
    ...TURNI_E_FASCE,
    ...FISCAL_2026,
  }
  const out = stimaBustaPaga(input)

  it('cometaDeducibile = 23.71 (mensile, 1975.68 × 0.012, calcolato a mano)', () =>
    expect(out.cometaDeducibile).toBe(23.71))
  it('imponibileIrpefMensile = 1792.49 (1816.20 − 23.71, calcolato a mano — Stadio 7)', () =>
    expect(out.imponibileIrpefMensile).toBe(1792.49))
  it('ralLordo = 26000.00 — INTATTO (Step 5: Cometa riduce solo imponibileIrpefAnnuo, mai ralLordo)', () =>
    expect(out.ralLordo).toBe(26000.00))
  it('imponibileIrpefAnnuo = 23302.39 (23610.60 − 308.21 cometaAnnuo, calcolato a mano — Stadio 8a)', () =>
    expect(out.imponibileIrpefAnnuo).toBe(23302.39))
  it('irpefNettaMensile = 133.94 (cascata IRPEF su rc ridotto, calcolata a mano — vedi commento sopra)', () =>
    expect(out.irpefNettaMensile).toBe(133.94))
  it('netto = 1658.55 (cascata IRPEF su rc ridotto, calcolata a mano — vedi commento sopra)', () =>
    expect(out.netto).toBe(1658.55))
})

describe('TC-B – mese parziale (12/23 gg), stessa fissa di TC-A (test decisivo)', () => {
  const input: StimaInput = {
    retribuzioneFissaComponenti: fissaBucket(2000),
    mensilita: 13,
    giorniPagatiEffettivi: 12,
    giorniLavorabiliMese: 23,
    giorniFerialiMese: 23,
    tariffaOraria: 2000 / 173,
    ore: [],
    entriesOrdinarieMaggiorate: [],
    maggiorazioni: MAGGIORAZIONI_METALMECCANICA,
    variabiliFlat: 0,
    oreCig: 0,
    orePermessoNonRetribuito: 0,
    divisoreOrario: 173,
    coefficienteSolidarieta: 0,
    coefficienteSindacale: 0,
    coefficienteCometa: 0,
    minimoTabellareReale: null,
    numeroPasti: 0,
    importoMensa: 0,
    addizionaleRegionale: 0,
    addizionaleComunale: 0,
    accontoComunale: 0,
    ...TURNI_E_FASCE,
    ...FISCAL_2026,
  }
  const out = stimaBustaPaga(input)

  it('lordo = 1043.48 (2000×12/23 — MENO di TC-A: meno giorni, meno lordo)', () => expect(out.lordo).toBe(1043.48))
  it('[DECISIVO] lordo(12/23) ≠ lordo(23/23) a parità di fissa', () => expect(out.lordo).not.toBe(2000))
  // CLAMP INCAPIENZA (secondo caso, oltre TC-NEW-3): stessa rc annua di TC-A (23610.60) →
  // stessa aliquotaMediaLorda(≈0.230000847)/detrazioniMensili(275.98) di TC-A, ma applicate a un
  // imponibileIrpefMensile molto più piccolo (mese parziale 12/23, 947.58 vs 1816.20 di TC-A).
  // contributiInps=r2(1043.48×0.0919)=95.90. imponibileIrpefMensile=r2(1043.48−95.90)=947.58.
  // irpefLordaMensile≈947.58×0.230000847≈217.94. detrazioniMensili=275.98 > lorda → senza clamp
  // darebbe irpefNettaMensile≈−58.04 (netto sarebbe stato 1005.62, valore pre-clamp). Con
  // Math.max(0,...): irpefNettaMensile=0, netto=r2(947.58−0)=947.58.
  it('irpefNettaMensile = 0 (GATE incapienza — senza clamp sarebbe −58.04, deve restare inchiodato a 0)', () =>
    expect(out.irpefNettaMensile).toBe(0))
  it('netto = 947.58 (incapienza clampata — lorda mensile 217.94 < detrazioni 275.98 sul mese parziale)', () =>
    expect(out.netto).toBe(947.58))
})

describe('TC-C – mese pieno + straordinario (variabile, invariato dallo Step 4)', () => {
  const input: StimaInput = {
    retribuzioneFissaComponenti: fissaBucket(2000),
    mensilita: 13,
    giorniPagatiEffettivi: 23,
    giorniLavorabiliMese: 23,
    giorniFerialiMese: 23,
    tariffaOraria: 2000 / 173,
    ore: [{ tipo: 'straordinarioDiurnoFeriale', quantita: 10 }],
    entriesOrdinarieMaggiorate: [],
    maggiorazioni: MAGGIORAZIONI_METALMECCANICA,
    variabiliFlat: 0,
    oreCig: 0,
    orePermessoNonRetribuito: 0,
    divisoreOrario: 173,
    coefficienteSolidarieta: 0,
    coefficienteSindacale: 0,
    coefficienteCometa: 0,
    minimoTabellareReale: null,
    numeroPasti: 0,
    importoMensa: 0,
    addizionaleRegionale: 0,
    addizionaleComunale: 0,
    accontoComunale: 0,
    ...TURNI_E_FASCE,
    ...FISCAL_2026,
  }
  const out = stimaBustaPaga(input)

  it('lordo = 2144.51 (fissa 2000.00 + extra 10×(2000/173)×1.25=144.51)', () =>
    expect(out.lordo).toBe(2144.51))
  // contributiInps=r2(2144.51×0.0919)=197.08. imponibileIrpefMensile=r2(2144.51−197.08)=1947.43.
  // Stessa rc/aliquotaMediaLorda di TC-A. irpefNettaMensile=r2(1947.43×0.230000847−275.98333)=171.93.
  it('irpefNettaMensile = 171.93', () => expect(out.irpefNettaMensile).toBe(171.93))
  it('netto = 1775.50', () => expect(out.netto).toBe(1775.50))
})

// ─── TC-NEW-1: scenario ex-TC1, mese pieno + straordinario ───────────────────────────────
// retribuzioneFissaComponenti 2200 invariato per il RAL (indipendente da giorni/ore — è la
// fissa dichiarata). RAL/IRPEF annuo restano IDENTICI a Step 3 (25971.66/5973.48/2160.67/1000)
// — solo lordo/netto mensili cambiano (fisso ora da giorni, non più da ore).

describe('TC-NEW-1 – mese pieno 23/23 gg, scaglione 23%, cuneo tier2 piatto (ex TC1)', () => {
  const input: StimaInput = {
    retribuzioneFissaComponenti: fissaBucket(2200),
    mensilita: 13,
    giorniPagatiEffettivi: 23,
    giorniLavorabiliMese: 23,
    giorniFerialiMese: 23,
    tariffaOraria: 2200 / 173,
    ore: [{ tipo: 'straordinarioDiurnoFeriale', quantita: 10 }],
    entriesOrdinarieMaggiorate: [],
    maggiorazioni: MAGGIORAZIONI_METALMECCANICA,
    variabiliFlat: 0,
    oreCig: 0,
    orePermessoNonRetribuito: 0,
    divisoreOrario: 173,
    coefficienteSolidarieta: 0,
    coefficienteSindacale: 0,
    coefficienteCometa: 0,
    minimoTabellareReale: null,
    numeroPasti: 0,
    importoMensa: 0,
    addizionaleRegionale: 0,
    addizionaleComunale: 0,
    accontoComunale: 0,
    ...TURNI_E_FASCE,
    ...FISCAL_2026,
  }
  const out = stimaBustaPaga(input)

  it('lordo = 2358.96 (fissa 2200.00 + extra 10×2200/173×1.25=158.96)', () =>
    expect(out.lordo).toBe(2358.96))
  it('contributiInps = 216.79', () => expect(out.contributiInps).toBe(216.79))
  it('imponibileIrpefAnnuo = 25971.66 (RAL invariato — indipendente da giorni/ore)', () =>
    expect(out.imponibileIrpefAnnuo).toBe(25971.66))
  it('irpefLorda = 5973.48 (invariato)', () => expect(out.irpefLorda).toBe(5973.48))
  it('detrazioniArt13 = 2160.67 (invariato)', () => expect(out.detrazioniArt13).toBe(2160.67))
  it('beneficioCuneo = 1000 (invariato, piatto)', () => expect(out.beneficioCuneo).toBe(1000))
  // Ricalcolato (modello-busta): imponibileIrpefMensile=r2(2358.96−216.79)=2142.17.
  // aliquotaMediaLorda=5973.48/25971.66≈0.229999. irpefLordaMensile≈2142.17×0.229999≈492.70.
  // detrazioniMensili=(2160.67+1000)/12=263.39. irpefNettaMensile≈r2(492.70−263.39)=229.31.
  it('irpefNettaMensile = 229.31', () => expect(out.irpefNettaMensile).toBe(229.31))
  it('netto = 1912.86', () => expect(out.netto).toBe(1912.86))
  it('warningDetrazioniForfettizzate = true', () => expect(out.warningDetrazioniForfettizzate).toBe(true))
})

// ─── TC-NEW-2: scenario ex-TC2 (due scaglioni IRPEF, cuneo decrescente) ───────────────────

describe('TC-NEW-2 – mese pieno 23/23 gg, due scaglioni IRPEF, cuneo decrescente (ex TC2)', () => {
  const input: StimaInput = {
    retribuzioneFissaComponenti: fissaBucket(2800),
    mensilita: 13,
    giorniPagatiEffettivi: 23,
    giorniLavorabiliMese: 23,
    giorniFerialiMese: 23,
    tariffaOraria: 2800 / 173,
    ore: [{ tipo: 'straordinarioDiurnoFeriale', quantita: 20 }],
    entriesOrdinarieMaggiorate: [],
    maggiorazioni: MAGGIORAZIONI_METALMECCANICA,
    variabiliFlat: 0,
    oreCig: 0,
    orePermessoNonRetribuito: 0,
    divisoreOrario: 173,
    coefficienteSolidarieta: 0,
    coefficienteSindacale: 0,
    coefficienteCometa: 0,
    minimoTabellareReale: null,
    numeroPasti: 0,
    importoMensa: 0,
    addizionaleRegionale: 0,
    addizionaleComunale: 0,
    accontoComunale: 0,
    ...TURNI_E_FASCE,
    ...FISCAL_2026,
  }
  const out = stimaBustaPaga(input)

  it('lordo = 3204.62 (fissa 2800.00 + extra 20×2800/173×1.25=404.62)', () => expect(out.lordo).toBe(3204.62))
  it('imponibileIrpefAnnuo = 33054.84 (RAL invariato, straord non inquina)', () =>
    expect(out.imponibileIrpefAnnuo).toBe(33054.84))
  it('irpefLorda = 8108.10 (invariato)', () => expect(out.irpefLorda).toBe(8108.10))
  it('detrazioniArt13 = 1536.15 (invariato)', () => expect(out.detrazioniArt13).toBe(1536.15))
  it('beneficioCuneo = 868.15 (invariato, decrescente)', () => expect(out.beneficioCuneo).toBe(868.15))
  // Ricalcolato (modello-busta, cross-check multi-scaglione oltre al TC isolato dedicato):
  // contributiInps=r2(3204.62×0.0919)=294.50. imponibileIrpefMensile=r2(3204.62−294.50)=2910.12.
  // aliquotaMediaLorda=8108.10/33054.84≈0.245292 (rc>28000, pesa il secondo scaglione 33%).
  // irpefLordaMensile≈2910.12×0.245292≈713.83. detrazioniMensili=(1536.15+868.15)/12=200.36.
  // irpefNettaMensile≈r2(713.83−200.36)=513.47.
  it('irpefNettaMensile = 513.47', () => expect(out.irpefNettaMensile).toBe(513.47))
  it('netto = 2396.65', () => expect(out.netto).toBe(2396.65))
})

// ─── TC-NEW-3: mese parziale (metà giorni), zero straord — ex TC3 ────────────────────────

describe('TC-NEW-3 – mese parziale (12/23 gg), zero straord (ex TC3)', () => {
  const input: StimaInput = {
    retribuzioneFissaComponenti: fissaBucket(2200),
    mensilita: 13,
    giorniPagatiEffettivi: 12,
    giorniLavorabiliMese: 23,
    giorniFerialiMese: 23,
    tariffaOraria: 2200 / 173,
    ore: [],
    entriesOrdinarieMaggiorate: [],
    maggiorazioni: MAGGIORAZIONI_METALMECCANICA,
    variabiliFlat: 0,
    oreCig: 0,
    orePermessoNonRetribuito: 0,
    divisoreOrario: 173,
    coefficienteSolidarieta: 0,
    coefficienteSindacale: 0,
    coefficienteCometa: 0,
    minimoTabellareReale: null,
    numeroPasti: 0,
    importoMensa: 0,
    addizionaleRegionale: 0,
    addizionaleComunale: 0,
    accontoComunale: 0,
    ...TURNI_E_FASCE,
    ...FISCAL_2026,
  }
  const out = stimaBustaPaga(input)

  it('lordo = 1147.83 (2200×12/23)', () => expect(out.lordo).toBe(1147.83))
  it('imponibileIrpefAnnuo = 25971.66 (RAL invariato)', () => expect(out.imponibileIrpefAnnuo).toBe(25971.66))
  // CLAMP INCAPIENZA: contributiInps=r2(1147.83×0.0919)=105.49.
  // imponibileIrpefMensile=r2(1147.83−105.49)=1042.34. aliquotaMediaLorda=5973.48/25971.66≈0.23
  // (stessa rc di TC-NEW-1). irpefLordaMensile≈1042.34×0.23≈239.74.
  // detrazioniMensili=(2160.67+1000)/12=263.39 — FLAT, non pro-quotato sui 12/23 giorni effettivi
  // del mese parziale: su questa base ridotta le detrazioni intere superano la lorda mensile
  // (239.74−263.39=−23.65). Math.max(0,...) clampa l'incapienza a 0 — l'IRPEF mensile trattenuta
  // non è mai negativa, l'eccedenza non è simulata come conguaglio qui (semplificazione dichiarata).
  it('irpefNettaMensile = 0 (incapienza clampata — 239.74 lorda < 263.39 detrazioni sui 12/23 gg)', () =>
    expect(out.irpefNettaMensile).toBe(0))
  it('netto = 1042.34 (= imponibileIrpefMensile, zero IRPEF trattenuta per incapienza)', () =>
    expect(out.netto).toBe(1042.34))
})

// ─── TC-D: input ORARIO diretto, mese pieno — RAL da tariffa×173, lordo da giorni ────────
// Anche per il tipo 'hourly' il fisso matura ora sui GIORNI (stessa formula) — un mese pieno
// dà sempre tariffa×divisore esatto, indipendentemente da quante ore reali contenga il mese
// (l'anti-pattern "ore reali determinano il fisso" è eliminato per entrambi i tipi di input).

describe('TC-D – input orario diretto, mese pieno 23/23 gg', () => {
  const input: StimaInput = {
    retribuzioneFissaComponenti: fissaBucket(2595), // = tariffaOraria(15) × divisoreOrario(173), risolto dal resolver
    mensilita: 13,
    giorniPagatiEffettivi: 23,
    giorniLavorabiliMese: 23,
    giorniFerialiMese: 23,
    tariffaOraria: 15,
    ore: [],
    entriesOrdinarieMaggiorate: [],
    maggiorazioni: MAGGIORAZIONI_METALMECCANICA,
    variabiliFlat: 0,
    oreCig: 0,
    orePermessoNonRetribuito: 0,
    divisoreOrario: 173,
    coefficienteSolidarieta: 0,
    coefficienteSindacale: 0,
    coefficienteCometa: 0,
    minimoTabellareReale: null,
    numeroPasti: 0,
    importoMensa: 0,
    addizionaleRegionale: 0,
    addizionaleComunale: 0,
    accontoComunale: 0,
    ...TURNI_E_FASCE,
    ...FISCAL_2026,
  }
  const out = stimaBustaPaga(input)

  it('lordo = 2595.00 (mese pieno = fissa esatta, anche per input orario)', () => expect(out.lordo).toBe(2595.00))
  it('imponibileIrpefAnnuo = 30634.75 (RAL = 2595×13, cioè tariffa×173×mensilità)', () =>
    expect(out.imponibileIrpefAnnuo).toBe(30634.75))
  // contributiInps=r2(2595.00×0.0919)=238.48. imponibileIrpefMensile=r2(2595.00−238.48)=2356.52.
  // rc=30634.75 (>28000): irpefLorda=7309.47 (6440.00 primo scaglione + 869.47 secondo),
  // detrazioniArt13=1746.26, beneficioCuneo=1000 (tier2 piatto, rc≤32000). aliquotaMediaLorda=
  // 7309.47/30634.75≈0.238601. irpefNettaMensile=r2(2356.52×0.238601−228.855)≈333.41.
  it('irpefNettaMensile = 333.41', () => expect(out.irpefNettaMensile).toBe(333.41))
  it('netto = 2023.11', () => expect(out.netto).toBe(2023.11))
})

// ─── TC-E: turno ORDINARIO notturno via FLAG — overlap pieno con la fascia (reinterpretato) ──
// kind='work' con flag notturno, NESSUN orario esplicito → turno standard 22:00-06:00 (da
// turniStandard), overlap con fascia notturna 22:00-06:00 = 8h intere (identità: lo stesso
// caso di prima, ma ora passa dall'overlap, non da "tutte le ore dell'entry"). La % cambia
// 0.15→0.20 (fasceMaggiorate, non più MAGGIORAZIONI_METALMECCANICA): il NUMERO si muove per
// quello, non per il meccanismo — prova che il meccanismo non sposta il caso base.

describe('TC-E – mese pieno 23/23 gg + notturno via flag (overlap pieno 8h col turno standard)', () => {
  const input: StimaInput = {
    retribuzioneFissaComponenti: fissaBucket(2000),
    mensilita: 13,
    giorniPagatiEffettivi: 23,
    giorniLavorabiliMese: 23,
    giorniFerialiMese: 23,
    tariffaOraria: 2000 / 173,
    ore: [],
    entriesOrdinarieMaggiorate: [{ flag: 'notturno' }],
    maggiorazioni: MAGGIORAZIONI_METALMECCANICA,
    variabiliFlat: 0,
    oreCig: 0,
    orePermessoNonRetribuito: 0,
    divisoreOrario: 173,
    coefficienteSolidarieta: 0,
    coefficienteSindacale: 0,
    coefficienteCometa: 0,
    minimoTabellareReale: null,
    numeroPasti: 0,
    importoMensa: 0,
    addizionaleRegionale: 0,
    addizionaleComunale: 0,
    accontoComunale: 0,
    ...TURNI_E_FASCE,
    ...FISCAL_2026,
  }
  const out = stimaBustaPaga(input)

  it('lordo = 2018.50 (fissa 2000.00 + markup 8h×(2000/173)×0.20=18.50 — overlap pieno, non più flat 0.15)', () =>
    expect(out.lordo).toBe(2018.50))
  // contributiInps=r2(2018.50×0.0919)=185.50. imponibileIrpefMensile=r2(2018.50−185.50)=1833.00.
  // Stessa rc/aliquotaMediaLorda di TC-A. irpefNettaMensile=r2(1833.00×0.230000847−275.98333)=145.61.
  it('irpefNettaMensile = 145.61', () => expect(out.irpefNettaMensile).toBe(145.61))
  it('netto = 1687.39', () => expect(out.netto).toBe(1687.39))
  it('imponibileIrpefAnnuo = 23610.60 (RAL invariato — il turno ordinario non tocca il fisso/RAL)', () =>
    expect(out.imponibileIrpefAnnuo).toBe(23610.60))
  it('oreNotturne = 8 (overlap pieno col turno standard 22:00-06:00, display puro)', () =>
    expect(out.oreNotturne).toBe(8))
  it('orePomeridiane = 0 (nessuna entry pomeridiana)', () => expect(out.orePomeridiane).toBe(0))
})

// ─── TC-F: turno ORDINARIO pomeridiano via FLAG — riscritto, doppio cambio isolato ───────
// turno standard pomeriggio 14:00-22:00, overlap con fascia SERALE 18:00-22:00 = SOLO 4h
// (le 14:00-18:00 non sono in nessuna fascia, zero maggiorazione). Cambia sia le ore (8h→4h)
// sia la % (0.065→0.20) — non una ricalibrazione, uno scenario nuovo.

describe('TC-F – mese pieno 23/23 gg + pomeridiano via flag (overlap parziale 4h su 8h di turno)', () => {
  const input: StimaInput = {
    retribuzioneFissaComponenti: fissaBucket(2000),
    mensilita: 13,
    giorniPagatiEffettivi: 23,
    giorniLavorabiliMese: 23,
    giorniFerialiMese: 23,
    tariffaOraria: 2000 / 173,
    ore: [],
    entriesOrdinarieMaggiorate: [{ flag: 'pomeridiano' }],
    maggiorazioni: MAGGIORAZIONI_METALMECCANICA,
    variabiliFlat: 0,
    oreCig: 0,
    orePermessoNonRetribuito: 0,
    divisoreOrario: 173,
    coefficienteSolidarieta: 0,
    coefficienteSindacale: 0,
    coefficienteCometa: 0,
    minimoTabellareReale: null,
    numeroPasti: 0,
    importoMensa: 0,
    addizionaleRegionale: 0,
    addizionaleComunale: 0,
    accontoComunale: 0,
    ...TURNI_E_FASCE,
    ...FISCAL_2026,
  }
  const out = stimaBustaPaga(input)

  it('lordo = 2009.25 (fissa 2000.00 + markup 4h×(2000/173)×0.20=9.25 — solo le 18-22, non l\'intero turno)', () =>
    expect(out.lordo).toBe(2009.25))
  // contributiInps=r2(2009.25×0.0919)=184.65. imponibileIrpefMensile=r2(2009.25−184.65)=1824.60.
  // Stessa rc/aliquotaMediaLorda di TC-A. irpefNettaMensile=r2(1824.60×0.230000847−275.98333)=143.67.
  it('irpefNettaMensile = 143.67', () => expect(out.irpefNettaMensile).toBe(143.67))
  it('netto = 1680.93', () => expect(out.netto).toBe(1680.93))
  it('imponibileIrpefAnnuo = 23610.60 (RAL invariato, identico a TC-E)', () =>
    expect(out.imponibileIrpefAnnuo).toBe(23610.60))
  it('orePomeridiane = 4 (overlap parziale con la fascia 18:00-22:00, display puro)', () =>
    expect(out.orePomeridiane).toBe(4))
  it('oreNotturne = 0 (nessuna entry notturna)', () => expect(out.oreNotturne).toBe(0))
})

// ─── TC-G: turno ORDINARIO pomeridiano via ORARIO ESPLICITO — gate di consistenza ────────
// 14:00-22:00 esplicito deve dare l'IDENTICO risultato di TC-F (flag pomeridiano, che deriva
// lo stesso span dal turno standard). Prova che i due rami della union sono equivalenti a
// parità di span — non un caso nuovo, un controllo di non-regressione sul refactoring orario
// esplicito (Fase 3, Passo 4).

describe('TC-G – mese pieno 23/23 gg + pomeridiano via ORARIO ESPLICITO (deve = TC-F)', () => {
  const input: StimaInput = {
    retribuzioneFissaComponenti: fissaBucket(2000),
    mensilita: 13,
    giorniPagatiEffettivi: 23,
    giorniLavorabiliMese: 23,
    giorniFerialiMese: 23,
    tariffaOraria: 2000 / 173,
    ore: [],
    entriesOrdinarieMaggiorate: [{ orario: { inizio: '14:00', fine: '22:00' } }],
    maggiorazioni: MAGGIORAZIONI_METALMECCANICA,
    variabiliFlat: 0,
    oreCig: 0,
    orePermessoNonRetribuito: 0,
    divisoreOrario: 173,
    coefficienteSolidarieta: 0,
    coefficienteSindacale: 0,
    coefficienteCometa: 0,
    minimoTabellareReale: null,
    numeroPasti: 0,
    importoMensa: 0,
    addizionaleRegionale: 0,
    addizionaleComunale: 0,
    accontoComunale: 0,
    ...TURNI_E_FASCE,
    ...FISCAL_2026,
  }
  const out = stimaBustaPaga(input)

  it('lordo = 2009.25 (identico a TC-F: overlap 4h con fascia 18-22, stesso span del flag)', () =>
    expect(out.lordo).toBe(2009.25))
  it('irpefNettaMensile = 143.67 (identico a TC-F — stesso lordo 2009.25, stessa rc)', () =>
    expect(out.irpefNettaMensile).toBe(143.67))
  it('netto = 1680.93 (identico a TC-F)', () => expect(out.netto).toBe(1680.93))
  it('imponibileIrpefAnnuo = 23610.60 (identico a TC-F)', () => expect(out.imponibileIrpefAnnuo).toBe(23610.60))
  it('orePomeridiane = 4 (identico a TC-F — stesso span, ramo orario esplicito)', () =>
    expect(out.orePomeridiane).toBe(4))
  it('oreNotturne = 0', () => expect(out.oreNotturne).toBe(0))
})

// ─── TC-H: flat variabile (Step 6) — modello-busta, calcolato a mano ─────────────────────
// Stesso input di TC-A (fissa 2000, mese pieno, zero straordinario/turno) + variabiliFlat=500.
// RAL invariato (23610.60, identico a TC-A/E/F — variabiliFlat non tocca Stadio 2/8a) quindi
// stessa rc di TC-A → stessi irpefLorda(5430.44)/detrazioniArt13(2311.80)/beneficioCuneo(1000)
// e stessa aliquotaMediaLorda(≈0.230000847) di TC-A. Il modello-busta non ha più un canale
// extra separato: il flat entra semplicemente nell'unico imponibileIrpefMensile, tassato alla
// STESSA aliquota media lorda del resto (non più marginale isolata come nel vecchio split). A mano:
//   contributiInps = r2(2500.00×0.0919) = 229.75
//   imponibileIrpefMensile = r2(2500.00−229.75) = 2270.25
//   irpefLordaMensile = 2270.25×0.230000847 = 522.1575+ε ≈ 522.16
//   detrazioniMensili = (2311.80+1000)/12 = 275.98333
//   irpefNettaMensile = r2(522.16−275.98333) = 246.17
//   netto = r2(2270.25−246.17) = 2024.08
// CORREZIONE (Diff A): la versione precedente di questo commento aveva un errore di calcolo
// manuale (522.26/246.28 invece di 522.16/246.17) — mai asserito direttamente allora (solo
// netto era testato, ed era già corretto), scoperto solo ora aggiungendo l'assert su
// irpefNettaMensile. Non è un secondo TC-B (nessun segno/clamp coinvolto), solo un refuso
// nel commento.
describe('TC-H – mese pieno 23/23 gg + variabiliFlat 500€ (delta a marginale, no straord/turno)', () => {
  const input: StimaInput = {
    retribuzioneFissaComponenti: fissaBucket(2000),
    mensilita: 13,
    giorniPagatiEffettivi: 23,
    giorniLavorabiliMese: 23,
    giorniFerialiMese: 23,
    tariffaOraria: 2000 / 173,
    ore: [],
    entriesOrdinarieMaggiorate: [],
    maggiorazioni: MAGGIORAZIONI_METALMECCANICA,
    variabiliFlat: 500,
    oreCig: 0,
    orePermessoNonRetribuito: 0,
    divisoreOrario: 173,
    coefficienteSolidarieta: 0,
    coefficienteSindacale: 0,
    coefficienteCometa: 0,
    minimoTabellareReale: null,
    numeroPasti: 0,
    importoMensa: 0,
    addizionaleRegionale: 0,
    addizionaleComunale: 0,
    accontoComunale: 0,
    ...TURNI_E_FASCE,
    ...FISCAL_2026,
  }
  const out = stimaBustaPaga(input)

  it('lordo = 2500.00 (2000 fissa + 500 flat — nessuna maggiorazione, è già un importo)', () =>
    expect(out.lordo).toBe(2500.00))
  it('imponibileIrpefAnnuo = 23610.60 (RAL invariato — variabiliFlat non è RAL)', () =>
    expect(out.imponibileIrpefAnnuo).toBe(23610.60))
  it('irpefNettaMensile = 246.17 (modello-busta, calcolato a mano — vedi commento sopra e CORREZIONE)', () =>
    expect(out.irpefNettaMensile).toBe(246.17))
  it('netto = 2024.08 (modello-busta, calcolato a mano — vedi commento sopra)', () =>
    expect(out.netto).toBe(2024.08))
})

// ─── TC-I/TC-J: giorno misto work+cig (CIG Step 4) — verifica ortogonalità, nessun nuovo stadio ──
// giorniPagatiEffettivi (giorno-livello, max kind% — Stadio 7 resolver) e oreCig (ora-livello,
// somma per-entry — Stadio 8 resolver) sono assi ortogonali sullo stesso dayMap: un giorno misto
// contribuisce 1.0 UNA VOLTA a giorniPagatiEffettivi (mai 2.0, è un max non una somma) e SOLO le
// ore kind='cig' a oreCig (le ore 'work' dello stesso giorno sono ignorate dal filtro). Qui si
// verifica che il motore, ricevuto il numero già aggregato dal resolver, tenga fede a questa
// indipendenza: fisso pieno indipendentemente dalla composizione del giorno, storno SOLO sulle
// ore cig reali (non sul giorno intero).

describe('TC-I – giorno misto 6h lavoro + 2h cig (fisso pieno, storno solo su 2h non 8h)', () => {
  const input: StimaInput = {
    retribuzioneFissaComponenti: fissaBucket(2248.97),
    mensilita: 13,
    giorniPagatiEffettivi: 22,   // mese pieno — il giorno misto conta 1.0 come qualsiasi altro
    giorniLavorabiliMese: 22,
    giorniFerialiMese: 22,
    tariffaOraria: 2248.97 / 173,
    ore: [],
    entriesOrdinarieMaggiorate: [],
    maggiorazioni: MAGGIORAZIONI_METALMECCANICA,
    variabiliFlat: 0,
    oreCig: 2,                  // SOLO la quota cig del giorno misto — le 6h work non entrano qui
    orePermessoNonRetribuito: 0,
    divisoreOrario: 173,
    coefficienteSolidarieta: 0, // isola fisso/storno dall'integrazione (bucket diff 3, non qui)
    coefficienteSindacale: 0,
    coefficienteCometa: 0,
    minimoTabellareReale: null,
    numeroPasti: 0,
    importoMensa: 0,
    addizionaleRegionale: 0,
    addizionaleComunale: 0,
    accontoComunale: 0,
    ...TURNI_E_FASCE,
    ...FISCAL_2026,
  }
  const out = stimaBustaPaga(input)

  it('stornoCig = 25.56 (2h × 2248.97/176, non 8h × .../176 = 102.23)', () =>
    expect(out.stornoCig).toBe(25.56))
  it('lordo = 2223.41 (fissa 2248.97 PIENA − storno 25.56 — il fisso non "sa" che il giorno era misto)', () =>
    expect(out.lordo).toBe(2223.41))
})

describe('TC-J – mese con giorno CIG pieno (8h) + giorno misto (4h+4h) — oreCig somma entrambi', () => {
  const input: StimaInput = {
    retribuzioneFissaComponenti: fissaBucket(2248.97),
    mensilita: 13,
    giorniPagatiEffettivi: 22,   // OGNI giorno (work puro, cig puro, misto) conta 1.0 — mai doppio
    giorniLavorabiliMese: 22,
    giorniFerialiMese: 22,
    tariffaOraria: 2248.97 / 173,
    ore: [],
    entriesOrdinarieMaggiorate: [],
    maggiorazioni: MAGGIORAZIONI_METALMECCANICA,
    variabiliFlat: 0,
    oreCig: 12,                 // 8h (giorno cig pieno) + 4h (quota cig del giorno misto) = 12
    orePermessoNonRetribuito: 0,
    divisoreOrario: 173,
    coefficienteSolidarieta: 0,
    coefficienteSindacale: 0,
    coefficienteCometa: 0,
    minimoTabellareReale: null,
    numeroPasti: 0,
    importoMensa: 0,
    addizionaleRegionale: 0,
    addizionaleComunale: 0,
    accontoComunale: 0,
    ...TURNI_E_FASCE,
    ...FISCAL_2026,
  }
  const out = stimaBustaPaga(input)

  it('stornoCig = 153.34 (12h × 2248.97/176 — somma dei due giorni, non doppiata né persa)', () =>
    expect(out.stornoCig).toBe(153.34))
  it('lordo = 2095.63 (fissa 2248.97 piena, invariata dal numero di giorni cig/misti nel mese)', () =>
    expect(out.lordo).toBe(2095.63))
})

// ─── TC-K: permesso non retribuito (Step 1b) — 30/04 reale, ricalcolato a mano ─────────────
// Target a mano: 1.5 × 2248.97/173 = 1.5 × 12.99983 = 19.4997... → 19.50 di storno.
// Stessa base di TC-I/TC-J (fissa 2248.97, mese pieno 22/22gg) MA con permesso invece di cig,
// così il confronto isola l'effetto del nuovo termine: lordo scende esattamente di 19.50
// rispetto allo stesso identico input con orePermessoNonRetribuito: 0.

describe('TC-K – 1.5h permesso non retribuito (fissa piena, storno a valle come CIG)', () => {
  const baseInput: StimaInput = {
    retribuzioneFissaComponenti: fissaBucket(2248.97),
    mensilita: 13,
    giorniPagatiEffettivi: 22,
    giorniLavorabiliMese: 22,
    giorniFerialiMese: 22,
    tariffaOraria: 2248.97 / 173,
    ore: [],
    entriesOrdinarieMaggiorate: [],
    maggiorazioni: MAGGIORAZIONI_METALMECCANICA,
    variabiliFlat: 0,
    oreCig: 0,
    orePermessoNonRetribuito: 0,
    divisoreOrario: 173,
    coefficienteSolidarieta: 0,
    coefficienteSindacale: 0,
    coefficienteCometa: 0,
    minimoTabellareReale: null,
    numeroPasti: 0,
    importoMensa: 0,
    addizionaleRegionale: 0,
    addizionaleComunale: 0,
    accontoComunale: 0,
    ...TURNI_E_FASCE,
    ...FISCAL_2026,
  }
  const outSenzaPermesso = stimaBustaPaga(baseInput)
  const outConPermesso = stimaBustaPaga({ ...baseInput, orePermessoNonRetribuito: 1.5 })

  it('lordo senza permesso = 2248.97 (fissa piena, mese pieno)', () =>
    expect(outSenzaPermesso.lordo).toBe(2248.97))
  it('lordo con 1.5h permesso = 2229.47 (2248.97 − 19.50)', () =>
    expect(outConPermesso.lordo).toBe(2229.47))
  it('differenza esatta = 19.50', () =>
    expect(outSenzaPermesso.lordo - outConPermesso.lordo).toBeCloseTo(19.50, 2))
})

// ─── computeOreInFascia — overlap puro, casi limite (minuti 0-1439, wrap mezzanotte) ─────

describe('computeOreInFascia', () => {
  it('confine esatto: span identico alla fascia → tutte le ore', () => {
    expect(computeOreInFascia({ inizio: '22:00', fine: '06:00' }, { da: '22:00', a: '06:00', percentuale: 0.20 })).toBe(8)
  })
  it('contenuto: span interamente dentro la fascia → tutte le ore, nessun clipping', () => {
    expect(computeOreInFascia({ inizio: '19:00', fine: '21:00' }, { da: '18:00', a: '22:00', percentuale: 0.20 })).toBe(2)
  })
  it('parziale: span 20:00-06:00 (wrappa) vs fascia serale 18-22 → solo 2h (20-22)', () => {
    expect(computeOreInFascia({ inizio: '20:00', fine: '06:00' }, { da: '18:00', a: '22:00', percentuale: 0.20 })).toBe(2)
  })
  it('parziale: span 20:00-06:00 (wrappa) vs fascia notturna 22-06 → 8h (tutto lo span notturno)', () => {
    expect(computeOreInFascia({ inizio: '20:00', fine: '06:00' }, { da: '22:00', a: '06:00', percentuale: 0.20 })).toBe(8)
  })
  it('zero: span diurno interamente fuori da una fascia wrappante → 0', () => {
    expect(computeOreInFascia({ inizio: '08:00', fine: '16:00' }, { da: '22:00', a: '06:00', percentuale: 0.20 })).toBe(0)
  })
  it('entrambi wrappanti: span 23:00-07:00 vs fascia 22:00-06:00 → 7h (23-06 comuni, 06-07 fuori fascia)', () => {
    expect(computeOreInFascia({ inizio: '23:00', fine: '07:00' }, { da: '22:00', a: '06:00', percentuale: 0.20 })).toBe(7)
  })
})

// ─── marginalRate — boundary at bracket edges (invariato, non tocca StimaInput) ──────────

describe('marginalRate – boundary at 28000 and 50000', () => {
  const sc = FISCAL_2026.scaglioni

  it('rc = 27999.99 → 23%', () => expect(marginalRate(27999.99, sc)).toBe(0.23))
  it('rc = 28000 → 23% (≤ fino, stays in bracket)', () => expect(marginalRate(28000, sc)).toBe(0.23))
  it('rc = 28000.01 → 33%', () => expect(marginalRate(28000.01, sc)).toBe(0.33))
  it('rc = 49999.99 → 33%', () => expect(marginalRate(49999.99, sc)).toBe(0.33))
  it('rc = 50000 → 33%', () => expect(marginalRate(50000, sc)).toBe(0.33))
  it('rc = 50000.01 → 43%', () => expect(marginalRate(50000.01, sc)).toBe(0.43))
})

// ─── Congedo parentale 80% e 30% ──────────────────────────────────────────────

describe('Congedo parentale 80% e 30%', () => {
  const baseInput: StimaInput = {
    retribuzioneFissaComponenti: fissaBucket(2296.56),
    mensilita: 13,
    giorniPagatiEffettivi: 22,
    giorniLavorabiliMese: 22,
    tariffaOraria: 2296.56 / 173,
    ore: [],
    entriesOrdinarieMaggiorate: [],
    maggiorazioni: MAGGIORAZIONI_METALMECCANICA,
    variabiliFlat: 0,
    oreCig: 0,
    giorniFerialiMese: 22,
    coefficienteSolidarieta: 0,
    orePermessoNonRetribuito: 0,
    divisoreOrario: 173,
    coefficienteSindacale: 0,
    coefficienteCometa: 0,
    minimoTabellareReale: null,
    numeroPasti: 0,
    importoMensa: 0,
    addizionaleRegionale: 0,
    addizionaleComunale: 0,
    accontoComunale: 0,
    ...TURNI_E_FASCE,
    ...FISCAL_2026,
  }

  it('8h congedo parentale 80%: storno = 106.20, indennita = 84.96, INPS solo su lordo ridotto', () => {
    const out = stimaBustaPaga({ ...baseInput, oreCongedoParentale80: 8 })
    // tariffa = 2296.56 / 173 = 13.27491 -> 8h = 106.20
    expect(out.stornoCongedoParentale).toBe(106.20)
    expect(out.indennitaCongedoParentale).toBe(84.96) // 106.20 * 0.80 = 84.96
    expect(out.lordo).toBe(2296.56 - 106.20) // 2190.36
    // Contributi INPS calcolati su lordo (2190.36 * 0.0919 = 201.29), NON sull'indennità
    expect(out.contributiInps).toBe(Math.round(2190.36 * 0.0919 * 100) / 100)
    // Imponibile IRPEF include l'indennità: (lordo - inps) + indennità
    expect(out.imponibileIrpefMensile).toBe(
      Math.round((2190.36 - out.contributiInps + 84.96) * 100) / 100,
    )
  })

  it('8h congedo parentale 30%: storno = 106.20, indennita = 31.86', () => {
    const out = stimaBustaPaga({ ...baseInput, oreCongedoParentale30: 8 })
    expect(out.stornoCongedoParentale).toBe(106.20)
    expect(out.indennitaCongedoParentale).toBe(31.86) // 106.20 * 0.30 = 31.86
    expect(out.lordo).toBe(2190.36)
  })
})
