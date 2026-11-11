/**
 * Pure economic estimation engine — no I/O, no DB, no network.
 * Receives already-parsed input from the resolver and returns computed monetary values.
 *
 * ROUNDING CONVENTION
 * Every monetary output (€ amount) is rounded to 2 decimal places immediately after
 * it is computed (r2). Rationale: payroll software rounds at each step; if we don't
 * match, the calibration against the real cedolino (Phase 4) will show a systematic
 * "method error" that looks like a coefficient error and is not. Better to speak the
 * same language as the cedolino from day one.
 * Exceptions: tariffaGiornaliera and tariffaOraria (unit rates, not printed on the
 * cedolino) are kept at full floating-point precision to avoid compounding rounding
 * errors on multiplications.
 *
 * PIPELINE — 10 stadi (refactoring architetturale)
 * Stadio 2 (retribuzioneFissaMensile — Modalità 1) È implementato: `computeRetribuzioneFissaMensile`
 * somma i 4 componenti dichiarati (`RetribuzioneFissaComponenti`). Se l'utente non dichiara la
 * composizione (record legacy, o input orario), il RESOLVER sintetizza un bucket unico che
 * riproduce lo stesso numero di prima — la quadratura (`quadraturaOk`) è verificata lì, non qui:
 * il motore calcola, non giudica l'input dell'utente.
 * Stadi 1, 3, 4 (dati CCNL, paga oraria, componenti variabili "grezze") vivono ANCORA upstream
 * nel resolver: `StimaInput` arriva con `tariffaOraria` già risolto (mensile o orario, stesso
 * divisore su entrambi i rami — vedi resolver). Prendono corpo nel motore quando i loro step
 * (divisore da CCNLProfile, variabili aggiuntive) verranno costruiti — non anticipato qui.
 * Stadi 5-10 (lordo mese → netto): ogni stadio è una funzione pura nominata, `stimaBustaPaga`
 * è il solo orchestratore.
 * Stadio 9 (addizionali regionali/comunali) NON è implementato: `netto` non le sottrae
 * nemmeno oggi, pur essendo configurabili in `worklogUserFiscalConfig` — gap preesistente,
 * dichiarato, fuori scope di questo refactoring. Aggiungerlo cambierebbe il netto per chi ha
 * regione/comune configurati = cambio di valore, non fatto qui senza richiesta esplicita.
 *
 * MODEL: FISSO A GIORNI + VARIABILE A ORE (Step 4)
 * Lordo del mese = fissaMaturata (Stadio 5a, GIORNI) + variabili (Stadio 5b, ORE).
 * fissaMaturata = retribuzioneFissaMensile × giorniPagatiEffettivi / giorniLavorabiliMese —
 * il fisso matura pro-quota sui GIORNI LAVORABILI REGISTRATI (pesati per kind%: lavoro=100%,
 * assenza non retribuita=0%), MAI sulle ore effettivamente battute in un giorno. Un mese pieno
 * (giorni registrati = giorni lavorabili) dà SEMPRE la fissa esatta, indipendentemente da
 * quante ore reali contenga ciascun giorno — sostituisce il modello ore×tariffa di Fase-3-
 * passo-3 (quel modello faceva variare il fisso con le ore reali lavorate, comportamento non
 * realistico per la parte fissa: un cedolino mensile non cambia se un giorno si fanno 7.5h
 * invece di 8h). Le variabili (straordinario, turni) restano interamente su ore reali ×
 * tariffaOraria — invariate da questo step, `computeComponentiVariabili` non tocca.
 * `giorniPagatiEffettivi`/`giorniLavorabiliMese` sono risolti a monte dal resolver (stesso
 * calcolo già usato per il gate buco_mese/mese_parziale, riusato qui — non una nuova logica).
 *
 * IRPEF BASE: RAL, not current month × 12.
 * imponibileIrpefAnnuo = retribuzioneMensile × mensilità − INPS annuo.
 * This eliminates the old "annualisation defect" where overtime-heavy months inflated
 * the IRPEF bracket. Overtime is variable and excluded from RAL.
 * warningAnnualizzazione is kept in the output for API compatibility but always false.
 *
 * TURNO ORDINARIO A FASCE ORARIE (Step 5.x, refactoring — reinterpreta 5.1/5.3)
 * Il markup del turno ordinario (notturno/pomeridiano) non copre più TUTTE le ore dell'entry:
 * copre solo le ore che cadono in una FASCIA MAGGIORATA (`FasceMaggiorateConfig`). Lo span
 * lavorato viene da un ORARIO ESPLICITO sull'entry (`OrarioEsplicito`, precedenza assoluta)
 * o, in sua assenza, da un FLAG (notturno/pomeridiano) che deriva lo span dal TURNO STANDARD
 * del CCNL (`TurniStandardConfig` — durata = inizio del turno successivo, mai un campo durata
 * a sé). Orario e flag sono mutuamente esclusivi per costruzione (`EntryOrdinariaInput` è una
 * union discriminata) — mai additivi, zero rischio doppio conteggio. `computeOreInFascia` fa
 * l'intersezione pura (minuti 0–1439, scomposizione a segmenti per il wrap di mezzanotte).
 * Il markup resta SOLO-percentuale (mai 1+perc): la base di quelle ore è già nel fisso
 * pro-quota (Stadio 5a). Le percentuali vive sono ora in `fasceMaggiorate`, non più nelle
 * voci `notturnoOrdinarioInTurno`/`pomeridianoInTurno` di `maggiorazioni` — quelle due chiavi
 * restano nel tipo (`ModificatoreKey`, per compatibilità) ma sono MORTE: nessun path le legge
 * più, né per l'ordinario (ora su `fasceMaggiorate`) né per lo straordinario (che non le ha
 * mai usate, sono chiavi distinte).
 */

// ─── Input types ─────────────────────────────────────────────────────────────
// Defined locally so the engine has zero external runtime dependencies.
// The resolver maps DB types → these types before calling stimaBustaPaga.

