# DexHub — Modulo `worklog` (Ore lavorate & stima compenso)

**Spec di implementazione per Claude Code**
Documento di riferimento. Descrive *cosa* costruire e *con quali contratti*, non l'implementazione riga per riga.

---

## 0. Contesto e principi

Questo modulo si innesta nell'architettura UI a **Module Manifest + Shell Slots** già definita per DexHub. Il Core non conosce `worklog`: il modulo dichiara le proprie estensioni tramite manifest e la shell le consuma dagli slot. Nessuna modifica alla shell per installarlo.

**Regole non negoziabili derivanti dall'architettura DexHub:**

1. Il modulo espone un `manifest` (`'use client'`) con metadati statici + contributi pesanti in `load: () => import(...)`.
2. Tutta la logica dati passa da funzioni thin-wrapper che chiamano la **REST API** del modulo — niente accesso dati diretto nel manifest.
3. Lo stato persistente usa gli adapter esistenti (`ModuleKVAdapter` per config leggera, storage/DB del modulo per le entry).
4. Gli aggiornamenti reattivi (badge "ore residue", "ore mese") passano dall'`EventBus`.
5. I permessi passano da `PermissionsContext` / `ShellRenderContext`.

**Principio guida del dominio:** separare nettamente due strati.
- **Strato A — Tracciamento ore** (deterministico, semplice, va fatto benissimo).
- **Strato B — Stima economica** (approssimativo per natura, config-driven, versionato per anno, calibrabile su busta paga reale).

Lo Strato A deve funzionare ed essere utile *anche senza* lo Strato B.

---

## 1. Modello dati

### 1.1 `WorkDay` — il giorno
Un giorno di calendario. Non contiene direttamente le ore: contiene una lista di `TimeEntry`, così un singolo giorno può mescolare più tipi (es. 6h lavoro + 2h permesso).

```ts
interface WorkDay {
  id: string
  userId: string
  date: string              // ISO 'YYYY-MM-DD'
  entries: TimeEntry[]
  note?: string
  // derivati (calcolati, non salvati): oreLavorate, oreAssenza, ecc.
}
```

### 1.2 `TimeEntry` — la voce
```ts
type EntryKind =
  | 'lavoro'          // ore ordinarie
  | 'straordinario'   // ore oltre l'orario, con maggiorazione
  | 'ferie'           // assenza retribuita, scala dal monte ferie
  | 'permesso'        // ROL / permessi, scala dal monte permessi
  | 'malattia'        // assenza, trattamento a parte
  | 'festivo'         // festività goduta
  | 'riposo'          // giorno non lavorativo
  | 'recupero'        // recupero ore / banca ore

interface TimeEntry {
  id: string
  kind: EntryKind
  hours: number             // supporta parziali: 2, 4.5, 8
  // modificatori opzionali che influenzano la paga (Strato B)
  modifiers?: {
    notturno?: boolean      // maggiorazione notturna
    festivoLavorato?: boolean
    reperibilita?: boolean
  }
  note?: string
}
```

**Requisito parziali:** ferie e permessi devono poter essere a ore, non solo a giornata intera (es. "permesso 2h"). L'UI deve rendere immediato sia il caso "giornata standard 8h lavoro" (un tap) sia il caso misto.

### 1.3 `ContractConfig` — il contratto dell'utente
Parametri stabili che descrivono *come* lavori. Salvato in KV, editabile dalle impostazioni del modulo.

```ts
interface ContractConfig {
  oreGiornaliereStandard: number      // default 8, personalizzabile
  giorniLavorativiSettimana: number[] // es. [1,2,3,4,5]

  // ── Retribuzione: due modalità alternative ──────────────
  retribuzione:
    | { modo: 'oraria'; pagaOraria: number }
    | {
        modo: 'mensile'
        stipendioMensileLordo: number   // lordo da contratto (tabellare + superminimo + scatti)
        premioProduzioneMensile?: number // premio fisso mensile, sommato al lordo
      }
  // Da 'mensile' la paga oraria si deriva col divisore del CCNL (vedi CCNLProfile).
  // Da 'oraria' il mensile si deriva moltiplicando per lo stesso divisore.

  mensilita: 13 | 14                  // tredicesima / quattordicesima

  ccnlId: string                      // riferimento al CCNLProfile (es. 'metalmeccanica-industria')

  // monte ore accantonato (default suggeriti dal CCNL, sovrascrivibili)
  ferieResidueOreIniziali?: number
  permessiResiduiOreIniziali?: number
  rateoFerieMensile?: number          // ore ferie maturate/mese
  rateoPermessiMensile?: number
}
```

