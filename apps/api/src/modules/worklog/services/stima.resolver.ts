import {
  and,
  asc,
  desc,
  eq,
  getClient,
  gte,
  isNull,
  lte,
  sum,
  worklogAddizionaliConfig,
  worklogCcnlProfile,
  worklogCigConfig,
  worklogCigMassimale,
  worklogCometaConfig,
  worklogContract,
  worklogDays,
  worklogEntries,
  worklogFiscalProfile,
  worklogMensaConfig,
  worklogNettoReale,
  worklogRetribuzione,
  worklogSindacatoConfig,
  worklogUserFiscalConfig,
  worklogVariabiliFlat,
} from '@dexhub/db'
import type { EntryKind, EntryModifiers } from '@dexhub/db'
import {
  computeAddizionali,
  computeRetribuzioneFissaMensile,
  determineTaxDataSource,
  getItalianHolidays,
  quadraturaOk,
  stimaBustaPaga,
  valutaScostamento,
  type EntryOrdinariaInput,
  type ModificatoreKey,
  type OrarioEsplicito,
  type OreInput,
  type RetribuzioneFissaComponenti,
  type StimaInput,
  type StimaOutput,
  type TaxContext,
  type TaxDataSource,
  type ValutazioneScostamento,
  type VersoScostamento,
} from '@dexhub/worklog-engine'

// ─── Public contract ──────────────────────────────────────────────────────────

export type StimaBlocker =
  | 'no_user_config'
  | 'no_retribuzione'
  | 'no_ccnl_profile'
  | 'no_fiscal_profile'
  | 'no_contract'
  | 'no_turni_config'
  | 'no_cig_config'
  | 'buco_mese'

export type StimaWarningCode =
  | 'no_addizionali'
  | 'annualizzazione'
  | 'mese_parziale'
  | 'malattia_stimata'
  | 'detrazioni_stimate_ral_teorico'
  | 'quadratura_incongruente'
  | 'integrazione_solidarieta_stimata'
  | 'trattenuta_sindacale_non_disponibile'
  | 'cometa_non_disponibile'

// Fase 4B Diff 1 — quota lavoratore CIGS (0,30%), si aggiunge al 9,19% ordinario nei mesi
// con ore CIG. Pre-motore: il motore fiscale resta cieco, riceve sempre un solo
// contributiInpsRate già composto (vedi StimaInput più sotto).
const CIGS_LAVORATORE_RATE = 0.003

// TODO(Fase 4B, futuro diff): conguaglio.resolver.ts costruisce ancora il proprio
// contributiInpsRate in isolamento (config.contributiInpsOverride ?? fiscal.contributiInps),
// senza nessuna nozione di ore-CIG per-mese — non riallineato a questo nuovo modello mensile.
// Fuori scope di questo diff (regola esplicita: nessuna modifica a Conguaglio).
function computeContributiInpsRate(contributiBase: number, oreCig: number): number {
  return oreCig > 0 ? contributiBase + CIGS_LAVORATORE_RATE : contributiBase
}

// Fase 4B — forma di risposta API per le addizionali, DISTINTA dal tipo motore
// (`AddizionaliOutput`: regionalAmount/municipalAmount). Suffisso "Annual" esplicito: sono
// importi ANNUI, mai rateizzati (Fase 5, non iniziata) — evita l'ambiguità con le altre righe
// mensili della busta (netto/contributiInps/ecc).
export interface AddizionaliAnnuali {
  regionalAmountAnnual: number
  municipalAmountAnnual: number
  source: TaxDataSource
}

export type StimaResolution =
  | {
      ok: true
      output: StimaOutput
      warnings: StimaWarningCode[]
      sindacatoNome: string | null
      addizionali: AddizionaliAnnuali
      nettoReale: number | null
      scarto: number | null
      stimaNettoSnapshot: number | null
      scostamentoPerc: number | null
      valutazione: ValutazioneScostamento | null
      verso: VersoScostamento | null
    }
  | { ok: false; reason: StimaBlocker; warnings: StimaWarningCode[] }

