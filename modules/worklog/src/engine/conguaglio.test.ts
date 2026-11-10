import { describe, expect, it } from 'vitest'
import { stimaConguaglio, computeRalTeoricoAnnuo, type StimaConguaglioInput } from '@dexhub/worklog-engine'

// ─── Fase 3 Passo 2 — RAL effettivo proiettato + avviso conguaglio ─────────────────────
// Formula (rivista 2026-09-10, derivata dal ledger — vedi header di conguaglio.ts e TC-F/G/H):
//   conguaglio = L(R_eff) − α · R_eff,  α = L(R_teo)/R_teo = aliquotaMediaLorda teorica
// I valori di TC-B/C/D sono stati RICALCOLATI a mano quando il modello è cambiato: la vecchia
// formula (delta × differenza di marginali) sovrastimava, perché applicava il 33% anche alla
// quota di delta che resta sotto i 28.000.
// deltaImponibileAnnuo = Σ(extra_m sui mesi reali validi) + mesiFuturi × extraProiettato/mese
// extra_m = imponibileIrpefMensile_reale − (retribuzioneMensile × (1 − contributiInpsRate))
//
// Base comune: mensile 2200, mensilita 13 → RAL teorico 28600 → imponibile teorico 25971.66
// → marginaleTeorico 23% (scaglione ≤28000). Nominale netto INPS/mese = 1997.82.

const SCAGLIONI: StimaConguaglioInput['scaglioni'] = [
  { fino: 28000, aliquota: 0.23 },
  { fino: 50000, aliquota: 0.33 },
  { fino: null,  aliquota: 0.43 },
]

// Normalizzazione temporale (2026-09-10): il motore non deriva più nominale e RAL teorico da
// scalari — li riceve già ricostruiti dal resolver. I TC A-H sono stati migrati alla nuova
// forma con gli STESSI numeri che il motore calcolava da sé, quindi gli attesi non cambiano:
//   nominale/mese     = 2200 × (1 − 0.0919)      = 1997.82
//   ralTeoricoImponib = 2200 × 13 × (1 − 0.0919) = 25971.66
const NOMINALE_BASE = 1997.82
const BASE = {
  scaglioni: SCAGLIONI,
  ralTeoricoImponibile: 25971.66,
}

