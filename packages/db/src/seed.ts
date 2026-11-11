/**
 * Idempotent reference-data seed.
 * Run via: docker exec dexhub-api-1 node node_modules/@dexhub/db/dist/seed.js
 *
 * UPSERT semantics (ON CONFLICT DO UPDATE): safe to re-run.
 * Re-running with corrected values updates existing rows without duplicates.
 *
 * RULES:
 *   - Migrations own the schema shape (immutable once applied).
 *   - This script owns the data. Never mix them.
 *   - Do NOT run outside the API container (postgres is on an internal Docker network).
 */
import { drizzle } from 'drizzle-orm/postgres-js'
import { eq } from 'drizzle-orm'
import postgres from 'postgres'
import { worklogCcnlProfile, worklogFiscalProfile, changelogRelease, changelogChange } from './schema'
import type {
  CcnlBancaOre,
  CcnlFasceMaggiorate,
  CcnlLimitiStraordinario,
  CcnlMaggiorazioni,
  CcnlTurnoStandard,
} from './schema/worklog/ccnl-profile'
import type {
  DetrazioniLavoroRule,
  IrpefScaglione,
  TrattamentoIntegrativoRule,
} from './schema/worklog/fiscal-profile'

async function main() {
  const url = process.env['DATABASE_URL']
  if (!url) throw new Error('DATABASE_URL is not set')

  const client = postgres(url, { max: 1 })
  const db = drizzle(client)

  try {
    await seedCcnlMetalmeccanica(db)
    await seedCcnlCommercio(db)
    await seedFiscal2026(db)
    await seedChangelog(db)
    console.log('Seed complete.')
  } finally {
    await client.end()
  }
}

type DB = ReturnType<typeof drizzle>

// ---------------------------------------------------------------------------
// CCNL Metalmeccanica Industria (Federmeccanica-Assistal)
// Fonte: testo CCNL 2021-2024, accordo siglato 5 feb 2021 con FIOM-FIM-UILM.
// Rinnovo atteso dopo scadenza 2027-05-31 — ri-verificare i valori alla firma.
// ---------------------------------------------------------------------------
async function seedCcnlMetalmeccanica(db: DB) {
  const maggiorazioni: CcnlMaggiorazioni = {
    // Percentuali di maggiorazione sulle ore aggiuntive rispetto alla retribuzione oraria base.
    straordinarioDiurnoFeriale: 0.25,   // art. 5 CCNL
    straordinarioNotturno: 0.55,         // art. 5 CCNL (notturno = dopo le 22:00)
    straordinarioFestivo: 0.50,          // art. 5 CCNL
    straordinarioFestivoNotturno: 0.75,  // art. 5 CCNL
    notturnoOrdinarioInTurno: 0.15,      // turno notturno ordinario (non straordinario)
    pomeridianoInTurno: 0.065,           // turno pomeridiano per lavoratori in turni avvicendati
  }

  const limitiStraordinario: CcnlLimitiStraordinario = {
    // art. 5 CCNL: limiti standard. Possono essere derogati da accordo aziendale.
    oreGiornoMax: 2,
    oreSettimanaMax: 8,
    oreAnnoMax: 200,
    oreAnnoMaxConAccordo: 250,
  }

  const bancaOre: CcnlBancaOre = {
    // 50% della maggiorazione straordinario confluisce in banca ore (per accordo aziendale).
    // Valore di default; varia per accordi di secondo livello.
    maggiorazioneConfluita: 0.50,
  }

  // Turni standard (inizi soli, durata = consecutivo) e fasce maggiorate — CAMPI INERTI:
  // nessun path di codice li legge ancora (motore/resolver restano su `maggiorazioni` sopra,
  // 0.15/0.065). Le % qui sono quelle corrette da CCNL (0.20/0.20) per quando il motore
  // passerà al calcolo a fasce — "da confermare" sul testo contrattuale ufficiale.
  const turniStandard: CcnlTurnoStandard = {
    mattino: { inizio: '06:00' },
    pomeriggio: { inizio: '14:00' },
    notte: { inizio: '22:00' },
  }

  const fasceMaggiorate: CcnlFasceMaggiorate = {
    notturnoOrdinarioInTurno: { da: '22:00', a: '06:00', percentuale: 0.20 },
    pomeridianoInTurno: { da: '18:00', a: '22:00', percentuale: 0.20 },
  }

  const row = {
    id: 'metalmeccanica-industria',
    nome: 'CCNL Metalmeccanica Industria (Federmeccanica-Assistal)',
    // 173 = divisore mensile standard (40h × 52 settimane / 12 mesi).
    divisoreOrario: '173',
    orarioSettimanale: '40',
    maggiorazioni,
    limitiStraordinario,
    bancaOre,
    turniStandard,
    fasceMaggiorate,
    // ROL 72h per aziende ≤200 dipendenti; 104h per aziende >200 (accordo aziendale).
    // Seedo il valore minimo di legge; aziende grandi overrideranno via user config.
    defaultRolOreAnno: '72',
    defaultExFestivitaOreAnno: '32',
    validoFino: '2027-05-31',
  }

  await db
    .insert(worklogCcnlProfile)
    .values(row)
    .onConflictDoUpdate({
      target: worklogCcnlProfile.id,
      set: {
        nome: row.nome,
        divisoreOrario: row.divisoreOrario,
        orarioSettimanale: row.orarioSettimanale,
        maggiorazioni: row.maggiorazioni,
        limitiStraordinario: row.limitiStraordinario,
        bancaOre: row.bancaOre,
        turniStandard: row.turniStandard,
        fasceMaggiorate: row.fasceMaggiorate,
        defaultRolOreAnno: row.defaultRolOreAnno,
        defaultExFestivitaOreAnno: row.defaultExFestivitaOreAnno,
        validoFino: row.validoFino,
      },
    })

  console.log('  ✓ ccnl: metalmeccanica-industria')
}