// ─── Kind → pay percentage ────────────────────────────────────────────────────

const KIND_PERC: Record<EntryKind, number> = {
  work: 1.0,
  overtime: 0,
  vacation: 1.0,
  leave: 1.0,
  sick: 1.0,   // known overestimate — triggers malattia_stimata warning
  holiday: 1.0,
  cig: 1.0,    // CIG (Step 1): il giorno matura la fissa piena — Strada A, storno a valle (Step 2)
  permesso_non_retribuito: 1.0,  // Permesso (Step 2): stesso pattern CIG — Strada A, storno a
                                 // valle via orePermesso, MAI 0 (doppio conteggio col pool-ore).
  congedo_parentale_80: 1.0,     // Congedo 80%: fissa piena, storno e indennità INPS a valle
  congedo_parentale_30: 1.0,     // Congedo 30%: fissa piena, storno e indennità INPS a valle
}

// ─── Resolver ─────────────────────────────────────────────────────────────────

export async function resolveStima(
  userId: string,
  targetMonth: string, // 'YYYY-MM'
): Promise<StimaResolution> {
  const db = getClient()
  const warnings: StimaWarningCode[] = []
  const targetYear = parseInt(targetMonth.split('-')[0] ?? '0', 10)

  // ── 1. User fiscal config ────────────────────────────────────────────────────
  const [config] = await db
    .select()
    .from(worklogUserFiscalConfig)
    .where(eq(worklogUserFiscalConfig.userId, userId))
    .limit(1)

  if (!config) {
    return { ok: false, reason: 'no_user_config', warnings }
  }

  // ── 2. CCNL profile ─────────────────────────────────────────────────────────
  const [ccnl] = await db
    .select()
    .from(worklogCcnlProfile)
    .where(eq(worklogCcnlProfile.id, config.ccnlId))
    .limit(1)

  if (!ccnl) {
    return { ok: false, reason: 'no_ccnl_profile', warnings }
  }

  // Turno ordinario a fasce (Step 5.x) — nullable in DB per CCNL futuri senza questi campi
  // ancora configurati. Niente fallback muto: blocker esplicito, come per gli altri config.
  if (!ccnl.turniStandard || !ccnl.fasceMaggiorate) {
    return { ok: false, reason: 'no_turni_config', warnings }
  }

  // ── 3. Retribuzione — MAX(decorrenza) WHERE decorrenza <= targetMonth ────────
  let [retrib] = await db
    .select()
    .from(worklogRetribuzione)
    .where(
      and(
        eq(worklogRetribuzione.userId, userId),
        lte(worklogRetribuzione.decorrenza, targetMonth),
      ),
    )
    .orderBy(desc(worklogRetribuzione.decorrenza))
    .limit(1)

  // Fallback: se il targetMonth precede la prima decorrenza salvata, usa la prima
  // retribuzione disponibile dell'utente (la più vecchia) invece di bloccare la stima
  if (!retrib) {
    const [earliestRetrib] = await db
      .select()
      .from(worklogRetribuzione)
      .where(eq(worklogRetribuzione.userId, userId))
      .orderBy(asc(worklogRetribuzione.decorrenza))
      .limit(1)

    if (earliestRetrib) {
      retrib = earliestRetrib
    }
  }

  if (!retrib) {
    return { ok: false, reason: 'no_retribuzione', warnings }
  }

  // ── 4. Fiscal profile for the target year ───────────────────────────────────
  const [fiscal] = await db
    .select()
    .from(worklogFiscalProfile)
    .where(eq(worklogFiscalProfile.anno, targetYear))
    .limit(1)

  if (!fiscal) {
    return { ok: false, reason: 'no_fiscal_profile', warnings }
  }

  // ── 4b. Contract — ore contrattuali richieste per la tariffa oraria, mai un fallback muto ──
  const [contract] = await db
    .select()
    .from(worklogContract)
    .where(eq(worklogContract.userId, userId))
    .limit(1)

  if (!contract) {
    return { ok: false, reason: 'no_contract', warnings }
  }

  // ── 5. Addizionali check (non-blocking) ─────────────────────────────────────
  if (!config.aliquotaAddRegionale && !config.aliquotaAddComunale) {
    warnings.push('no_addizionali')
  }

  // ── 6. All registered days + entries for the month ──────────────────────────
  const { from, to } = monthRange(targetMonth)

  const registeredRows = await db
    .select({
      date: worklogDays.date,
      mealOverride: worklogDays.mealOverride,
      kind: worklogEntries.kind,
      modifiers: worklogEntries.modifiers,
      hours: worklogEntries.hours,
    })
    .from(worklogDays)
    .leftJoin(worklogEntries, eq(worklogEntries.dayId, worklogDays.id))
    .where(
      and(
        eq(worklogDays.userId, userId),
        gte(worklogDays.date, from),
        lte(worklogDays.date, to),
        isNull(worklogDays.deletedAt),
      ),
    )

  // Group entries by date
  interface DayEntry { kind: EntryKind; modifiers: EntryModifiers | null | undefined; hours: number }
  const dayMap = new Map<string, DayEntry[]>()
  // mealOverride è per-giorno (non per-entry) — stesso valore duplicato su ogni riga joinata
  // per quella data, l'ultima scrittura è idempotente.
  const dayMealOverrideMap = new Map<string, boolean | null>()
  for (const row of registeredRows) {
    if (!dayMap.has(row.date)) dayMap.set(row.date, [])
    dayMealOverrideMap.set(row.date, row.mealOverride)
    if (row.kind != null) {
      dayMap.get(row.date)!.push({
        // row.kind è il tipo pieno dell'enum Postgres (rest/recovery inclusi, mai rimossi dal DB
        // — valori morti). Cast sicuro: 0 righe live con questi kind, UI non li offre più.
        kind: row.kind as EntryKind,
        modifiers: row.modifiers,
        hours: parseFloat(row.hours ?? '0'),
      })
    }
  }

  // ── 7. Gate logic: iterate calendar working days ─────────────────────────────
  const holidays = getItalianHolidays(targetYear)
  const todayStr = todayDate()
  const calendarWorkingDays = getWorkingDays(targetMonth, holidays)

  const giorniLavorabiliMese = calendarWorkingDays.length
  const giorniFerialiMese = getFerialiCount(targetMonth)  // divisore CIG, festività incluse (vedi getFerialiCount)
  let giorniPagatiEffettivi = 0
  let numeroPasti = 0
  let hasFutureDays = false
  let hasSick = false

  for (const dateStr of calendarWorkingDays) {
    const entries = dayMap.get(dateStr)
    if (entries !== undefined) {
      // Registered day — take highest kind% across entries on this day
      let maxPerc = 0
      for (const { kind } of entries) {
        const perc = KIND_PERC[kind] ?? 0
        if (perc > maxPerc) maxPerc = perc
        if (kind === 'sick') hasSick = true
      }
      giorniPagatiEffettivi += maxPerc
      // Mensa: mealOverride vince sull'auto-derivazione, stesso set di giorni/gate di
      // giorniPagatiEffettivi (registrati entro il mese in corso, mai i lavorabili di calendario).
      const override = dayMealOverrideMap.get(dateStr) ?? null
      if (override !== null ? override : deriveMeal(entries)) numeroPasti++
    } else if (dateStr >= todayStr) {
      // Unregistered future day — counts as 0; stima is progressive (only registered days)
      hasFutureDays = true
    } else {
      // Unregistered past working day → missing registration
      return { ok: false, reason: 'buco_mese', warnings }
    }
  }

  if (hasFutureDays) warnings.push('mese_parziale')
  if (hasSick) warnings.push('malattia_stimata')

  // ── 8. Overtime entries → OreInput (variabile, invariato — resta su ore reali) ────
  // Turno ORDINARIO (kind='work') a fasce: un flag = un'occorrenza del turno standard intero
  // (mai le ore della entry — quelle sono lo shortcut "ho fatto il turno standard", per ore
  // parziali serve l'orario esplicito, non ancora wired: campo DB non esiste finché non
  // arriva la sua migration). computeMaggiorazioniOrdinarie fa l'overlap nel motore.
  const oreMap = new Map<ModificatoreKey, number>()
  const entriesOrdinarieMaggiorate: EntryOrdinariaInput[] = []
  let oreCig = 0
  let orePermesso = 0
  let oreCongedo80 = 0
  let oreCongedo30 = 0
  for (const entries of dayMap.values()) {
    for (const { kind, modifiers, hours } of entries) {
      if (kind === 'overtime') {
        const key = modKey(modifiers)
        oreMap.set(key, (oreMap.get(key) ?? 0) + hours)
      } else if (kind === 'work') {
        const orario = modOrarioOrdinario(modifiers)
        if (orario) {
          entriesOrdinarieMaggiorate.push({ orario })
        } else {
          for (const flag of modFlagsOrdinario(modifiers)) {
            entriesOrdinarieMaggiorate.push({ flag })
          }
        }
      } else if (kind === 'cig') {
        // CIG Step 2 — secondo pool-ore per-entry, stesso pattern di overtime: somma indipendente
        // dalle ore 'work' sullo stesso giorno (asse ora-livello, mai il giorno-livello di
        // giorniPagatiEffettivi/KIND_PERC — vedi Stadio 5c nel motore).
        oreCig += hours
      } else if (kind === 'permesso_non_retribuito') {
        // Permesso Step 2 — stesso pattern di oreCig: pool-ore indipendente, mai il giorno-livello.
        orePermesso += hours
      } else if (kind === 'congedo_parentale_80') {
        oreCongedo80 += hours
      } else if (kind === 'congedo_parentale_30') {
        oreCongedo30 += hours
      }
    }
  }
  const ore: OreInput[] = Array.from(oreMap.entries()).map(([tipo, quantita]) => ({
    tipo,
    quantita,
  }))

  // ── 8b. CIG config (Step 3) — risolve il massimale di legge per l'anno (es. 2026: 1.340,56 €)
  // o l'override utente. Non retroattivo: ogni anno legge il proprio massimale storico da worklog_cig_massimale.
  let coefficienteSolidarieta = 0
  let massimaleCigNetto: number | null = null
  if (oreCig > 0) {
    const [cigConfig] = await db
      .select()
      .from(worklogCigConfig)
      .where(eq(worklogCigConfig.userId, userId))
      .limit(1)

    // Massimale storico per targetYear
    const [cigMassimaleRow] = await db
      .select()
      .from(worklogCigMassimale)
      .where(eq(worklogCigMassimale.anno, targetYear))
      .limit(1)

    if (cigConfig?.massimaleMensile != null) {
      massimaleCigNetto = parseFloat(cigConfig.massimaleMensile)
    } else if (cigMassimaleRow?.massimaleNetto != null) {
      massimaleCigNetto = parseFloat(cigMassimaleRow.massimaleNetto)
    }

    if (cigConfig?.coefficiente != null) {
      coefficienteSolidarieta = parseFloat(cigConfig.coefficiente)
    }

    if (!cigConfig && !cigMassimaleRow) {
      return { ok: false, reason: 'no_cig_config', warnings }
    }

    if (!massimaleCigNetto) {
      warnings.push('integrazione_solidarieta_stimata')
    }
  }

  // ── 8c. Sindacato config (CGIL) — query SEMPRE eseguita, NON condizionale come CIG:
  // "riga assente" equivale univocamente a "non iscritto" (l'evidenza d'uso è la config
  // stessa, non i giorni/entries) — mai uno stato inconsistente, mai un blocker.
  const [sindacatoConfig] = await db
    .select()
    .from(worklogSindacatoConfig)
    .where(eq(worklogSindacatoConfig.userId, userId))
    .limit(1)
  // Pre-azzerato qui: il motore riceve solo il numero, non sa "perché" — stesso schema di
  // coefficienteSolidarieta sopra.
  const coefficienteSindacale = sindacatoConfig?.iscritto ? parseFloat(sindacatoConfig.coefficiente) : 0
  const sindacatoNome = sindacatoConfig?.nome ?? null

  // ── 8c-bis. Cometa config (previdenza complementare) — query SEMPRE eseguita, stesso pattern
  // di sindacato: "riga assente" equivale univocamente a "non iscritto", mai un blocker.
  const [cometaConfig] = await db
    .select()
    .from(worklogCometaConfig)
    .where(eq(worklogCometaConfig.userId, userId))
    .limit(1)
  // Pre-azzerato qui, stesso schema di coefficienteSindacale — nessun default percentuale:
  // iscritto ma coefficiente non ancora dichiarato (nullable in DB) degrada a 0, mai un valore
  // indovinato.
  const coefficienteCometa = cometaConfig?.iscritto
    ? (cometaConfig.coefficiente != null ? parseFloat(cometaConfig.coefficiente) : 0)
    : 0

  // ── 8d. Mensa config — query SEMPRE eseguita, stesso pattern di sindacato: "riga assente"
  // equivale univocamente a "non attivo", mai un blocker. Nessun bucket contaminato qui
  // (a differenza del sindacato) — niente warning "non disponibile" da introdurre.
  const [mensaConfig] = await db
    .select()
    .from(worklogMensaConfig)
    .where(eq(worklogMensaConfig.userId, userId))
    .limit(1)
  const importoMensa = mensaConfig?.attivo ? parseFloat(mensaConfig.importo) : 0

  // ── 8e. Addizionali IRPEF config — query SEMPRE eseguita, stesso pattern di mensa:
  // "riga assente" equivale univocamente a "non attivo", mai un blocker. Netta pura, zero
  // tocco fiscale (a differenza di Cometa che è iscritto-gated e deducibile).
  const [addizionaliConfig] = await db
    .select()
    .from(worklogAddizionaliConfig)
    .where(eq(worklogAddizionaliConfig.userId, userId))
    .limit(1)

  // ── 8f. Netto reale (per mese) — trasporto puro, mirror sindacatoNome: mai in StimaInput/
  // StimaOutput, il motore resta ignaro. Query sempre eseguita, "riga assente" = non ancora
  // dichiarato per questo mese → nettoReale/scarto restano null (assenza, non 0).
  const [nettoRealeRow] = await db
    .select()
    .from(worklogNettoReale)
    .where(and(eq(worklogNettoReale.userId, userId), eq(worklogNettoReale.mese, targetMonth)))
    .limit(1)
  const nettoReale = nettoRealeRow ? parseFloat(nettoRealeRow.netto) : null
  const stimaNettoSnapshot = nettoRealeRow?.stimaNettoSnapshot ? parseFloat(nettoRealeRow.stimaNettoSnapshot) : null

  // ── 9. Tariffa oraria unica — stesso divisore in entrambe le direzioni mensile↔orario,
  // così il RAL non diverge tra i due tipi di input. Divisore = proprietà del CCNLProfile
  // (173 per Metalmeccanica Industria), non più derivato dalle ore contrattuali del
  // contratto — quello serve ad altro nel modulo (calendario/monte ore), non alla paga.
  const divisoreOrario = parseFloat(ccnl.divisoreOrario)

  const { componenti, warningQuadratura, componentiDichiarati } = resolveRetribuzioneFissaComponenti(retrib, divisoreOrario)
  if (warningQuadratura) warnings.push('quadratura_incongruente')
  const retribuzioneMensile = computeRetribuzioneFissaMensile(componenti)
  // Trattenuta sindacale (CGIL, forma) — SOLO il minimo tabellare vero (mai il bucket legacy/
  // orario sintetizzato sopra, che riusa lo stesso campo per l'intero importo).
  const minimoTabellareReale = componentiDichiarati ? componenti.minimoTabellare : null
  // Cometa (previdenza complementare) — stesso degrado della sindacale: iscritto (coefficiente
  // >0) ma minimo non dichiarato/ramo orario → deduzione 0 nel motore, warning esplicito qui
  // (motore non toccato in questo step, nessun output field dedicato).
  if (coefficienteCometa > 0 && minimoTabellareReale === null) warnings.push('cometa_non_disponibile')
  const tariffaOraria = retrib.tipo === 'hourly'
    ? parseFloat(retrib.importo)
    : retribuzioneMensile / divisoreOrario

  // ── 9b. Flat variabili (Step 6) — importi one-off del mese (premio produzione feriale/
  // variabile), entrano in imponibileExtra/marginale nel motore. Nessuna riga = 0, NON blocker:
  // l'assenza di premio in un mese è normale, non un dato mancante come contratto/retribuzione.
  const [variabiliFlatRow] = await db
    .select({ totale: sum(worklogVariabiliFlat.importo) })
    .from(worklogVariabiliFlat)
    .where(and(eq(worklogVariabiliFlat.userId, userId), eq(worklogVariabiliFlat.mese, targetMonth)))
  const variabiliFlat = variabiliFlatRow?.totale ? parseFloat(variabiliFlatRow.totale) : 0

  // ── 10. Assemble engine input and call ───────────────────────────────────────
  const input: StimaInput = {
    retribuzioneFissaComponenti: componenti,
    mensilita: config.mensilita,
    giorniPagatiEffettivi,
    giorniLavorabiliMese,
    tariffaOraria,
    ore,
    entriesOrdinarieMaggiorate,
    turniStandard: ccnl.turniStandard,
    fasceMaggiorate: ccnl.fasceMaggiorate,
    maggiorazioni: ccnl.maggiorazioni,
    variabiliFlat,
    oreCig,
    giorniFerialiMese,
    coefficienteSolidarieta,
    massimaleCigNetto,
    orePermessoNonRetribuito: orePermesso,
    oreCongedoParentale80: oreCongedo80,
    oreCongedoParentale30: oreCongedo30,
    divisoreOrario,
    coefficienteSindacale,
    coefficienteCometa,  // da worklog_cometa_config, vedi query 8c-bis sopra
    minimoTabellareReale,
    numeroPasti,
    importoMensa,
    addizionaleRegionale: addizionaliConfig?.attivo ? parseFloat(addizionaliConfig.addizionaleRegionale) : 0,
    addizionaleComunale: addizionaliConfig?.attivo ? parseFloat(addizionaliConfig.addizionaleComunale) : 0,
    accontoComunale: addizionaliConfig?.attivo ? parseFloat(addizionaliConfig.accontoComunale) : 0,
    contributiInpsRate: computeContributiInpsRate(parseFloat(fiscal.contributiInps), oreCig),
    scaglioni: fiscal.scaglioniIrpef,
    detrazioniLavoro: fiscal.detrazioniLavoro,
    trattamentoIntegrativo: fiscal.trattamentoIntegrativo ?? null,
  }

  const output = stimaBustaPaga(input)
  if (output.warningDetrazioniForfettizzate) warnings.push('detrazioni_stimate_ral_teorico')
  if (output.warningTrattenutaSindacaleNonDisponibile) warnings.push('trattenuta_sindacale_non_disponibile')

  // Scarto stima vs reale — calcolato con engine puro valutaScostamento.
  // Se è presente uno snapshot immutabile di quel periodo, confronta con lo snapshot,
  // altrimenti con la stima corrente. Se il netto reale è null o <= 0, valutazione = 'uncommunicated'.
  const comparisonEstimate = stimaNettoSnapshot ?? output.netto
  const sc = nettoReale !== null && nettoReale > 0 ? valutaScostamento(comparisonEstimate, nettoReale) : null
  const scarto = sc && sc.valutazione !== 'uncommunicated' ? sc.delta : null
  const scostamentoPerc = sc && sc.valutazione !== 'uncommunicated' ? sc.scostamentoPerc : null
  const valutazione = sc ? sc.valutazione : 'uncommunicated'
  const verso = sc && sc.valutazione !== 'uncommunicated' ? sc.verso : null

  // Fase 4B — addizionali regionali/comunali, dato PREVISIONALE/CONSOLIDATO, mai sottratto dal
  // netto qui (vedi output sopra, `computeNetto` non le vede). previousYearSnapshot è sempre
  // null in questa fase: nessuno snapshot fiscale chiuso persiste ancora (Fase 5, non iniziata).
  const previousYearSnapshot: TaxContext | null = null
  const currentYearEstimate: TaxContext = {
    fiscalYear: targetYear,
    taxableIncome: output.imponibileIrpefAnnuo,
    source: 'ESTIMATED_CURRENT_YEAR',
  }
  const taxContext = determineTaxDataSource(previousYearSnapshot, currentYearEstimate)
  const addizionaliCalcolate = computeAddizionali(
    taxContext,
    config.aliquotaAddRegionale != null ? parseFloat(config.aliquotaAddRegionale) : 0,
    config.aliquotaAddComunale != null ? parseFloat(config.aliquotaAddComunale) : 0,
  )
  const addizionali: AddizionaliAnnuali = {
    regionalAmountAnnual: addizionaliCalcolate.regionalAmount,
    municipalAmountAnnual: addizionaliCalcolate.municipalAmount,
    source: addizionaliCalcolate.source,
  }

  return {
    ok: true,
    output,
    warnings,
    sindacatoNome,
    addizionali,
    nettoReale,
    scarto,
    stimaNettoSnapshot,
    scostamentoPerc,
    valutazione,
    verso,
  }
}

