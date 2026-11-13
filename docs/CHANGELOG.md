# Changelog

All notable changes to DexHub are documented here.

## [0.6.0] - 2026-11-13

### Added
- **Modulo Carta Dedicata a Te (`@dexhub/social-cards`)**:
  - Profilo completo per l'edizione 2026-2027 (500€ attuali + 500€ sbloccati automaticamente ad aprile 2027).
  - Motore di calcolo a *Checkpoint Anchor* basato sull'ultimo scontrino saldo ATM Postamat.
  - Logica FIFO interna per le tranche con countdown al 16 dicembre 2026 per la prima spesa e gestione decadenza residui.
  - Formula di scorporo per il calcolo automatico del risparmio effettivo del 15% con override manuale per eccezioni.
  - Autocompletamento con preset dei principali supermercati aderenti alle convenzioni MASAF.
- **Sicurezza Vault Bank-Grade (AES-256-GCM)**:
  - Cifratura client/server a riposo per numero completo carta (PAN), PIN ATM Postamat, data di scadenza e CVV.
  - Derivazione chiavi crittografiche PBKDF2 (100.000 iterazioni con SHA-256 e salt univoco).
  - Vettore di inizializzazione (IV) casuale a 12 byte per ogni singolo campo cifrato.
  - Conformità standard PCI-DSS (solo le ultime 4 cifre restano in chiaro per il rendering mascherato).
- **Procedura di Sicurezza a Doppia Conferma per PIN**:
  - Modal di protezione dedicato prima di svelare il PIN a 5 cifre dello sportello Postamat.
  - Presa visione obbligatoria con checkbox di consapevolezza sicurezza.
  - Timer automatico di auto-oscuramento a 30 secondi con pulsante di mascheramento immediato.
- **Visualizzatore Tessera Fisica Fotorealistico**:
  - Proporzioni ufficiali ISO/IEC 7810 ID-1 con angoli arrotondati, texture speculare plastificata e caratteri a sbalzo (3D embossed).
  - Chip microprocessore EMV con pattern contatti ISO 7816 e finitura metallica *Champagne Gold*.
  - Icona Contactless e monogramma ufficiale Poste Italiane.
  - Logo ufficiale Mastercard vettoriale con cerchi sovrapposti rosso/giallo e lente arancione.
  - Controllo di visibilità rapido integrato direttamente sulla tessera tramite sola icona occhio.
- **Riordinamento Moduli nella Sidebar**:
  - Maniglia a matrice 3×3 a 9 punti (`Grip`) a sinistra di ogni voce nella barra di navigazione.
  - Drag & Drop nativo HTML5 con riga indicatrice di rilascio luminescente (*primary*).
  - Persistenza dell'ordine personalizzato tramite LocalStorage/Zustand con pulsante di ripristino istantaneo.
  - Sincronizzazione automatica dell'ordine sulla navigazione mobile (bottom bar e drawer moduli).

### Changed
- **Armonizzazione Palette Semantica e Design System**:
  - Standardizzazione dei colori di sistema: giallo 300–400 per warning e urgenze moderate, rose-400 per scadenze superate ed errori, slate neutro per richieste in attesa (pending) e undo, champagne gold per elementi speciali/chip.
  - Eliminazione dei gradienti e delle tinte arancioni non coordinate in Panoramica, Notifiche e Debiti & Crediti.
  - Differenziazione a tre livelli per le scadenze: neutro (>3 giorni), giallo chiaro (entro 3 giorni), rosso/rosa (scaduto).

### Fixed
- Risolto errore JavaScript `Cannot read properties of null (reading 'dataset')` nel drag leave della sidebar.
- Risolto errore Mixed Content su `manifest.webmanifest` nel middleware Next.js forzando HTTPS e rendendo pubblici gli asset PWA.
- Migliorata la reattività e lo scrolling dei modali con tastiera virtuale mobile attiva (`max-h-[90vh] overflow-y-auto`).

## [0.5.0] - 2026-07-12
- Trattenuta mensa con conteggio pasti automatico e override giornaliero su Worklog.

## [Unreleased]

### Added
- Initial monorepo scaffold (Phase 7)
- `packages/sdk` — Module SDK with types, events, permissions, storage, errors, Result<T>
- `packages/db` — Drizzle ORM schemas for all 15 tables (users, sessions, passkeys, recovery codes, roles, permissions, role_permissions, user_roles, settings, setup_tokens, module_registry, module_settings, module_kv_store, audit_logs, cache_store)
- `packages/ui` — Shared component library with Button and cn/CVA utilities
- `packages/config` — Shared TypeScript, ESLint, Prettier configs
- `apps/web` — Next.js 15 frontend with App Router, dark-first design system, Zustand store
- `apps/api` — NestJS 11 + Fastify backend with health endpoint, global exception filter, Zod pipe
- Docker Compose (production and development)
- Caddy reverse proxy with security headers
- GitHub Actions CI/CD workflows
- Module template scaffold (`modules/_template`)
- Architecture documentation and 9 ADRs