export type ModificatoreKey =
  | 'straordinarioDiurnoFeriale'
  | 'straordinarioNotturno'
  | 'straordinarioFestivo'
  | 'straordinarioFestivoNotturno'
  | 'notturnoOrdinarioInTurno'
  | 'pomeridianoInTurno'

export interface OreInput {
  tipo: ModificatoreKey
  quantita: number
}

export interface ScaglioneFiscale {
  fino: number | null   // null = no upper limit (last bracket)
  aliquota: number      // e.g. 0.23
}

export interface DetrazioneFascia {
  tipo: 'flat' | 'lineare' | 'lineare_solo_base'
  reddito_da?: number   // inclusive; 0 if omitted
  reddito_fino: number  // inclusive
  valore_base?: number
  base?: number
  aggiunta?: number
  denominatore?: number
}

export interface DetrazioneBonusFlat {
  reddito_da: number
  reddito_fino: number
  importo: number
}

export interface DetrazioniLavoroConfig {
  fasce: DetrazioneFascia[]
  bonus?: DetrazioneBonusFlat[]
}

export interface TrattamentoIntegrativoConfig {
  fasce_non_imponibili: Array<{
    reddito_da: number
    reddito_fino: number
    percentuale: number
  }>
  detrazione_da: number
  detrazione_piatto_fino: number
  detrazione_importo: number
  detrazione_zero_a: number
}

// Modalità 1 — scomposizione dichiarata della retribuzione fissa mensile (Stadio 2).
// Se l'utente non dichiara la composizione (record legacy o input orario), il resolver
// sintetizza un bucket unico che riproduce lo stesso importo di prima — vedi resolver.
export interface RetribuzioneFissaComponenti {
  minimoTabellare: number
  superminimo: number
  scattiAnzianita: number
  premioProduzioneFisso: number
}

// Turno ordinario a fasce orarie — vedi header pipeline sopra.
export interface OrarioEsplicito {
  inizio: string   // 'HH:MM'
  fine: string     // 'HH:MM' — fine ≤ inizio → wrappa mezzanotte
}

export interface FasciaMaggiorata {
  da: string           // 'HH:MM'
  a: string             // 'HH:MM' — a ≤ da → wrappa mezzanotte
  percentuale: number
}

export interface TurniStandardConfig {
  mattino: { inizio: string }
  pomeriggio: { inizio: string }
  notte: { inizio: string }
}

export interface FasceMaggiorateConfig {
  notturnoOrdinarioInTurno: FasciaMaggiorata
  pomeridianoInTurno: FasciaMaggiorata
}

// Union discriminata: orario esplicito e flag sono MUTUAMENTE ESCLUSIVI per costruzione —
// mai entrambi sulla stessa entry, precedenza garantita dal tipo stesso, non a runtime.
export type EntryOrdinariaInput =
  | { orario: OrarioEsplicito }
  | { flag: 'notturno' | 'pomeridiano' }

export interface StimaInput {
  // ── Salary ───────────────────────────────────────────────────────────────
  retribuzioneFissaComponenti: RetribuzioneFissaComponenti  // Stadio 2 — alimenta SIA il lordo
                                      // del mese (Stadio 5a, pro-quota su giorni) SIA l'ancora
                                      // RAL/IRPEF (Stadio 8, sempre a mensilità piena). Resolver
                                      // garantisce lo stesso divisore per input mensile e orario
                                      // (nessuna deriva tra i due tipi per la stessa paga reale).
  mensilita: number                   // pay periods per year: 13 or 14

  // ── Fisso a giorni (Step 4) ────────────────────────────────────────────────
  giorniPagatiEffettivi: number        // Σ per-day max(kind%) sui giorni lavorabili del mese
  giorniLavorabiliMese: number         // giorni lavorabili di calendario del mese (weekend/festivi esclusi)