// ---------------------------------------------------------------------------
// CCNL Commercio e Terziario (Confcommercio)
// ---------------------------------------------------------------------------
async function seedCcnlCommercio(db: DB) {
  const maggiorazioni: CcnlMaggiorazioni = {
    straordinarioDiurnoFeriale: 0.15,
    straordinarioNotturno: 0.50,
    straordinarioFestivo: 0.30,
    straordinarioFestivoNotturno: 0.60,
    notturnoOrdinarioInTurno: 0.15,
    pomeridianoInTurno: 0.05,
  }

  const limitiStraordinario: CcnlLimitiStraordinario = {
    oreGiornoMax: 2,
    oreSettimanaMax: 8,
    oreAnnoMax: 200,
    oreAnnoMaxConAccordo: 250,
  }

  const bancaOre: CcnlBancaOre = {
    maggiorazioneConfluita: 0.50,
  }

  const turniStandard: CcnlTurnoStandard = {
    mattino: { inizio: '06:00' },
    pomeriggio: { inizio: '14:00' },
    notte: { inizio: '22:00' },
  }

  const fasceMaggiorate: CcnlFasceMaggiorate = {
    notturnoOrdinarioInTurno: { da: '22:00', a: '06:00', percentuale: 0.15 },
    pomeridianoInTurno: { da: '18:00', a: '22:00', percentuale: 0.10 },
  }

  const row = {
    id: 'commercio-terziario',
    nome: 'CCNL Commercio e Terziario (Confcommercio)',
    divisoreOrario: '168',
    orarioSettimanale: '40',
    maggiorazioni,
    limitiStraordinario,
    bancaOre,
    turniStandard,
    fasceMaggiorate,
    defaultRolOreAnno: '56',
    defaultExFestivitaOreAnno: '32',
    validoFino: '2027-03-31',
  }

  await db
    .insert(worklogCcnlProfile)
    .values(row)
    .onConflictDoUpdate({
      target: worklogCcnlProfile.id,
      set: {
        nome: row.nome,
        divisoreOrario: row.divisoreOrario,
        orarioSettimanale: row.orarioSettimanale,
        maggiorazioni: row.maggiorazioni,
        limitiStraordinario: row.limitiStraordinario,
        bancaOre: row.bancaOre,
        turniStandard: row.turniStandard,
        fasceMaggiorate: row.fasceMaggiorate,
        defaultRolOreAnno: row.defaultRolOreAnno,
        defaultExFestivitaOreAnno: row.defaultExFestivitaOreAnno,
        validoFino: row.validoFino,
      },
    })

  console.log('  ✓ ccnl: commercio-terziario')
}

