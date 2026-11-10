# DexHub — Redesign landing page pubblica (v2 di 1a / "2a")

**Data**: 2026-07-15
**Origine**: progetto Claude Design "DexHub landing page design" (`81fecb64-1e69-43d8-9b69-bc25ab74bd10`, file `DexHub Landing.dc.html`), opzione **2a** ("v2 di 1a — la comunicazione vende il prodotto") scelta esplicitamente dall'utente tra 4 direzioni disponibili nel file (2a, 1a, 1b, 1c).

## Obiettivo

Sostituire lo splash minimale attuale (`apps/web/src/app/landing-page.tsx`) con una landing page multi-sezione a tema navy/prodotto, preservando ogni funzione reale già esistente (form invito reale con email+telefono, redirect se già loggato, endpoint `/api/v1/invite-requests`), senza introdurre framing tecnico (self-hosted/Docker/installazione) né moduli o dati fittizi al posto di quelli reali.

**Tono generale (vincolo trasversale)**: tutta la copy parla del prodotto e dei benefici per l'utente finale — mai linguaggio da developer/self-hosting/infrastruttura. DexHub si presenta come "web app modulare per organizzare la propria vita", mai come "piattaforma che tu ospiti".

## Architettura

- `apps/web/src/app/page.tsx` — **invariato** (redirect a `/dashboard` se cookie sessione presente, altrimenti `<LandingPage />`).
- `apps/web/src/app/landing-page.tsx` — riscritto, diventa l'orchestratore: stato del form invito (email/telefono/paese/submitted/loading/error) + rendering dei sotto-componenti in ordine.
- Nuova cartella `apps/web/src/app/_landing/` con un componente per sezione:
  - `nav.tsx` — barra fissa in alto.
  - `hero.tsx` — headline + CTA + console animata decorativa.
  - `moduli-section.tsx` — griglia moduli reali.
  - `perche-section.tsx` — 3 benefici.
  - `come-section.tsx` — 3 step (copy user-facing).
  - `chi-section.tsx` — bio Alex con placeholder iniziali.
  - `invito-section.tsx` — form reale, inline (non più modal).
  - `footer.tsx`.
- Styling: CSS Module dedicato (mirror del `page.module.css` attuale — la pagina ha sempre avuto un linguaggio visivo isolato dall'app autenticata, niente Tailwind qui per gli stessi motivi già validi oggi: troppi valori arbitrari/gradiente/animazioni custom per essere puliti in utility classes).
- Font: **riuso Geist Sans + Geist Mono**, già installati e usati da tutta l'app (`geist/font/sans`/`geist/font/mono`, `layout.tsx:2-3`) — zero richieste esterne (pacchetto npm, non Google Fonts), coerenti col resto dell'app. Geist Sans per tutto (heading inclusi, sostituisce Poppins/Manrope del mockup), Geist Mono solo nella console dell'hero (sostituisce JetBrains Mono). Decisione presa in sede di piano dopo scoperta che Geist era già presente: stessa motivazione dell'utente ("meno richieste HTTP, più coerenza") servita meglio da zero richieste esterne che da due (Manrope+JetBrains Mono via Google Fonts).
- Logo: **riuso `/icon.png` già presente in app** (`apps/web/src/app/icon.png`, 512×512) — verificato contro l'asset `dexhub-mark.png` del progetto Design (anch'esso 512×512, stesso logo con export diverso): nessun asset duplicato da introdurre.

## Contenuto — sezione per sezione

### Nav
Moduli · Come funziona · Chi c'è dietro · **Accedi** (link testuale, stesso stile degli altri, verso `/login`) · **Richiedi un invito** (CTA piena, scroll-to `#invito` invece di aprire un modal).

### Hero
Headline/sottotitolo/CTA del mockup 2a **come riferimento, non intoccabili**: se durante l'implementazione emerge una micro-miglioria di copy che rende il messaggio più chiaro senza cambiarne il significato, applicarla — nessun obbligo di copiare la frase pixel-per-pixel.