  // ── Variabile a ore ──────────────────────────────────────────────────────────
  tariffaOraria: number                // single rate for overtime base — resolver-resolved
  ore: OreInput[]                      // straordinario: ore EXTRA rispetto al fisso → paga base+maggiorazione (1+perc)
  entriesOrdinarieMaggiorate: EntryOrdinariaInput[]  // turno ordinario (notturno/pomeridiano) — solo
                                       // il MARKUP sulle ore in fascia (vedi header pipeline), mai le ore intere
  turniStandard: TurniStandardConfig                 // fallback per entry con flag ma senza orario esplicito
  fasceMaggiorate: FasceMaggiorateConfig              // confini orari + percentuale, fonte viva delle %
  maggiorazioni: Record<ModificatoreKey, number>
  variabiliFlat: number                // Stadio 5b (Step 6) — totale € one-off del mese (premio
                                       // produzione feriale/variabile, cadenza è etichetta utente,
                                       // il motore vede solo il numero). Stesso ingresso a
                                       // imponibileExtra/marginale di straordinario/turno — mai RAL,
                                       // mai retribuzioneFissaMensile.
  oreCig: number                       // Stadio 5c (CIG Step 2) — ore CIG del mese, sottratte dal
                                       // lordo via computeStornoCig (Strada A: la fissa matura
                                       // piena, Stadio 5a invariato — lo storno è un termine a
                                       // valle, non una riduzione della pro-quota giorni).
  giorniFerialiMese: number            // Divisore CIG (CIG Step 6, correzione) — giorni feriali
                                       // lun-ven del mese, FESTIVITÀ INCLUSE. DISTINTO da
                                       // giorniLavorabiliMese (che le esclude, per la pro-quota
                                       // fissa): verificato su busta reale, aprile con Pasquetta
                                       // conta 22 per lo storno CIG ma 21 per giorniLavorabiliMese.
  coefficienteSolidarieta: number      // Stadio 5d (CIG Step 3) — integrazione = storno×coefficiente,
                                       // FUORI dal lordo (TOTALE LORDO busta) ma DENTRO l'imponibile
                                       // contributivo+fiscale. Da worklog_cig_config, 0 se assente/
                                       // non applicabile (nessuna ora CIG questo mese).
  massimaleCigNetto?: number | null   // Massimale mensile CIG netto INPS di legge per l'anno (es. € 1.340,56 per il 2026).
                                       // Quando presente, l'integrazione è calcolata esattamente da massimale / divisoreCig
                                       // senza ricorrere a coefficienti forfettari.
  orePermessoNonRetribuito: number    // Permesso non retribuito (Step 1a) — definito, NON ancora
                                       // agganciato a lordo/imponibili (vedi computeStornoPermesso).
  divisoreOrario: number              // Permesso non retribuito (Step 1b-forma) — divisore CCNL
                                       // esplicito (173), NON derivabile da tariffaOraria: nel ramo
                                       // hourly tariffaOraria è la tariffa letterale, non 173-based.
  coefficienteSindacale: number       // Trattenuta sindacale (CGIL, forma) — 0 se non iscritto/
                                       // assente config, stesso pattern pre-azzerato di
                                       // coefficienteSolidarieta (il motore non sa "perché").
  minimoTabellareReale: number | null // Trattenuta sindacale (CGIL, forma) — SOLO se i 4 componenti
                                       // Modalità 1 sono dichiarati (mai il bucket legacy/orario
                                       // sintetizzato in retribuzioneFissaComponenti.minimoTabellare,
                                       // che per righe non dichiarate contiene l'intero importo, non
                                       // un vero minimo tabellare). null = degradazione a trattenuta 0.
                                       // Riusato as-is da Cometa (stesso canale pulito, mai un
                                       // secondo campo equivalente).
  coefficienteCometa: number          // Cometa (previdenza complementare, forma) — 0 se non
                                       // iscritto/config assente, stesso pattern pre-azzerato di
                                       // coefficienteSindacale. Base = minimoTabellareReale sopra,
                                       // MAI componenti.minimoTabellare. Questo diff (forma): il
                                       // motore calcola SOLO `cometaDeducibile` in output, non lo
                                       // sottrae da alcun imponibile/netto (valore: diff separato).
  numeroPasti: number                 // Trattenuta mensa (forma) — pasti fruiti nel mese, mirror
                                       // coefficienteSindacale (0 se non applicabile, mai null).
  importoMensa: number                // Trattenuta mensa (forma) — costo unitario pasto, da
                                       // worklog_mensa_config, 0 se assente/non attivo.
  addizionaleRegionale: number         // Addizionali IRPEF (Fase 4B, forma) — importi GIÀ
                                       // MENSILI presi dalla busta reale (rata anno precedente),
                                       // MAI calcolati/rateizzati qui. 0 se config assente/non
                                       // attiva, stesso pattern di importoMensa.
  addizionaleComunale: number          // Addizionali IRPEF (Fase 4B, forma) — v. sopra.
  accontoComunale: number              // Addizionali IRPEF (Fase 4B, forma) — acconto addizionale
                                       // comunale, v. sopra.

  // ── Fiscal ───────────────────────────────────────────────────────────────
  contributiInpsRate: number          // e.g. 0.0919
  scaglioni: ScaglioneFiscale[]
  detrazioniLavoro: DetrazioniLavoroConfig
  trattamentoIntegrativo: TrattamentoIntegrativoConfig | null
}

// ─── Output types ─────────────────────────────────────────────────────────────

export interface StimaOutput {
  // Monthly amounts (€)
  lordo: number
  contributiInps: number
  imponibileIrpefMensile: number      // informational; IRPEF uses imponibileOrd/Extra split internally
  irpefNettaMensile: number
  netto: number
  // Annual amounts used in IRPEF calculation (€) — based on RAL, not lordo×12
  ralLordo: number                     // Stadio 8a — retribuzioneMensile×mensilità, SOLO fissa
                                       // (variabili/straordinario/maggiorazioni esclusi di proposito).
  imponibileIrpefAnnuo: number
  irpefLorda: number
  detrazioniArt13: number
  beneficioCuneo: number
  stornoCig: number                    // Stadio 5c — importo stornato per ore CIG (magnitudine
                                       // positiva; già sottratto da lordo). Esposto perché le
                                       // righe del motore rispecchiano la busta, non solo il netto.
  integrazioneSolidarieta: number      // Stadio 5d — storno×coefficiente. MAI in lordo (busta:
                                       // riga separata "IMPORTO SOLIDARIETÀ"), MAI nell'imponibile
                                       // INPS (= lordo, verificato contro busta reale), per intero
                                       // nell'imponibileIrpefMensile (bucket marginale, niente
                                       // 5.84% — v1, warning integrazioneSolidarietaStimata).
  trattenutaSindacale: number           // Stadio 10 — coefficiente × minimoTabellareReale, netta
                                       // pura (non deducibile, fuori da ogni imponibile). Già
                                       // sottratta dal netto (vedi computeNetto).
  trattenutaMensa: number              // Stadio 10 — numeroPasti × importoMensa. Forma pura in
                                       // questo diff: esposta in output, NON ancora sottratta dal
                                       // netto (valore: diff separato).
  trattenutaAddizionali: number         // Stadio 10 — somma addizionale regionale+comunale+acconto
                                       // comunale, importi GIÀ MENSILI (no calcolo/rateizzazione
                                       // qui). Forma pura in questo diff: esposta in output, NON
                                       // ancora sottratta dal netto (valore: diff separato). Netta
                                       // pura come sindacale/mensa — MAI un imponibile la vede.
  /**
   * Base TEORICA del mese: retribuzione fissa vigente, al netto dell'INPS DI QUESTO MESE
   * (CIGS inclusa se il mese ha ore CIG) e della Cometa. NON è l'imponibile effettivo:
   * è il "cosa sarebbe stato senza deviazioni", e serve al conguaglio annuale come
   * riferimento mese per mese. Esposto qui perché solo il motore conosce tutti e tre gli
   * addendi nello stesso punto — il resolver altrimenti lo inferirebbe da proxy fragili.
   */
  imponibileNominaleMensile: number
  cometaDeducibile: number             // Cometa (previdenza complementare) — coefficienteCometa ×
                                       // minimoTabellareReale. Deducibile (non netta pura come
                                       // sindacale/mensa): già sottratta da imponibileIrpefMensile
                                       // E da imponibileOrd (Stadio 7, due canali in lockstep —
                                       // Step 0, non un nodo comune), quindi già dentro netto di
                                       // riflesso. RAL/imponibileIrpefAnnuo intatti (Stadio 8a,
                                       // diff separato).
  oreNotturne: number                  // Stadio 5b — somma delle ore-in-fascia notturna
                                       // (`computeOreInFascia` su `notturnoOrdinarioInTurno`),
                                       // display puro: non entra in nessun calcolo, mai sommata/
                                       // sottratta altrove. 0 se nessuna entry cade in fascia.
  orePomeridiane: number               // Stadio 5b — v. sopra, fascia `pomeridianoInTurno`.
  // Warning flags
  warningAnnualizzazione: boolean              // always false (defect eliminated in Phase 3)
  warningDetrazioniForfettizzate: boolean      // detrazioni/cuneo stimate su RAL teorico costante (/12), non ricalcolate progressivamente dal sostituto mese per mese
  warningTrattenutaSindacaleNonDisponibile: boolean  // iscritto (coefficienteSindacale>0) ma
                                       // minimoTabellareReale assente (componenti non dichiarati/
                                       // ramo orario) — trattenuta degradata a 0, non 1% del bucket.
}

