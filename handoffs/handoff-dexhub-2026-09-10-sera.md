# DexHub — Handoff unico definitivo

**Ultimo aggiornamento**: 2026-09-10, fine giornata
**Sostituisce**: la revisione del mattino dello stesso giorno e, prima di quella, i cinque handoff di
giugno/luglio. In `handoffs/` deve restare **un solo file**: questo. È l'unica fonte di verità; se una
memoria persistente lo contraddice, vince questo documento e la memoria va corretta.
**⚠️ Vive in `handoffs/`, NON nella root del repo** (la revisione del mattino sosteneva il contrario).

---

## 0. Registro della sessione 2026-09-10

Il mattino è stato un cross-check del codice reale (grep, `tsc`, `vitest`, mtime `src` vs `dist`) che
aveva prodotto una tabella di 10 divergenze. **Nove sono state chiuse nel pomeriggio**; il resto è
assorbito nelle sezioni sotto. Qui il registro di cosa è cambiato **davvero sul disco**.

| # | Lavoro | Esito |
|---|---|---|
| 1 | **IP/DHCP**: la macchina era passata a `192.168.1.8`, `.env` era fermo a `.3` (ora occupato da un altro dispositivo) | `.env` aggiornato sui 6 valori, stack ribuildato. **Le 2 passkey sono morte** col cambio di `WEBAUTHN_RP_ID` — vedi §12 |
| 2 | **Quick win** | Logo reale in sidebar, `console.log` di debug rimosso, codice morto del registry eliminato (+ il campo `enabled` di `RegisteredModule`) |
| 3 | **`cuneo_non_verificato`** | Rimosso ovunque, motore incluso (flag `warningCuneoPendingVerification`), + commento normativo stale in `fiscal-profile.ts` |
| 4 | **`trattenutaAddizionali` in UI** | Tipo client + riga condizionale in `stima-card.tsx` + label en/it |
| 5 | **Home `page.tsx`**: era un **mockup di design in produzione** (mai documentato prima) | i18n (11 chiavi en+it), 7 token `--home-*` (dark **byte-identico**, light riparato), Poppins rimosso, 2 elementi finti-cliccabili diventati `<Link>` veri. **Design invariato per scelta dell'utente** |
| 6 | **Toggle tema** Sole/Luna nella sidebar | Nuovo, solo a sidebar espansa |
| 7 | **Conguaglio — modello IRPEF** | Formula derivata dal ledger e **corretta**: `L(R_eff) − α·R_eff`. Vedi §4.14 |
| 8 | **Conguaglio — normalizzazione temporale** | Nominali **per mese** invece di scalari; la colonna deprecata `contributiInpsOverride` non è più letta da nessuno. Vedi §12 |
| 9 | **Modulo To-Do** | **Riscritto da capo** sul mockup Claude Design ritrovato a metà sessione. Vedi §5 |
| 10 | **Auto-provisioning space `Personale`** | Risolto in `listForUser()`, self-healing e create-only |

**Test motore**: da **140 a 148** (`conguaglio.test.ts` da 5 a 13). **`tsc --noEmit` pulito** su
`apps/api`, `apps/web`, `modules/worklog`. **Migration a DB: 0026** (verificata read-only).