// ---------------------------------------------------------------------------
// Profilo fiscale 2026
//
// INPS:      Circolare INPS n.6 del 30-01-2026 + n.8 del 03-02-2026.
//            Aliquota dipendente ordinario: 9,19%. Fiducia: ALTA.
//            Apprendistato: ~5,84% (NON VERIFICATO su circolare specifica 2026).
//            Seodo solo l'aliquota ordinaria. Il motore usa tipoContratto per branching.
//
// IRPEF:     L.199/2025, art.1 co.3. Fonte: Ministero del Lavoro + fiscomania.com + ecnews.it.
//            Novità: secondo scaglione ridotto da 35% (2025) a 33% (2026). Fiducia: ALTA.
//
// Art.13:    Testo TUIR vigente da brocardi.it, confermato da centrofiscale.com,
//            fiscomania.com, randstad.it. Fascia A flat €1.955 (non formula). Fiducia: ALTA.
//
// Cuneo:     L.199/2025. Fonte: fiscomania.com. Fiducia: MEDIA (una sola fonte dettagliata).
//            INCERTEZZA: non confermato se sostituisce o coesiste col trattamento integrativo
//            L.207/2024 (€1.200 per RC ≤€15k). Verificare contro busta paga reale in Fase 4.
//
// TEST DI REGRESSIONE UFFICIALE (valori 2026 reali):
//   Input:  CCNL metalmeccanica-industria, ordinario, RAL €26.400 (€2.200/mese),
//           10h straordinario diurno feriale nel mese.
//   Output: netto mensile = €1.914,89
//   Dettaglio: lordo €2.358,96 − INPS €216,79 − IRPEF €227,28 = €1.914,89
// ---------------------------------------------------------------------------
async function seedFiscal2026(db: DB) {
  const scaglioniIrpef: IrpefScaglione[] = [
    // Fonte: L.199/2025 art.1 co.3
    { fino: 28000, aliquota: 0.23 },
    { fino: 50000, aliquota: 0.33 }, // era 0.35 nel 2025
    { fino: null,  aliquota: 0.43 },
  ]

  const detrazioniLavoro: DetrazioniLavoroRule = {
    fasce: [
      // Fascia A ≤€15.000: importo FISSO €1.955 (non formula).
      // Minimo garantito €690 (€1.380 per tempo determinato) — floor applicabile
      // in caso di part-time o anno parziale; non rilevante per calcolo mensile standard.
      // Fonte: art.13 TUIR co.1 (brocardi.it + centrofiscale.com).
      {
        tipo: 'flat',
        reddito_fino: 15000,
        valore_base: 1955,
      },
      // Fascia B €15.001–€28.000: formula lineare.
      // Detrazione = 1.910 + 1.190 × (28.000 − RC) / 13.000
      // NOTA: produce un "gradino" a RC=€15.001 (detrazione ~€3.100 vs €1.955 a €15.000).
      // Questo non è un errore — è un'anomalia del TUIR nota e documentata. Il motore
      // implementa la legge senza lisciare il gradino.
      {
        tipo: 'lineare',
        reddito_da: 15001,
        reddito_fino: 28000,
        base: 1910,
        aggiunta: 1190,
        denominatore: 13000,
      },
      // Fascia C €28.001–€50.000: formula lineare solo base.
      // Detrazione = 1.910 × (50.000 − RC) / 22.000
      {
        tipo: 'lineare_solo_base',
        reddito_da: 28001,
        reddito_fino: 50000,
        base: 1910,
        denominatore: 22000,
      },
      // Fascia D >€50.000: nessuna detrazione (nessuna entry = engine restituisce 0).
    ],
    // Bonus aggiuntivo +€65 per RC €25.001–€35.000.
    // Si somma alla detrazione fascia B/C senza sostituirla.
    // Fonte: art.13 TUIR co.1-bis (brocardi.it), confermato da centrofiscale.com.
    bonus: [
      { reddito_da: 25001, reddito_fino: 35000, importo: 65 },
    ],
  }

  // Cuneo fiscale strutturale — isolato come blocco separato (modificabile senza toccare art.13).
  // Per disabilitare: portare questo campo a NULL via db:seed aggiornato + riesecuzione.
  // Vedi commento header di questo file per dettagli su incertezza e source.
  const trattamentoIntegrativo: TrattamentoIntegrativoRule = {
    // Tier 1: somme non imponibili per RC ≤€20.000 (riduce la base IRPEF).
    // Applicazione progressiva su fasce: percentuale × reddito_nella_fascia.
    // Esempio: RC=€20.000 → 7,1%×8.500 + 5,3%×6.500 + 4,8%×5.000 = €1.188 totale.
    fasce_non_imponibili: [
      { reddito_da: 0,     reddito_fino: 8500,  percentuale: 0.071 },
      { reddito_da: 8501,  reddito_fino: 15000, percentuale: 0.053 },
      { reddito_da: 15001, reddito_fino: 20000, percentuale: 0.048 },
    ],
    // Tier 2: detrazione IRPEF per RC €20.001–€40.000 (riduce l'imposta dovuta).
    // Piatta €1.000 fino a €32.000, poi decresce linearmente a 0 a €40.000.
    detrazione_da: 20001,
    detrazione_piatto_fino: 32000,
    detrazione_importo: 1000,
    detrazione_zero_a: 40000,
  }

  const row = {
    anno: 2026,
    // Aliquota dipendente ordinario. Fonte: Circolare INPS n.6/2026.
    contributiInps: '0.09190',
    scaglioniIrpef,
    noTaxArea: '8500.00',
    detrazioniLavoro,
    trattamentoIntegrativo,
  }

  await db
    .insert(worklogFiscalProfile)
    .values(row)
    .onConflictDoUpdate({
      target: worklogFiscalProfile.anno,
      set: {
        contributiInps: row.contributiInps,
        scaglioniIrpef: row.scaglioniIrpef,
        noTaxArea: row.noTaxArea,
        detrazioniLavoro: row.detrazioniLavoro,
        trattamentoIntegrativo: row.trattamentoIntegrativo,
      },
    })

  console.log('  ✓ fiscal: 2026')
}