// ─── Engine ───────────────────────────────────────────────────────────────────

export function stimaBustaPaga(input: StimaInput): StimaOutput {
  const {
    retribuzioneFissaComponenti, mensilita,
    giorniPagatiEffettivi, giorniLavorabiliMese,
    tariffaOraria,
    ore, entriesOrdinarieMaggiorate, turniStandard, fasceMaggiorate, maggiorazioni, variabiliFlat, oreCig,
    giorniFerialiMese, coefficienteSolidarieta, massimaleCigNetto, orePermessoNonRetribuito, divisoreOrario,
    coefficienteSindacale, minimoTabellareReale, coefficienteCometa,
    numeroPasti, importoMensa,
    addizionaleRegionale, addizionaleComunale, accontoComunale,
    contributiInpsRate, scaglioni, detrazioniLavoro, trattamentoIntegrativo,
  } = input

  // ── Stadio 2: retribuzioneFissaMensile = somma componenti dichiarati ──────
  const retribuzioneMensile = computeRetribuzioneFissaMensile(retribuzioneFissaComponenti)

  // ── Stadio 5: lordo del mese (fisso a giorni + variabili a ore − storno CIG) ──
  const lordoBase = computeFissaMaturata(retribuzioneMensile, giorniPagatiEffettivi, giorniLavorabiliMese)
  const maggiorazioniOrdinarie = computeMaggiorazioniOrdinarie(entriesOrdinarieMaggiorate, tariffaOraria, turniStandard, fasceMaggiorate)
  const variabiliLordo = r2(
    computeComponentiVariabili(ore, tariffaOraria, maggiorazioni)
    + maggiorazioniOrdinarie.totale
    + variabiliFlat,
  )
  const stornoCig = computeStornoCig(oreCig, retribuzioneMensile, giorniFerialiMese)
  const stornoPermesso = computeStornoPermesso(orePermessoNonRetribuito, retribuzioneMensile, divisoreOrario)
  const lordo = computeLordoMese(lordoBase, variabiliLordo, stornoCig, stornoPermesso)

  // ── Stadio 5d: integrazione CIG / solidarietà — FUORI dal lordo E FUORI dall'imponibile INPS,
  // DENTRO il solo imponibile IRPEF.
  // Se massimaleCigNetto è specificato (> 0), usa la formula esatta di legge da Circolare INPS:
  // quotaOraria = massimaleNetto / (giorniFerialiMese * 8)
  // integrazione = oreCig * quotaOraria
  // Altrimenti fallback al coefficiente forfettario.
  const integrazioneSolidarieta = massimaleCigNetto != null && massimaleCigNetto > 0 && giorniFerialiMese > 0
    ? computeIntegrazioneDaMassimale(oreCig, massimaleCigNetto, giorniFerialiMese)
    : computeIntegrazioneSolidarieta(stornoCig, coefficienteSolidarieta)

  // ── Stadio 6: contributi INPS (dipendente, mensile) — SOLO sul lordo, mai sull'integrazione ──
  const contributiInps = computeContributiInps(lordo, contributiInpsRate)

  // ── Cometa (previdenza complementare) — calcolata QUI, prima dei due canali imponibile che
  // la consumano: NON forkano da un nodo comune (Step 0), quindi va sottratta in lockstep in
  // ENTRAMBI — Stadio 7 (imponibileIrpefMensile, sotto) e lo split ordinario (imponibileOrd,
  // sotto). Base = minimoTabellareReale SECCO, canale ordinario/fisso — MAI imponibileExtra
  // (quello è variabile/straordinario, Cometa non lo tocca).
  const cometaDeducibile = computeCometaMensile(coefficienteCometa, minimoTabellareReale)

  // ── Stadio 7: imponibile fiscale mensile = (lordo − INPS) + integrazione intera − Cometa ──
  const imponibileIrpefMensile = r2(computeImponibileFiscale(lordo, contributiInps) + integrazioneSolidarieta - cometaDeducibile)
  // Base teorica del mese (per il conguaglio annuale): stessa aliquota INPS applicata sopra,
  // quindi un mese con ore CIG porta già il +0,30% CIGS senza che nessuno lo ricostruisca.
  const imponibileNominaleMensile = r2(retribuzioneMensile * (1 - contributiInpsRate) - cometaDeducibile)

  // ── Stadio 8: IRPEF (ancorata al RAL, non all'imponibile mensile) ─────────
  // Modello-busta: imponibile fiscale mensile UNICO (riga sopra, già lordo−INPS+integrazione
  // −Cometa) × aliquota media LORDA (sola progressività scaglioni) − detrazioni/12 esplicito.
  // Sostituisce il vecchio split ordinario/variabile (aliquota media netta sull'ordinario +
  // marginale sul variabile) — quel modello sotto-accreditava le detrazioni sulla quota
  // variabile/extra (mai coperta dal rapporto netta/annua). Vedi diagnosi sessione precedente.
  const { ralLordo, imponibileIrpefAnnuo } = computeRalAnnuo(
    retribuzioneMensile, mensilita, contributiInpsRate, coefficienteCometa, minimoTabellareReale,
  )
  const { irpefLorda, detrazioniArt13, beneficioCuneo } =
    computeIrpefAnnua(imponibileIrpefAnnuo, scaglioni, detrazioniLavoro, trattamentoIntegrativo)
  const irpefNettaMensile = computeIrpefMensile(
    imponibileIrpefMensile, imponibileIrpefAnnuo, irpefLorda, detrazioniArt13, beneficioCuneo,
  )

  // ── Stadio 9: addizionali regionali/comunali — NON implementato (vedi header) ──

  // ── Stadio 10: netto mensile ───────────────────────────────────────────────
  // Base = imponibileIrpefMensile (già lordo−INPS+integrazione): l'integrazione è cassa reale
  // che il lavoratore riceve — è già dentro imponibileIrpefMensile, non serve riaggiungerla qui.
  // trattenutaSindacale: sottratta qui, non tocca imponibili (Stadio 7 già chiuso sopra) —
  // stesso schema storno CIG/permesso ma a valle del tutto: netta pura, non deducibile.
  const trattenutaSindacale = computeTrattenutaSindacale(minimoTabellareReale, coefficienteSindacale)
  // trattenutaMensa: stesso schema, netta pura — sottratta insieme alla sindacale nella stessa riga.
  const trattenutaMensa = computeTrattenutaMensa(numeroPasti, importoMensa)
  // trattenutaAddizionali (Fase 4B, Step 4 — VALORE): stesso schema sindacale/mensa, netta pura —
  // sottratta insieme alle altre due nella stessa riga, nessun imponibile la vede.
  const trattenutaAddizionali = computeTrattenutaAddizionali(addizionaleRegionale, addizionaleComunale, accontoComunale)
  // cometaDeducibile (calcolata sopra, Stadio 7): NON risottratta qui — a differenza di
  // sindacale/mensa non è netta pura, è già dentro imponibileIrpefMensile (quindi già dentro
  // netto di riflesso, stesso schema dell'integrazione solidarietà).
  const netto = r2(computeNetto(imponibileIrpefMensile, irpefNettaMensile) - trattenutaSindacale - trattenutaMensa - trattenutaAddizionali)

  return {
    lordo,
    contributiInps,
    imponibileIrpefMensile,
    irpefNettaMensile,
    netto,
    ralLordo,
    imponibileIrpefAnnuo,
    irpefLorda,
    detrazioniArt13,
    beneficioCuneo,
    stornoCig,
    integrazioneSolidarieta,
    trattenutaSindacale,
    trattenutaMensa,
    trattenutaAddizionali,
    imponibileNominaleMensile,
    cometaDeducibile,
    oreNotturne: maggiorazioniOrdinarie.oreNotturne,
    orePomeridiane: maggiorazioniOrdinarie.orePomeridiane,
    warningAnnualizzazione: false,
    warningDetrazioniForfettizzate: detrazioniArt13 > 0 || beneficioCuneo > 0,
    warningTrattenutaSindacaleNonDisponibile: coefficienteSindacale > 0 && minimoTabellareReale === null,
  }
}