> **Nota premio produzione:** trattato come voce fissa che si somma al lordo mensile. In futuro potrà avere trattamento fiscale agevolato (imposta sostitutiva sui premi di risultato) — non modellarlo ora, ma non impedirlo: tienilo come voce separata identificabile, non fusa nello stipendio base.

### 1.4 `TaxProfile` — il profilo fiscale (VERSIONATO PER ANNO)
**Il punto critico.** Aliquote, scaglioni, contributi e detrazioni cambiano ogni anno e per territorio. Non devono stare nel codice: sono **dati** caricati per `anno` + `regione` + `comune`.

```ts
interface TaxProfile {
  anno: number
  contributiInps: number              // 0.0919 dipendente ordinario, 0.0584 apprendistato
  scaglioniIrpef: { fino: number | null; aliquota: number }[]
  detrazioneLavoroDip: DetrazioneRule // formula a fasce, non un numero fisso
  noTaxArea: number                   // 8500 dipendenti
  addizionaleRegionale: AliquotaRule  // dipende dalla regione
  addizionaleComunale: AliquotaRule   // dipende dal comune
  trattamentoIntegrativo?: BonusRule  // bonus cuneo fiscale
}
```

**Seed 2026 da inserire come dato iniziale** (fonte: L. 199/2025, Agenzia delle Entrate — da rivalidare ogni anno):
- Contributi INPS dipendente ordinario: **9,19%** (apprendistato 5,84%).
- Scaglioni IRPEF: **23%** fino a 28.000 €, **33%** da 28.001 a 50.000 €, **43%** oltre 50.000 €.
- No tax area dipendenti: **8.500 €**.
- Addizionali regionale/comunale: **variabili, da impostare per regione/comune** (fino al 2028 possono usare 4 scaglioni pre-riforma).
- Detrazioni lavoro dipendente e bonus cuneo: formula a fasce decrescenti sul reddito.

> Requisito: il `TaxProfile` deve essere caricabile da un file/tabella dati aggiornabile senza toccare il motore di calcolo. Prevedere un banner UI "profilo fiscale anno N — verifica aggiornamento" quando l'anno corrente non ha un profilo confermato.

### 1.5 `CCNLProfile` — profilo contrattuale (CONFIGURABILE, estendibile)
Il CCNL definisce le maggiorazioni, il divisore orario e i default di ferie/permessi. È **dato configurabile**, non codice: si parte con un profilo (Metalmeccanica Industria) e se ne aggiungono altri senza toccare il motore.

```ts
interface CCNLProfile {
  id: string                          // 'metalmeccanica-industria'
  nome: string                        // 'CCNL Metalmeccanica Industria (Federmeccanica)'
  divisoreOrario: number              // mensile → oraria (es. 173)
  orarioSettimanale: number           // 40
  maggiorazioni: {
    straordinarioDiurnoFeriale: number
    straordinarioNotturno: number
    straordinarioFestivo: number
    straordinarioFestivoNotturno: number
    notturnoOrdinarioInTurno: number  // lavoro notturno non straordinario
    pomeridianoInTurno?: number
  }
  limitiStraordinario: {
    oreGiornoMax?: number
    oreSettimanaMax?: number
    oreAnnoMax?: number
  }
  bancaOre?: { maggiorazioneConfluita: number } // % della maggiorazione straordinario
  defaultRolOreAnno?: number
  defaultExFestivitaOreAnno?: number
}
```

**Seed `metalmeccanica-industria`** (fonte: guide CCNL Metalmeccanica Industria 2026 — da rivalidare a ogni rinnovo, il contratto corrente è valido fino al 31/05/2027):

| Voce | Valore |
|---|---|
| Divisore orario (mensile → oraria) | **173** |
| Orario settimanale | 40 h |
| Straordinario diurno feriale | **+25%** |
| Straordinario notturno | **+55%** |
| Straordinario festivo | **+50%** |
| Straordinario festivo notturno | **+75%** |
| Lavoro notturno ordinario in turno | **+15%** |
| Turno pomeridiano | **+6,5%** |
| Banca ore (straordinario confluito) | 50% della maggiorazione |
| Limiti straordinario | 2 h/giorno, 8 h/settimana, 200 h/anno (elevabili a 250 con accordo) |
| ROL | 72 h/anno (aziende ≤200 dip.) o 104 h (>200) |
| Ex festività | 32 h/anno |