Console animata a destra **mantenuta come elemento decorativo** ma con contenuto aggiornato per riflettere DexHub reale — righe tipo:
```
$ dexhub status
✓ Workspace avviato        bentornato
✓ Note sincronizzate       3 nuove oggi
✓ To-Do aggiornato         2 completati
✓ Cartellino registrato    ore di oggi salvate
✓ Sincronizzazione ok      tutto aggiornato
```
Zero riferimenti a Docker/installazione/container — solo workspace/moduli/sincronizzazione, coerente col divieto di linguaggio tecnico. **Deve leggersi come la console di DexHub, non come un terminale Linux generico** — evitare estetica da shell POSIX (prompt `$` va bene come richiamo, ma niente `ls`/`cd`/percorsi Unix/output da sistema operativo): è un pannello di stato del prodotto, non una sessione shell.

### Moduli (sezione "Uno strumento per ogni cosa")
4 card, non 6: **Notes** (icona `FileText`), **To-Do** (icona `CheckSquare`), **Cartellino** (icona `Clock`) — icone lucide-react reali, stesse dell'app — più una quarta card **"Molti altri in arrivo"** con **stesso stile identico alle altre 3** (niente bordo tratteggiato/slot vuoto — deve leggersi come una feature, non come un buco), icona **✨** al posto dell'icona-lucide. Griglia **4 colonne su desktop, 2×2 sotto il breakpoint tablet** (non più 3×2 del mockup).

### Perché DexHub
Copy del mockup **invariato** (Modulare / Tutto insieme / Privacy) — già orientato ai benefici, nessuna modifica richiesta.

### Come funziona
Copy **sostituito**, meno tecnico:
1. **Scegli i moduli che ti servono.**
2. **Organizza tutto in un unico posto.**
3. **DexHub cresce insieme alle tue esigenze.**

Layout 3 colonne del mockup mantenuto (numerazione 01/02/03 ok qui: è un vero processo in ordine — scegli poi organizzi poi cresci).

### Chi c'è dietro
Testo del mockup invariato ("Costruito da Alex Munafò" + i due paragrafi). Foto → **placeholder iniziali "AM"** su cerchio con colore accento (facilmente sostituibile in futuro con un file immagine reale). **Tono**: deve trasmettere autenticità, non linguaggio autoreferenziale/promozionale — niente frasi tipo "la mia missione è rivoluzionare...", nessuna retorica da manifesto.

### Richiedi un invito
**Cambio funzionale rispetto a oggi**: da modal a **sezione inline ancorata** `#invito`, stile del mockup (card scura con bordo/gradiente accento). Dentro, il **form reale** esistente — non quello semplificato del mockup (solo email): email + telefono con selettore prefisso (49 paesi, invariato), stesso `POST /api/v1/invite-requests`, stessi stati di successo/errore. Il bottone "Richiedi un invito" in nav/hero fa scroll-to invece di aprire popup.

### Footer
Struttura del mockup, link **Moduli · Come funziona · Chi c'è dietro** (niente "Privacy" — nessuna pagina esiste oggi, evitare un link morto).

## Responsive

Progettazione **mobile-first**, stessi contenuti su ogni breakpoint (nessuna sezione omessa o con versione alternativa su mobile):
- Hero completamente leggibile su smartphone, zero overflow orizzontale.
- Navbar con menu mobile (hamburger/drawer) sotto il breakpoint tablet — i 5 link nav (Moduli/Come funziona/Chi c'è dietro/Accedi/Richiedi un invito) non stanno affiancati su schermo stretto.
- Console dell'hero ridimensionata ma **sempre presente** anche su mobile (mai nascosta).
- Griglia moduli: 2×2 su mobile (coerente con la griglia responsive già decisa sopra).

## Cosa NON cambia
- Route `/` e il gate redirect-se-loggato.
- Endpoint reale `/api/v1/invite-requests` e il suo contratto (email + phone opzionale).
- Selettore prefisso telefonico (49 paesi) — stessa lista, stesso comportamento.
- Nessun nuovo modulo reale viene creato: la card "in arrivo" è puramente comunicativa.

## Testing / verifica
Nessun tool di automazione browser disponibile in questo ambiente (vincolo noto, vale per tutto il progetto) — verifica tramite: `tsc --noEmit` su `apps/web`, avvio dev server e controllo manuale dei link/ancore/form (submit reale contro l'endpoint), conferma visiva esplicita dell'utente prima di dichiarare il lavoro concluso.