// ─── Stadi 5-10 — funzioni pure nominate (skeleton Step 1) ───────────────────

/** Stadio 5b: straordinario — ore EXTRA rispetto al fisso, paga base+maggiorazione (1+perc). */
function computeComponentiVariabili(
  ore: OreInput[],
  tariffaOraria: number,
  maggiorazioni: Record<ModificatoreKey, number>,
): number {
  let totale = 0
  for (const { tipo, quantita } of ore) {
    const perc = maggiorazioni[tipo] ?? 0
    totale = r2(totale + r2(quantita * tariffaOraria * (1 + perc)))
  }
  return totale
}

/**
 * Stadio 5b: turno ordinario con maggiorazione — SOLO il markup (perc, non 1+perc) sulle ore
 * che cadono in una fascia maggiorata. La base di quelle ore è già pagata dal fisso pro-quota
 * (Stadio 5a): riusare la formula dello straordinario pagherebbe la base due volte.
 * Lo span di ogni entry viene dall'orario esplicito (precedenza assoluta) o, in sua assenza,
 * dal turno standard derivato dal flag — uniforme: si controlla l'overlap contro ENTRAMBE le
 * fasce sempre, uno span notte-standard dà zero overlap con la serale automaticamente.
 */
function computeMaggiorazioniOrdinarie(
  entries: EntryOrdinariaInput[],
  tariffaOraria: number,
  turniStandard: TurniStandardConfig,
  fasceMaggiorate: FasceMaggiorateConfig,
): { totale: number; oreNotturne: number; orePomeridiane: number } {
  let totale = 0
  let oreNotturne = 0
  let orePomeridiane = 0
  for (const entry of entries) {
    const span: OrarioEsplicito = 'orario' in entry
      ? entry.orario
      : turnoStandardSpan(entry.flag, turniStandard)

    for (const tipo of ['notturnoOrdinarioInTurno', 'pomeridianoInTurno'] as const) {
      const fascia = fasceMaggiorate[tipo]
      const oreInFascia = computeOreInFascia(span, fascia)
      if (oreInFascia > 0) {
        totale = r2(totale + r2(oreInFascia * tariffaOraria * fascia.percentuale))
        if (tipo === 'notturnoOrdinarioInTurno') oreNotturne = r2(oreNotturne + oreInFascia)
        else orePomeridiane = r2(orePomeridiane + oreInFascia)
      }
    }
  }
  return { totale, oreNotturne, orePomeridiane }
}