> Le percentuali sono calcolate sulla **retribuzione di fatto** (tabellare + superminimo + scatti) e **non sono cumulabili**: la maggiore assorbe la minore. Il divisore 173 è lo standard del settore per ricavare la paga oraria dal mensile. Ogni valore deve restare editabile: i rinnovi contrattuali li cambiano.

**Estendibilità:** aggiungere un CCNL = aggiungere un `CCNLProfile` alla tabella dati. Nessuna modifica al motore. Prossimi candidati: Metalmeccanica Artigianato/PMI, Commercio, ecc.

### 1.6 `MonthSummary` — derivato, mai salvato
Aggregato calcolato al volo per un mese: totale ore ordinarie, straordinario, ferie usate/residue, permessi usati/residui, giorni lavorati, e (se Strato B attivo) lordo stimato, trattenute, netto stimato.

---

## 2. Strato A — Tracciamento ore (MVP, deve essere solido)

### Funzionalità
1. **Vista calendario mensile** — ogni giorno mostra un indicatore compatto (ore + tipo con codice colore). Il colore distingue lavoro / ferie / permesso / malattia / festivo / riposo.
2. **Inserimento rapido** — tap su un giorno → default "8h lavoro" preimpostato (dal `ContractConfig`), confermabile in un gesto. Modificabile per giorni misti/parziali.
3. **Inserimento massivo** — selezione multipla di giorni → applica lo stesso pattern (es. "seleziona lun-ven → 8h lavoro"). Fondamentale per non inserire giorno per giorno.
4. **Template/turni** — pattern ricorrenti salvabili (es. "turno standard", "turno notturno") applicabili con un tap. Utile per chi fa turni fissi.
5. **Vista lista/registro** — elenco cronologico filtrabile per tipo e mese, per revisione e correzione.
6. **Riepilogo mensile live** — sempre visibile: ore ordinarie, straordinario, ferie usate, permessi usati, monte ore residuo.
7. **Monte ore (ratei)** — ferie e permessi maturano ogni mese (`rateoFerieMensile`) e si consumano con le entry corrispondenti. Mostrare il residuo aggiornato. Alert quando il residuo scende sotto una soglia.
8. **Note per giorno** e ricerca testuale (integrata nella ricerca globale via slot `search`).
9. **Festività** — precaricare le festività nazionali italiane per anno (opzionale: patronale del comune). I giorni festivi sono suggeriti automaticamente come `festivo`.

### Esportazione
- Export mensile/annuale in **CSV** e **JSON** (via slot `export` del manifest).
- Opzionale: export PDF "riepilogo mese" stampabile (fase successiva).

---

## 3. Strato B — Motore di stima economica

### 3.1 Architettura del motore
Il motore è una **funzione pura**: prende `(MonthSummary, ContractConfig, TaxProfile)` e restituisce una stima. Nessun side-effect, nessuna chiamata rete al suo interno, così è testabile con casi noti.

```ts
function stimaBustaPaga(
  mese: MonthSummary,
  contratto: ContractConfig,
  profilo: TaxProfile
): StimaCompenso
```

### 3.2 Sequenza di calcolo (ordine corretto)
1. **Lordo del mese.**
   - Modalità *mensile*: lordo base = `stipendioMensileLordo + premioProduzioneMensile`. La paga oraria per gli straordinari si ricava con `stipendioMensileLordo / divisoreOrario` (es. /173).
   - Modalità *oraria*: lordo base = ore ordinarie × paga oraria.
   - **Straordinari**: ogni ora di `straordinario` è pagata come paga oraria × (1 + maggiorazione), dove la maggiorazione è scelta dal `CCNLProfile` in base ai modificatori della entry (diurno feriale / notturno / festivo / festivo-notturno). Ricorda: **non cumulabili**, la maggiore assorbe la minore.
   - Ferie e permessi retribuiti concorrono al lordo come ore normali (non aggiungono maggiorazione).
