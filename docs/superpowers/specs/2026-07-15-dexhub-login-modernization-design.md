# DexHub — Login modernization (modal su landing + restyle pagina /login)

**Data**: 2026-07-15
**Origine**: seguito diretto del redesign landing page (opzione "2a", stessa sessione) — l'utente vuole login raggiungibile dalla landing senza uscirne, e la pagina `/login` esistente rimodernizzata nello stesso stile navy/dinamico.

## Obiettivo

Aggiungere un modal di login sulla landing page (trigger: "Accedi" in nav) e rimodernizzare la pagina `/login` separata, riusando un **solo** componente logico (`LoginForm`, invariato nel comportamento) restylato una volta sola e montato in entrambi i contenitori. Zero duplicazione di logica auth, zero modifica a endpoint/WebAuthn/i18n.

## Vincoli invariati

- Logica di `login-form.tsx` **non tocco**: stesse 3 modalità (passkey default / recovery / emergency), stessi fetch verso `/api/v1/auth/*`, stesso `startAuthentication` di `@simplewebauthn/browser`, stessa i18n `t.login.*` — **redesign visivo puro**.
- Route `/login` resta raggiungibile diretta (bookmark, redirect da altri punti dell'app) — non sparisce.
- Nessun nuovo endpoint, nessuna migration.
- Font: Geist Sans/Mono (stessi della landing, zero richieste esterne) — nessun nuovo font.
- No test runner in `apps/web` (invariato) — verifica via `tsc --noEmit` + manuale (dev server / stack reale), stesso pattern del redesign landing.

## Architettura

- **`apps/web/src/core/components/login-form.tsx`** (modificato) — solo le classi cambiano: da Tailwind (`bg-surface`/`bg-bg`/`text-error`/`bg-warning-muted` ecc.) a un nuovo CSS Module colocato `login-form.module.css`. Il componente **non renderizza più il proprio bordo/sfondo card** (evita card-dentro-card nel modal) — chi lo monta fornisce il contenitore.
- **`apps/web/src/core/components/login-form.module.css`** (nuovo) — esporta `.card` (contenitore condiviso: sfondo `#04101f`, bordo `rgba(255,255,255,.1)`, ombra `0 30px 80px rgba(0,0,0,.5)`, stesso "materiale" della console hero) + tutte le classi interne del form (titolo, input, bottoni, toggle "problemi con accesso?", box warning emergency).
- **`apps/web/src/app/_landing/login-modal.tsx`** (nuovo) — backdrop scuro cliccabile-per-chiudere + `.card` (da `login-form.module.css`) contenente `<LoginForm/>`. `Esc` chiude, focus spostato sul modal all'apertura e ripristinato sul trigger alla chiusura, `document.body` overflow bloccato mentre aperto.
- **`apps/web/src/app/_landing/nav.tsx`** (modificato) — "Accedi" (desktop e mobile) passa da `<Link href="/login">` a `<button onClick={...}>` che apre `LoginModal`. Stato apertura vive dentro `Nav` (unico trigger, zero context/prop-drilling). `Nav` renderizza `<LoginModal open={...} onClose={...}/>` come sibling della propria barra.
- **`apps/web/src/app/(auth)/login/page.tsx`** (modificato) — sfondo navy pieno (`#031b35`, stesso glow radiale decorativo dell'hero, via nuovo `login.module.css` colocato) invece dell'attuale `bg-bg` chiaro. Monta `<div className={loginFormStyles.card}><LoginForm/></div>` — stesso identico markup interno del modal, contenitore diverso.

## Palette/dettagli aggiunti (non presenti nella landing, nuovi solo qui)

- **Warning emergency-mode**: box ambra `#F5A623` su `rgba(245,166,35,.1)`, bordo `rgba(245,166,35,.3)` — sostituisce `bg-warning-muted`/`text-warning` di oggi. Non esiste nella palette landing (che non aveva bisogno di un colore "attenzione"), introdotto qui perché la modalità emergency lo richiede semanticamente.
- Input/focus/bottone primario: **riuso esatto** degli stili già scritti per `invito-section.tsx` (sfondo `rgba(3,27,53,.6)`, bordo `rgba(255,255,255,.18)`, focus `#2fe6a0`) e del bottone primario verde menta della landing — zero nuova invenzione visiva lì.

## Cosa NON cambia

- Comportamento delle 3 modalità di login (passkey/recovery/emergency) — stesso codice, stessi endpoint, stessi messaggi i18n.
- Route `/login` — resta una pagina reale e diretta.
- Nessun nuovo campo di dati, nessuna nuova chiamata API.

## Testing / verifica

Nessun tool di automazione browser disponibile in questo ambiente (vincolo noto, invariato) — verifica tramite `tsc --noEmit`, avvio stack reale (`docker compose up -d --build web`, dominio `https://192-168-1-3.nip.io`), controllo manuale: apertura/chiusura modal (bottone, backdrop, Esc), le 3 modalità di login sia nel modal sia sulla pagina `/login` diretta, focus trap basilare, nessuna regressione sul flusso passkey/recovery/emergency reale.