/** Deriva lo span del turno standard dal flag — durata = inizio del turno successivo (notte→mattino wrappa). */
function turnoStandardSpan(flag: 'notturno' | 'pomeridiano', turni: TurniStandardConfig): OrarioEsplicito {
  return flag === 'notturno'
    ? { inizio: turni.notte.inizio, fine: turni.mattino.inizio }
    : { inizio: turni.pomeriggio.inizio, fine: turni.notte.inizio }
}

function minutiDaOrario(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number)
  return (h ?? 0) * 60 + (m ?? 0)
}

/** Scompone un range [inizio,fine) su un orologio 24h in 1-2 segmenti non wrappanti su [0,1440). */
function segmentiRange(inizioMin: number, fineMin: number): Array<[number, number]> {
  if (fineMin > inizioMin) return [[inizioMin, fineMin]]
  if (fineMin === inizioMin) return []
  return [[inizioMin, 1440], [0, fineMin]]
}

/** Ore di sovrapposizione fra uno span lavorato e una fascia maggiorata — gestisce il wrap di mezzanotte su entrambi. */
export function computeOreInFascia(span: OrarioEsplicito, fascia: FasciaMaggiorata): number {
  const segSpan = segmentiRange(minutiDaOrario(span.inizio), minutiDaOrario(span.fine))
  const segFascia = segmentiRange(minutiDaOrario(fascia.da), minutiDaOrario(fascia.a))
  let minuti = 0
  for (const [aStart, aEnd] of segSpan) {
    for (const [bStart, bEnd] of segFascia) {
      minuti += Math.max(0, Math.min(aEnd, bEnd) - Math.max(aStart, bStart))
    }
  }
  return minuti / 60
}

/** Stadio 5: lordo del mese = fissa/base + variabili − storno CIG − storno permesso non retribuito. */
function computeLordoMese(lordoBase: number, variabiliLordo: number, stornoCig: number, stornoPermesso: number): number {
  return r2(lordoBase + variabiliLordo - stornoCig - stornoPermesso)
}

/**
 * Stadio 5c: storno CIG (Strada A) — ore CIG × base storno, MAI un flag sulla fissa: la fissa
 * matura sempre piena (Stadio 5a), questo è un termine sottratto a valle. Base storno = fissa
 * mensile ÷ (giorniFerialiMese × 8) — divisore CIG-specifico, DIVERSO dal divisoreOrario CCNL
 * (173) usato per tariffaOraria/straordinario/turni, E DIVERSO da giorniLavorabiliMese (fisso
 * pro-quota): giorniFerialiMese conta i lun-ven del mese CON le festività dentro (verificato su
 * busta reale: aprile con Pasquetta conta 22 per lo storno, ma 21 per giorniLavorabiliMese —
 * due divisori distinti, non fondibili). 8 = ore convenzionali/giorno, costante di dominio.
 */
export function computeStornoCig(oreCig: number, retribuzioneMensile: number, giorniFerialiMese: number): number {
  const divisoreCig = giorniFerialiMese * 8
  return divisoreCig > 0 ? r2(oreCig * retribuzioneMensile / divisoreCig) : 0
}

/**
 * Step 1b: storno permesso non retribuito — ore permesso × base storno, divisore FISSO
 * (divisoreOrario CCNL, es. 173), DIVERSO dal divisore CIG dinamico (giorniFerialiMese×8).
 * Riduce lordo/imponibileOrd come lo storno CIG (Strada A) — vedi computeLordoMese/
 * lordoOrdinarioNetStorno. Niente integrazione, niente effetto su RAL teorico.
 */
export function computeStornoPermesso(orePermesso: number, retribuzioneMensile: number, divisoreOrario: number): number {
  return divisoreOrario > 0 ? r2(orePermesso * retribuzioneMensile / divisoreOrario) : 0
}

/**
 * Stadio 10: trattenuta sindacale (CGIL) — coefficiente × minimoTabellare SECCO (mai
 * retribuzioneFissaMensile: bucket travestito da minimo tabellare su righe non dichiarate
 * dà un numero sbagliato). Flat, non pro-quotata su giorni/CIG — quota associativa identica
 * ogni mese se iscritto. Netta pura: nessun imponibile la vede (non deducibile per i
 * dipendenti privati). null (componenti non dichiarati/ramo orario) → degradazione a 0,
 * mai un blocker.
 */
export function computeTrattenutaSindacale(minimoTabellareReale: number | null, coefficiente: number): number {
  return minimoTabellareReale !== null ? r2(minimoTabellareReale * coefficiente) : 0
}

/**
 * Cometa (previdenza complementare) — quota lavoratore deducibile = coefficiente ×
 * minimoTabellare SECCO, stesso canale pulito della sindacale (mai il bucket travestito su
 * righe non dichiarate). A differenza della sindacale NON è netta pura: è deducibile
 * dall'imponibile IRPEF — questo helper calcola solo l'IMPORTO, la sottrazione agli
 * imponibili è un diff separato (valore, Stadio 7/8). coefficiente 0 o minimoTabellareReale
 * null → 0, stesso degrado della sindacale, mai un blocker.
 */
export function computeCometaMensile(coefficienteCometa: number, minimoTabellareReale: number | null): number {
  return minimoTabellareReale !== null ? r2(minimoTabellareReale * coefficienteCometa) : 0
}

/**
 * Stadio 10: trattenuta mensa — numeroPasti × importoMensa. Flat per pasto fruito, nessun
 * ramo speciale: a differenza della trattenuta sindacale non c'è un canale "non disponibile"
 * (nessun campo nullable qui), 0×qualcosa o qualcosa×0 dà 0 naturalmente.
 */
export function computeTrattenutaMensa(numeroPasti: number, importoMensa: number): number {
  return r2(numeroPasti * importoMensa)
}