describe('stimaConguaglio', () => {
  it('TC-A: nessuno sforo → conguaglio 0, nessun avviso', () => {
    const out = stimaConguaglio({
      ...BASE,
      imponibiliMensiliReali: Array(6).fill(1997.82),
      imponibiliNominaliMensili: Array(6).fill(NOMINALE_BASE),
      mesiAttesiReali: 6,
      mesiFuturi: 6,
      proiezione: 'prudente',
    })
    expect(out.mesiCompletiUsati).toBe(6)
    expect(out.marginaleTeorico).toBe(0.23)
    expect(out.marginaleEffettivo).toBe(0.23)
    expect(out.deltaImponibileAnnuo).toBe(0)
    expect(out.conguaglioStimato).toBe(0)
    expect(out.warningConguaglio).toBe(false)
  })

  // R_teo = 25971.66 → L = 5973.48 → α = 0.22999993. delta 7200 → R_eff = 33171.66.
  // L(R_eff) = 6440 + 5171.66×0.33 = 8146.65 — trattenuto = 0.22999993×33171.66 = 7629.48
  // → C = 517.17.  (Vecchio modello: 7200×(0.33−0.23) = 720 — sovrastimava di 202.83.)
  it('TC-B: sforo sopra soglia (prudente) → salto a 33%, conguaglio 517.17, avviso', () => {
    const out = stimaConguaglio({
      ...BASE,
      imponibiliMensiliReali: Array(6).fill(3197.82),
      imponibiliNominaliMensili: Array(6).fill(NOMINALE_BASE),
      mesiAttesiReali: 6,
      mesiFuturi: 6,
      proiezione: 'prudente',
    })
    expect(out.mesiCompletiUsati).toBe(6)
    expect(out.deltaImponibileAnnuo).toBe(7200)
    expect(out.marginaleEffettivo).toBe(0.33)
    expect(out.conguaglioStimato).toBe(517.17)
    expect(out.warningConguaglio).toBe(true)
  })

  // delta 6000 → R_eff = 31971.66 → L = 6440 + 3971.66×0.33 = 7750.65
  // trattenuto = 0.22999993×31971.66 = 7353.48 → C = 397.17.  (Vecchio: 600.)
  it('TC-C: mese bloccato (Marzo) escluso, non azzerato → N=5/6, conguaglio 397.17', () => {
    const out = stimaConguaglio({
      ...BASE,
      imponibiliMensiliReali: Array(5).fill(3197.82), // Marzo assente, non incluso
      imponibiliNominaliMensili: Array(5).fill(NOMINALE_BASE),
      mesiAttesiReali: 6,
      mesiFuturi: 6,
      proiezione: 'prudente',
    })
    expect(out.mesiCompletiUsati).toBe(5)
    expect(out.mesiAttesiReali).toBe(6)
    expect(out.deltaImponibileAnnuo).toBe(6000)
    expect(out.marginaleEffettivo).toBe(0.33)
    expect(out.conguaglioStimato).toBe(397.17)
    expect(out.warningConguaglio).toBe(true)
  })

  // delta 14400 → R_eff = 40371.66 → L = 6440 + 12371.66×0.33 = 10522.65
  // trattenuto = 0.22999993×40371.66 = 9285.48 → C = 1237.17.  (Vecchio: 1440.)
  it('TC-D: toggle storico estrapola lo sforo sui mesi futuri → conguaglio 1237.17 (vs 517.17 prudente)', () => {
    const out = stimaConguaglio({
      ...BASE,
      imponibiliMensiliReali: Array(6).fill(3197.82),
      imponibiliNominaliMensili: Array(6).fill(NOMINALE_BASE),
      mesiAttesiReali: 6,
      mesiFuturi: 6,
      proiezione: 'storico',
    })
    expect(out.deltaImponibileAnnuo).toBe(14400)
    expect(out.marginaleEffettivo).toBe(0.33)
    expect(out.conguaglioStimato).toBe(1237.17)
    expect(out.warningConguaglio).toBe(true)
  })

  // ─── TC-E: Cometa attiva (Diff 2) — chiude il bias reale-con-Cometa/teorico-senza ─────────
  // A mano: cometaMensile = 1975.68×0.012 = 23.70816 → 23.71.
  // imponibileNominaleNetto = 2200×0.9081 − 23.71 = 1997.82 − 23.71 = 1974.11.
  // cometaAnnuo = min(0.012×1975.68×13, 5164.57) = 308.20608 → 308.21.
  // ralTeoricoImponibile = 28600×0.9081 − 308.21 = 25971.66 − 308.21 = 25663.45 (≤28000, resta 23%
  // — non c'è salto di scaglione qui, la prova del corretto spostamento è sul valore, non sul bracket).
  // Mesi reali "nessuno sforo" con Cometa attiva (dal Diff 1, resolveStima già la sottrae in
  // imponibileIrpefMensile) mostrano 1974.11 — IDENTICO al nuovo imponibileNominaleNetto:
  // extraReale torna a 0 esatto, non −23.71/mese spurio (il bias che questo diff chiude).
  it('TC-E: Cometa attiva, mesi reali coerenti (nominale−Cometa) → extraReale 0, nessun bias spurio', () => {
    const out = stimaConguaglio({
      ...BASE,
      // Cometa attiva: il resolver sottrae 23.71/mese al nominale e 308.21 al RAL teorico.
      ralTeoricoImponibile: 25663.45,
      imponibiliMensiliReali: Array(6).fill(1974.11),
      imponibiliNominaliMensili: Array(6).fill(1974.11),
      mesiAttesiReali: 6,
      mesiFuturi: 6,
      proiezione: 'prudente',
    })
    expect(out.marginaleTeorico).toBe(0.23)
    expect(out.marginaleEffettivo).toBe(0.23)
    expect(out.deltaImponibileAnnuo).toBe(0)
    expect(out.conguaglioStimato).toBe(0)
    expect(out.warningConguaglio).toBe(false)
  })

  // ─── TC-F/G/H — modello conguaglio allineato alla trattenuta mensile ad ALIQUOTA MEDIA ───
  // Derivazione (a mano, dal ledger — non dedotta dal codice esistente):
  //   trattenuto nell'anno = α · R_eff − D      (stima.ts trattiene imponibile × aliquotaMediaLorda)
  //   dovuto a fine anno   = L(R_eff) − D        (progressività sull'imponibile effettivo)
  //   D si semplifica (ancorata al RAL teorico in entrambi) →  C = L(R_eff) − α · R_eff
  // dove α = L(R_teo)/R_teo. Il delta NON è un fattore: entra solo dentro R_eff = R_teo + delta.
  // Per questo `delta × (marginale−qualcosa)` è sbagliato appena il delta attraversa uno scaglione.
  // Questi 3 TC usano rate 0 e Cometa 0 per tenere i numeri verificabili a mano.

  const PULITO = {
    scaglioni: SCAGLIONI,
    mesiAttesiReali: 12,
    mesiFuturi: 0,
    proiezione: 'prudente' as const,
  }

  // R_teo = 2000×13 = 26000 (<28000). Nessun extra → R_eff = R_teo → L(R_eff) = α·R_eff.
  it('TC-F: sotto i 28k senza extra → conguaglio 0 (regressione)', () => {
    const out = stimaConguaglio({
      ...PULITO,
      ralTeoricoImponibile: 26000, // 2000 × 13
      imponibiliMensiliReali: Array(12).fill(2000),
      imponibiliNominaliMensili: Array(12).fill(2000),
    })
    expect(out.deltaImponibileAnnuo).toBe(0)
    expect(out.conguaglioStimato).toBe(0)
    expect(out.warningConguaglio).toBe(false)
  })

  // R_teo = 2100×13 = 27300 (<28000, α = 0.23). Un mese a 3800 → delta 1700 → R_eff 29000 (>28000).
  // trattenuto = 0.23×29000 = 6670.00 — dovuto = 28000×0.23 + 1000×0.33 = 6440+330 = 6770.00
  // C = 6770.00 − 6670.00 = 100.00.  (La vecchia formula dava 1700×(0.33−0.23) = 170: applicava
  // il 33% a TUTTI i 1700 di extra, mentre solo 1000 stanno sopra la soglia.)
  it('TC-G: il delta attraversa i 28k → solo la parte sopra soglia paga il 33% → 100.00', () => {
    const out = stimaConguaglio({
      ...PULITO,
      ralTeoricoImponibile: 27300, // 2100 × 13
      imponibiliMensiliReali: [...Array(11).fill(2100), 3800],
      imponibiliNominaliMensili: Array(12).fill(2100),
    })
    expect(out.deltaImponibileAnnuo).toBe(1700)
    expect(out.conguaglioStimato).toBe(100)
  })

  // R_teo = 2400×13 = 31200 (>28000) → L = 6440 + 3200×0.33 = 7496 → α = 7496/31200 = 0.24025641.
  // delta 1200 → R_eff 32400 → L = 6440 + 4400×0.33 = 7892.
  // trattenuto = 0.24025641×32400 = 7784.31 → C = 7892.00 − 7784.31 = 107.69.
  // È il caso che la vecchia formula sbagliava peggio: marginale invariato (0.33→0.33) → diceva 0,
  // ignorando che l'extra era stato trattenuto alla media (24.03%) e non al marginale (33%).
  it('TC-H: nessun cambio di scaglione ma trattenuta alla media → conguaglio 107.69, non 0', () => {
    const out = stimaConguaglio({
      ...PULITO,
      ralTeoricoImponibile: 31200, // 2400 × 13
      imponibiliMensiliReali: [...Array(11).fill(2400), 3600],
      imponibiliNominaliMensili: Array(12).fill(2400),
    })
    expect(out.marginaleTeorico).toBe(0.33)
    expect(out.marginaleEffettivo).toBe(0.33)
    expect(out.deltaImponibileAnnuo).toBe(1200)
    expect(out.conguaglioStimato).toBe(107.69)
  })

  // ─── TC-I..L — normalizzazione temporale: nominale per mese, non scalare ─────────────
  // Il punto di questi TC: quando i mesi reali NON deviano dal loro nominale, il delta deve
  // essere ESATTAMENTE 0. Col vecchio nominale scalare non lo era, perche' un unico numero non
  // puo' rappresentare ne' una decorrenza di retribuzione ne' la CIGS di un singolo mese.

  it('TC-I: cambio di retribuzione a febbraio → ogni mese usa la SUA decorrenza → delta 0', () => {
    // Gennaio 2000 → nominale 2000×0.9081 = 1816.20; da febbraio 2300 → 2088.63.
    // Mesi reali esattamente al nominale (nessuno sforo) ⇒ delta 0.
    // Col vecchio scalare (un solo nominale, quello nuovo) gennaio avrebbe mostrato
    // extra = 1816.20 − 2088.63 = −272.43 di sforo NEGATIVO inventato.
    const nominali = [1816.2, ...Array(8).fill(2088.63)]
    const out = stimaConguaglio({
      scaglioni: SCAGLIONI,
      ralTeoricoImponibile: computeRalTeoricoAnnuo(nominali, 2088.63, 13),
      imponibiliMensiliReali: [...nominali],
      imponibiliNominaliMensili: nominali,
      mesiAttesiReali: 9,
      mesiFuturi: 0,
      proiezione: 'prudente',
    })
    expect(out.deltaImponibileAnnuo).toBe(0)
    expect(out.conguaglioStimato).toBe(0)
  })

  it('TC-J: solo il mese con ore CIG porta il +0,30% CIGS → delta 0', () => {
    // base 2200×(1−0.0919) = 1997.82 ; mese CIG 2200×(1−0.0949) = 1991.22 (−6.60).
    // Col vecchio override 9,49% PIATTO i 3 mesi senza CIG avrebbero prodotto
    // 3 × 6.60 = 19.80 di delta spurio.
    const nominali = [1997.82, 1991.22, 1997.82, 1997.82]
    const out = stimaConguaglio({
      scaglioni: SCAGLIONI,
      ralTeoricoImponibile: computeRalTeoricoAnnuo(nominali, 1997.82, 13),
      imponibiliMensiliReali: [...nominali],
      imponibiliNominaliMensili: nominali,
      mesiAttesiReali: 4,
      mesiFuturi: 0,
      proiezione: 'prudente',
    })
    expect(out.deltaImponibileAnnuo).toBe(0)
    expect(out.conguaglioStimato).toBe(0)
  })

  it('TC-K: i mesi futuri e la 13a usano il nominale CORRENTE, non la media storica', () => {
    // 9 mesi trascorsi: gennaio 1816.20 (vecchia retribuzione) + 8 × 2088.63.
    // Restano 3 mesi futuri + 1 mensilita' aggiuntiva = 4 × nominale corrente.
    //   Σ trascorsi = 1816.20 + 16709.04 = 18525.24
    //   + 4 × 2088.63 = 8354.52  ⇒  R_teo = 26879.76
    const nominali = [1816.2, ...Array(8).fill(2088.63)]
    expect(computeRalTeoricoAnnuo(nominali, 2088.63, 13)).toBe(26879.76)

    // La media storica dei trascorsi sarebbe 2058.36, che spalmerebbe il salto salariale di
    // gennaio sui mesi futuri: valore diverso, previsione implicita. Non e' quello che vogliamo.
    const mediaStorica = 18525.24 / 9
    expect(computeRalTeoricoAnnuo(nominali, mediaStorica, 13)).not.toBe(26879.76)

    // Anno interamente trascorso: nessun mese futuro, resta solo la 13a al nominale corrente.
    expect(computeRalTeoricoAnnuo(Array(12).fill(2000), 2000, 13)).toBe(26000)
    // mensilita 14 → due mensilita' aggiuntive.
    expect(computeRalTeoricoAnnuo(Array(12).fill(2000), 2000, 14)).toBe(28000)
  })

  it('TC-L: identità contabile R_eff = R_teo + delta', () => {
    const out = stimaConguaglio({
      ...PULITO,
      ralTeoricoImponibile: 27300,
      imponibiliMensiliReali: [...Array(11).fill(2100), 3800],
      imponibiliNominaliMensili: Array(12).fill(2100),
    })
    expect(out.ralTeoricoImponibile).toBe(27300)
    expect(out.deltaImponibileAnnuo).toBe(1700)
    expect(out.ralEffettivoImponibile).toBe(29000)
    expect(out.ralEffettivoImponibile).toBe(out.ralTeoricoImponibile + out.deltaImponibileAnnuo)
  })

  it('vettori di lunghezza diversa → errore esplicito, non silenzioso', () => {
    expect(() => stimaConguaglio({
      ...PULITO,
      ralTeoricoImponibile: 26000,
      imponibiliMensiliReali: Array(12).fill(2000),
      imponibiliNominaliMensili: Array(11).fill(2000),
    })).toThrow(/stessa lunghezza/)
  })
})