### La lezione della giornata
Il modulo To-Do è stato lavorato **due volte con lo scopo sbagliato** (prima "Fase 0 da completare",
poi "normalizzare") perché nessuno sapeva che **esisteva già un design completo** in un artifact
Claude Design. È esattamente il fallimento che §1 prevedeva ("mockup in ASCII, non Artifact, perché
tra sessioni si perdono"). **Prima di pianificare il lavoro su un modulo, chiedere se esiste un
artifact di design**: il codice e questo documento non lo diranno. Link e istruzioni di lettura in §5.0.

### Cosa NON è stato verificato
**Nessuna verifica visiva, in tutta la giornata** — zero sessioni attive a DB, e il rientro richiede
l'emergency token. Tutto quello che sta qui sopra è deployato e typecheckato, **non visto a schermo**.
Checklist in fondo a §11.

---

## 1. Progetto, ruoli, metodo (VINCOLO FORTE)

- **Progetto**: `C:\Users\am28\Desktop\DexHub`. **NON è un repository git** — nessun commit/branch/diff, solo file su disco. Ogni piano ha gli step "commit" skippati.
- **Setup a due livelli**: Claude (architetto/reviewer) genera i prompt; l'utente li incolla in Claude Code (VS Code) che implementa. Sessioni non sincronizzate.

Regole non negoziabili:

- **Diagnosi prima del codice**: giro di sola diagnosi (zero codice) → piano diff → approvazione → implementazione. **Un diff per responsabilità.** Diagnosi via agente SEMPRE riverificata a mano.
- **Sfumatura 07-22 (attiva)**: per diff **meccanici a basso rischio** (naming, swap di un hook, rimozioni pulite) la diagnosi si incorpora nel prompt stesso ("verifica X, se anomalo fermati, altrimenti applica"). Il **metodo pieno resta obbligatorio** per: schema, migration, permessi, refactor backend, modello dati.
- **Pattern 07-21 (funziona, mantenere)**: diff multi-file spezzati in responsabilità separate (hook → consumer → presentazione) con approvazione esplicita tra l'una e l'altra.
- **PRIMA di generare qualsiasi file/decisione, CHIEDERE.** Mai generare-poi-chiedere.
- **Separare FORMA da VALORE**, mai nello stesso diff.
- **Test coi valori calcolati A MANO**, indipendenti dall'output; si asserisce l'*oracle*, doppio metodo (formula in avanti + back-solve). Divergenze si **segnalano**, non si forzano. Asserire sempre anche i **componenti**, non solo gli aggregati.
- **"Torna troppo bene → sospetta"**.
- **`tsc pulito ≠ in esecuzione`.** Verifica in PROD via endpoint reale + hard-reload (Ctrl+Shift+R) + JSON in Network.
- **Nessun tool browser/automazione in Claude Code**: ogni verifica visiva spetta all'utente, con conferma esplicita prima di dichiarare concluso un lavoro UI. Mockup UI = **blocco ASCII inline in chat**, non Artifact (problemi di persistenza tra sessioni).
- **Mai scrittura SQL diretta**: sempre via endpoint reale. SELECT read-only ok (`docker exec dexhub-postgres-1 psql`; password con `@` → usare `PGPASSWORD` env var, non l'URL). Mai fabbricare sessioni/account via SQL.
- **Bandierina gialla**: se Claude Code fa più del richiesto, salta un gate o dichiara "fatto" fermandosi al confine dei suoi strumenti → chiedere il perché.
- **Segnalare i sotto-diff aperti prima di cambiare argomento** (grep sul codice reale, non sul riepilogo conversazionale).
- **Mirror-first**: riusare un pattern esistente prima di inventare. Astrazione estratta solo alla **rule-of-three**.
- **Risposte concise**, niente pensare-a-voce-alta.
- **Il design sostituisce il design, l'architettura sostituisce l'architettura, mai il contrario.** In dubbio: preservare l'esistente e fermarsi a proporre.
- Ogni approssimazione dichiarata con la **direzione dell'errore**.
- Ogni stringa UI visibile → `en.ts` **E** `it.ts`/`i18n.ts`, sempre entrambe.

---

## 2. Ambiente, toolchain, build, migration

- **Macchina**: Windows 11 + Docker Desktop (hostname `ALEXM`). Monorepo Turbo+pnpm. Stack prod Docker `dexhub` (Caddy + nip.io): **`https://192-168-1-8.nip.io`** (dal 2026-09-10 pom.). Nessun hot-reload in prod: ogni modifica richiede rebuild.
- **IP fragile per DHCP**: storia `.4 → .3 → .6 → .3 → .8` (**quinto cambio, 09-10**). `.3` è ora occupato da un altro dispositivo, non recuperabile. `.env` oggi su `.8` (6 valori, backup del precedente in `.env.bak-2026-09-10`). **PRIMA REGOLA DI OGNI SESSIONE: confrontare `Get-NetIPAddress` con `DOMAIN` in `.env`** — l'utente l'ha azzeccato a intuito due volte, non fidarsi del valore scritto.
- **Cura definitiva mai applicata**: una **reservation DHCP** sul router (`192.168.1.1`) per `ALEXM` chiuderebbe la serie. Finché non c'è, ogni cambio IP costa un rebuild + **tutte le passkey invalidate** (l'RP ID fa parte della credenziale). Alternativa più robusta mai valutata a fondo: RP ID svincolato dall'IP (mDNS `alexm.local` o voce hosts) — tocca Caddyfile, `.env`, CA e ogni device.
- **MAI `docker compose down -v`**: brucia il volume `caddy_data` → CA rigenerata → "certificato non sicuro".

```powershell
# Node
$env:PATH = "C:\Users\am28\AppData\Local\nvm\v22.23.1;" + $env:PATH
# Test engine (i test veri vivono in modules/worklog, NON in packages/worklog-engine)
pnpm --filter=@dexhub/worklog exec vitest run
# Typecheck
cd modules\worklog; npx tsc --noEmit
cd apps\api;        npx tsc --noEmit
cd apps\web;        npx tsc --noEmit
```
```bash
# Rebuild prebuilt-dist PRIMA del rebuild Docker
pnpm --filter=@dexhub/worklog-engine build
pnpm --filter=@dexhub/db build
pnpm --filter=@dexhub/sdk build
pnpm --filter=@dexhub/ui build
# Rebuild + riavvio stack PROD (auto-migra al boot)
docker compose up -d --build api    # cambi apps/api o packages/{db,worklog-engine,sdk}
docker compose up -d --build web    # cambi anche modules/* o apps/web
```

### Vincolo build critico (prebuilt-dist)
`docker/api/Dockerfile` builda solo `@dexhub/sdk`/`@dexhub/db`/`@dexhub/api`, poi `COPY packages ./packages` copia il `dist/` **già presente su disco**. `packages/{sdk,ui,db,worklog-engine}` hanno `main: "./dist/index.js"` (prebuild `tsup`, non compilano al volo):
- `pnpm --filter=@dexhub/worklog-engine build` **SEMPRE prima** di un rebuild Docker che tocca il motore (scoperto quando un `console.log` di debug non compariva nei log: dist stale, silenzioso, nessun errore).
- `pnpm --filter=@dexhub/db build` **SEMPRE** dopo una modifica di schema.
- `@dexhub/worklog`, `@dexhub/tasks`, `@dexhub/notes` puntano a `./src` (bundlati da sorgente, nessun prebuild).
- **Dockerfile boundary**: `modules/` è escluso dal container API (intenzionale) — il backend non vede mai i manifest sorgente, solo quello che il frontend gli posta.
- Stato verificato 10/09: tutti i `dist` freschi.

### Fix TLS/HSTS (procedura da riusare)
Il blocco "certificato non sicuro" NON è la CA (volume persistito) ma **HSTS**. Fix: (1) togliere/azzerare HSTS in locale, (2) `chrome://net-internals/#hsts` → Delete domain, (3) re-importare la CA: `curl.exe http://localhost/caddy-ca.crt` + `Import-Certificate -CertStoreLocation Cert:\LocalMachine\Root`. Il Caddyfile espone `/caddy-ca.crt` apposta. `EPERM` symlink su `next build` locale (Windows) è noto e non bloccante: la build Docker Linux è il percorso reale.

### Disciplina migration
`db:generate` → diff SQL → `pnpm --filter=@dexhub/db build` → `docker compose up -d --build api` (la startup migration `apps/api/src/db/migrate.ts` applica e registra al boot). MAI SQL a mano, MAI righe in `__drizzle_migrations` a mano. Dopo ogni migration `db:generate` a vuoto deve dare "No schema changes". Per **DML puro senza diff schema** → `drizzle-kit generate --custom` (pattern usato in 0024 e 0025: journal + snapshot aggiornati da soli).

### Migration reali (stato disco 10/09 — ultima: **0025**)
| # | File | Contenuto |
|---|---|---|
| 0009 | `fuzzy_triton` | `mensilita` int default 13 su `worklog_user_fiscal_config` |
| 0010 | `neat_banshee` | 4 colonne scomposizione fissa su `worklog_retribuzione` |
| 0011 | `watery_mockingbird` | `turniStandard`+`fasceMaggiorate`; `regimeOrario` enum |
| 0012 | `chilly_korath` | `worklog_variabili_flat` |
| 0013 | `ancient_madelyne_pryor` | `worklog_cig_config`; enum kind +`cig` |
| 0014 | `big_sinister_six` | enum kind +`permesso_non_retribuito` |
| 0015 | `bouncy_blade` | `contributiInpsOverride` (poi deprecato, §4.11) |
| 0016 | `medical_earthquake` | `worklog_sindacato_config` |
| 0021 | `natural_marvel_zombies` | `worklog_addizionali_config` |
| 0022 | `clammy_clea` | `worklog_netto_reale` (PK composita userId+mese) |
| 0023 | `silly_squirrel_girl` | `user_module_preferences` + seed idempotente |
| 0024 | `delete_orphan_changelog_module_registry` | `DELETE FROM module_registry WHERE id='changelog'` |
| 0025 | `delete_task_lists` | **Fase 0 tasks**: azzeramento dati, DROP `task_lists`, DROP `tasks.list_id`/`tasks.color`/`task_space_members.last_seen_at`, reindex `idx_tasks_sort` su `(space_id,sort_order)`, backfill 1 space `Personale` per utente |

**Debito storico BENIGNO — NON toccare**: catena snapshot `meta/` salta 0001–0005 (non cancellare `0006_snapshot.json`); migration orfane 0003–0005 (DDL già nel DB, sequenza pulita verificata, documentato in `packages/db/src/migrate.ts`).

✅ **0025 CONFERMATA APPLICATA A DB** (verifica read-only 09-10 pom., Docker acceso): `to_regclass('public.task_lists')` → NULL, `SELECT count(*) FROM task_spaces WHERE type='personal'` → **4** (backfill fatto, 1 per utente). ⚠️ **La tabella è in schema `drizzle`, non `public`**: la query giusta è `SELECT id, to_timestamp(created_at/1000) FROM drizzle.__drizzle_migrations ORDER BY id DESC LIMIT 3` — e l'`id` è un **seriale**, non l'indice del journal (l'ultima riga è `id=24` applicata 2026-07-22 10:39 UTC = 12:39 locale, che **è** la 0025; lo sfasamento viene dalle migration orfane 0003–0005 mai registrate). Non allarmarsi vedendo 24.

---

## 3. Architettura DexHub (trasversale)

### 3.1 Shell e Module Registry
- Shell / Module Manifest: moduli lazy-load, manifest versionati, hook reattivo `useSlot`.
- **`lifecycle` (`active|beta|soon`)** = campo ESPLICITO del `ModuleManifest`, **ortogonale** a `status` del registry (`active|disabled|error|incompatible`, on/off admin). Mai inferito.
- **Fix registry (06/07)**: `install()` fa **upsert** — `module-bootstrapper.tsx` (in `apps/web/src/core/components/`, **non** in `core/registry/`) chiama `POST /modules` per ogni modulo bundlato a ogni avvio → sync automatico, zero nuovo endpoint. `MODULE_FACTORIES` = `[notes, tasks, worklog]`. Il Registry **non ha uninstall/reconcile** (§12).
- `module_registry` a DB contiene esattamente `notes, tasks, worklog` (riga orfana `changelog` rimossa da 0024).
- **Codice morto residuo**: `moduleRegistry.getEnabled()` / `setEnabled()` / `useRegisteredModules()` — flag locale in-memory sempre `true` al `register()`, **zero consumer** dopo lo swap della command-palette. Candidato delete in blocco.

### 3.2 Contratto Home ↔ moduli (`WidgetDefinition`)
Canale UNICO modulo → dashboard (scartato un canale dati parallelo `getSummary`).
- La dashboard possiede il **guscio** della card (icona, nome, badge, bordo, hover, span); il modulo possiede SOLO il contenuto della preview.
- Preview **opzionale e degradabile**: manca/crasha → corpo neutro, che appartiene alla dashboard.
- **Trappola nota**: `moduleRegistry` (DB) serializza il manifest → le funzioni `component` dei widget sono **morte nel JSON**. Il componente si risolve SEMPRE dal registry frontend in-memory (`apps/web/src/core/registry/module-registry.ts`, `moduleRegistry.get(id)?.manifest.widgets?.[0]?.component`), mai dal payload API. `moduleId` = chiave di join.
- `ModuleSummary`/primitive SDK **NON introdotte** (rule-of-two sulle preview reali).
- Componenti: `apps/web/src/app/(hub)/home/_components/{lazy-mount, module-badge, module-card, neutral-body, widget-error-boundary}.tsx`.
- **Widget esistenti oggi**: `worklog` (`worklog-summary.tsx`), `notes` (`recent-notes.tsx`). **`tasks` non ha `widgets[]`** — unico dei 3.

### 3.3 Abilitazione moduli — due livelli ortogonali
1. **Globale/admin**: `module_registry.status` (`active|disabled|error|incompatible`), endpoint `POST /modules/:id/{enable,disable}` gated `AdminGuard`, UI `/settings/administration/modules`.
2. **Per-utente**: tabella `user_module_preferences` (PK composita `userId+moduleId`, FK cascade a `users.id` e `module_registry.id`, `enabled boolean default true`), endpoint `/me/modules` (`GET` + `PUT /:id` upsert, `userId` sempre da `@CurrentUser()`, mai un parametro; valida che il modulo esista e sia `active` → 404/409). UI catalogo `/modules`.

**Hook (`apps/web/src/core/hooks/use-modules.ts`) — unica fonte delle regole:**
| Hook | Contratto |
|---|---|
| `useModules()` | tutti i moduli, tutti gli status. `refetchOnWindowFocus:true, staleTime:0` (eccezione locale, default globali del `QueryClient` invariati) per propagare un disable fatto da un altro admin senza refresh manuale |
| `useMyModulePreferences()` | preferenze dell'utente corrente |
| `useSetModulePreference()` | `PUT /me/modules/:id` → invalida `['me','modules']` |
| `useSetModuleStatus()` | `POST /modules/:id/:action` → invalida solo `['modules']` |
| `useVisibleModules()` | **fonte neutra**: TUTTI i moduli reali con `maintenance = status!=='active'` e `enabled` (preferenza). **Zero filtro** — le regole di visibilità vivono nei consumer |
| `useModuleMaintenance(id)` | helper puro su `useVisibleModules`; id inesistente → `maintenance:false` (non trasforma "non esiste" in "in manutenzione") |
| `useActiveModules()` | "solo utilizzabili" = `status==='active'` **AND** preferenza `enabled===true` (assenza riga = escluso, opt-in non opt-out) |

**Predicato dei consumer di `useVisibleModules()`**: sidebar / Home / command-palette filtrano `enabled===true` (Home e palette anche `&& !maintenance` dove serve). Verificato che la sidebar — unico consumer persistente cross-navigazione — non rimonta dentro `(hub)/layout.tsx`, quindi nessun refetch-spam.

### 3.4 Arco "Manutenzione moduli" (chiuso 07-21) — 4 superfici coerenti
Quando l'admin disabilita globalmente un modulo, non sparisce silenziosamente: appare **in manutenzione**, e il contenuto operativo **non monta mai**.
- **Catalogo** (`/modules`): mostra tutti i moduli reali. TOTALI = tutti, ATTIVI = `enabled && !maintenance`. Filtri Attivi/Disponibili escludono maintenance (visibile solo in "Tutti"). Badge "Manutenzione" (`--warning`) ha precedenza; switch **inerte** (`checked` = preferenza reale, `disabled` — non mente, non scrive, non offre un'azione che il backend rifiuterebbe con 409).
- **Sidebar**: voce visibile ma `<span aria-disabled>` (non `<Link>`, zero navigazione), `opacity-60`, `NavDot` colore `--warning`. La guardia di visibilità della sezione conta i soli `enabled` (bug intercettato durante il diff: contava tutti i moduli reali, avrebbe mostrato la sezione vuota).
- **Route piena** (`[module]/[[...path]]/module-renderer.tsx`): guardia `useModuleMaintenance` **in testa, prima della risoluzione route** → `isLoading` riusa lo stato esistente, `maintenance` → stato inline (`text-warning`, chiave `moduleRenderer.maintenance`); il `LazyComponent` monta solo dopo `maintenance===false`. Contenuto operativo **opt-in**, zero flash.
- **Home**: branch a tre vie sul contenuto, guscio `ModuleCard` invariato in tutti i casi; `maintenance` → `<NeutralBody variant="maintenance"/>`, nessun `LazyMount`, nessun `import()` dinamico scatta. `ModuleBadge` accetta `maintenance?` e corto-circuita **prima** della logica lifecycle (token `--warning`/`bg-warning-muted`, gli stessi di `beta`). `moduleCount` conta `enabled && !maintenance` (secondo bug intercettato: contava tutti gli `enabled`).
- **Command-palette**: `useVisibleModules()` filtrato `enabled && !maintenance`, stessa fonte/predicato di sidebar e Home. `icon`/`commands` letti dal blob `manifest` (untyped) con cast espliciti (`CommandDefinition[]`) — il blob DB è validato da zod all'`install()`, nessun campo perso.
- **Due punti di mount distinti** (non un chokepoint unico): `ModuleRenderer` (route piena, monta "a scatola chiusa", nessuna nozione di status) e `LazyMount` (dumb, chiamato da `home/page.tsx` che già possiede `maintenance` per elemento). Condividono solo la fonte dati.
- **Chiavi i18n**: `modules.badgeMaintenance` (namespace `t.modules`) e `dashboard.badgeMaintenance`/`dashboard.previewMaintenance` sono **due chiavi distinte per vincolo di tipo** (`ModuleBadge` legge solo `t.dashboard.*`), non una duplicazione da ripulire.

### 3.5 RBAC (esiste già — non ricostruirlo)
- **Auth**: session-cookie Better Auth → `AuthGuard` globale (`apps/api/src/auth/auth.guard.ts`, `APP_GUARD`) su ogni rotta salvo `@Public()`. `req.session = {user, session}`; `userId = req.session.user.id`.
- **Autz**: colonna `users.isAdmin` (`packages/db/src/schema/core/users.ts`, default false alla signup) + `AdminGuard` (`apps/api/src/common/guards/admin.guard.ts`, 403 se non admin). Pattern house-style: `@UseGuards(AdminGuard)` per-controller o per-metodo + `@Audit`; template quasi-identico = `RegistryController`.
- **Frontend**: `GET /api/v1/users/me` → `useMe()` (`core/hooks/use-me.ts`) espone `isAdmin`.
- **Gate admin centralizzato (07-22)**: `apps/web/src/app/(hub)/settings/administration/layout.tsx` — **primo layout client del progetto**. `useMe()` + `useEffect` → `router.replace('/home')` per non-admin; stato di loading inline (mirror `module-renderer.tsx`) mentre `meLoading||!isAdmin`; mai un frame delle pagine admin per un non-admin. Il gate duplicato è stato rimosso dalle 6 pagine (`users/page.tsx` conserva `useMe()` solo per `me?.id`).
- **Query admin-gated**: `useInviteRequests`, `useFeedbackCounts`, `useAdminUsers`, `useAdminSecuritySettings`, `useAdminFeedback` chiamano `useMe()` internamente + `enabled:!!me?.isAdmin`. (`useAdminUserPasskeys`/`useGetRecoveryCode` hanno già un `enabled` proprio legato a `userId` e vivono in modali a valle: non toccati.)
- **DA IGNORARE**: tabelle `roles/permissions/role_permissions/user_roles` esistono ma sono **morte** (popolate solo da install-modulo, nessun guard le legge; `GET /permissions/me` è uno stub). Se servirà RBAC granulare oltre il boolean, lo schema c'è ma va wired da zero.

### 3.6 Regola React #310 (hook order) — pattern da non ripetere
Hook chiamati **dopo** un early return condizionale (`if(meLoading)return null; if(!me?.isAdmin)return null;`) → quando `useMe()` passa loading→resolved (o un refetch ribalta `isAdmin`) il conteggio hook cambia tra render della stessa istanza montata → violazione Rules of Hooks → **React error #310 in produzione**. Scansionate e fixate 07-21 tutte le 6 pagine `settings/administration/**`: `users`, `invite-requests`, `security` erano buggate (5/5/6 hook spostati sopra i return — **puro riordino**, nessun hook aggiunto o rimosso, nessuna dipendenza da `me` nei hook spostati); `modules`, `feedback`, `page.tsx` erano già pulite. Oggi il problema è strutturalmente attenuato dal layout gate (§3.5), ma **il pattern va evitato ovunque**: tutti gli hook prima di ogni return.

### 3.7 Design system
- **Accent unico: teal** `#33C9B4` = `hsl(172 60% 49%)`, derivato dal brand mark. `--primary`/`--primary-hover`/`--primary-muted`/`--primary-foreground` in `globals.css` (dark+light). `--primary-foreground` **scuro** in entrambi i temi: fix contrasto AA reale (`text-white` su `bg-primary` faceva ~2.07:1 — ~19 occorrenze hardcoded sostituite col token, `packages/ui/src/components/button.tsx` incluso).
- Regola di casa: **token del tema, no hex** (eccezione voluta solo su landing/login, §9). Icone Lucide named-import.
- Token `--overlay-subtle` (dark `hsl(0 0% 100% / 0.035)`, light `hsl(0 0% 0% / 0.035)` — **alpha su colore opposto, non un'inversione**), esposto in `@theme inline` → `bg-overlay-subtle`. Cablato nelle 3 ex-occorrenze di `bg-white/[0.035]` (`recent-notes.tsx:32`, `worklog-summary.tsx:79,83`). Zero drift visivo dark, light ora ha un overlay reale invece di bianco-su-bianco.
- Font app autenticata e landing: **Geist Sans + Geist Mono** self-hosted, zero richieste esterne.
- `kind-colors.ts` = sorgente unica dei colori kind worklog (§6).

---

## 4. Worklog / Cartellino — motore economico

### 4.1 Stato
**Motore calibrato**: stima aprile 2026 = **1.558,08 €** vs busta 1.560,20 → residuo **−2,12** = drift imponibile noto e dichiarato. Tutte le componenti della busta sono modellate. Fase 3 e Fase 4 (calibrazione) chiuse salvo il coefficiente solidarietà (unico parametro ancora empirico). **140 test motore verdi** — riverificato 10/09: `stima.test.ts` 122 + `addizionali.test.ts` 6 + `retribuzione-fissa.test.ts` 7 + `conguaglio.test.ts` 5.

**Discrepanze numeriche**: si usa sempre l'oracle finale (netto aprile **1.558,08**, residuo −2,12). I valori intermedi delle sessioni di calibrazione (1616,59 · 1581,65 · 1558,85 ecc.) erano step, NON vanno riconciliati né riportati.

### 4.2 Impianto: pipeline e separazione
- **Motore = funzione pura** (`packages/worklog-engine/src/stima.ts`): input → output, zero I/O, testabile con oracle a mano. Chi legge il DB è il **resolver** (`apps/api/src/modules/worklog/services/stima.resolver.ts` + `conguaglio.resolver.ts`). Mai fondere i due. Il motore è "cieco": riceve numeri pre-azzerati/pre-risolti, non conosce config/iscrizioni/gate.
- **Pipeline a 10 stadi** con funzioni pure per stadio (`computeComponentiVariabili`, `computeLordoMese`, `computeContributiInps`, `computeImponibileFiscale`, `computeRalAnnuo`, `computeIrpefAnnua`, `computeIrpefMensile`, `computeNetto`, …) + orchestratore `stimaBustaPaga`. **NB**: `packages/worklog-engine` ha **zero test propri**; i test veri sono in `modules/worklog/src/engine/`.
- **`StimaInput`**: `retribuzioneFissaComponenti, mensilita, giorniPagatiEffettivi, giorniLavorabiliMese, tariffaOraria, ore, entriesOrdinarieMaggiorate, turniStandard, fasceMaggiorate, maggiorazioni, contributiInpsRate, scaglioni, detrazioniLavoro, trattamentoIntegrativo, giorniFerialiMese, oreCig, orePermessoNonRetribuito, divisoreOrario, minimoTabellareReale, coefficienteSindacale, + config trattenute`. Campo nuovo in `StimaInput` = required + valore esplicito su TUTTI i fixture (mai default implicito).
- Spec: `docs/modulo-worklog-spec.md`.

### 4.3 Retribuzione fissa e storico
- `retribuzioneFissaMensile` = **minimoTabellare + superminimo + scattiAnzianita + premioProduzioneFisso** (`computeRetribuzioneFissaMensile`, somma pura, `stima.ts:258`).
- UI "Storico retribuzione": label **"Retribuzione di fatto"** (termine di busta), **4 componenti obbligatori** con **quadratura bloccante ±0,01** al salvataggio — validazione zod `superRefine` su POST e PUT (`worklog.controller.ts`): componenti mancanti → 400; somma ≠ importo → 400 con messaggio `"La somma dei componenti (X) non corrisponde alla retribuzione di fatto (Y)"`. `premioFisso` legacy e campo nota rimossi dal form (colonna/ramo intatti per compat, zero righe reali li usano).
- **Canale pulito `minimoTabellareReale`** (il punto architetturale più delicato): `resolveRetribuzioneFissaComponenti` espone `componentiDichiarati: boolean`; il resolver passa al motore `minimoTabellareReale: number | null`, valorizzato SOLO se dichiarati. **MAI leggere `componenti.minimoTabellare` per calcoli su base minimo**: su righe legacy/orarie contiene un bucket sintetico contaminato = l'INTERO importo travestito da minimo (usarlo darebbe 1% del bucket = bug ~22€, evitato esplicitamente). Vale in **ENTRAMBI** i resolver (stima e conguaglio). Base di: CGIL, Cometa.
- **Degradazione ad avviso**: qualsiasi feature che richiede `minimoTabellare` quando manca → warning, non crash, nessun backfill forzato.
- **Righe versionate per decorrenza**; le stime sono **viste derivate** (ricalcolate al volo, MAX decorrenza ≤ mese target). **Edit = correzione in-place** (`PUT retribuzione/:id`, mirror `templates-panel`, scoping `and(eq(id),eq(userId))` → `NotFoundException`): "riga sbagliata era sbagliata anche per i mesi passati → ricalcolo retroattivo corretto". `decorrenza` **immutabile** (esclusa dal `.set()` server-side; `disabled` in UI; per un cambio effettivo si crea una nuova decorrenza). L'update invalida `retribuzione()` + `['worklog','stima']` + `conguaglioRaw()`. Due stati-limite coperti in `retribuzione-panel.tsx`: delete della riga in editing → `cancelEdit()` auto; switch Pencil A→B → `startEdit()` sovrascrive.
- **Autocomplete componenti** (`component-autocomplete.tsx`): tendina custom token-based sui 4 campi, suggerisce i valori distinti già salvati per campo (dedup a 2 decimali, sorgente `useRetribuzione` in memoria). Pattern catcher scoped (`fixed inset-0` locale + Esc scoped, **niente onBlur**, niente navigazione tastiera v1) per convivere con la modale.

### 4.4 RAL, divisore, maturazione, gate
- `RAL_teorico` (= `ralLordo`) = `retribuzioneFissaMensile × mensilità` (13/14, **per-utente** in `worklog_user_fiscal_config`, default 13). L'utente inserisce il mensile, non il RAL.
- **Divisore orario 173** = proprietà del CCNLProfile (`ccnl.divisoreOrario`, Metalmeccanici Industria, stampato in busta). Tariffa oraria **unica** per lordo base e straordinario.
- **Maturato pro-quota su giorni**: `fissa_maturata = fissaMensile × giorniPagatiEffettivi / giorniLavorabiliMese` (`computeFissaMaturata`). `giorniPagatiEffettivi` = `max(kind%)` per giorno (max-wins, mai doppio conteggio). Mese pieno = mensile esatto.
- **Gate progressivo (nel resolver, il motore non lo conosce)**: mese passato completo → stima piena; mese in corso → giorni futuri = 0 (**maturato progressivo reale**), warning `mese_parziale`; giorno lavorabile PASSATO non compilato → blocker `buco_mese` (zero numeri); "oggi" trattato come futuro.

### 4.5 Kind, percentuali, festivi
- `KIND_PERC` (nel resolver): `work / vacation / leave / sick / holiday / cig / permesso_non_retribuito = 1.0`; `overtime = 0`. `sick` a 100% è semplificazione dichiarata (warning `malattia_stimata`).
- `rest`/`recovery` **eliminati** (nessun caso reale: i riposi cadono su sab/dom già non lavorativi). Strada "valori morti": l'enum Postgres conserva i valori inerti (no `DROP VALUE`), `EntryKind` server = `Exclude<..., 'rest'|'recovery'>`, rimossi da codice/UI/i18n, zero migration. `row.kind` da Drizzle ha ancora il tipo pieno → cast esplicito commentato in `stima.resolver.ts`.
- **Festivi pre-popolati** solo se cadono **lun–ven** (filtro `dow>=1 && dow<=5`, Mon-Fri hardcoded come il motore, non il `workdays` configurabile): effect in `worklog-page.tsx` → endpoint dedicato `POST /worklog/days/ensure-holiday` → `ensureHolidayDay()` con `INSERT ... ON CONFLICT DO NOTHING` (**create-only** atomico: riga esistente, attiva o cestinata, mai toccata). **Invariante di sistema: le operazioni automatiche non modificano MAI dati esistenti — solo l'utente lo fa intenzionalmente.** `upsertDay` resta la via manuale (de-cestina intenzionalmente). Nota storica: prima del create-only, un festivo auto su un giorno cestinato lo de-cestinava E cancellava le entry originali (bug serio, fixato).

### 4.6 Fasce orarie e maggiorazioni
- **Motore a fasce**: `computeOreInFascia` puro (minuti 0–1439, wrap mezzanotte per scomposizione segmenti). CCNLProfile: `turniStandard` (inizi 06/14/22, durata da inizi consecutivi) + `fasceMaggiorate` **separate** (18–22 e 22–06, entrambe **0,20**) — un turno CONTIENE una fascia, non coincide. Turno pomeridiano → solo 4h (18–22) maggiorate.
- Maggiorazioni **markup-only** (la base è già nel fisso via pro-quota giorni), confluiscono nel lordo del mese.
- **Precedenza per entry**: orario esplicito `{orarioInizio/orarioFine}` ("HH:MM" in `EntryModifiers` jsonb, wrap notturno ammesso, un solo campo = assente) > flag turno standard (notturno/pomeridiano mutuamente esclusivi, `EntryOrdinariaInput` union discriminata) > niente. Gate di consistenza: 14–22 esplicito ≡ flag pomeridiano.
- Blocker `no_turni_config` se servono fasce senza config. Le vecchie voci in `maggiorazioni` (`notturnoOrdinarioInTurno` 0.15 / `pomeridianoInTurno` 0.065) sono **morte**: fonte attiva unica = `fasceMaggiorate`.
- `regimeOrario` (`giornaliero|turnista`, per-utente su `worklog_contract`): dato grezzo, **wiring DTO/UI ancora aperto** (giornaliero = 8h piene, pausa non rappresentata in v1).

### 4.7 CIG / solidarietà (validato su buste reali)
- **Storno CIG** = `ore_cig × (fissaMensile ÷ (giorniFerialiMese × 8))` (`computeStornoCig`). Divisore **dinamico mese-specifico**, giorni feriali lun–ven **festività INCLUSE** (`getFerialiCount()` nel resolver) — distinto da `giorniLavorabiliMese` (netto festività) della pro-quota. La Pasquetta ha rivelato i due divisori distinti (aprile: 22 feriali per lo storno, 21 lavorabili per la fissa).
- **Integrazione solidarietà** = `storno × coefficiente` (config, **0,596 empirico** stabile su 2 mesi — NON l'80% da manuale: la formula strutturale richiede %-accordo × 80% al netto 5,84% + massimale INPS, parametri dell'accordo aziendale non disponibili). Warning `integrazione_solidarieta_stimata` attivo finché il valore resta stimato.
- **Split imponibili INPS ≠ IRPEF** (corretto DOPO il dato reale di aprile — la prima versione usava `lordo+integrazione` come base unica, smentita dai numeri): `imponibileInps = lordo` (integrazione FUORI dall'INPS); base IRPEF mensile include l'integrazione **intera** (nessun 5,84%).
- **Strada A** (rispecchia la busta riga per riga): il giorno CIG matura la fissa PIENA (`KIND_PERC.cig = 1.0`), lo storno è componente negativa separata a valle; l'integrazione entra nel netto e nella base IRPEF, mai nel lordo (per questo su un mese CIG "Netto > Lordo" è **corretto**, non un bug).
- **Pool-ore CIG per-entry** (pattern overtime): oggi giorni interi, regge il misto futuro (6 lavoro + 2 CIG). Giorno misto work+cig ortogonale per costruzione (giorno-livello max% vs ora-livello somma).
- Config: tabella dedicata `worklog_cig_config` (single-row/user, coefficiente default 0,596, `massimaleMensile` predisposto ma non letto in v1) — la solidarietà è stato aziendale, NON regola CCNL. Blocker **condizionale all'uso** `no_cig_config` (solo se `oreCig > 0` senza config).

### 4.8 Permesso non retribuito
- **Pool-ore a 0%** (`computeStornoPermesso`, pattern CIG), storno a valle: `ore × (fissaMensile / 173)` — divisore **173 FISSO** via `StimaInput.divisoreOrario` esplicito (≠ divisore CIG dinamico; NON derivabile da `tariffaOraria` che nel ramo hourly non è 173-based). `KIND_PERC.permesso_non_retribuito = 1.0` (NON 0: la fissa la toglie una volta sola il pool, altrimenti doppia penalizzazione sul giorno di solo-permesso).
- Fiscalità simmetrica allo storno CIG: riduce lordo → INPS e IRPEF; niente integrazione; `RAL_teorico` intatto. Può **coesistere** con la CIG sullo stesso giorno (due storni separati coi rispettivi divisori).
- Colore kind: **ciano** (token `--cyan`, in `globals.css` dark+light+`@theme inline`). Enum via `ALTER TYPE ADD VALUE` (0014).

### 4.9 Flat variabili
- Tabella `worklog_variabili_flat` (userId FK, mese `YYYY-MM`, tipo varchar validato TS, importo ≥ 0, note; multi-riga per mese, il resolver somma). Migration 0012. Tipi: `premio_produzione_feriale`, `premio_produzione_variabile` (one-off attribuiti a un mese; la cadenza è etichetta, non ramo di calcolo). Meccanismo flat **UNICO**.
- Fiscalità: il flat entra nel lordo/imponibile **del mese** (base unica IRPEF, §4.10); **NON entra in `RAL_teorico`**, NON tocca `retribuzioneFissaMensile`. Il conguaglio lo eredita da sé via `imponibileIrpefMensile`.
- Distinzione a 3 casi confermata dalla busta: Premio Produzione **mensile ricorrente** = FISSO dentro `retribuzioneFissaMensile` (`premioProduzioneFisso`); Premio Feriale e Premio Variabile = FLAT.
- CRUD completo + UI `variabili-flat-panel.tsx` (create+list+delete; edit = cancella+ricrea).
- Nota fiscale aperta: sul premio feriale di maggio la busta mostra un evento (conguaglio/detassazione, +35,24 di lorda) **fuori scope** — da isolare se/quando si toccano i premi.

### 4.10 IRPEF — modello mensile FINALE (riconciliato al centesimo)
Il modello precedente (split ordinario/extra: `imponibileOrd` a media netta, `imponibileExtra` = straordinario+integrazione+flat a marginale piena senza detrazioni) sotto-accreditava ~112€/mese ed è stato **rimosso come artefatto** (il bucket extra non vedeva mai le detrazioni). Codice morto eliminato: `imponibileOrd`, `imponibileExtra`, `inpsOrd`, `inpsExtra`, `lordoOrdinarioNetStorno`.

```
imponibileIrpefMensile = base unica (integrazione inclusa, Cometa dedotta, NO split)  [Stadio 7]
aliquotaMediaLorda     = irpefLordaAnnua / imponibileIrpefAnnuo   (solo progressività, NO detrazioni dentro)
irpefLordaMensile      = imponibileIrpefMensile × aliquotaMediaLorda
detrazioniMensili      = (detrazioniArt13 + beneficioCuneo) / 12   (/12 ESPLICITO, non /mensilità=13)
irpefNettaMensile      = max(0, irpefLordaMensile − detrazioniMensili)
```
Decisioni fissate:
- **Aliquota media LORDA** (non marginale secca): replica la progressività della busta, robusta se il RAL supererà uno scaglione.
- **`/12` esplicito**: le detrazioni si spalmano sui 12 mesi ordinari (la tredicesima ha detrazioni sue). Unico punto del motore dove 12 è giusto e `mensilità` sbagliato — commentato nel codice.
- **Clamp incapienza a 0** (`Math.max(0, ...)`): su mesi parziali le detrazioni flat superano la lorda; il clamp **non simula** il conguaglio del sostituto — semplificazione dichiarata (trovata su TC-B pre-clamp −58,04 e TC-NEW-3 −23,65).
- **Divergenza dichiarata sui mesi transitori** (±decine di €): il datore ricalcola il reddito presunto mese per mese (conguaglio in itinere; marzo anomalo per conguaglio malattia); DexHub usa **RAL teorico costante**. È stima, non conguaglio. Aprile (mese calibrato) torna al centesimo.
- `computeIrpefMensile` **esportata** (era privata), firma `(imponibileIrpefMensile, imponibileIrpefAnnuo, irpefLordaAnnua, detrazioniArt13, beneficioCuneo)`.
- `imponibileIrpefAnnuo` = base per scaglioni/detrazioni/cuneo/conguaglio = RAL lordo − INPS annuo teorico − Cometa annua. `ralLordo` (29.236,61) esposto a parte in UI (`computeRalAnnuo` ritorna `{ralLordo, imponibileIrpefAnnuo}`).

**Parametri normativi 2026 confermati via ricerca (non da memoria):**
- Scaglioni **[23% / 33% / 43%]** (L.199/2025) — già nel seed.
- art.13 fascia 15.001–28.000: `1.910 + 1.190 × (28.000 − R)/13.000`; **maggiorazione +65€/anno** fascia 25–35k GIÀ inclusa in `detrazioniArt13` (2.143,99 = 2.079 + 65).
- **Cuneo/ulteriore detrazione L.207/2024** (strutturale L.199/2025): `beneficioCuneo` tier2 = **1.000€ flat** fascia 20.001–32.000 (azzera a 40k). **È GIÀ l'ulteriore detrazione**: `computeCuneo`/`beneficioCuneo` in `stima.ts` la implementa già (tier1 redditi ≤20k, tier2 20-32k lineare a scendere fino a 40k) — NON è il vecchio esonero contributivo IVS 2024, non manca nulla. **Non reimplementarla** (rischio doppio conteggio +1.000€; il nome non lo segnala).
- Warning rinominato `'detrazioni_forfettizzate'` → `'detrazioni_stimate_ral_teorico'` (tutti e 6 i punti, union type esaustive). Il booleano interno `warningDetrazioniForfettizzate` NON rinominato (interno, non user-facing). Commento normativo stale in `packages/db/src/schema/worklog/fiscal-profile.ts:49` da correggere.
- Il warning `cuneo_non_verificato` **è stato rimosso il 09-10 pom.** (motore, resolver, service, tipo client, card, i18n en+it) insieme al flag `warningCuneoPendingVerification`. Commento normativo stale in `fiscal-profile.ts` corretto nella stessa passata.

### 4.11 INPS
- **9,49% = 9,19% IVS/FPLD (universale) + 0,30% contributo ordinario di finanziamento CIGS** a carico lavoratore (azienda in campo CIGS: >15 dip., industria). **Confermato STRUTTURALE** su busta non-CIG (nov 2025, stesso datore): dovuto sempre. (Busta 2023 di agenzia al 9,19% non comparabile — datore diverso.)
- Il 9,19% vive in `worklog_fiscal_profile` (tabella **globale per anno fiscale**, non per-utente — commento `fiscal-profile.ts:63-79`): un bump del seed l'avrebbe applicato a TUTTI. Soluzione: **override per-utente additivo** — `computeContributiInpsRate(contributiBase, oreCig)` in `stima.resolver.ts` con costante `CIGS_LAVORATORE_RATE=0.003`. La colonna `contributiInpsOverride` (0015) resta in DB ma **deprecata/non più letta** dal resolver mensile; il pannello fiscale mostra un solo campo % con hint sulla composizione.
- **INPS gira sul lordo pieno, PRIMA di Cometa** (la deduzione morde solo la base IRPEF a valle) — non toccare.

### 4.12 Cometa (previdenza complementare)
- Si deduce **SOLO la quota lavoratore**: `coefficiente (config, reale 1,2%) × minimoTabellareReale` = **23,71/mese**, costante, flat anche nei mesi CIG. La voce busta "oneri deducibili 67,17" = 23,71 lavoratore + 43,46 azienda: **la quota azienda NON va sottratta** (fuori dalla base imponibile del dipendente, art. 51 TUIR; informativa). Contrib. TFR al fondo: tassazione separata, **fuori scope**.
- La deduzione abbassa la base IRPEF in **due punti coerenti**: mensile (base unica già Cometa-inclusa) e annuo (`computeRalAnnuo`: `imponibileIrpefAnnuo −= computeCometaAnnuo(...)`; `ralLordo` intatto). Cascata automatica su aliquota media/scaglioni/art.13/cuneo/conguaglio.
- **Annuo ×13** (Cometa si applica alla tredicesima — incognita chiusa): `computeCometaAnnuo(coeff, base, mensilità) = min(coeff × minimoTabellareReale × mensilità, 5164.57)` — helper condiviso, tetto 5.164,57 in un solo posto (a ~308/anno non morde mai; assicurazione per contribuzioni volontarie future).
- **Conguaglio wired in due punti** (formule diverse; `conguaglio.ts` importa `computeCometaMensile`/`computeCometaAnnuo`/`marginalRate`, mai `computeIrpefMensile`): sottrazione **mensile** sull'imponibile nominale netto + sottrazione **annua** su `ralTeoricoImponibile`. Prerequisito: `resolveRetribuzioneFissaComponentiPerConguaglio` esteso con `componentiDichiarati`. La funzione duplicata resta duplicata **di proposito** (`ponytail:`, refactor a sé).
- Config `worklog_cometa_config` single-row/user mirror sindacato: `iscritto` + `coefficiente` (**nessun default 1,2%, nessun placeholder** — lo compila l'utente).
- Output: `StimaOutput.cometaDeducibile` (mensile), riga **informativa** nel blocco parametri, FUORI dalla somma del netto (è deducibile, non trattenuta netta). Niente `cometaDeducibileAnnuo` (YAGNI).

### 4.13 Trattenute nette a Stadio 10 (a valle delle imposte, zero effetto sugli imponibili)
Pattern comune "mirror Strada A": componente negativa dopo IRPEF, config single-row/user, query resolver **sempre eseguita** (riga assente ⇒ non attivo — la config è l'evidenza d'uso, nessun blocker).

- **CGIL / trattenuta sindacale**: `computeTrattenutaSindacale` = `coefficiente (default 1%) × minimoTabellareReale` = 19,76. Quota associativa **piatta** (NON pro-quotata su giorni/CIG: feb = apr = 19,76). Le quote sindacali dei dipendenti privati NON sono deducibili. Config `worklog_sindacato_config` (0016: `iscritto`, `coefficiente` numeric(5,4) 0–1 check, `nome` text nullable **normalizzato `'' → null`** per non rompere il fallback label). Motore: 0 se base null + `warningTrattenutaSindacaleNonDisponibile` (iscritto ma componenti non dichiarati → trattenuta 0, warning, **MAI fallback sul bucket** — provato da TC-N). Gating pre-motore `coefficienteSindacale = iscritto ? coefficiente : 0`. Label `sindacatoNome` viaggia su `StimaResponseData` (fuori da `StimaOutput`); card: riga condizionale `sindacatoNome ?? default`.
- **Mensa**: `numeroPasti × importo` (config `worklog_mensa_config`: `attivo`, `importo` default 0,77 = CORRISPETTIVO PASTI). Pasti **auto-derivati dalla presenza** (`deriveMeal`: almeno una entry `work`/`overtime` nel giorno; solo-CIG/solo-permesso/ferie/malattia/festivo → no) sui giorni registrati rispettando il gate, con **override manuale tri-state** per giorno: `worklog_days.mealOverride` (`null=auto | true=forza | false=escludi`) — lo scarto di 1 pasto in aprile (13 auto vs 12 busta) è la ragion d'essere dell'override. UI: tri-state nel day-modal, icona cibo su cella solo per giorni registrati, stat pasti nel riepilogo.
- **Addizionali regionali/comunali A.P.** (Fase 4B, completa): in busta sono **rate sull'Anno Precedente** (RATA REGIONALE A.P. 37,38 + RATA COMUNALE A.P. 14,72 + ACCONTO COMUNALE 6,41 = **58,51/mese**), calcolate sull'anno chiuso → DexHub non ha i dati 2025, quindi **NON si calcolano: si configurano** (Strada A). Config `worklog_addizionali_config` (0021, single-row/user, flag `attivo` unico + **tre importi separati** ≥ 0, zero rateizzazione: già mensili; residuo "Res:" **ignorato**, `ponytail:` per Fase 5). Sottrazione a Stadio 10 (`stima.ts:379`, il netto sottrae `− trattenutaSindacale − trattenutaMensa − trattenutaAddizionali`), TC-ADD a mano (1674,46 − 58,51 = 1615,95). Resolver mirror mensa (`attivo ? importi : 0`). Config reale attivata **via PUT** (mai SQL). UI: `addizionali-config-panel.tsx`, icona `Receipt`. **Debito aperto**: `trattenutaAddizionali` **non è nel tipo client** né ha riga in `stima-card.tsx` — la deduzione funziona (netto corretto), la riga è invisibile (§0 #6, §11 p.4).
- **NB canale distinto** — `packages/worklog-engine/src/addizionali.ts` (nato in una sessione ChatGPT): **seme della Fase 5** (canale *previsionale*: calcola le addizionali sull'anno corrente stimato per l'anno prossimo). Esposto in `StimaResolution.addizionali` (`AddizionaliAnnuali`: `regionalAmountAnnual`/`municipalAmountAnnual`/`source`) **puramente informativo, MAI sottratto dal netto**. `previousYearSnapshot`/`FINAL_PREVIOUS_YEAR` = ramo morto scaffolding (`determineTaxDataSource` oggi è identità). Legge l'imponibile post-Cometa (corretto). Da non confondere con la trattenuta reale 4B.

### 4.14 Conguaglio (proiezione anno corrente)
- `conguaglio.ts`, `stimaConguaglio()` pura, **delta-based**. ⚠️ **MODELLO RIVISTO 2026-09-10** (era rimasto quello del vecchio split ordinario/extra):
  ```
  trattenuto nell'anno = α · R_eff − D      ← stima.ts trattiene imponibile × aliquotaMediaLorda
  dovuto a fine anno   = L(R_eff) − D
  D si semplifica (ancorata al RAL teorico in entrambi)  ⇒  conguaglio = L(R_eff) − α · R_eff
  ```
  con `α = L(R_teo)/R_teo` e `R_eff = R_teo + deltaAnnuo`. **Il delta non è un fattore moltiplicativo**: entra solo dentro `R_eff`. La formula precedente `deltaAnnuo × (marginaleEff − marginaleTeorico)` presupponeva una trattenuta mensile al **marginale** — vera fino al modello ordinario/extra, **falsa dal modello "busta"** (§4.10, base unica × aliquota media). Sbagliava in due modi, entrambi dimostrati con TC calcolati a mano: applicava l'aliquota alta a TUTTO il delta anche quando solo una parte supera lo scaglione (**TC-G: dava 170, il vero è 100**), e dava **0** ogni volta che il marginale non cambiava, ignorando il divario media/marginale (**TC-H: dava 0, il vero è 107,69**). `computeIrpefLorda` è stata **esportata** da `stima.ts` (era privata, stesso trattamento già dato a `computeIrpefMensile`). `marginaleTeorico`/`marginaleEffettivo` restano nell'output come contesto per la card, ma **non entrano più nel calcolo**.
  **Perché non si era mai visto**: l'imponibile IRPEF annuo reale (~26.154 €) sta **sotto i 28.000** → un solo scaglione → aliquota media = marginale = 23% → entrambe le formule danno 0. Il difetto si manifesta solo superando la soglia.
  **Confini dichiarati** (scritti nell'header del file, con la direzione dell'errore): detrazioni ancorate al RAL teorico → il sostituto le ricalcola su `R_eff` e l'art.13 cala col reddito → conguaglio reale **più grande**, quindi **sottostima**; clamp incapienza mensile scattato → **sovrastima**; tredicesima → la derivazione regge assumendo che la 13ª sia trattenuta ad `α` sul nominale.
  **Test: 8** (erano 5). TC-B/C/D **ricalcolati a mano** col nuovo modello (720→517,17 · 600→397,17 · 1440→1237,17), TC-A/E invariati a 0 (regressione), TC-F/G/H nuovi. Totale motore **143**. Card `conguaglio-section.tsx` importa il motore direttamente (Strada A: una sola implementazione per test e runtime).
- Endpoint `GET /worklog/stima/conguaglio-raw` **senza `?month`**, ancorato a **OGGI** (data server reale) → stesso valore su ogni mese, query-key senza mese. Tre requisiti mese-valido: non-futuro, completo (`buco_mese`→skip), retribuzione vigente. Mese in corso incluso pro-quota (riusa il gate di `resolveStima`). Nessuna proiezione futuri (`mesiFuturi` sempre 0 lato client; il motore supporta ancora il parametro). Stati: `ok / anno_incompleto / dati_inconsistenti / dati_insufficienti` (soglia 4 mesi). `anno_non_corrente` rimosso (irraggiungibile dopo l'ancoraggio a oggi).
- Eredita Cometa (§4.12) e le variazioni della storia retribuzione. Col profilo reale → 0 (imponibile effettivo sotto i 28k). Copre SOLO l'anno solare in corso; un consuntivo su anno chiuso sarebbe funzione separata (non costruita).
- **Resolver conguaglio senza test automatici** — verificare a mano dopo ogni modifica che tocca `resolveStima`.
- ✅ **Normalizzazione temporale del conguaglio — FATTA 2026-09-10 pom.** Non era "il fix dell'INPS": `retribuzioneMensile` e `contributiInpsRate` erano rappresentati come **scalari** mentre nel dominio sono **time-versioned** (decorrenze; +0,30% CIGS solo nei mesi con ore CIG). Da lì nasceva anche la lettura della colonna deprecata `contributiInpsOverride`.
  **Evidenza che ha ribaltato la diagnosi iniziale**: `worklog_user_fiscal_config.contributi_inps_override` era **valorizzata a 0.09490 sull'account admin** — quindi il conguaglio usava 9,49% **piatto su tutti i mesi** mentre il resolver mensile usa 9,19% + CIGS solo nei mesi CIG. Delta **sovrastimato** di ~6,75 €/mese sui mesi senza CIG (≈ 54 € sull'anno), non sottostimato come si era dedotto prima di guardare il DB. Morale: rimuovere l'override sarebbe stato **un cambio di comportamento mascherato da cleanup**.
  **Catena nuova**: `stima.ts` espone `imponibileNominaleMensile` (retribuzione fissa × (1−aliquota **di quel mese**) − Cometa) → il resolver lo legge e costruisce `imponibiliNominaliMensili[]` parallelo ai reali → `conguaglio.ts` riceve dati **già normalizzati** e fa solo aritmetica. Il nominale è esposto dal motore perché è l'unico punto in cui i tre addendi coesistono; l'alternativa (inferire la CIGS da `stornoCig > 0`) è stata scartata come proxy fragile.
  ⚠️ **Il nominale NON è l'imponibile effettivo del mese**: se lo si derivasse da quello, `extra` collasserebbe a 0 per costruzione e il conguaglio sarebbe sempre nullo. È la base *teorica*.
  **`StimaConguaglioInput` ora**: `scaglioni`, `imponibiliMensiliReali[]`, `imponibiliNominaliMensili[]`, `ralTeoricoImponibile`, `mesiAttesiReali`, `mesiFuturi`, `proiezione`. Spariti `retribuzioneMensile`/`mensilita`/`contributiInpsRate`/`coefficienteCometa`/`minimoTabellareReale`. Output: aggiunti `ralTeoricoImponibile`/`ralEffettivoImponibile` per rendere osservabile l'identità contabile. Guardia: vettori di lunghezza diversa → `throw`.
  **`computeRalTeoricoAnnuo(nominaliTrascorsi, nominaleCorrente, mensilita)`** — pura ed **esportata apposta per essere testabile** (il resolver non ha test): `Σ N_m + (mesiFuturi + mensilita−12) × N_corrente`.
  **Mesi non osservati (futuri E bloccati)** → `nominaleAssunto` = retribuzione vigente × (1 − aliquota **base**) − Cometa. **Scelta (i) dell'utente**: nessuna media storica (spalmerebbe un aumento già avvenuto sui mesi futuri = previsione implicita dove l'endpoint dichiara di non proiettare) e **mai il nominale dell'ultimo mese risolto** (erediterebbe la CIGS: fatto contingente di un mese, non una previsione).
  **`contributiInpsOverride` non è stata rimossa**: semplicemente **nessuno la legge più**. Colonna intatta a DB.
  **Test: 13** (erano 8). Gli 8 esistenti **migrati meccanicamente** passando gli stessi numeri che il motore derivava da sé (`1997.82`/`25971.66`, TC-E `1974.11`/`25663.45`) → attesi invariati, regressione dimostrata. Nuovi: **TC-I** cambio decorrenza → delta 0 (col vecchio scalare gennaio inventava −272,43); **TC-J** mese CIG → delta 0 (col vecchio override piatto: 19,80 spuri); **TC-K** `computeRalTeoricoAnnuo`, asserisce anche che la media storica dà un valore **diverso**, copre mensilita 14; **TC-L** `R_eff === R_teo + delta`; **+1** guardia lunghezze. Totale motore **148**.
  ⚠️ **Mai verificato dal vivo** (zero sessioni attive): al rientro aprire la stima → sezione Conguaglio deve restare **0** (imponibile sotto i 28k). Se mostra un numero, guardare subito il resolver.
- **Il problema IRPEF marginale/aliquota-media è CHIUSO** (§4.14), ma resta **separato** da questa normalizzazione per scelta esplicita dell'utente: ora c'è una base temporale pulita su cui costruire eventuali test sopra i 28k.
- **#16A — osservabilità (display-only)**: `computeMaggiorazioniOrdinarie` ritorna `{totale, oreNotturne, orePomeridiane}` invece di un numero nudo (`.totale` entra nel lordo byte-identico; verificato `orePomeridiane:24` su aprile = 6×4h overlap); nuovi `StimaOutput.oreNotturne/.orePomeridiane` (display puro) — e **stato completezza** (`giorniRegistrati`/`giorniConBuco` in `getMonthlySummary`, query "qualsiasi entry", riusa `calendarWorkingDays`, `todayDate()` esportato mirror `getWorkingDays`). **Decisione architetturale**: ore-fascia NON aggiunte al DTO backend `MonthlySummary` (sarebbe ricalcolare l'intera pipeline stima lato server) → esposte via **composizione frontend** — `worklog-page.tsx` chiama `useStima(month)` (stessa queryKey di `StimaCard`, React Query dedupe, zero rete in più) e passa i campi a `<MonthSummary>`. UI: `Moon` viola / `Sun` oro (`text-violet`/`text-warning`, stessi token del day-modal), Mensa `Utensils`/`text-primary`.
- **#16B — netto reale + scarto**: confronto **netto secco** (scomposizione = evoluzione futura). Tabella `worklog_netto_reale` (`packages/db/src/schema/worklog/netto-reale.ts`), PK composita `(userId, mese)` via `primaryKey({columns})`, CHECK `netto>=0`, migration 0022. GET/PUT upsert per-mese (`onConflictDoUpdate({target:[userId,mese]})`, mirror `moduleKvStore`/mensa, `MonthSchema` riusato, non admin-gated). **Il resolver calcola lo scarto** (`round(output.netto − nettoReale, 2)`) e trasporta `nettoReale`+`scarto` in `StimaResolution`/`StimaResponseData` (mirror `sindacatoNome`; il motore è ignaro del "reale"). UI: `netto-reale-panel.tsx` mese-scoped (prop `month`, collocazione mirror `VariabiliFlatPanel`), icona `ScrollText`, + riga **scarto assoluto con segno** in `stima-card.tsx` sotto il netto, condizionale su `scarto!==null`.
- **Stato numerico aprile 2026** (prod, golden). Ledger busta (oracle): `1.474,57 lordo − 139,98 INPS − 150,64 IRPEF netta (413,62 lorda − 262,98 detr.) − 19,76 CGIL − 9,24 mensa − 58,51 addizionali − 23,71 Cometa + 487,47 integrazione = 1.560,20 ✔`. Welfare (RET. NATURA 250 esente art.51, Metasalute) = fuori modello: il ledger quadra al centesimo senza. (Residuo mensa 0,77 = 1 pasto su `meal_override=false` a 04-30, §10.)

### 4.16 Blocker e warning (fonte di verità = codice/i18n)
- **Blocker**: `buco_mese`; contratto non configurato (mai fallback muto); `no_turni_config`; `no_cig_config` (condizionale all'uso).
- **Warning attivi**: `integrazione_solidarieta_stimata`; `detrazioni_stimate_ral_teorico`; `malattia_stimata`; `trattenuta_sindacale_non_disponibile` (condizionale); `mese_parziale`; `quadratura_incongruente` morto in pratica (le righe nuove quadrano per costruzione) ma tenuto (separazione forma/valore). `warningAnnualizzazione` sempre false (rimuovibile, breaking, bassa urgenza). Warning-code minori (`no_addizionali`, `annualizzazione`, `malattia_stimata`, `quadratura_incongruente`) senza riassunto collassabile dedicato → fallback al testo pieno.

### 4.17 Wiki "come funziona" (deliverable finale — materiale già raccolto)
Perché il netto non cambia coi giorni (mensilizzato); divisore 173 e derivazione oraria; modello IRPEF (stima-non-conguaglio: base unica, aliquota media lorda, detrazioni /12, incapienza azzerata a 0, RAL teorico costante → divergenza dichiarata sui transitori); INPS 9,49 e composizione (9,19 + 0,30 CIGS); conguaglio (cos'è, solo anno corrente, ≈0 sotto i 28k); CIG/solidarietà (storno, integrazione, coefficiente stimato); trattenute (CGIL, mensa, Cometa deducibile, addizionali A.P. configurate); codice colore kind e stati celle; approssimazioni dichiarate con direzione dell'errore. Il changelog dice *cosa è cambiato*, la Wiki *come funziona*; un change può linkarla via `linkWiki`.

---

## 5. Modulo To-Do (tasks) — RISCRITTO 2026-09-10 sul mockup Claude Design

### 5.0 Origine: il design esisteva e il progetto se l'era perso
Il modulo è stato rifatto su un **canvas Claude Design** che l'utente ha ritrovato a metà sessione:
**`https://claude.ai/code/artifact/b90f3f76-246e-4b96-875b-61280f9f14b2`** — mockup interattivo
dell'intero DexHub (Panoramica, catalogo Moduli, To-Do). ⚠️ **Il link serve solo un loader**: il
contenuto vero è gzip+base64 dentro `<script type="__bundler/manifest">`, va estratto per essere
letto. È esattamente il fallimento che §1 prevedeva ("mockup in ASCII, non Artifact, perché tra
sessioni si perdono"): è successo, e per due giri di lavoro il modulo è stato trattato come "Fase 0
da completare" invece che "da riscrivere". **Chiedere sempre se esistono artifact prima di
pianificare un modulo.**

**Cromia**: il canvas usa verde `#7ee0b4` su `#0a0d0c`; su istruzione esplicita dell'utente
**struttura e interazioni sono identiche al mockup ma i colori vengono dal design system del
progetto** (`--primary` teal, `--success`/`--warning`/`--error` per le priorità, Geist al posto di
Hanken Grotesk/JetBrains Mono). Quindi funziona anche in tema light.

### 5.1 Migration 0026 (applicata a DB, verificata)
`0026_tasks_assignee_section_invites` — **solo aggiunte, nessun drop**:
- `tasks.section` enum `task_section` (`oggi|settimana|prossime`), NOT NULL default `oggi`.
  **Colonna vera, non derivata da `dueDate`**: il drag&drop sposta un'attività di sezione senza
  toccarne la data (mockup punto 8), quindi sezione e data possono legittimamente divergere.
- `tasks.assignee_id` → `users.id`, **nullable**, `ON DELETE SET NULL` (se l'utente sparisce
  l'attività resta, senza assegnatario).
- `task_space_invites` (id, space_id, email, invited_by, created_at, UNIQUE(space_id,email)).
  **Tabella separata da `task_space_members` di proposito**: un invito via email punta a una persona
  che può non avere ancora un account, quindi non c'è una riga `users` a cui agganciarsi. L'invito
  viene **consumato** (cancellato) quando quella email entra col codice.

### 5.2 Backend
- `CreateTaskDto`/`UpdateTaskDto`: + `section`, + `assigneeId` (`null` è un valore legittimo — i
  check sono su `undefined`). `ReorderTaskDto`: + `section` opzionale.
- `SpacesService`: `assertOwner()`; `getMembers()` ritorna `isOwner` (gerarchia piatta, l'unico
  ruolo che esiste è Proprietario); `getInvites`/`invite`/`cancelInvite`/`removeMember`.
- **`delete(space)` cambiato**: prima vietava con `memberCount > 1`, ora è riservato al
  **Proprietario** e vale anche con altri membri dentro ("Elimina workspace per tutti", punto 11).
- **Auto-provisioning risolto**: `listForUser()` crea lo space `Personale` se manca. **Self-healing
  e create-only**: copre invito, wizard di setup e restore da backup in un punto solo, e se lo space
  c'è già non tocca nulla. Chiude il punto 2 di §11 senza toccare `admin-invite.controller.ts`.
- Nuove rotte: `GET|POST /spaces/:id/invites`, `DELETE /spaces/:id/invites/:inviteId`,
  `DELETE /spaces/:id/members/:userId`.

### 5.3 Frontend (riscritto)
`modules/tasks/src` oggi: `api/{tasks-client,public-api}.ts`, `hooks/{use-tasks,use-spaces}.ts`,
`components/{progress-ring,task-row,quick-add-bar,workspace-modals}.tsx`, `routes/tasks-page.tsx`,
`widgets/todo-summary.tsx`, `i18n.ts`, `manifest.ts`.

**Eliminati** (backup in scratchpad, il repo non è git): `routes/join-space-page.tsx`,
`components/tasks/{create-task-form,task-card,task-detail-panel,task-filters-bar}.tsx`,
`components/layout/tasks-sidebar.tsx`, `components/spaces/*`, `hooks/use-lists.ts`,
`hooks/use-tags.ts`, `utils/parse-quick-add.ts` (superato: la spec vuole **solo il date picker**,
niente parsing di testo libero). `tagsApi` tolto dal client (zero consumer; le rotte tag restano
lato backend).

Coperti tutti e 16 i punti della spec: breadcrumb, anello di progresso SVG, toggle
Personale/Together, quick-add (data nativa + chip priorità singola), smart list con contatori live +
filtro priorità **multi-select** combinabile, raggruppamento per sezione in vista "Tutte",
riga con maniglia/checkbox/avatar/pill/data/stella/matita/cestino, edit inline (Invio salva, Esc
annulla), drag&drop con adozione di sezione, stato vuoto, switcher workspace, barra membri,
3 modali (invito+codice+membri+zona pericolo, nuovo workspace, join).

**`manifest.ts`**: version `0.3.0`, `lifecycle: 'active'`, **`widgets[]` finalmente presente**
(`todo-summary`) — `tasks` era l'unico dei 3 moduli senza. Tolti la rotta `/join`, il comando
palette relativo e il permesso `tasks:comments:write` (inattuabile).

### 5.4 Trappole trovate e chiuse
- **La stella non è la view `important`**: lato backend `important` = `priority IN ('alta','critica')`,
  mentre la stella è `favorite`. La smart list "Importanti" filtra `favorite`, client-side.
- `chi sono io` non ha un endpoint nel modulo: si deduce da `personalSpace.createdBy` (il
  proprietario del proprio space personale sono sempre io), senza una chiamata in più.
- L'avatar sceglie la tinta da un hash dell'id utente: stessa persona = stesso colore, senza che il
  backend memorizzi nulla.
- `todayInput()` nel quick-add **non usa `toISOString()`**: quello passa per UTC e in Italia di sera
  darebbe il giorno dopo.

### 5.5 Aperto
- **Nessun test** in `modules/tasks` (era vero prima, resta vero).
- **Zero validazione input** sui controller tasks (DTO senza decoratori, nessun `ValidationPipe`).
- `task_subtasks`/`task_comments`: schema morto, nessun consumer. Da droppare o implementare.
- **Assegnare un'attività dalla UI non c'è**: il campo `assigneeId` esiste ed è letto (avatar in
  Together), ma manca il controllo per **impostarlo**. Il mockup lo mostra come dato, non come
  azione. Da chiarire con l'utente.
- L'invito via email **non manda nessuna email**: crea la riga "In attesa" e basta. Chi è invitato
  entra comunque col codice. Nessun canale email esiste nel progetto.
- ⚠️ **Mai verificato a schermo.**

## 6. UI Worklog — decisioni consolidate

- **Header pagina** a due bande (identità + ingranaggio config; toolbar azioni sotto, gruppi + overflow `⋯` con export CSV/JSON, template, cestino, elimina-mese danger). `Trash2` = elimina mese, `ArchiveRestore` = cestino.
- **Celle calendario** (`day-cell.tsx`): 3 stati (compilato / da-compilare tratteggiato / non-lavorativo); weekend via `bg-bg` + header `text-text-subtle` (prop `isWeekend` con Sab/Dom letterali, non il pattern-contratto `isWorkday`); **multi-pallino `uniqueKinds()` dedup per kind** (overtime escluso, fallback `work`, max 3 + "…"); `StickyNote` se `day.note` (l'indicatore `entry.note` è stato rimosso: zero input UI per popolarlo); `Utensils`/primary solo su giorni registrati.
- **`kind-colors.ts` = sorgente unica** (token del tema): lavoro=verde, ferie=arancione, permesso=blu, malattia=ambra, straordinario=viola (`--violet`), festivo=rosa (`--pink`), **cig=token `error` PER DECISIONE** (eccezione voluta alla regola "rosso solo azioni" — non "sistemarlo"), permesso n.r.=ciano (`--cyan`).
- **`entry-editor.tsx` condiviso** tra day-modal e bulk-modal (kind, ore, icone fasce, add/remove, warning ore): prima duplicavano ~60-70% e il bulk mancava le fasce. Warning ore: soglia **11h** (`warnOverLimit`, era `warnOver24`), conta tutte le ore del giorno, non bloccante. Split-suggestion ed elimina-giorno solo nel day-modal.
- **Icone fasce** (ordine: orologino → sole → luna): orologino `text-text` con `fill=none` (lancette visibili), sole `text-warning`, luna `text-violet`; orario esplicito senza valori precompilati (`orarioPrecisoAttivo` = presence-check `!==undefined`, non truthy).
- **Nessuna modale si chiude cliccando fuori** (regola worklog-wide: rimossa da day-modal/trash-panel/templates-panel). Chiusura solo esplicita.
- **Month-picker** (`month-year-picker.tsx`): titolo mese/anno cliccabile → popover griglia 3×4 + frecce anno (mese-oggi `bg-primary`, mese-navigato `ring-primary`, chiude su click/backdrop/Esc). **Mese navigato persistito** in `localStorage['dexhub-worklog-month']` (regex-validato, `useEffect` post-mount per zero hydration mismatch, scrittura su tutti e 3 i call-site: frecce/picker/torna-a-oggi). Il bottone **"torna a oggi" esiste e resta**.
- **Template**: picker a destra (`flex justify-end` + `absolute right-0`); modifica (`PUT /worklog/templates/:id`, `editingId` discrimina) e conferma-eliminazione standard (overlay `bg-black/50` + card); bulk-apply precompila `work` solo se `selectionAllFeriale`.
- **Settings-panel**: sidebar verticale, **10 voci** con icone Lucide — Contratto `FileText`, Fiscale `Landmark`, Retribuzione `Wallet`, Premi `TrendingUp`, CIG `PiggyBank`, Sindacato `Users`, Mensa `Utensils`, Addizionali `Receipt`, Cometa, Netto reale `ScrollText`. Pannelli **sempre montati con `hidden`** (i form in corso non si azzerano al cambio tab); salva-e-resta-aperto. Sotto `sm` rotaia solo-icone (`w-11 sm:w-36`, `aria-label`+`title` obbligatori). Stato attivo `bg-primary/10 text-primary` (mirror `day-modal.tsx:196`). Pannelli config sindacato/mensa/Cometa/addizionali: checkbox in cima governa i campi **disabled-dimmed** (non nascosti), il salvataggio non azzera mai i valori digitati (numero dormiente, il gating vive in `iscritto`/`attivo` lato resolver).
- **Stima-card in due blocchi** (toggle ridotto/dettagli persistito in `localStorage['dexhub-stima-details-open']`, default chiuso): **A. Flusso del netto** (Lordo → −INPS → −IRPEF → +Integrazione [→ −Sindacato → −Mensa → −Addizionali] → Netto; **trattenute PRIMA dell'integrazione** perché l'integrazione è già netta INPS; righe condizionali; scarto vs netto reale sotto il netto se presente) e **B. Parametri di calcolo** (fuori dalla somma: Storno CIG, Imponibile IRPEF, **RAL lordo** con nota (i) `InfoNote` hover-desktop/tap-mobile, Imponibile IRPEF annuo, Detrazioni art.13, Cuneo, Cometa informativa). **Warning collassabili** (riassunto + chevron). In fondo: warning + `ConguaglioSection` (non fusa).
- **Riepilogo mensile** (`month-summary.tsx`): testata "Ore registrate" (`totaleRegistrate` = somma di TUTTE le entry-ore del mese, qualsiasi kind — include permesso n.r., debito cosmetico accettato) + "Giorni lavorabili" dal **motore** (`getWorkingDays` esportata da `stima.resolver.ts`, riusata — mai duplicata client-side, deve coincidere col divisore pro-quota); righe per kind + riga CIG; ore per fascia con Moon/Sun; completezza `giorniRegistrati`/`giorniConBuco`.
- **Blocker a due registri, una fonte**: `modules/worklog/src/lib/blockers.ts` — `blockerMessage(blocker,t)` (lungo, **esclusivo** di `stima-card.tsx`/`conguaglio-section.tsx`) e `blockerShortLabel(blocker,t) → {label, action?}` (breve, usato dal widget Home). Stesso `Record<StimaBlocker,…>` esaustivo (8 code) nello stesso file → un blocker nuovo forza via TS l'aggiornamento di **entrambe** le mappe. 26 chiavi i18n (`blocker_short_*`/`blocker_action_*` ×8 ×2 lingue). I widget importano solo da `lib/`/`services/`, mai da componenti di pagina.

---

## 7. Home "Panoramica", catalogo moduli, sidebar

- Route `/home` (era `/dashboard`; cartella `(hub)/dashboard`→`(hub)/home`, `middleware.ts` non toccato, matcher generico già copre). Titolo **"Panoramica"** (era "Moduli"). Dati reali: nome utente (`useMe`), conteggio moduli, versione **statica `v0.7`** (`ponytail:`, nessun canale reale; "ultimo accesso" rimosso — nessun campo `lastLoginAt` in `Me`).
- **Home generalizzata al contratto** (07-20/07-21): `page.tsx` enumera `useVisibleModules()` filtrato `enabled===true`, join col registry frontend per icona/widget/lifecycle (`resolveModuleIcon`, `moduleRegistry.get(id)`), monta `ModuleCard` + `LazyMount`/`NeutralBody`. Le 4 card hardcoded (Note/Cartellino/Promemoria/Ricette) e i loro import Lucide statici sono spariti. `module-badge.tsx` reso difensivo (`STATE_STYLE[state] ?? STATE_STYLE.active`) contro stati ignoti. Griglia `repeat(auto-fill, minmax(340px,1fr))`; **span definitivi rimandati** ai contenuti reali (criterio: densità).
- `ModuleCard` = guscio presentazionale puro, chrome copiato verbatim dalla vecchia card Cartellino — **style inline, non token: mirror deliberato della convenzione di quel file, debito hex ancora aperto**. Descrizione piccola/tenue + linea divisoria sopra lo slot `{children}` (riusa il colore del bordo card).
- `recent-notes.tsx` de-chromato (bordo/bg/radius/padding/header propri rimossi: duplicavano il guscio). Righe Notes come "chip" `bg-overlay-subtle`, icona teal per riga.
- `worklog-summary.tsx`: self-contained, mese corrente interno, `useMonthlySummary`+`useStima`; netto "hero" (€ separato in span teal, `Intl.NumberFormat` **senza** `style:currency`), ore e completezza in 2 chip `bg-overlay-subtle`, dot di stato su token esistenti (`bg-warning`/`bg-success`/`bg-neutral` — quest'ultimo era morto, riattivato lì). **`useStima` ritorna `StimaResponse`** (union `{stima}` / `{stima:null, stimaBlocker}`), non `StimaOutput` diretto → letto `stimaResponse?.stima?.netto` con fallback pulito. Se `stima===null` → `blockerShortLabel()`.
- **Catalogo `/modules`**: stat Totali/Attivi, search + filtro client-side, `ModuleCatalogCard` (badge legato a `enabled`, **diverso** da `ModuleBadge` della Home), primitivo `Switch` (`core/components/switch.tsx`, non esisteva nulla di riusabile). Toggle → `PUT /me/modules/:id` → invalida `['me','modules']` → ricalcolano Home, sidebar, catalogo dalla stessa fonte. **Zero optimistic update, zero stato locale delle preferenze.** `useSetModulePreference` gestisce l'errore in modo minimo (throw + console, nessun toast) — coerente con l'istruzione esplicita di lasciarlo così.
- **Sidebar** (`core/components/sidebar.tsx`): mark SVG esagono inline teal (⚠️ **placeholder ancora attivo benché `public/dexhub-mark.png` esista** — §0 #2), dot teal sulla voce nav attiva (spacer trasparente sulle inattive), header split in due righe (brand / search) per stare nei 56px collassati, blocco utente = **menu account** (Impostazioni + Esci; pattern catcher `fixed inset-0` mirror `module-autocomplete.tsx` + `Escape` + focus restore), collapse = **handle circolare a cavallo del bordo destro** ancorato in un wrapper `relative` **attorno** alla `<nav>` (dentro `<nav>` l'`overflow-y-auto` forza `overflow-x:auto` e clipperebbe la metà sporgente). Voce "Moduli" (`LayoutGrid`) sotto Panoramica. Voce changelog hardcoded (§8).
- **Parità nav (07-22)**: `mobile-nav.tsx:33` ha la voce Moduli (`coreNavItems`, dopo Panoramica; overflow non un problema — flex-1 shrink, label già truncate); `command-palette.tsx` idem + fonte moduli corretta (§3.4).
- **Admin `/settings/administration`**: 5 card (la 5ª "Moduli" con `LayoutGrid`, mirror esatto del markup delle altre 4; label riusa `admin.modules.title`, nuova `admin.index.modulesDesc`). Pagina `/settings/administration/modules`: gate ora dal layout (§3.5), sorgente `useModules()` (tutti gli status), Switch interattivo per `active`/`disabled`, **pill read-only** (`--warning`/neutro) per `error`/`incompatible` — l'admin non "manutiene" con l'interruttore un modulo rotto. **Enable immediato, disable con dialog di conferma** ("per tutti gli utenti").
- **Debito rule-of-three dichiarato**: `Modal`/`ConfirmModal` non avevano un componente condiviso (grep confermato) → mirror fedele dei locali di `users/page.tsx`, duplicati in `administration/modules/page.tsx` con `// NOTE:` in entrambi. **Al 3° uso estrarre in `core/components/`.**
- Footer Home: versione **pinnata in fondo alla viewport** anche a contenuto corto (`display:flex, flexDirection:column, minHeight:'100vh'` sul wrapper + `marginTop:'auto'` sul footer) — approssimazione dichiarata: `100vh` invece di un calc esatto contro il box del layout hub, scarto ~24px, invisibile in pratica. Larghezza: rimosso `maxWidth:1060`+centraggio, padding orizzontale 40px, bleed negativo `margin:-1.5rem` (annulla il `p-6` del layout hub).
- Menu account: si ancora sempre `bottom-full` a prescindere da collassata/espansa (semplificazione dichiarata).

---

## 8. Changelog / "Novità"

### Architettura
**Funzione globale della shell** (come Feedback/Settings), **NON un modulo del Registry**: pagina statica `apps/web/src/app/(hub)/changelog/`, nav hardcoded in `sidebar.tsx`, `useT()` shell. Slug/module-key `changelog`, rotta `/changelog`. La riga orfana `changelog` in `module_registry` (residuo mai ripulito, `status='disabled'`, nessun manifest sorgente, non in `MODULE_FACTORIES`) è stata **rimossa da 0024** — verificato pre-delete che zero righe `user_module_preferences` la referenziassero.

### Modello dati e regole
- `changelog_release` (`versione` SemVer **UNIQUE**, `titolo`, `descrizione?`, `stato` `draft|published`, `dataPubblicazione?`) + `changelog_change` (FK cascade, `categoria` `feature|improvement|fix|security|breaking`, `visibilita` `user|developer|internal`, `modulo` = module-key slug, `titolo`, `descrizione?`, `linkWiki?`, `migrationNote?`, `ordine`). Enum Postgres veri.
- **Una sola draft** alla volta (partial unique index → 409). **Publish** = draft→published + `dataPubblicazione=now`, non auto-crea la prossima. **Congelamento totale del published** (409 su ogni mutazione). **Backfill = seed idempotente** (`seedChangelog`), mai publish runtime.
- `isUniqueViolation()` legge `err.cause.constraint_name` per distinguere i due unique → **ogni nuovo unique constraint futuro va aggiunto a quello switch**.
- **Bug latente noto**: `publishRelease` (service) ritorna la release senza `changes[]` (stesso bug di `updateRelease`, già fixato passando per `attachChanges`). Innocuo oggi: il client fa solo `invalidateQueries`, mai `setQueryData` con la risposta grezza. Se un domani la si usa direttamente, fixare identico. `apiFetch` non gestiva `204` (DELETE) → fixato.

### Gating admin (completo)
- `@UseGuards(AdminGuard)` per-metodo sui **7 endpoint mutanti** (POST releases, PUT releases/:id, POST publish, DELETE releases/:id, POST changes, PUT changes/:changeId, DELETE changes/:changeId) + `@Audit` (categoria `DATA`: manca l'enum `CHANGELOG` in `audit_category` = `AUTH|DATA|PERMISSION|MODULE|ADMIN|SECURITY`; debito cosmetico). I 3 GET restano aperti.
- **Visibilità bozze**: i GET conoscono `isAdmin` via `@CurrentUser()`. Non-admin: `listReleases(false)` → `where(stato='published')`; `getRelease`/`getReleaseByVersion` su una draft → **404** (per il non-admin la risorsa non esiste).
- **UI**: `canEdit = isDraft && !!me?.isAdmin`, singola fonte di verità su tutti gli entry point editor.
- Collaudo residuo non bloccante: il ramo non-admin (403/404/UI sola-consultazione) è garantito per costruzione ma **mai esercitato live** (servirebbe un secondo account con sessione, che nasce `isAdmin=false` da signup — mai fabbricarlo via SQL).

### UI
- **Lista densa** stile Vercel (pill categorie deduplicate con icone `Sparkles/Wrench/Bug/Lock/AlertTriangle`, pill "Azione richiesta" se migration note, badge Bozza). **Dettaglio** per versione (URL condivisibile), overview conteggi, change per categoria, migration note = callout ambra, accordion-ready (collapse non implementato). Utility condivise: `core/utils/changelog-categories.tsx` (`CATEGORY_ICON`/`CATEGORY_ORDER`, estratte alla rule-of-three).
- **Editor draft** sulla stessa pagina (adattiva a `stato`): header con dirty-tracking via **`useDirtyState<T>`** (`core/hooks/use-dirty-state.ts`, generico riusabile, `commit(next)` doppio uso seed+post-save; candidato Settings/Wiki), indicatore, `router.replace` se la versione cambia; modal add/edit change unico (`change-editor-modal.tsx` `mode:'create'|'edit'` + `module-autocomplete.tsx` testuale, `ordine`=ultimo+1 client-side; CRUD change immediato, NON nel dirty-tracking); barra sticky 3 bottoni (Elimina bozza danger / Salva se dirty / Pubblica disabilitato se dirty), dialog conferma, invito post-publish "Crea la prossima release" (riusa `CreateReleaseModal`).

### Stato DB (⚠️ **non riverificato il 10/09 — Docker spento**)
**7 release published**: 0.1.0 Nascita Worklog · 0.2.0 CIG/Solidarietà · 0.3.0 Permessi non retribuiti · 0.4.0 Trattenuta sindacale · 0.5.0 Mensa · 0.6.0 Novità (il changelog stesso) · 0.6.5 Controllo accessi. **+ 1 draft `0.7.0`** "Stima più fedele alla busta paga", creata via API reale (sessione admin, non seed/SQL), 3 change: Feature "Previdenza complementare (Cometa)", **Fix** "Corretto il calcolo dell'IRPEF mensile" (Fix, non Improvement: correggeva un errore di default ~70€/mese), Feature "Addizionali regionali e comunali". **Non pubblicata** — review browser + publish spettano all'utente (irreversibile). Landing/login esclusi di proposito. (Una draft `0.6.1 "Cometa e Addizionali"` è esistita tra le sessioni 12–13/07 poi confluita/rinominata; non cercarla, non esiste più a DB.) Principio: **non annunciare feature prima di averle fatte**.

---

## 9. Landing e Login

Tutto in `apps/web/src/app/_landing/` — **puro CSS Module colocato, zero Tailwind in quel folder**.
- **Origine design**: progetto **Claude Design** importato via tool `DesignSync` — `81fecb64-1e69-43d8-9b69-bc25ab74bd10` ("DexHub landing page design"), file `DexHub Landing.dc.html`, **opzione 2a** scelta tra 4 (2a/1a/1b/1c). Le altre 3 direzioni sono ancora nel progetto Design, non serve reimportare.
- Artefatti (fonte di verità, non duplicare): `docs/superpowers/specs/2026-07-15-dexhub-landing-redesign-design.md` + `.../plans/2026-07-15-dexhub-landing-redesign.md` (9 task); `docs/superpowers/specs/2026-07-15-dexhub-login-modernization-design.md` + `.../plans/...-login-modernization.md` (4 task).
- **Geist Sans + Geist Mono self-hosted. Google Fonts scartato** (richieste esterne + tracker su un prodotto "i tuoi dati restano tuoi") — deviazione dalla spec decisa dopo aver scoperto Geist già nel bundle. Non reintrodurre.
- **CTA primario "Richiedi un invito"** → modulo `invite-requests` (`POST /api/v1/invite-requests`, email+telefono+prefisso 49 paesi). **Registrazione libera CHIUSA di proposito.** CTA secondario "Accedi". Il form scrive record **reali**: se inviato in test, il dato va gestito/scartato.
- **Login = un solo componente logico `LoginForm`** (`core/components/login-form.tsx`; state machine passkey/recovery/emergency invariata al 100%: endpoint `/api/v1/auth/*`, `@simplewebauthn/browser`, i18n `t.login.*`, route `/login`), due contenitori: `LoginModal` (`_landing/login-modal.tsx`, trigger "Accedi" in `Nav`) + pagina `/login` (`(auth)/login/`, sfondo navy pieno). `LoginForm` non renderizza card/bordo propri (li fornisce il contenitore); `Button` di `@dexhub/ui` sostituito da `<button>` plain per evitare conflitto coi token light-theme.
- **Bug CSS trovato e fixato (pattern insidioso da ricordare)**: `.nav` ha `backdrop-filter: blur(8px)` → crea un containing-block CSS per i discendenti `position:fixed`, quindi `LoginModal` (dentro `<header>`) era fixed relativo alla nav bar invece che alla viewport (modal ritagliato, niente overlay scuro). **Fix**: `Nav` ritorna un **Fragment** con `<header>` e `<LoginModal>` come sibling, non più annidato. **Cercare `backdrop-filter`/`transform`/`filter`/`will-change` su ogni ancestor prima di un nuovo `position:fixed`.**
- **Palette**: navy `#031b35` (pagina) / `#04101f` (card); **ambra `#F5A623`** per emergency. Hardcoded **consapevole** (unica eccezione ai token). Container `1360px` fisso (fluida `clamp` scartata dall'utente); `.measure { max-width:68ch }` sui paragrafi. Hero full-bleed con glow statico (keyframes rimossi come codice morto). Focus trap modal "basilare" (Esc + restore + body lock) = punto d'intervento per a11y piena. Vecchio `apps/web/src/app/page.module.css` **eliminato**.
- **Parcheggiato (Diff 3)**: fascia full-bleed a sfondo differenziato per "Perché DexHub" — solo se a occhio la landing sembra piatta.

---

## 10. Account reali e dati (stato noto, non riverificato il 10/09)

- **`alexmunni@outlook.it`** (`c5ace699-aa4b-4c48-94ae-3587f6c87747`) — **account primario admin** (`isAdmin=true`, preesistente). Retribuzione oraria 13,00 €/h fino a gennaio → monthly **2.248,97** da febbraio 2026 (componenti dichiarati 1.975,68 / 0 / 25,05 / 248,24). Config reali impostate dall'utente via pannello, **NON toccare**: INPS `0.0949`; `worklog_sindacato_config` `iscritto=true, coefficiente=0.01, nome="CGIL"`; `worklog_addizionali_config` `attivo:true, 37.38/14.72/6.41`; Cometa 1,2%; mensa 0,77; CIG coefficiente 0,596. **Aprile 2026 = mese golden calibrato** (8 giorni `cig` — 01/02/03/07/08/09/10/13 = 64h, festivi weekend 05 e 25-04 cestinati, 30/04 work 6,5h + permesso n.r. 1,5h). `worklog_netto_reale` aprile = 1560.20 (reale da busta).
- **`alexmunn1i@outlook.it`** (`f0ef5260-e04b-4e9f-8b6e-964ec47124c8`) — account "golden" luglio 2026 (hourly puro, mese pieno 23gg), non-admin, usato per le verifiche fasce/flat. **Spesso senza sessione attiva** → è la ragione per cui il ramo non-admin (403/404 changelog, isolamento cross-utente delle preferenze moduli, scenario iscritto+non-dichiarato) non è **mai** stato testato live.
- Altri due account reali non-admin (`antonellailardo119@gmail.com`, `alexishere666@gmail.com`), non usati. **4 utenti reali totali**; `users.id` è di tipo `text` (confermato via query read-only).
- **Dati sporchi noti**: (1) `worklog_netto_reale` **maggio 2026 = 2100.00** = DATO DI TEST lasciato durante la verifica #16B, non reale (nessun endpoint DELETE su quella tabella; cleanup = prossimo upsert reale dall'utente). (2) `meal_override=false` pre-esistente su `2026-04-30` = residuo mensa 0,77 su aprile, noto, non un bug.
- **Dati tasks azzerati** dalla migration 0025 (erano quasi tutti test: 2 space condivisi, 18 liste, 1 solo task attivo su 17).
- **Isolamento cross-utente delle preferenze moduli** provato solo **strutturalmente** (nessun parametro `userId` esiste nel contratto degli endpoint), mai dal vivo.

---

## 11. Lavori aperti (ordine consigliato)

1. **Rientrare nell'app**: emergency access → **ri-registrare la passkey** → **ruotare
   `EMERGENCY_ACCESS_TOKEN`**. Finché non succede, niente verifica visiva ed è tutto fermo (§12).
2. **Verificare a schermo il lavoro del 09-10** — checklist in fondo a questa sezione. È la voce a
   priorità più alta dopo il rientro: sette lavori sono deployati e mai visti.
3. **Reservation DHCP** per `ALEXM` su `192.168.1.1`, altrimenti al prossimo lease si ripete tutto
   (rebuild + passkey invalidate). Cura più solida ma più costosa: RP ID svincolato dall'IP (§12).
4. **To-Do, code aperte** (§5.5): **assegnare un'attività dalla UI non esiste** (il campo c'è e
   l'avatar si vede, ma manca il controllo per impostarlo — il mockup lo mostra come dato, non come
   azione: **da chiarire**); l'invito via email **non manda email**; zero validazione input sui
   controller; zero test; `task_subtasks`/`task_comments` schema morto da droppare o implementare.
5. **Conguaglio, punto rimasto**: il resolver non ha test automatici, e il modello nuovo non è mai
   stato esercitato dal vivo. Al primo login la sezione Conguaglio **deve restare 0** (imponibile
   sotto i 28k): se mostra un numero, guardare subito il resolver.
6. **Pubblicare changelog `0.7.0`** — draft pronta a DB dal 07/2026; review browser + publish
   spettano all'utente (irreversibile). ⚠️ non riverificata a DB.
7. **Decidere il bug shift-click anchor** (`worklog-page.tsx:223-243`): far rispettare all'ancora il
   filtro weekend/festivo, **oppure** accettarlo esplicitamente. Aperto da luglio senza decisione.
8. **Allineare Panoramica e catalogo Moduli al canvas di design** (§5.0) — il mockup li copre, ma
   l'utente ha chiesto esplicitamente di fermarsi al To-Do. **Non assumere lo scope: chiedere.**
9. **Worklog residui**: coefficiente solidarietà 59,6% vs accordo aziendale ufficiale + massimale
   (unico parametro fiscale ancora stimato, richiede un documento esterno); evento fiscale premio
   feriale maggio (+35,24) da isolare toccando i premi; `regimeOrario` wiring DTO/UI.
10. **Wiki "come funziona"** — deliverable finale, materiale già raccolto in §4.17.
11. **Debiti trasversali**: `apiFetch` ignora `code`/`details` degli errori zod (meriterebbe una
    passata unica); `publishRelease` ritorna senza `changes[]` (latente, innocuo oggi); manca l'enum
    `CHANGELOG` in `audit_category`; `Modal`/`ConfirmModal` duplicati — **al 3° uso estrarre**
    (il modulo tasks ne ha ora una copia locale per costruzione: non può importare da `apps/web`).
12. **Fase 5 worklog (semi, non prioritari)**: canale previsionale addizionali
    (`FINAL_PREVIOUS_YEAR`); esaurimento rate A.P.; payroll progressivo / "RAL effettivo" in itinere
    (chiuderebbe la divergenza sui transitori); scomposizione confronto #16B; changelog per-utente.
13. **Landing Diff 3** (fascia "Perché DexHub") — solo se a occhio la landing sembra piatta.
14. **Convergenza i18n a 3**: allineare `useNoteT()` (notes, chiave `'dexhub-language'`) al pattern
    di tasks/worklog. Funzionante, solo divergente.

### Verifiche visive mai fatte (nessun tool browser — spettano all'utente, Ctrl+Shift+R)
Nessuna sessione da **07-19** in poi ha avuto conferma a schermo. La checklist si è accumulata.

**Priorità — 09-10 (tutto deployato, niente visto):**
- **To-Do riscritto** (`/tasks`): creare un'attività (era il percorso che dava 404); toggle
  Personale/Together; drag di un'attività fra sezioni; stella; edit inline (Invio salva, Esc annulla);
  filtro priorità multi-select; le 3 modali; card To-Do in Panoramica con checkbox interattive.
- **Home**: in dark deve essere **identica a prima** (se cambia una sfumatura, un token è sbagliato);
  in **light** deve essere corretta, non solo leggibile (i valori light li ha scelti l'agente, il
  design non li aveva mai definiti); in **EN** saluto, "Welcome back", conteggio e data.
- **Toggle tema** Sole/Luna in sidebar (solo espansa).
- **Sidebar**: logo reale, collassata **e** espansa.
- **Stima worklog**: riga "Addizionali − 58,51" sotto Mensa su aprile 2026; sparizione del warning
  "Cuneo fiscale stimato"; **Conguaglio deve restare 0**.
- **Bulk-apply** su range shift-click ancora funzionante dopo la rimozione del `console.log`.

**Arretrato (07-19 → 07-22)**: teal ovunque; sidebar (menu account, handle collapse); Home (larghezza,
griglia, footer pinnato); generalizzazione Home + catalogo moduli; toggle admin + dialog conferma;
badge/switch inerte nel catalogo; dot warning sidebar non-cliccabile; URL diretto a modulo in
manutenzione bloccato; **nessun #310 in console** su users/invite-requests/security dopo refocus;
voce Moduli su mobile-nav e Ctrl+K; redirect non-admin su `/settings/administration/*`; 16A/16B
(icone Moon/Sun/Utensils, pannello Netto reale, riga scarto); i 3 diff RBAC changelog.

**Trasversale**: **WebAuthn passkey** — ora si sa che sono invalidate (§12), da ri-registrare.

---

## 12. Debito tecnico e loose-end

**Infrastruttura / ambiente**
- **WebAuthn RP ID — il rischio si è REALIZZATO il 2026-09-10 pom.**: IP passato a `.8`, `WEBAUTHN_RP_ID` ora `192-168-1-8.nip.io`. Le **2 passkey a DB sono state registrate sotto `192-168-1-3.nip.io`** (una è dell'admin `c5ace699`) → **non autenticano più**, e al momento del cambio le sessioni attive erano **0**. Rientro deciso con l'utente: **emergency access** (`POST /api/v1/auth/emergency/login`, `@Public()`, `timingSafeEqual` contro `EMERGENCY_ACCESS_TOKEN` da env, crea sessione sul primo utente `isAdmin` — **zero dipendenza da WebAuthn**, quindi immune ai cambi IP: è la via di rientro strutturale). Dopo il rientro: **ri-registrare la passkey**. Le 2 righe vecchie in `passkeys` restano orfane a DB — spazzatura nota, **non cancellarle via SQL** (§1). `EMERGENCY_ACCESS_TOKEN` va **ruotato dopo l'uso** (il controller stesso lo dice nel warning di risposta).
- ~~Docker Desktop spento al cross-check~~ — acceso il 09-10 pom.: 0025 confermata (§2), stack ribuildato e healthy su `.8`. **Changelog draft 0.7.0 non riverificato** a DB.
- `apps/api/dist/` contiene tipi stale (es. `StimaWarningCode` con `detrazioni_forfettizzate`): innocuo (il container ricompila `apps/api`), ma **non usarlo come fonte di verità nei grep**.
- Processi `next dev` ad-hoc (`taskkill /F /IM node.exe`) — se la porta 3000 è occupata inaspettatamente, è un residuo.

**Frontend / shell**
- ~~`home/page.tsx` mockup di design in produzione~~ — **RISOLTO 2026-09-10 pom.** Il **design è rimasto identico** (scelta esplicita dell'utente: è il design voluto, §7); è cambiato solo ciò che lo rendeva non conforme:
  1. **i18n**: 11 chiavi nuove in `t.dashboard.*` (en **e** it) — `greetingNight/Morning/Afternoon/Evening`, `welcomeBack`, `activeModulesOne`/`activeModulesOther` (placeholder `{n}`, convenzione mirror di worklog), `quickAddNote`, `sectionModules`, `catalogCta`, `catalogHint`. `Intl.DateTimeFormat` ora segue la lingua (`it-IT`/`en-GB`). **`"DexHub v0.7"` resta hardcoded di proposito** (marchio + versione, ha già il suo `ponytail:`).
  2. **Token**: 7 token `--home-*` in `globals.css`, definiti in `:root` **e** `.light`. `--home-ink`/`--home-line`/`--home-accent` sono **triplette rgb** usate come `rgb(var(--home-ink) / .35)`, così ogni alpha originale sopravvive esatta. **I valori dark sono byte-identici a quelli hardcoded di prima**: il dark non cambia, il light smette di essere rotto. Zero hex residui in tutta `home/`.
  3. `Poppins` rimosso (era caricato e mai usato). `--primary-32` (inesistente) → `rgb(var(--home-accent) / .32)`.
  4. I due elementi finti-cliccabili sono ora `<Link>` veri: barra catalogo → `/modules`; "+ Nuova nota" → `/notes`, **condizionato a `notesReachable`** (modulo enabled e non in manutenzione) per non lasciare un link morto su una pagina generalizzata, con `minHeight:18` sul contenitore per non far saltare il layout quando sparisce.
  5. `module-card.tsx`: il `ponytail:` diceva "duplicato finché non si generalizzano le 3 card mock" — quelle card non esistono dal 07-20, quindi il commento è stato corretto (quella è ora **l'unica** definizione, non una copia) e i colori sono passati ai token.
  ⚠️ **Verifica visiva NON ancora avvenuta** — vedi la checklist di §11.
- **Toggle tema in sidebar (nuovo, 09-10 pom.)**: bottone Sole/Luna nella riga del brand (`sidebar.tsx`), visibile **solo a sidebar espansa** (a 56px non c'è spazio). Icona = destinazione, non stato. È un **toggle a due stati**: `system` resta nello store e selezionabile da Impostazioni, ma da qui non ci si torna (ciclo a 3 con un'icona sola sarebbe illeggibile). Riusa `t.settings.appearance.light/dark`, zero stringhe nuove; il cablaggio esisteva già (`core/providers/theme-provider.tsx` mette `.light` su `<html>`).
- `ModuleCard` (Home) usa **style inline con hex**, non token — debito segnalato 3 volte; `--overlay-subtle` ne ha ripagato solo i 3 chip, non la card.
- `Modal`/`ConfirmModal` duplicati in 2 punti — **al 3° uso estrarre**.
- `apiFetch` 400 zod generico (legge solo `body.message`, ignora `code`/`details`) — **trasversale a DexHub**, meriterebbe una passata unica.
- Bootstrap-upsert manifest al boot richiede sessione **ADMIN** (`AdminGuard` su `POST /modules`): innocuo su single-user, **latente per il multi-tenant** (un non-admin che apre l'app per primo non sincronizza i manifest).
- Effetto collaterale accettato dei fix #310: un non-admin che raggiunge l'URL diretto fa comunque partire la query admin (rifiutata 403) prima che il gate nasconda la pagina — mitigato ma non annullato dagli `enabled:!!me?.isAdmin` di §3.5. Nessuna fuga dati.

**Bug aperto — decisione mai presa**
- **Shift-click range/ancora weekend** (`worklog-page.tsx:223-243`): l'ancora del range bypassa il filtro weekend/festivo del dialog perché il click normale l'ha già inserita nel Set. Se l'ancora è un weekend/festivo resta selezionata anche con le checkbox "includi" disattivate → `selectionAllFeriale=false` → niente default `work` precompilato nel bulk-modal. Preesistente. **Fixare o accettare?**

**Motore/worklog**
- Ore contrattuali **NON storicizzate** (contratto = riga singola): i mesi passati usano le ore attuali; vuoto contrattuale coperto da vecchia decorrenza non rilevato (conta come lavorato).
- `premioFisso` legacy irraggiungibile dal form (colonna/ramo intatti per compat). Voci `maggiorazioni` morte (0.15/0.065) non rimosse. `quadratura_incongruente` morto tenuto. `warningAnnualizzazione` sempre false (rimuovibile, breaking, bassa urgenza).
- `totaleRegistrate` include il permesso n.r. (decisione "per adesso somma tutto"). `entry.note` senza input UI.
- Clamp `irpefNettaAnnua` a 0 assente a monte (`computeIrpefAnnua`), presente solo in `computeIrpefMensile` — benigno per il caso reale.
- L'output mensile non separa art.13 da ulteriore detrazione (esposizione; il regime è corretto).
- Commento/rename anti-doppio-conteggio su `computeCuneo` e marcatura `ponytail:` su `addizionali.ts`: da confermare applicati.
- `conguaglio.ts` non rivisto contro il nuovo modello IRPEF mensile.
- **Debito test**: i TC che asseriscono solo aggregati (`netto`) mascherano errori nei componenti — l'incapienza −58,04 su TC-B è rimasta invisibile per mesi finché non si è asserito `irpefNettaMensile`. Rinforzare TC-I/J/K con assert sui componenti.
- Resolver (stima e conguaglio) **senza test automatici** (strutturale): il browser è l'unico test dell'orchestrazione.
- Settings-panel: 10 voci piatte → rischio clipping su mobile landscape <~400px di altezza, mai verificato, accettato.

**Tasks** — tutto §5.2 / §5.3.

**Changelog/shell**: `publishRelease` mutation-return grezzo (bug latente innocuo); accordion dettaglio non implementato; `descrizione` release non valorizzata (la lista usa il change di punta come fallback); seed changelog non ritoccato dopo l'UNIQUE su `versione`; audit categoria `DATA` (manca enum `CHANGELOG`); il Registry non ha uninstall/reconcile (se serve rimuovere moduli, progettare un reconcile completo).

**Debito storico intoccabile**: snapshot 0006 + migration orfane 0003–0005 (§2).

**Memoria persistente Claude Code (vault)**: da riallineare a questo documento — in particolare `project_dexhub_tasks_rework.md` (dice "Fase 0 non applicata", **falso** per DB+backend) e `reference_dexhub_handoff_doc.md` (deve puntare a **questo** file). Anche `project_dexhub_worklog_phase.md`, `feedback_dexhub_process_constraints.md`, `feedback_dexhub_ral_anchoring.md`, `project_dexhub_open_bulk_range_anchor.md` riflettono stati vecchi. **Questo handoff prevale sempre.**

---

## 13. Scelte scartate — NON riproporre

- **Divisore 160h** (`oreLavorativeSettimanali×4`) → **173** (CCNL). Il 160 era un artefatto del Passo-3 di Fase 3; il 173 esisteva già nel seed, ignorato.
- **Split IRPEF ordinario/extra** (media netta + marginale) → **base unica** × aliquota media lorda − detrazioni/12 (lo split non faceva mai vedere le detrazioni al bucket extra).
- **INPS 9,19% globale bump** → override per-utente 9,19+0,30 (il bump avrebbe mentito per utenti non-CIGS).
- **Cometa annuo ×12** → **×13** (si applica alla tredicesima).
- **Google Fonts** sulla landing → Geist self-hosted.
- **Registrazione libera** → solo inviti.
- Canale dati parallelo `getSummary` modulo→dashboard → solo `WidgetDefinition`.
- `ModuleSummary`/primitive SDK anticipate → rule-of-two sulle preview reali.
- **Append-only** per l'edit storico retribuzione → in-place correttivo (decorrenza immutabile).
- Larghezza landing **fluida** (`clamp`) → 1360px fisso (`.measure` pronta se si riapre).
- Riusare tabelle **roles/permissions** → morte, si usa `isAdmin`+`AdminGuard`.
- "Lordo + Integrazione = subtotale, poi contributi" in stima-card → ordine fiscale corretto: trattenute prima, integrazione dopo (già netta INPS).
- **Effetto-scaglione mensile** nell'IRPEF → non serve (il progressivo annuo resta nel primo scaglione).
- Reimplementare l'**ulteriore detrazione** L.207/2024 → è GIÀ `beneficioCuneo` tier2 (doppio conteggio da ~1.000€).
- Fascia mattina a 0% nel motore → il turno mattutino esce gratis dall'overlap.
- Vista "**proiezione statistica**" separata / proiezione mesi futuri nel conguaglio → l'utente ci ha ripensato; se mai servisse è funzione a sé, non dentro `stimaConguaglio`.
- Due strutture separate per i premi flat → meccanismo flat UNICO.
- Rimuovere il bottone "**torna a oggi**" → esiste e resta.
- "Spostare" il colore CIG dal token `error` → è una **decisione**, non un residuo.
- Seconda tariffa oraria /173 per lo straordinario → tariffa oraria UNICA (era un bug).
- Annunciare nel changelog feature non ancora fatte → mai.
- **Switch attivo sul modulo in manutenzione** nel catalogo → inerte e `disabled` (il backend risponderebbe 409 comunque; non offrire un'azione impossibile).
- **Estrarre `Modal` in `core/components` al 2° uso** → mirror + `// NOTE:`, si estrae al 3°.
- **`useTasksT()` che legge lo zustand della shell** → bloccato (nessuna dipendenza, nessun alias, sarebbe circolare) → mirror di `useWorklogT()`.
- **Un chokepoint unico di mount dei moduli** → sono due punti distinti per costruzione (`ModuleRenderer` e `LazyMount`), la guardia manutenzione vive in entrambi.

---

## 14. Riferimenti esterni (leggere alla fonte, non duplicare)

- `docs/modulo-worklog-spec.md` — spec del modulo Worklog.
- `docs/superpowers/specs/` + `docs/superpowers/plans/2026-07-15-dexhub-{landing-redesign,login-modernization}.md`.
- `docs/{ARCHITECTURE,DECISIONS,ROADMAP,TODO,CHANGELOG}.md` — **anteriori al 28/06, largamente superati da questo file**; non usarli come fonte.
- Progetto Claude Design `81fecb64-1e69-43d8-9b69-bc25ab74bd10` (opzione 2a scelta, altre 3 direzioni disponibili).
- **Codice chiave**: `packages/worklog-engine/src/{stima,conguaglio,addizionali}.ts`; `packages/db/src/schema/{worklog,core,tasks,modules}/`; `packages/db/migrations/`; `apps/api/src/modules/{worklog,changelog,tasks,me-modules,registry}/`; `modules/{worklog,tasks,notes}/src/`; `apps/web/src/core/{hooks/use-modules.ts, components/{sidebar,command-palette,mobile-nav,module-bootstrapper,switch}.tsx, registry/module-registry.ts}`; `apps/web/src/app/(hub)/{home,modules,changelog,[module],settings/administration}/`; `apps/web/src/app/_landing/`.

---

## Suggested skills (per il prossimo agente Claude Code)

- **`superpowers:verification-before-completion`** — **priorità massima**. Sette lavori sono
  deployati e **mai visti a schermo** (§11 p.2). Non dichiarare chiuso nessun lavoro UI senza
  conferma esplicita dell'utente dopo hard-reload. Vale anche per il To-Do riscritto: `tsc` pulito
  non prova niente sul comportamento, e quel modulo ha **zero test**.
- **`superpowers:test-driven-development`** — ha pagato in modo evidente il 09-10 sul conguaglio:
  i TC scritti **prima** hanno smentito l'ipotesi di partenza (la sostituzione "marginale → aliquota
  media" era sbagliata, vedi §4.14). Continuare così su qualsiasi percorso soldi: oracle calcolato a
  mano, mai dedotto dal codice esistente. `modules/tasks` resta senza test; i resolver worklog idem.
- **`superpowers:systematic-debugging`** — grep-first sul codice reale, **mai su questo riepilogo**.
  Il 09-10 ha prodotto due esempi: la colonna `contributi_inps_override` era valorizzata a DB e ha
  **ribaltato la direzione dell'errore** già diagnosticata; e la stella "Importante" non è la view
  `important` del backend. Entrambe invisibili senza guardare il dato vero.
- **`superpowers:brainstorming`** — prima di pianificare un modulo, **chiedere se esiste un artifact
  di design** (§0, §5.0). Panoramica e catalogo Moduli sono coperti dal canvas ma **non** allineati:
  non assumere lo scope.
- **`ponytail:ponytail`** — disciplina di riuso osservata in tutta la serie (mirror invece di
  estrarre prematuramente, token esistenti invece di hex nuovi). Il 09-10 ha anche mostrato il
  rovescio utile: rimuovere codice morto ha trasformato un guasto invisibile a runtime in errori di
  compilazione che hanno guidato il refactor.
- **`caveman:caveman`** — stile terse già in uso, mantenere se l'utente non dice altro.