// ---------------------------------------------------------------------------
// Changelog — backfill storico (import, non publish runtime: date reali nel passato,
// il service CRUD rifiuterebbe con 409 su release published — bypassato di proposito).
//
// Idempotenza:
//   - Release: nessun UNIQUE su `versione` a schema (Diff 1) — niente onConflictDoUpdate
//     possibile. Upsert manuale: SELECT by versione, poi UPDATE (se esiste) o INSERT (se no).
//     Sicuro qui perché lo script è single-threaded, non un endpoint runtime concorrente.
//   - Change: nessuna chiave naturale pulita → per ogni release del seed, DELETE by
//     releaseId poi INSERT dell'elenco completo. Accettabile: import controllato, non
//     dati utente. `ordine` = indice nell'array, così la UI rispetta l'ordine dichiarato qui.
// ---------------------------------------------------------------------------
interface ChangelogChangeSeed {
  categoria: 'feature' | 'improvement' | 'fix' | 'security' | 'breaking'
  visibilita?: 'user' | 'developer' | 'internal'
  modulo?: string | null
  titolo: string
  descrizione?: string | null
  migrationNote?: string | null
}

interface ChangelogReleaseSeed {
  versione: string
  titolo: string
  descrizione: string | null
  dataPubblicazione: string // 'YYYY-MM-DD' — mezzogiorno UTC applicato in seedChangelog
  changes: ChangelogChangeSeed[]
}