// ─── Modalità 1 — retribuzione fissa: componenti dichiarati o bucket legacy ──────────────

/**
 * Se l'utente ha dichiarato la scomposizione (i 4 campi Modalità 1, tutti non-null),
 * verifica la quadratura contro `importo` e la usa. Altrimenti (record legacy o input
 * orario) sintetizza un bucket unico usando il divisore CCNL corrente (importo + premioFisso
 * per 'monthly', importo × divisoreOrario per 'hourly').
 */
function resolveRetribuzioneFissaComponenti(
  retrib: { tipo: 'hourly' | 'monthly'; importo: string; premioFisso: string | null
    minimoTabellare: string | null; superminimo: string | null
    scattiAnzianita: string | null; premioProduzioneFisso: string | null },
  divisoreOrario: number,
): { componenti: RetribuzioneFissaComponenti; warningQuadratura: boolean; componentiDichiarati: boolean } {
  const importo = parseFloat(retrib.importo)

  if (retrib.tipo === 'hourly') {
    return {
      componenti: { minimoTabellare: importo * divisoreOrario, superminimo: 0, scattiAnzianita: 0, premioProduzioneFisso: 0 },
      warningQuadratura: false,
      componentiDichiarati: false,
    }
  }

  const dichiarati = retrib.minimoTabellare != null && retrib.superminimo != null
    && retrib.scattiAnzianita != null && retrib.premioProduzioneFisso != null

  if (!dichiarati) {
    const bucket = importo + (retrib.premioFisso ? parseFloat(retrib.premioFisso) : 0)
    return {
      componenti: { minimoTabellare: bucket, superminimo: 0, scattiAnzianita: 0, premioProduzioneFisso: 0 },
      warningQuadratura: false,
      componentiDichiarati: false,
    }
  }

  const componenti: RetribuzioneFissaComponenti = {
    minimoTabellare: parseFloat(retrib.minimoTabellare!),
    superminimo: parseFloat(retrib.superminimo!),
    scattiAnzianita: parseFloat(retrib.scattiAnzianita!),
    premioProduzioneFisso: parseFloat(retrib.premioProduzioneFisso!),
  }
  return { componenti, warningQuadratura: !quadraturaOk(componenti, importo), componentiDichiarati: true }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Mensa: presenza auto-derivata da un giorno registrato — true se almeno un'entry ha
 * kind ∈ {work, overtime}, altrimenti false. Predicato puro, sorgente unica (mai duplicato
 * client-side) — cig/permesso/ferie/malattia/festivo ricadono naturalmente su false, nessun
 * ramo speciale per costruzione.
 */
export function deriveMeal(entries: { kind: EntryKind }[]): boolean {
  return entries.some((e) => e.kind === 'work' || e.kind === 'overtime')
}

function monthRange(month: string): { from: string; to: string } {
  const [y, m] = month.split('-').map(Number) as [number, number]
  const from = `${y}-${String(m).padStart(2, '0')}-01`
  const lastDay = new Date(y, m, 0).getDate()
  const to = `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
  return { from, to }
}

export function getWorkingDays(month: string, holidays: Set<string>): string[] {
  const [y, m] = month.split('-').map(Number) as [number, number]
  const lastDay = new Date(y, m, 0).getDate()
  const result: string[] = []
  for (let d = 1; d <= lastDay; d++) {
    const dow = new Date(y, m - 1, d).getDay()
    const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    if (dow !== 0 && dow !== 6 && !holidays.has(dateStr)) {
      result.push(dateStr)
    }
  }
  return result
}

/**
 * Divisore CIG (CIG Step 6, correzione) — giorni feriali lun-ven del mese, FESTIVITÀ INCLUSE.
 * DISTINTO da getWorkingDays: quello esclude le festività per la pro-quota fissa (Stadio 5a),
 * questo le conta per lo storno CIG (Stadio 5c) — verificato su busta reale (aprile con
 * Pasquetta: 22 giorni feriali, ma 21 giorniLavorabiliMese). Non fondere i due.
 */
function getFerialiCount(month: string): number {
  const [y, m] = month.split('-').map(Number) as [number, number]
  const lastDay = new Date(y, m, 0).getDate()
  let count = 0
  for (let d = 1; d <= lastDay; d++) {
    const dow = new Date(y, m - 1, d).getDay()
    if (dow !== 0 && dow !== 6) count++
  }
  return count
}

export function todayDate(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

function modKey(mods: EntryModifiers | null | undefined): ModificatoreKey {
  const notturno = mods?.notturno ?? false
  const festivo = mods?.festivoLavorato ?? false
  if (festivo && notturno) return 'straordinarioFestivoNotturno'
  if (festivo) return 'straordinarioFestivo'
  if (notturno) return 'straordinarioNotturno'
  return 'straordinarioDiurnoFeriale'
}

/**
 * Turno ORDINARIO (kind='work') a fasce — flag, non chiave CCNL: la mappatura flag→fascia
 * (e l'overlap con lo span) vive nel motore (`computeMaggiorazioniOrdinarie`), qui solo si
 * legge quali flag sono settati. Ritorna un array: se in futuro (o via API diretta) un'entry
 * avesse entrambi i flag, il motore somma entrambe le maggiorazioni invece di sceglierne una
 * — la UI li rende mutuamente esclusivi (Step 5.3), il resolver resta generico.
 * `festivoLavorato` su un'entry ordinaria non ha ancora una fascia dedicata — ignorato.
 */
/**
 * Orario esplicito (Step 5.4) — precedenza assoluta sui flag notturno/pomeridiano quando
 * entrambi i campi sono compilati. Un solo campo compilato (dato parziale/inatteso) è trattato
 * come assente: non passiamo un orario a metà al motore, si torna al flag come se non ci fosse.
 */
function modOrarioOrdinario(mods: EntryModifiers | null | undefined): OrarioEsplicito | null {
  if (!mods?.orarioInizio || !mods?.orarioFine) return null
  return { inizio: mods.orarioInizio, fine: mods.orarioFine }
}

function modFlagsOrdinario(mods: EntryModifiers | null | undefined): Array<'notturno' | 'pomeridiano'> {
  const flags: Array<'notturno' | 'pomeridiano'> = []
  if (mods?.notturno) flags.push('notturno')
  if (mods?.pomeridiano) flags.push('pomeridiano')
  return flags
}