/**
 * Stadio 10: trattenuta addizionali IRPEF (regionale+comunale+acconto comunale) — somma pura di
 * importi GIÀ MENSILI (rata anno precedente in busta), mirror trattenutaMensa. Netta pura: nessun
 * imponibile la vede, MAI un canale deducibile come Cometa.
 */
export function computeTrattenutaAddizionali(
  addizionaleRegionale: number,
  addizionaleComunale: number,
  accontoComunale: number,
): number {
  return r2(addizionaleRegionale + addizionaleComunale + accontoComunale)
}

export function computeIntegrazioneDaMassimale(
  oreCig: number,
  massimaleCigNetto: number,
  giorniFerialiMese: number,
): number {
  const divisoreCig = giorniFerialiMese * 8
  return divisoreCig > 0 ? r2(oreCig * (massimaleCigNetto / divisoreCig)) : 0
}

/**
 * Stadio 5d: integrazione solidarietà = storno × coefficiente (fallback v1).
 */
function computeIntegrazioneSolidarieta(stornoCig: number, coefficienteSolidarieta: number): number {
  return r2(stornoCig * coefficienteSolidarieta)
}

/** Stadio 6: contributi INPS a carico dipendente sul lordo — l'integrazione solidarietà non li genera. */
function computeContributiInps(lordo: number, contributiInpsRate: number): number {
  return r2(lordo * contributiInpsRate)
}

/** Stadio 7: imponibile fiscale mensile di base (lordo − INPS), prima di sommare l'integrazione. */
function computeImponibileFiscale(lordo: number, contributiInps: number): number {
  return r2(lordo - contributiInps)
}

// Tetto annuo Cometa (previdenza complementare) — art.10 c.1 lett.e-bis TUIR, limite di
// deducibilità fiscale del contributo lavoratore, non un massimale contrattuale.
const COMETA_TETTO_ANNUO = 5164.57

/**
 * Cometa annua — coefficiente × minimoTabellare SECCO × mensilita (13/14, il campo reale, MAI
 * 13 hardcoded — Cometa si applica anche sulla tredicesima/quattordicesima), clampata al tetto
 * di deducibilità fiscale. Un solo r2() finale sui valori GREZZI: MAI cometaDeducibile×mensilita
 * (quello è già arrotondato mensilmente, introdurrebbe un doppio arrotondamento).
 */
export function computeCometaAnnuo(
  coefficienteCometa: number,
  minimoTabellareReale: number | null,
  mensilita: number,
): number {
  if (minimoTabellareReale === null) return 0
  return r2(Math.min(coefficienteCometa * minimoTabellareReale * mensilita, COMETA_TETTO_ANNUO))
}

/** Stadio 8a: RAL lordo = base salary × mensilità (solo fissa, variabili escluse di proposito).
 * Imponibile IRPEF annuo = RAL lordo − INPS annuo teorico − Cometa annua (ralLordo INTATTO,
 * solo l'imponibile fiscale scende) — base reale per scaglioni/detrazioni/cuneo. */
function computeRalAnnuo(
  retribuzioneMensile: number,
  mensilita: number,
  contributiInpsRate: number,
  coefficienteCometa: number,
  minimoTabellareReale: number | null,
): { ralLordo: number; imponibileIrpefAnnuo: number } {
  const ralLordo = r2(retribuzioneMensile * mensilita)
  const inpsAnnuo = r2(ralLordo * contributiInpsRate)
  const cometaAnnuo = computeCometaAnnuo(coefficienteCometa, minimoTabellareReale, mensilita)
  return { ralLordo, imponibileIrpefAnnuo: r2(ralLordo - inpsAnnuo - cometaAnnuo) }
}

interface IrpefAnnua {
  irpefLorda: number
  detrazioniArt13: number
  beneficioCuneo: number
  irpefNettaAnnua: number
}

/** Stadio 8b: IRPEF lorda/netta annua — scaglioni, detrazioni art.13, cuneo fiscale strutturale. */
function computeIrpefAnnua(
  imponibileIrpefAnnuo: number,
  scaglioni: ScaglioneFiscale[],
  detrazioniLavoro: DetrazioniLavoroConfig,
  trattamentoIntegrativo: TrattamentoIntegrativoConfig | null,
): IrpefAnnua {
  const irpefLorda = computeIrpefLorda(imponibileIrpefAnnuo, scaglioni)
  const detrazioniArt13 = computeDetrazioniArt13(imponibileIrpefAnnuo, detrazioniLavoro)
  const cuneo = computeCuneo(imponibileIrpefAnnuo, trattamentoIntegrativo)

  if (cuneo.tipo === 'tier1_non_imponibili') {
    const rcRidotto = r2(imponibileIrpefAnnuo - cuneo.somme)
    const irpefRidotta = computeIrpefLorda(rcRidotto, scaglioni)
    const beneficioCuneo = r2(irpefLorda - irpefRidotta)
    return { irpefLorda, detrazioniArt13, beneficioCuneo, irpefNettaAnnua: r2(irpefRidotta - detrazioniArt13) }
  }
  if (cuneo.tipo === 'tier2_detrazione') {
    return {
      irpefLorda, detrazioniArt13, beneficioCuneo: cuneo.importo,
      irpefNettaAnnua: r2(irpefLorda - detrazioniArt13 - cuneo.importo),
    }
  }
  return { irpefLorda, detrazioniArt13, beneficioCuneo: 0, irpefNettaAnnua: r2(irpefLorda - detrazioniArt13) }
}

/**
 * Stadio 8c: IRPEF mensile — modello-busta: imponibile unico × aliquota media LORDA
 * (solo progressività scaglioni, NON include detrazioni) − detrazioni/12 esplicito.
 * /12 e non /mensilita: le detrazioni si spalmano sui 12 mesi ordinari, la tredicesima
 * ha detrazioni proprie — unico punto del motore dove 12 è corretto e mensilita (13)
 * sarebbe errato.
 */