2. **Contributi INPS a carico dipendente** = lordo × aliquota INPS. Si sottraggono.
3. **Imponibile fiscale** = lordo − contributi.
4. **IRPEF lorda** = applicazione progressiva degli scaglioni sull'imponibile (annualizzato e riproporzionato al mese, oppure su base annua con rateizzazione — vedi nota).
5. **Detrazioni** (lavoro dipendente + eventuale bonus cuneo) sottratte dall'IRPEF lorda → **IRPEF netta**.
6. **Addizionali** regionale e comunale (di norma trattenute in busta l'anno successivo a rate — modellare come voce separata e opzionale, con nota che nel mese corrente potrebbero non incidere).
7. **Netto stimato** = imponibile − IRPEF netta − addizionali di competenza.

> **Nota fondamentale (annualizzazione):** l'IRPEF vera è annuale e il sostituto d'imposta la spalma sui mesi con conguaglio a fine anno. Una stima mensile onesta deve dichiarare che è una **proiezione**, non l'importo esatto del cedolino. Prevedere due modalità: (a) *stima mensile rapida* (proporzionale), (b) *proiezione annuale* (più accurata, usa RAL/tredicesima).

### 3.3 Calibrazione su busta paga reale — feature chiave per l'accuratezza
Invece di rincorrere ogni dettaglio del CCNL, permetti all'utente di **inserire un cedolino reale** (lordo, netto, trattenute). Il motore ricava i **parametri effettivi** (aliquota media effettiva, incidenza addizionali) e li usa per correggere le stime successive. Questo porta una stima generica vicina al reale senza modellare tutto il contratto.

```ts
interface Calibrazione {
  meseRiferimento: string
  lordoReale: number
  nettoReale: number
  parametriDerivati: { /* aliquota effettiva, offset, ecc. */ }
}
```

### 3.4 Disclaimer obbligatorio
Ogni schermata economica deve mostrare, in modo non invadente ma chiaro, che si tratta di una **stima indicativa** e non sostituisce la busta paga ufficiale. Non è consulenza fiscale.

---

## 4. Integrazione UI — il Manifest

```ts
export const WorklogModule: DexHubModule = {
  id: 'worklog',
  manifestVersion: 1,
  manifest: {
    nav: { icon: /* Clock */, label: 'Ore', href: '/worklog', order: 30,
           badge: { eventType: 'worklog.mese.update' } },   // badge = ore mese

    commands: [
      { id: 'worklog.oggi',      label: 'Registra oggi',      shortcut: 'o o', /* execute → API */ },
      { id: 'worklog.settimana', label: 'Compila settimana',  shortcut: 'o s' },
      { id: 'worklog.riepilogo', label: 'Riepilogo mese',     shortcut: 'o r' },
    ],

    search: { placeholder: 'Cerca nei giorni…',
              search: /* thin wrapper → REST */ },

    settings: [
      { id: 'worklog.contratto', label: 'Contratto e orario', load: () => import('./settings/contratto') },
      { id: 'worklog.fiscale',   label: 'Profilo fiscale',    load: () => import('./settings/fiscale') },
    ],

    export: [
      { id: 'worklog.export', label: 'Ore lavorate', formats: ['csv', 'json'],
        export: /* thin wrapper → REST */ },
    ],

    activity: { eventTypes: ['worklog.day.created', 'worklog.day.updated'],
                renderEvent: /* load lazy */ },

    trash: { /* giorni eliminati recuperabili */ },

    emptyState: () => import('./components/empty-state'),
  },
  bootstrap: async (ctx) => { /* init runtime, ratei, festività */ },
}
```

- **Metadati statici** (label, icona, order, shortcut) inline → caricati subito.
- **Componenti pesanti** (settings, activity renderer, empty state) → `load: () => import(...)`, mai importati in testa al file.
- **Badge reattivo** "ore mese" / "ferie residue" → emesso su `EventBus`, consumato via `useModuleBadge`.

---

## 5. API REST del modulo (contratti backend)

Le funzioni del manifest sono thin-wrapper su questi endpoint (nomi indicativi):

```
GET    /api/worklog/days?from=&to=        → WorkDay[]
POST   /api/worklog/days                  → crea/aggiorna giorno
DELETE /api/worklog/days/:id              → soft delete (→ trash)
GET    /api/worklog/summary?month=        → MonthSummary (include stima se attiva)
GET    /api/worklog/contract              → ContractConfig
PUT    /api/worklog/contract              → aggiorna
GET    /api/worklog/tax-profile?year=     → TaxProfile
PUT    /api/worklog/tax-profile           → aggiorna profilo/anno
POST   /api/worklog/calibration           → registra busta paga reale
GET    /api/worklog/export?format=&range= → CSV/JSON
```

Il calcolo economico gira **lato server** (endpoint `summary`), così il motore, le tabelle fiscali e la calibrazione restano fuori dal bundle client. Il manifest client riceve solo il risultato.

---

## 6. Roadmap di implementazione (per Claude Code)

**Fase 1 — Tracciamento (MVP utile da solo)**
Modello `WorkDay`/`TimeEntry`, storage, API days/summary, vista calendario + inserimento rapido/massivo, riepilogo ore mensile, `ContractConfig` base (ore standard, giorni). Manifest con `nav` + `commands` + badge ore mese.
*Nessun calcolo economico ancora.*

**Fase 2 — Monte ore e template**
Ratei ferie/permessi, residui e alert, template turni, festività nazionali, export CSV/JSON, slot `search` e `trash`.

**Fase 3 — Stima economica base**
`TaxProfile` versionato (seed 2026) + `CCNLProfile` (seed Metalmeccanica Industria), motore puro `stimaBustaPaga`, endpoint `summary` con lordo→imponibile→IRPEF→netto. Supporto entrambe le modalità retributive (oraria / mensile + premio). Straordinari con maggiorazioni CCNL (incluso notturno/festivo come modificatori). Modalità stima mensile e proiezione annuale, disclaimer. Settings "Contratto e CCNL" + "Profilo fiscale".

**Fase 4 — Accuratezza e completezza**
Calibrazione su busta paga reale, addizionali regionali/comunali configurabili, tredicesima/quattordicesima e ratei, banca ore, TFR (opzionale), indennità malattia (aggancio al hook già predisposto), detassazione premio produzione, report mensile PDF.

---

## 7. Rischi e cose da non sbagliare

- **Non hardcodare aliquote/scaglioni** nel motore: sono `TaxProfile` versionati per anno. Il 2026 ha già cambiato il secondo scaglione (35→33%): il codice non deve accorgersene, solo il dato.
- **Non promettere il netto esatto.** È una stima. La calibrazione la avvicina al reale; il disclaimer la inquadra correttamente.
- **Addizionali** dipendono da regione+comune e da un regime transitorio fino al 2028: sempre configurabili, mai assunte.
- **Parziali ovunque:** ferie/permessi a ore, non solo a giornata. È un requisito esplicito, non un extra.
- **Strato A indipendente da Strato B:** il tracciamento deve avere valore anche a motore economico spento.
- **Il manifest resta dichiarativo:** niente logica di calcolo nel manifest, solo dichiarazioni e thin-wrapper verso la REST.

---

## 8. Decisioni prese e punti ancora aperti

**Decise (da implementare così):**
1. **Retribuzione:** doppia modalità — paga oraria *oppure* stipendio mensile lordo + premio produzione fisso mensile (vedi §1.3). Il premio resta una voce separata identificabile.
2. **CCNL:** profilo configurabile, primo seed **Metalmeccanica Industria** con i valori di §1.5. Altri CCNL si aggiungono come dati, senza toccare il motore.
3. **Straordinario:** ore inseribili per singola giornata, con maggiorazione presa dal CCNL in base ai modificatori (diurno/notturno/festivo). Feature disponibile a tutti anche se l'utente non fa notti.
4. **Malattia:** per ora solo assenza tracciata (nessuna stima indennità). Progettare `EntryKind='malattia'` e il motore in modo che l'indennità sia aggiungibile in futuro senza rifattorizzare (es. hook `calcolaIndennita(kind, ...)` oggi no-op per malattia).
5. **Nome/nav:** confermato "Ore".

**Ancora aperti (non bloccano la Fase 1):**
- **Addizionali regionali/comunali:** stimarle subito (serve impostare regione + comune) o rimandarle alla Fase 4? Incidono sul netto ma richiedono i dati del tuo territorio.
- **Divisore orario:** confermare 173 per il tuo caso (è lo standard metalmeccanica, ma verifica sul cedolino).
- **Tredicesima/quattordicesima:** mostrarle come mensilità aggiuntive proiettate a fine anno o solo nella proiezione annuale?
- **Detassazione premio produzione** (imposta sostitutiva sui premi di risultato): fuori scope ora, previsto come raffinamento futuro.
