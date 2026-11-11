# DexHub

<div align="center">

![DexHub Logo](apps/web/public/icon.png)

**La tua piattaforma modulare e self-hosted per produttività personale, finanza, cartellino lavoro e gestione quotidiana.**

[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-15-black.svg?logo=next.js&logoColor=white)](https://nextjs.org/)
[![NestJS](https://img.shields.io/badge/NestJS-11-red.svg?logo=nestjs&logoColor=white)](https://nestjs.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38B2AC.svg?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Drizzle ORM](https://img.shields.io/badge/Drizzle_ORM-0.45-green.svg?logo=drizzle&logoColor=white)](https://orm.drizzle.team/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon_Serverless-4169E1.svg?logo=postgresql&logoColor=white)](https://neon.tech/)
[![Turborepo](https://img.shields.io/badge/Turbo-2.x-EF4444.svg?logo=turborepo&logoColor=white)](https://turbo.build/)

[Funzionalità](#-funzionalità-e-moduli) • [Architettura](#-architettura-del-progetto) • [Avvio Rapido](#-avvio-rapido-locale) • [Variabili d'Ambiente](#-variabili-dambiente) • [Sicurezza](#-sicurezza--autenticazione)

</div>

---

## 🌟 Cos'è DexHub?

**DexHub** è un hub digitale moderno progettato per centralizzare le esigenze personali e lavorative in un'unica interfaccia elegante, veloce e reattiva. È costruito con un'architettura **completamente modulare**: ogni utente può attivare solo i moduli desiderati e scegliere quali mettere in evidenza nella panoramica principale.

---

## 📦 Funzionalità e Moduli

DexHub organizza le proprie funzionalità in moduli autonomi con guardie di accesso e preferenze dedicate per utente:

### 🕒 Cartellino & Lavoro (`@dexhub/worklog`)
Il modulo più avanzato di DexHub per la tracciatura delle presenze, gestione dei turni e stima fiscale della busta paga:
- **Gestione Presenze & Turni**: registrazione rapida di ore ordinarie, turni pomeridiani/notturni, straordinari, ferie, permessi/ROL, malattia, festivi e permessi non retribuiti.
- **Compilazione 1-Click**: pulsanti rapidi per riempire l'intera settimana o l'intero mese lavorativo con l'orario contrattuale standard (escludendo weekend e festività italiane).
- **Navigazione Fluida**: scorrimento dei giorni nel modale giorno con pulsanti e scorciatoie da tastiera (`Alt + ←` / `Alt + →`).
- **Motore Fiscale Busta Paga (`@dexhub/worklog-engine`)**:
  - Calcolo progressivo scaglioni **IRPEF** e detrazioni lavoro dipendente (Art. 13 TUIR).
  - Abbattimento cuneo fiscale (L. Bilancio).
  - Contributi previdenziali **INPS** (9,19%).
  - Previdenza complementare (Fondo **Cometa** con deducibilità fiscale).
  - Trattenute sindacali e gestione mensa / ticket pasto.
  - Addizionali IRPEF regionali e comunali.
- **Cassa Integrazione & Solidarietà (CIG)**:
  - Calcolo ufficiale conforme **Circolare INPS n. 4/2026** (€ 1.340,56 netto con abbattimento 5,84% ex L. 41/86).
  - Determinazione esatta della quota oraria tramite **divisore mobile** mensile ($giorni\ feriali \times 8$).
  - **Storicizzazione per anno**: i massimali futuri non modificano mai le stime dei mesi e degli anni passati.
  - Tabella consultabile delle quote orarie mese per mese e link al volantino ufficiale PDF.
- **Banca Ore & Maturazione**:
  - Calcolo residuo ferie e permessi con proiezione in **giorni lavorativi equivalenti**.
  - Monitoraggio progressivo della **maturazione della 13ª mensilità**.
- **Esportazione & Stampa Ufficiale**:
  - Download in formato **CSV** e **JSON**.
  - Layout per stampa e salvataggio in **PDF A4** con prospetto presenze, riepilogo ore/pasti e riquadro firme.

### 💰 Finanziamenti & Mutui (`@dexhub/loans`)
- Piani di ammortamento alla francese con calcolo dettagliato quota capitale e quota interessi.
- Monitoraggio rate residue, debito residuo, TAEG e TAN.
- Importatore ed estrattore dati da PDF / estratti conto finanziari.

### 💳 Debiti & Crediti (`@dexhub/debts`)
- Monitoraggio delle somme prestate e dovute a persone e contatti.
- Storico transazioni, rimborsi parziali e chiusura saldi.

### ✅ Attività & Progetti (`@dexhub/tasks`)
- Gestione task con suddivisione in **Spaces** tematici (Lavoro, Personale, Progetti).
- Viste a elenco e board in stile **Kanban**.
- Priorità, date di scadenza, assegnazioni e filtri intelligenti.

### 🔁 Abbonamenti & Spese Ricorrenti (`@dexhub/subscriptions`)
- Elenco servizi in abbonamento (streaming, software, utenze, palestra).
- Calcolo della spesa complessiva mensile e annuale.
- Promemoria preventivi per scadenze e rinnovi automatici.

### 📝 Note & Appunti (`@dexhub/notes`)
- Editor Markdown con rendering istantaneo.
- Organizzazione tramite tag, ricerca full-text immediata e cronologia modifiche.

### 🍕 Calcolatore Pizza (`@dexhub/pizza`)
- Calcolatore professionale per impasti pizza e lievitati.
- Dosaggio idratazione, farina (W), sale, grassi e lievito (fresco/secco/lievito madre).
- Gestione prefermenti: **Biga** e **Poolish**.
- Calcolo tempi di lievitazione in base alla temperatura ambiente e stazionamento in frigo.

---

## 🔒 Sicurezza & Amministrazione

- **Autenticazione Moderna**: basata su [Better Auth](https://better-auth.com/) con sessioni sicure e cookie HTTP-only.
- **WebAuthn / Passkeys**: supporto per login senza password tramite Touch ID, Face ID, Windows Hello o chiavi hardware FIDO2 (YubiKey).
- **Codici di Recupero Cifrati**: crittografia simmetrica **AES-256-GCM** per i codici di emergenza memorizzati a database.
- **Pannello Amministrazione Completo**:
  - Gestione utenti e ruoli (Admin / User).
  - Sistema di inviti con token crittografici monouso e approvazione richieste.
  - Audit logs tracciati per ogni operazione sensibile.
  - Notifiche broadcast in tempo reale per tutti gli utenti.
  - Modalità manutenzione con blocco selettivo delle rotte.
  - Backup istantanei scaricabili cifrati con chiave AES.

---

## 🏗 Architettura del Progetto

DexHub adotta una struttura a monorepo gestita con **Turborepo** e **pnpm workspaces**:

```
dexhub/
├── apps/
│   ├── api/                 # Backend NestJS (Fastify, Drizzle ORM, Better Auth, Brevo Mailer)
│   └── web/                 # Frontend Next.js 15 (React 19, Tailwind CSS v4, PWA)
├── modules/
│   ├── debts/               # Modulo Debiti e Crediti
│   ├── loans/               # Modulo Finanziamenti e Ammortamento
│   ├── notes/               # Modulo Note Markdown
│   ├── pizza/               # Modulo Calcolatore Impasti Pizza
│   ├── subscriptions/       # Modulo Abbonamenti e Spese Ricorrenti
│   ├── tasks/               # Modulo Attività e Kanban Spaces
│   └── worklog/             # Modulo Cartellino, CCNL e Cedolino
├── packages/
│   ├── config/              # Configurazioni condivise (TSConfig, ESLint, Prettier)
│   ├── db/                  # Schema Drizzle, migrazioni e client Neon PostgreSQL
│   ├── sdk/                 # Client API tipizzato per frontend e moduli
│   ├── ui/                  # Componenti UI condivisi e utility stili
│   └── worklog-engine/      # Motore di calcolo fiscale e festività (pure TypeScript, 0 I/O)
├── docker/                  # Script e configurazioni container Docker
├── docker-compose.yml       # Deploy stack di produzione
└── turbo.json               # Pipeline di build e test Turborepo
```

---

## 🚀 Avvio Rapido Locale

### Prerequisiti
- **Node.js**: versione `>= 22.0.0`
- **pnpm**: versione `>= 9.0.0`
- Un'istanza **PostgreSQL** attiva (es. locale o Neon serverless)

### 1. Clonazione del repository
```bash
git clone https://github.com/aleeks-code/dexhub.git
cd dexhub
```

### 2. Installazione delle dipendenze
```bash
pnpm install
```

### 3. Configurazione dell'ambiente
Copia il file di esempio `.env.example` in `.env`:
```bash
cp .env.example .env
```
Compila i parametri principali:
- `DATABASE_URL`: stringa di connessione a PostgreSQL.
- `BETTER_AUTH_SECRET`: stringa casuale a 32 byte (`openssl rand -base64 32`).
- `RECOVERY_CODE_ENCRYPTION_KEY`: chiave esadecimale a 32 byte (`openssl rand -hex 32`).
- Configurazione SMTP (es. Brevo) per l'invio degli inviti.

### 4. Esecuzione delle migrazioni del Database
```bash
pnpm --filter @dexhub/db migrate
```

### 5. Avvio dei server di sviluppo
```bash
pnpm dev
```
- **Web App**: `http://localhost:3000`
- **API Server**: `http://localhost:3001`

---

## 🔑 Variabili d'Ambiente

Le principali variabili supportate (vedi [`.env.example`](.env.example) per il template completo):

| Variabile | Descrizione | Default / Esempio |
|---|---|---|
| `NODE_ENV` | Ambiente di esecuzione (`development`, `production`) | `production` |
| `FRONTEND_URL` | URL pubblico dell'applicazione frontend | `https://dexhub.it` |
| `PORT` | Porta di ascolto del server API Fastify | `3001` |
| `DATABASE_URL` | Stringa di connessione a PostgreSQL (Neon) | `postgresql://...` |
| `BETTER_AUTH_SECRET` | Chiave segreta crittografica per le sessioni | Generata con openssl |
| `BETTER_AUTH_URL` | URL base per il routing di autenticazione | `https://dexhub.it` |
| `WEBAUTHN_RP_ID` | Dominio registrato per Passkeys (senza schema/porta) | `dexhub.it` |
| `WEBAUTHN_ORIGIN` | Origine autorizzata per WebAuthn | `https://dexhub.it` |
| `RECOVERY_CODE_ENCRYPTION_KEY` | Chiave AES-256 per codici di recupero | Esadecimale 32 byte |
| `SMTP_HOST` | Host del relay SMTP per notifiche e inviti | `smtp-relay.brevo.com` |
| `SMTP_PORT` | Porta SMTP (587 STARTTLS o 465 SSL) | `587` |
| `SMTP_USER` | Username account SMTP | Es. account Brevo |
| `SMTP_PASS` | Password / Master API Key SMTP | Chiave SMTP |
| `SMTP_FROM` | Mittente predefinito per le email | `"DexHub" <noreply@dexhub.it>` |
| `ADMIN_EMAIL` | Email amministratore per notifiche di sistema | `admin@dexhub.it` |

---

## 🛠 Script Utili

Tutti i comandi principali vengono eseguiti attraverso Turborepo:

| Comando | Descrizione |
|---|---|
| `pnpm dev` | Avvia contemporaneamente frontend, backend e watcher moduli |
| `pnpm build` | Compila l'intero monorepo per il rilascio in produzione |
| `pnpm test` | Esegue l'intera suite di test unitari con Vitest |
| `pnpm typecheck` | Esegue il controllo statico dei tipi TypeScript (`tsc --noEmit`) |
| `pnpm lint` | Esegue l'analisi statica del codice |
| `pnpm format` | Formatta tutti i file con Prettier |

---

## 🐳 Deploy con Docker

DexHub include una configurazione pronta per il rilascio containerizzato tramite Docker Compose:

```bash
# Avvio dello stack di produzione
docker compose up -d --build
```

Lo stack include:
- Container frontend ottimizzato con output standalone Next.js.
- Container backend NestJS Fastify ad alte prestazioni.
- Rete interna isolata con volumi persistenti per backup e documenti.

---

## 📄 Licenza

Questo progetto è rilasciato sotto licenza privata / proprietaria. Tutti i diritti riservati.