export function computeIrpefMensile(
  imponibileIrpefMensile: number,
  imponibileIrpefAnnuo: number,
  irpefLordaAnnua: number,
  detrazioniArt13: number,
  beneficioCuneo: number,
): number {
  const aliquotaMediaLorda = imponibileIrpefAnnuo > 0
    ? irpefLordaAnnua / imponibileIrpefAnnuo
    : 0
  const irpefLordaMensile = imponibileIrpefMensile * aliquotaMediaLorda
  const detrazioniMensili = (detrazioniArt13 + beneficioCuneo) / 12
  // clamp incapienza: l'IRPEF mensile trattenuta non è mai < 0. Se le detrazioni superano la lorda
  // (mese parziale/ridotto), l'eccedenza NON viene simulata come conguaglio del sostituto — è una
  // semplificazione dichiarata della stima (vedi wiki: incapienza mensile azzerata).
  return r2(Math.max(0, irpefLordaMensile - detrazioniMensili))
}

/**
 * Stadio 10: netto mensile = imponibileIrpefMensile − irpefNettaMensile. imponibileIrpefMensile
 * è già (lordo−INPS)+integrazioneSolidarieta — l'integrazione è cassa reale ricevuta, entra qui
 * di riflesso (non serve riaggiungerla). Stadio 9 (addizionali) non sottratto — non
 * implementato, vedi header.
 */
function computeNetto(imponibileIrpefMensile: number, irpefNettaMensile: number): number {
  return r2(imponibileIrpefMensile - irpefNettaMensile)
}

// ─── Helpers (pure) ───────────────────────────────────────────────────────────

function r2(n: number): number {
  return Math.round(n * 100) / 100
}

/** Stadio 5a: fisso maturato pro-quota sui giorni lavorabili registrati (Step 4). Un mese pieno dà sempre la fissa esatta. */
export function computeFissaMaturata(
  retribuzioneFissaMensile: number,
  giorniPagatiEffettivi: number,
  giorniLavorabiliMese: number,
): number {
  return giorniLavorabiliMese > 0
    ? r2(retribuzioneFissaMensile * giorniPagatiEffettivi / giorniLavorabiliMese)
    : 0
}

/** Stadio 2: retribuzioneFissaMensile = somma dei 4 componenti dichiarati. */
export function computeRetribuzioneFissaMensile(componenti: RetribuzioneFissaComponenti): number {
  const { minimoTabellare, superminimo, scattiAnzianita, premioProduzioneFisso } = componenti
  return r2(minimoTabellare + superminimo + scattiAnzianita + premioProduzioneFisso)
}

/** Modalità 1 — la somma dei componenti dichiarati deve quadrare con la fissa letta in busta (entro epsilon per arrotondamenti). */
export function quadraturaOk(
  componenti: RetribuzioneFissaComponenti,
  fissaDichiarata: number,
  epsilon = 0.01,
): boolean {
  return Math.abs(computeRetribuzioneFissaMensile(componenti) - fissaDichiarata) <= epsilon
}

/** Returns the LORDA marginal rate of the bracket containing rc. rc == fino → stays in bracket (≤). */
export function marginalRate(rc: number, scaglioni: ScaglioneFiscale[]): number {
  for (const { fino, aliquota } of scaglioni) {
    if (rc <= (fino ?? Infinity)) return aliquota
  }
  return scaglioni.at(-1)?.aliquota ?? 0
}

export function computeIrpefLorda(rc: number, scaglioni: ScaglioneFiscale[]): number {
  let irpef = 0
  let prev = 0
  for (const { fino, aliquota } of scaglioni) {
    const upper = fino ?? Infinity
    if (rc <= prev) break
    const redditoInFascia = Math.min(rc, upper) - prev
    irpef = r2(irpef + r2(redditoInFascia * aliquota))
    prev = upper
  }
  return irpef
}

function computeDetrazioniArt13(rc: number, config: DetrazioniLavoroConfig): number {
  let detrazione = 0

  for (const fascia of config.fasce) {
    const da = fascia.reddito_da ?? 0
    if (rc < da || rc > fascia.reddito_fino) continue

    if (fascia.tipo === 'flat') {
      detrazione = fascia.valore_base ?? 0
    } else if (fascia.tipo === 'lineare') {
      const aggiunta = r2((fascia.aggiunta ?? 0) * (fascia.reddito_fino - rc) / (fascia.denominatore ?? 1))
      detrazione = r2((fascia.base ?? 0) + aggiunta)
    } else {
      detrazione = r2((fascia.base ?? 0) * (fascia.reddito_fino - rc) / (fascia.denominatore ?? 1))
    }
    break
  }

  for (const bonus of config.bonus ?? []) {
    if (rc >= bonus.reddito_da && rc <= bonus.reddito_fino) {
      detrazione = r2(detrazione + bonus.importo)
    }
  }

  return detrazione
}

type CuneoComputed =
  | { tipo: 'tier1_non_imponibili'; somme: number }
  | { tipo: 'tier2_detrazione'; importo: number }
  | { tipo: 'nessuno' }

function computeCuneo(rc: number, config: TrattamentoIntegrativoConfig | null): CuneoComputed {
  if (!config) return { tipo: 'nessuno' }

  const maxTier1 = config.fasce_non_imponibili.at(-1)?.reddito_fino ?? 0

  if (rc <= maxTier1) {
    let somme = 0
    let prev = 0
    for (const fascia of config.fasce_non_imponibili) {
      if (rc <= prev) break
      const redditoInFascia = Math.min(rc, fascia.reddito_fino) - prev
      somme = r2(somme + r2(redditoInFascia * fascia.percentuale))
      prev = fascia.reddito_fino
    }
    return { tipo: 'tier1_non_imponibili', somme }
  }

  if (rc < config.detrazione_da || rc > config.detrazione_zero_a) {
    return { tipo: 'nessuno' }
  }

  const range = config.detrazione_zero_a - config.detrazione_piatto_fino
  const importo = rc <= config.detrazione_piatto_fino
    ? config.detrazione_importo
    : r2(config.detrazione_importo * (config.detrazione_zero_a - rc) / range)

  return { tipo: 'tier2_detrazione', importo: r2(importo) }
}