const CHANGELOG_SEED: ChangelogReleaseSeed[] = [
  {
    versione: '0.1.0',
    titolo: 'Nascita Worklog',
    descrizione: null,
    dataPubblicazione: '2026-07-01',
    changes: [
      {
        categoria: 'feature', modulo: 'worklog', titolo: 'Modulo Cartellino',
        descrizione: 'Tracciamento ore e stima del cedolino paga.',
      },
    ],
  },
  {
    versione: '0.2.0',
    titolo: 'CIG / Solidarietà',
    descrizione: null,
    dataPubblicazione: '2026-07-08',
    changes: [
      {
        categoria: 'feature', modulo: 'worklog', titolo: 'Modellazione CIG e contratto di solidarietà',
        descrizione: 'Stima della busta con ore di CIG, storno della retribuzione e integrazione di solidarietà.',
        migrationNote: 'Configura il coefficiente di solidarietà in Impostazioni → CIG.',
      },
      {
        categoria: 'feature', modulo: 'worklog', titolo: 'Componenti variabili una-tantum',
        descrizione: 'Premi e voci variabili attribuibili a un singolo mese (es. premio produzione feriale, premio variabile).',
      },
    ],
  },
  {
    versione: '0.3.0',
    titolo: 'Permessi non retribuiti',
    descrizione: null,
    dataPubblicazione: '2026-07-09',
    changes: [
      {
        categoria: 'feature', modulo: 'worklog', titolo: 'Permesso non retribuito a ore',
        descrizione: 'Ore di permesso non retribuito su una giornata, con riduzione corretta della retribuzione maturata.',
      },
      {
        categoria: 'improvement', modulo: 'worklog', titolo: 'Riepilogo mensile più ricco',
        descrizione: 'Più informazioni nel riepilogo del mese e indicatori sulle giornate.',
      },
    ],
  },
  {
    versione: '0.4.0',
    titolo: 'Trattenuta sindacale (CGIL)',
    descrizione: null,
    dataPubblicazione: '2026-07-10',
    changes: [
      {
        categoria: 'feature', modulo: 'worklog', titolo: 'Trattenuta sindacale',
        descrizione: 'Quota di iscrizione al sindacato sottratta dal netto stimato.',
        migrationNote: 'Attiva l\'iscrizione e imposta il coefficiente in Impostazioni → Sindacato.',
      },
      {
        categoria: 'improvement', modulo: 'worklog', titolo: 'Modifica dello storico retribuzioni',
        descrizione: 'Correzione in-place delle voci di retribuzione passate, con ricalcolo automatico.',
      },
      {
        categoria: 'improvement', modulo: 'worklog', titolo: 'Mese di navigazione persistente',
        descrizione: 'Il mese aperto viene mantenuto anche dopo il ricaricamento della pagina.',
      },
      {
        categoria: 'improvement', modulo: 'shell', titolo: 'Impostazioni a barra laterale',
        descrizione: 'Il pannello impostazioni passa da schede orizzontali a una barra laterale verticale con icone.',
      },
      {
        categoria: 'fix', modulo: 'shell', visibilita: 'internal', titolo: 'Certificato locale e HSTS',
        descrizione: 'Risolto il blocco "certificato non sicuro" in ambiente self-hosted.',
      },
    ],
  },
  {
    versione: '0.5.0',
    titolo: 'Mensa',
    descrizione: null,
    dataPubblicazione: '2026-07-12',
    changes: [
      {
        categoria: 'feature', modulo: 'worklog', titolo: 'Trattenuta mensa',
        descrizione: 'Conteggio automatico dei pasti dai giorni di presenza, con override manuale per giorno, e trattenuta sul netto stimato.',
        migrationNote: 'Attiva la mensa e imposta l\'importo pasto in Impostazioni → Mensa.',
      },
      {
        categoria: 'improvement', modulo: 'worklog', titolo: 'Numero pasti nel riepilogo',
        descrizione: 'Il riepilogo mensile mostra quante volte hai usufruito della mensa nel mese.',
      },
    ],
  },
]

async function seedChangelog(db: DB) {
  for (const r of CHANGELOG_SEED) {
    const dataPubblicazione = new Date(`${r.dataPubblicazione}T12:00:00Z`)

    const existing = await db
      .select({ id: changelogRelease.id })
      .from(changelogRelease)
      .where(eq(changelogRelease.versione, r.versione))
      .limit(1)
      .then((rows) => rows[0])

    let releaseId: string
    if (existing) {
      releaseId = existing.id
      await db
        .update(changelogRelease)
        .set({
          titolo: r.titolo,
          descrizione: r.descrizione,
          stato: 'published',
          dataPubblicazione,
          updatedAt: new Date(),
        })
        .where(eq(changelogRelease.id, releaseId))
    } else {
      const [inserted] = await db
        .insert(changelogRelease)
        .values({
          versione: r.versione,
          titolo: r.titolo,
          descrizione: r.descrizione,
          stato: 'published',
          dataPubblicazione,
        })
        .returning({ id: changelogRelease.id })
      releaseId = inserted!.id
    }

    await db.delete(changelogChange).where(eq(changelogChange.releaseId, releaseId))
    await db.insert(changelogChange).values(
      r.changes.map((c, i) => ({
        releaseId,
        categoria: c.categoria,
        visibilita: c.visibilita ?? 'user',
        modulo: c.modulo ?? null,
        titolo: c.titolo,
        descrizione: c.descrizione ?? null,
        migrationNote: c.migrationNote ?? null,
        ordine: i,
      })),
    )

    console.log(`  ✓ changelog: ${r.versione} (${r.changes.length} change)`)
  }
}

main().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})
