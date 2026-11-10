# DexHub Landing Page Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current single-hero landing splash (`apps/web/src/app/landing-page.tsx`) with a full multi-section navy/product-themed public landing page (design option "2a"), while preserving every real function that exists today (invite-request form, redirect-if-logged-in) and never introducing fictional modules or self-hosted/Docker framing.

**Architecture:** One new folder `apps/web/src/app/_landing/` holds one file per page section (Nav, Hero, Moduli, Perché, Come, Chi, Invito, Footer) plus one shared CSS Module. `apps/web/src/app/landing-page.tsx` becomes a thin Server Component that renders the sections in order. Only `Nav` (mobile menu toggle), `Hero` (console demo animation) and `InvitoSection` (form state) are Client Components — everything else is static and needs no JS on the client.

**Tech Stack:** Next.js App Router, React, TypeScript, CSS Modules (no Tailwind for this page — matches the existing isolated landing-page styling convention), lucide-react icons, Geist Sans/Geist Mono (already installed, zero external font requests).

## Global Constraints

- Tone: product/user-benefit language only, everywhere — never "self-hosted", "Docker", "installazione", "server", "container".
- Only 3 real modules exist today (Notes, To-Do, Cartellino) — never show fictional modules (Spese/Password/Promemoria/Ricette/Meteo/etc. from the original mockup).
- The invite form is the REAL one (email + phone with country-code picker, `POST /api/v1/invite-requests`) — never the mockup's simplified email-only form.
- Fonts: Geist Sans (everywhere) + Geist Mono (console only) — already installed via the `geist` npm package (`layout.tsx`), zero external font requests. Never Google Fonts.
- Logo: reuse `apps/web/src/app/icon.png` (already in the app) — never introduce a duplicate logo asset.
- Mobile-first: every section must work at mobile width, same content as desktop (no section hidden/replaced on mobile).
- No "Privacy" footer link (no privacy page exists today — would be a dead link).
- No automated test runner exists for `apps/web` (confirmed: no vitest/jest config, zero `*.test.tsx` files). Verification for every task is `tsc --noEmit` + a concrete manual dev-server check — this matches the established convention for this entire codebase (every other frontend task in this project's history is verified this way, never with component tests).

---

## Task 1: Shared CSS foundation + Nav (with mobile menu)

**Files:**
- Create: `apps/web/src/app/_landing/landing.module.css`
- Create: `apps/web/src/app/_landing/nav.tsx`
- Modify: `apps/web/src/app/landing-page.tsx`

**Interfaces:**
- Produces: `styles` export surface in `landing.module.css` (CSS Modules — each task adds its own classes to this one shared file, classes are additive, later tasks never rename earlier classes). `Nav` component, no props (self-contained, no external state).

- [ ] **Step 1: Create the shared CSS file with root/container/nav classes**

Create `apps/web/src/app/_landing/landing.module.css`:

```css
/* ── Root / layout — shared by every _landing section ── */
.page {
  position: relative;
  min-height: 100vh;
  background: hsl(207 84% 11%);
  color: #eaf4f1;
  overflow-x: hidden;
}

.container {
  max-width: 1180px;
  margin: 0 auto;
  padding: 0 20px;
}

@media (min-width: 768px) {
  .container {
    padding: 0 48px;
  }
}

/* ── Nav ── */
.nav {
  position: sticky;
  top: 0;
  z-index: 40;
  background: hsl(207 84% 11% / 0.92);
  backdrop-filter: blur(8px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.navInner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
}

@media (min-width: 768px) {
  .navInner {
    padding: 20px 48px;
  }
}

.navBrand {
  display: flex;
  align-items: center;
  gap: 11px;
}

.navLogo {
  width: 32px;
  height: 32px;
  border-radius: 9px;
  display: block;
}

.navName {
  font-size: 18px;
  font-weight: 600;
  color: #fff;
}

.navAccent {
  color: #4fc9dc;
}

.navLinks {
  display: none;
  align-items: center;
  gap: 28px;
}

@media (min-width: 768px) {
  .navLinks {
    display: flex;
  }
}

.navLink {
  color: rgba(234, 244, 241, 0.72);
  font-size: 14px;
  font-weight: 500;
  text-decoration: none;
  transition: color 0.15s;
}

.navLink:hover,
.navLink:focus-visible {
  color: #fff;
}

.navCta {
  background: #2fe6a0;
  color: #031b35;
  font-size: 14px;
  font-weight: 600;
  padding: 10px 20px;
  border-radius: 10px;
  text-decoration: none;
  transition: background 0.15s;
  border: none;
  cursor: pointer;
  display: inline-block;
}

.navCta:hover,
.navCta:focus-visible {
  background: #5cf0b8;
}

.navMobileToggle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 9px;
  color: #eaf4f1;
  cursor: pointer;
}

@media (min-width: 768px) {
  .navMobileToggle {
    display: none;
  }
}

.navMobilePanel {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 8px 20px 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}

@media (min-width: 768px) {
  .navMobilePanel {
    display: none !important;
  }
}

.navMobileLink {
  color: rgba(234, 244, 241, 0.8);
  font-size: 15px;
  font-weight: 500;
  text-decoration: none;
  padding: 12px 4px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.navMobileCta {
  margin-top: 8px;
  text-align: center;
  background: #2fe6a0;
  color: #031b35;
  font-size: 15px;
  font-weight: 600;
  padding: 12px 20px;
  border-radius: 10px;
  text-decoration: none;
}
```

- [ ] **Step 2: Create the Nav component**

Create `apps/web/src/app/_landing/nav.tsx`:

```tsx
'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Menu, X } from 'lucide-react'
import styles from './landing.module.css'

const LINKS = [
  { href: '#moduli', label: 'Moduli' },
  { href: '#come', label: 'Come funziona' },
  { href: '#chi', label: 'Chi c’è dietro' },
]

export function Nav() {
  const [open, setOpen] = useState(false)

  return (
    <header className={styles.nav}>
      <div className={styles.navInner}>
        <div className={styles.navBrand}>
          <Image src="/icon.png" alt="DexHub" width={32} height={32} className={styles.navLogo} priority />
          <span className={styles.navName}>
            <span className={styles.navAccent}>Dex</span>Hub
          </span>
        </div>

        <nav className={styles.navLinks} aria-label="Sezioni">
          {LINKS.map((l) => (
            <a key={l.href} href={l.href} className={styles.navLink}>{l.label}</a>
          ))}
          <Link href="/login" className={styles.navLink}>Accedi</Link>
          <a href="#invito" className={styles.navCta}>Richiedi un invito</a>
        </nav>

        <button
          type="button"
          className={styles.navMobileToggle}
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-controls="landing-mobile-nav"
          aria-label={open ? 'Chiudi il menu' : 'Apri il menu'}
        >
          {open ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
        </button>
      </div>

      {open && (
        <nav id="landing-mobile-nav" className={styles.navMobilePanel} aria-label="Sezioni (mobile)">
          {LINKS.map((l) => (
            <a key={l.href} href={l.href} className={styles.navMobileLink} onClick={() => setOpen(false)}>
              {l.label}
            </a>
          ))}
          <Link href="/login" className={styles.navMobileLink} onClick={() => setOpen(false)}>Accedi</Link>
          <a href="#invito" className={styles.navMobileCta} onClick={() => setOpen(false)}>Richiedi un invito</a>
        </nav>
      )}
    </header>
  )
}
```

- [ ] **Step 3: Wire Nav into the orchestrator**

Replace the full contents of `apps/web/src/app/landing-page.tsx` with:

```tsx
import styles from './_landing/landing.module.css'
import { Nav } from './_landing/nav'

export function LandingPage() {
  return (
    <div className={styles.page}>
      <Nav />
    </div>
  )
}
```

(This intentionally drops the old modal/hero/aurora JSX — it comes back, restyled, in later tasks. `apps/web/src/app/page.module.css` stays on disk untouched for now; it gets deleted in Task 9 once nothing imports it.)

- [ ] **Step 4: Typecheck**

Run: `pnpm --filter=@dexhub/web exec tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Manual verification**

Run: `pnpm --filter=@dexhub/web dev`
Open `http://localhost:3000/` (log out first, or use an incognito window, so the redirect-if-logged-in gate doesn't kick in).
Expected: a sticky navy nav bar with the DexHub logo + wordmark on the left, "Moduli / Come funziona / Chi c'è dietro / Accedi" + a mint-green "Richiedi un invito" button on the right (desktop width). Shrink the window below ~768px: the links disappear, a hamburger button appears on the right; clicking it opens a stacked mobile menu with the same links + Accedi + CTA; clicking any mobile link closes the menu.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/app/_landing/landing.module.css apps/web/src/app/_landing/nav.tsx apps/web/src/app/landing-page.tsx
git commit -m "feat(landing): add nav with mobile menu, replace old splash shell"
```

---

## Task 2: Hero section (headline, CTAs, animated console)

**Files:**
- Modify: `apps/web/src/app/_landing/landing.module.css` (append hero classes)
- Create: `apps/web/src/app/_landing/hero.tsx`
- Modify: `apps/web/src/app/landing-page.tsx`

**Interfaces:**
- Consumes: `styles` from `landing.module.css` (Task 1).
- Produces: `Hero` component, no props.

- [ ] **Step 1: Append hero CSS**

Append to `apps/web/src/app/_landing/landing.module.css`:

```css
/* ── Hero ── */
.hero {
  position: relative;
  overflow: hidden;
}

.heroGlow {
  position: absolute;
  top: -160px;
  right: -120px;
  width: 560px;
  height: 560px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(47, 230, 160, 0.14), transparent 62%);
  animation: glowdrift 14s ease-in-out infinite;
  pointer-events: none;
}

@keyframes glowdrift {
  0% { transform: translate(-8%, -4%) scale(1); }
  50% { transform: translate(6%, 5%) scale(1.12); }
  100% { transform: translate(-8%, -4%) scale(1); }
}

@media (prefers-reduced-motion: reduce) {
  .heroGlow {
    animation: none;
  }
}

.heroGrid {
  position: relative;
  display: grid;
  grid-template-columns: 1fr;
  gap: 40px;
  padding: 48px 0 56px;
}

@media (min-width: 900px) {
  .heroGrid {
    grid-template-columns: 1.05fr 0.95fr;
    align-items: center;
    padding: 72px 0 80px;
  }
}

.heroEyebrow {
  font-family: var(--font-mono);
  font-size: 12px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: #4fc9dc;
  margin-bottom: 18px;
}

.heroHeadline {
  font-size: 34px;
  line-height: 1.15;
  font-weight: 600;
  color: #fff;
  margin: 0 0 20px;
  text-wrap: balance;
}

@media (min-width: 900px) {
  .heroHeadline {
    font-size: 50px;
  }
}

.heroAccent {
  color: #2fe6a0;
}

.heroSubline {
  font-size: 16px;
  line-height: 1.65;
  color: rgba(234, 244, 241, 0.66);
  margin: 0 0 30px;
  max-width: 480px;
  text-wrap: pretty;
}

.heroActions {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  align-items: center;
  margin-bottom: 22px;
}

.btnPrimary {
  background: #2fe6a0;
  color: #031b35;
  font-size: 15px;
  font-weight: 600;
  padding: 14px 26px;
  border-radius: 12px;
  text-decoration: none;
  box-shadow: 0 8px 24px rgba(47, 230, 160, 0.25);
  transition: background 0.15s, transform 0.15s;
  border: none;
  cursor: pointer;
  display: inline-block;
}

.btnPrimary:hover,
.btnPrimary:focus-visible {
  background: #5cf0b8;
  transform: translateY(-1px);
}

.btnSecondary {
  color: #eaf4f1;
  font-size: 15px;
  font-weight: 600;
  padding: 14px 22px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.16);
  text-decoration: none;
  transition: border-color 0.15s, color 0.15s;
  background: transparent;
  cursor: pointer;
  display: inline-block;
}

.btnSecondary:hover,
.btnSecondary:focus-visible {
  border-color: rgba(255, 255, 255, 0.4);
  color: #fff;
}

.heroMicro {
  font-family: var(--font-mono);
  font-size: 12px;
  color: rgba(234, 244, 241, 0.4);
}

/* ── Console (decorative demo, Geist Mono, DexHub-flavored — never a Linux shell) ── */
.console {
  background: #04101f;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 30px 80px rgba(0, 0, 0, 0.5);
}

.consoleHeader {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.07);
  background: rgba(255, 255, 255, 0.02);
}

.consoleDot {
  width: 11px;
  height: 11px;
  border-radius: 50%;
  display: block;
}

.consoleTitle {
  flex: 1;
  text-align: center;
  font-family: var(--font-mono);
  font-size: 11.5px;
  color: rgba(234, 244, 241, 0.45);
}

.consoleBody {
  padding: 22px 24px;
  font-family: var(--font-mono);
  font-size: 13.5px;
  line-height: 2.1;
  min-height: 260px;
}

.consolePromptLine {
  color: rgba(234, 244, 241, 0.4);
}

.consoleCmd {
  color: #eaf4f1;
}

.consoleCursor {
  display: inline-block;
  width: 9px;
  height: 16px;
  background: #2fe6a0;
  vertical-align: -3px;
  margin-left: 2px;
  animation: blink 1.1s steps(1) infinite;
}

@keyframes blink {
  0%, 55% { opacity: 1; }
  56%, 100% { opacity: 0; }
}

.consoleLine {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  animation: fadeup 0.35s ease both;
}

@keyframes fadeup {
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: none; }
}

.consoleCheck {
  color: #2fe6a0;
}

.consoleLabel {
  color: rgba(234, 244, 241, 0.88);
}

.consoleTime {
  color: rgba(234, 244, 241, 0.35);
}

.consoleSummary {
  margin-top: 10px;
  padding-top: 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  color: #2fe6a0;
  animation: fadeup 0.35s ease both;
}

@media (prefers-reduced-motion: reduce) {
  .consoleCursor,
  .consoleLine,
  .consoleSummary {
    animation: none;
  }
}
```

- [ ] **Step 2: Create the Hero component**

Create `apps/web/src/app/_landing/hero.tsx`:

```tsx
'use client'

import { useEffect, useState } from 'react'
import styles from './landing.module.css'

const CMD = 'dexhub status'

const LINES = [
  { label: 'Workspace avviato', time: 'bentornato' },
  { label: 'Note sincronizzate', time: '3 nuove oggi' },
  { label: 'To-Do aggiornato', time: '2 completati' },
  { label: 'Cartellino registrato', time: 'ore di oggi salvate' },
]

export function Hero() {
  const [tick, setTick] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setTick((t) => (t > 90 ? 0 : t + 1)), 90)
    return () => clearInterval(id)
  }, [])

  const typedChars = Math.min(tick, CMD.length)
  const typing = tick < CMD.length + 2
  const linesShown = tick < CMD.length + 4 ? 0 : Math.min(LINES.length, Math.floor((tick - CMD.length - 4) / 6) + 1)
  const summaryShown = tick >= CMD.length + 4 + LINES.length * 6 + 4

  return (
    <section className={styles.hero}>
      <div className={styles.heroGlow} aria-hidden="true" />
      <div className={`${styles.container} ${styles.heroGrid}`}>
        <div>
          <div className={styles.heroEyebrow}>Beta privata &middot; accesso su invito</div>
          <h1 className={styles.heroHeadline}>
            Le app di tutti i giorni, <span className={styles.heroAccent}>in un posto solo.</span>
          </h1>
          <p className={styles.heroSubline}>
            DexHub è una web app modulare che riunisce gli strumenti che usi ogni giorno in un unico posto:
            note, attività e cartellino, con altri moduli in arrivo.
          </p>
          <div className={styles.heroActions}>
            <a href="#invito" className={styles.btnPrimary}>Richiedi un invito</a>
            <a href="#moduli" className={styles.btnSecondary}>Scopri i moduli</a>
          </div>
          <div className={styles.heroMicro}>posti limitati &middot; i tuoi dati restano tuoi</div>
        </div>

        <div className={styles.console} aria-hidden="true">
          <div className={styles.consoleHeader}>
            <span className={styles.consoleDot} style={{ background: '#FF5F57' }} />
            <span className={styles.consoleDot} style={{ background: '#FEBC2E' }} />
            <span className={styles.consoleDot} style={{ background: '#28C840' }} />
            <span className={styles.consoleTitle}>dexhub — il tuo workspace</span>
            <span style={{ width: 47 }} />
          </div>
          <div className={styles.consoleBody}>
            <div>
              <span className={styles.consolePromptLine}>$</span>{' '}
              <span className={styles.consoleCmd}>{CMD.slice(0, typedChars)}</span>
              {typing && <span className={styles.consoleCursor} />}
            </div>
            {LINES.slice(0, linesShown).map((l) => (
              <div key={l.label} className={styles.consoleLine}>
                <span>
                  <span className={styles.consoleCheck}>&#10003;</span>{' '}
                  <span className={styles.consoleLabel}>{l.label}</span>
                </span>
                <span className={styles.consoleTime}>{l.time}</span>
              </div>
            ))}
            {summaryShown && (
              <div className={styles.consoleSummary}>tutto sincronizzato &middot; un posto solo</div>
            )}
            {summaryShown && (
              <div>
                <span className={styles.consolePromptLine}>$</span> <span className={styles.consoleCursor} />
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 3: Wire Hero into the orchestrator**

Update `apps/web/src/app/landing-page.tsx`:

```tsx
import styles from './_landing/landing.module.css'
import { Nav } from './_landing/nav'
import { Hero } from './_landing/hero'

export function LandingPage() {
  return (
    <div className={styles.page}>
      <Nav />
      <Hero />
    </div>
  )
}
```

- [ ] **Step 4: Typecheck**

Run: `pnpm --filter=@dexhub/web exec tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Manual verification**

Run: `pnpm --filter=@dexhub/web dev`, open `http://localhost:3000/`.
Expected: headline "Le app di tutti i giorni, in un posto solo." (accent on the last part), subline mentioning Note/attività/cartellino (never Docker/self-hosted/password/spese), two buttons ("Richiedi un invito" scrolls to the bottom of the page once `#invito` exists in Task 7, "Scopri i moduli" scrolls once `#moduli` exists in Task 3 — clicking now is a harmless no-op scroll-to-nothing, expected until those tasks land). On the right (desktop) / below (mobile, check by narrowing the window — the grid must collapse to one column, console never disappears), a dark console box types `dexhub status`, reveals 4 checklist lines one at a time, shows a green summary line, then a blinking cursor loop. Confirm the console text never mentions Docker/install/Unix paths.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/app/_landing/landing.module.css apps/web/src/app/_landing/hero.tsx apps/web/src/app/landing-page.tsx
git commit -m "feat(landing): add hero section with DexHub-flavored console demo"
```

---

## Task 3: Moduli section (real modules grid)

**Files:**
- Modify: `apps/web/src/app/_landing/landing.module.css` (append section header + moduli classes)
- Create: `apps/web/src/app/_landing/moduli-section.tsx`
- Modify: `apps/web/src/app/landing-page.tsx`

**Interfaces:**
- Consumes: `styles` from `landing.module.css`.
- Produces: `ModuliSection` component, no props.

- [ ] **Step 1: Append section-header (reused by Moduli/Perché/Come) + moduli grid CSS**

Append to `apps/web/src/app/_landing/landing.module.css`:

```css
/* ── Shared section header (reused by Moduli / Perché / Come) ── */
.section {
  padding: 56px 0;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}

.sectionEyebrow {
  font-family: var(--font-mono);
  font-size: 12px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: #4fc9dc;
  margin-bottom: 12px;
}

.sectionTitle {
  font-size: 26px;
  font-weight: 600;
  color: #fff;
  margin: 0 0 10px;
}

@media (min-width: 900px) {
  .sectionTitle {
    font-size: 32px;
  }
}

.sectionSubline {
  font-size: 15px;
  line-height: 1.6;
  color: rgba(234, 244, 241, 0.6);
  margin: 0 0 36px;
  max-width: 520px;
  text-wrap: pretty;
}

/* ── Moduli ── */
.moduliGrid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

@media (min-width: 768px) {
  .moduliGrid {
    grid-template-columns: repeat(4, 1fr);
  }
}

.moduleCard {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 14px;
  padding: 22px 20px;
  transition: border-color 0.15s, transform 0.15s;
}

.moduleCard:hover {
  border-color: rgba(47, 230, 160, 0.45);
  transform: translateY(-2px);
}

.moduleIcon {
  width: 40px;
  height: 40px;
  border-radius: 11px;
  background: rgba(47, 230, 160, 0.12);
  color: #2fe6a0;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16px;
}

.moduleTitle {
  font-size: 16px;
  font-weight: 600;
  color: #fff;
  margin: 0 0 6px;
}

.moduleDesc {
  font-size: 13.5px;
  line-height: 1.55;
  color: rgba(234, 244, 241, 0.58);
  margin: 0;
}
```

- [ ] **Step 2: Create the Moduli section component**

Create `apps/web/src/app/_landing/moduli-section.tsx`:

```tsx
import { CheckSquare, Clock, FileText, Sparkles } from 'lucide-react'
import styles from './landing.module.css'

const MODULES = [
  { icon: FileText, name: 'Note', desc: 'Appunti e idee, sempre a portata di mano.' },
  { icon: CheckSquare, name: 'To-Do', desc: 'Organizza le tue attività, da solo o con altri.' },
  { icon: Clock, name: 'Cartellino', desc: 'Tieni traccia delle tue ore, mese per mese.' },
]

export function ModuliSection() {
  return (
    <section id="moduli" className={styles.section}>
      <div className={styles.container}>
        <div className={styles.sectionEyebrow}>Moduli</div>
        <h2 className={styles.sectionTitle}>Uno strumento per ogni cosa.</h2>
        <p className={styles.sectionSubline}>Piccole app curate, pensate per la vita di tutti i giorni.</p>
        <div className={styles.moduliGrid}>
          {MODULES.map(({ icon: Icon, name, desc }) => (
            <div key={name} className={styles.moduleCard}>
              <div className={styles.moduleIcon}>
                <Icon size={22} aria-hidden="true" />
              </div>
              <h3 className={styles.moduleTitle}>{name}</h3>
              <p className={styles.moduleDesc}>{desc}</p>
            </div>
          ))}
          <div className={styles.moduleCard}>
            <div className={styles.moduleIcon}>
              <Sparkles size={22} aria-hidden="true" />
            </div>
            <h3 className={styles.moduleTitle}>Molti altri in arrivo</h3>
            <p className={styles.moduleDesc}>Nuovi moduli in arrivo, uno alla volta.</p>
          </div>
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 3: Wire into the orchestrator**

Update `apps/web/src/app/landing-page.tsx`:

```tsx
import styles from './_landing/landing.module.css'
import { Nav } from './_landing/nav'
import { Hero } from './_landing/hero'
import { ModuliSection } from './_landing/moduli-section'

export function LandingPage() {
  return (
    <div className={styles.page}>
      <Nav />
      <Hero />
      <ModuliSection />
    </div>
  )
}
```

- [ ] **Step 4: Typecheck**

Run: `pnpm --filter=@dexhub/web exec tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Manual verification**

Run the dev server, open `http://localhost:3000/`.
Expected: a "Moduli" section with the heading "Uno strumento per ogni cosa.", 4 cards — Note, To-Do, Cartellino, and "Molti altri in arrivo" (same card style as the other 3, sparkle icon, no dashed border). On desktop the 4 cards sit in one row; narrow the window below ~768px and confirm they wrap into a 2×2 grid. Click "Scopri i moduli" in the hero — it now scrolls down to this section.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/app/_landing/landing.module.css apps/web/src/app/_landing/moduli-section.tsx apps/web/src/app/landing-page.tsx
git commit -m "feat(landing): add real modules grid (Notes/To-Do/Cartellino + in-arrivo card)"
```

---

## Task 4: Perché DexHub section

**Files:**
- Modify: `apps/web/src/app/_landing/landing.module.css` (append perche classes)
- Create: `apps/web/src/app/_landing/perche-section.tsx`
- Modify: `apps/web/src/app/landing-page.tsx`

**Interfaces:**
- Consumes: `styles`, `.section`/`.sectionEyebrow`/`.sectionTitle` from Task 3.
- Produces: `PercheSection` component, no props.

- [ ] **Step 1: Append perche CSS**

Append to `apps/web/src/app/_landing/landing.module.css`:

```css
/* ── Perché DexHub ── */
.percheGrid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 32px;
}

@media (min-width: 768px) {
  .percheGrid {
    grid-template-columns: repeat(3, 1fr);
    gap: 44px;
  }
}

.percheIcon {
  color: #2fe6a0;
  margin-bottom: 14px;
}

.percheTitle {
  font-size: 18px;
  font-weight: 600;
  color: #fff;
  margin: 0 0 8px;
}

.percheDesc {
  font-size: 14px;
  line-height: 1.65;
  color: rgba(234, 244, 241, 0.6);
  margin: 0;
  text-wrap: pretty;
}
```

- [ ] **Step 2: Create the Perché section component**

Create `apps/web/src/app/_landing/perche-section.tsx`:

```tsx
import { Boxes, Layers, ShieldCheck } from 'lucide-react'
import styles from './landing.module.css'

const REASONS = [
  { icon: Layers, title: 'Modulare', desc: 'Attivi solo gli strumenti che ti servono. Il resto non ti ingombra.' },
  { icon: Boxes, title: 'Tutto insieme', desc: 'Basta saltare tra dieci applicazioni diverse: è tutto già lì.' },
  { icon: ShieldCheck, title: 'Privacy', desc: 'I tuoi dati vengono prima di tutto. Sempre.' },
]

export function PercheSection() {
  return (
    <section className={styles.section}>
      <div className={styles.container}>
        <div className={styles.sectionEyebrow}>Perché DexHub</div>
        <h2 className={styles.sectionTitle}>Meno app. Più vita.</h2>
        <div className={styles.percheGrid}>
          {REASONS.map(({ icon: Icon, title, desc }) => (
            <div key={title}>
              <div className={styles.percheIcon}>
                <Icon size={26} aria-hidden="true" />
              </div>
              <h3 className={styles.percheTitle}>{title}</h3>
              <p className={styles.percheDesc}>{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 3: Wire into the orchestrator**

Update `apps/web/src/app/landing-page.tsx`:

```tsx
import styles from './_landing/landing.module.css'
import { Nav } from './_landing/nav'
import { Hero } from './_landing/hero'
import { ModuliSection } from './_landing/moduli-section'
import { PercheSection } from './_landing/perche-section'

export function LandingPage() {
  return (
    <div className={styles.page}>
      <Nav />
      <Hero />
      <ModuliSection />
      <PercheSection />
    </div>
  )
}
```

- [ ] **Step 4: Typecheck**

Run: `pnpm --filter=@dexhub/web exec tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Manual verification**

Dev server, `http://localhost:3000/`. Expected: "Perché DexHub" section, heading "Meno app. Più vita.", 3 items (Modulare / Tutto insieme / Privacy) in one row on desktop, stacked on mobile.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/app/_landing/landing.module.css apps/web/src/app/_landing/perche-section.tsx apps/web/src/app/landing-page.tsx
git commit -m "feat(landing): add Perché DexHub benefits section"
```

---

## Task 5: Come funziona section

**Files:**
- Modify: `apps/web/src/app/_landing/landing.module.css` (append come classes)
- Create: `apps/web/src/app/_landing/come-section.tsx`
- Modify: `apps/web/src/app/landing-page.tsx`

**Interfaces:**
- Consumes: `styles`, shared section-header classes.
- Produces: `ComeSection` component, no props.

- [ ] **Step 1: Append come CSS**

Append to `apps/web/src/app/_landing/landing.module.css`:

```css
/* ── Come funziona ── */
.comeGrid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 28px;
}

@media (min-width: 768px) {
  .comeGrid {
    grid-template-columns: repeat(3, 1fr);
    gap: 36px;
  }
}

.comeStep {
  border-top: 2px solid #2fe6a0;
  padding-top: 20px;
}

.comeStep:nth-child(2) {
  border-top-color: #4fc9dc;
}

.comeStep:nth-child(3) {
  border-top-color: #19b48b;
}

.comeNumber {
  font-family: var(--font-mono);
  font-size: 13px;
  font-weight: 500;
  color: #2fe6a0;
  margin-bottom: 10px;
}

.comeStep:nth-child(2) .comeNumber {
  color: #4fc9dc;
}

.comeStep:nth-child(3) .comeNumber {
  color: #19b48b;
}

.comeText {
  font-size: 16px;
  line-height: 1.6;
  font-weight: 600;
  color: #fff;
  margin: 0;
  text-wrap: pretty;
}
```

- [ ] **Step 2: Create the Come funziona section component**

Create `apps/web/src/app/_landing/come-section.tsx`:

```tsx
import styles from './landing.module.css'

const STEPS = [
  { number: '01', text: 'Scegli i moduli che ti servono.' },
  { number: '02', text: 'Organizza tutto in un unico posto.' },
  { number: '03', text: 'DexHub cresce insieme alle tue esigenze.' },
]

export function ComeSection() {
  return (
    <section id="come" className={styles.section}>
      <div className={styles.container}>
        <div className={styles.sectionEyebrow}>Come funziona</div>
        <h2 className={styles.sectionTitle}>Semplice, dal primo giorno.</h2>
        <div className={styles.comeGrid}>
          {STEPS.map((s) => (
            <div key={s.number} className={styles.comeStep}>
              <div className={styles.comeNumber}>{s.number}</div>
              <p className={styles.comeText}>{s.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 3: Wire into the orchestrator**

Update `apps/web/src/app/landing-page.tsx`:

```tsx
import styles from './_landing/landing.module.css'
import { Nav } from './_landing/nav'
import { Hero } from './_landing/hero'
import { ModuliSection } from './_landing/moduli-section'
import { PercheSection } from './_landing/perche-section'
import { ComeSection } from './_landing/come-section'

export function LandingPage() {
  return (
    <div className={styles.page}>
      <Nav />
      <Hero />
      <ModuliSection />
      <PercheSection />
      <ComeSection />
    </div>
  )
}
```

- [ ] **Step 4: Typecheck**

Run: `pnpm --filter=@dexhub/web exec tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Manual verification**

Dev server, `http://localhost:3000/`. Expected: "Come funziona" section, 3 numbered steps ("Scegli i moduli che ti servono." / "Organizza tutto in un unico posto." / "DexHub cresce insieme alle tue esigenze."), each with a colored top border (green/cyan/teal). Clicking "Come funziona" in the nav scrolls here.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/app/_landing/landing.module.css apps/web/src/app/_landing/come-section.tsx apps/web/src/app/landing-page.tsx
git commit -m "feat(landing): add Come funziona section with user-facing copy"
```

---

## Task 6: Chi c'è dietro section

**Files:**
- Modify: `apps/web/src/app/_landing/landing.module.css` (append chi classes)
- Create: `apps/web/src/app/_landing/chi-section.tsx`
- Modify: `apps/web/src/app/landing-page.tsx`

**Interfaces:**
- Consumes: `styles`, shared section-eyebrow class.
- Produces: `ChiSection` component, no props.

- [ ] **Step 1: Append chi CSS**

Append to `apps/web/src/app/_landing/landing.module.css`:

```css
/* ── Chi c'è dietro ── */
.chiCard {
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 18px;
  padding: 32px 28px;
  display: grid;
  grid-template-columns: 1fr;
  gap: 28px;
  align-items: center;
  text-align: center;
}

@media (min-width: 768px) {
  .chiCard {
    grid-template-columns: 150px 1fr;
    padding: 44px 48px;
    text-align: left;
  }
}

.chiAvatar {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  background: linear-gradient(135deg, #2fe6a0, #4fc9dc);
  color: #031b35;
  font-size: 32px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto;
}

@media (min-width: 768px) {
  .chiAvatar {
    width: 150px;
    height: 150px;
    margin: 0;
  }
}

.chiTitle {
  font-size: 24px;
  font-weight: 600;
  color: #fff;
  margin: 0 0 14px;
}

.chiText {
  font-size: 15px;
  line-height: 1.7;
  color: rgba(234, 244, 241, 0.66);
  margin: 0 0 12px;
  text-wrap: pretty;
}

.chiSignature {
  margin-top: 18px;
  font-family: var(--font-mono);
  font-size: 13px;
  font-weight: 500;
  color: #2fe6a0;
}
```

- [ ] **Step 2: Create the Chi c'è dietro section component**

Create `apps/web/src/app/_landing/chi-section.tsx`:

```tsx
import styles from './landing.module.css'

export function ChiSection() {
  return (
    <section id="chi" className={styles.section}>
      <div className={styles.container}>
        <div className={styles.chiCard}>
          <div className={styles.chiAvatar} aria-hidden="true">AM</div>
          <div>
            <div className={styles.sectionEyebrow}>Chi c&rsquo;è dietro</div>
            <h2 className={styles.chiTitle}>Costruito da Alex Munafò</h2>
            <p className={styles.chiText}>
              DexHub è un progetto indipendente. Nasce dall&rsquo;idea di riunire gli strumenti della vita
              quotidiana in un&rsquo;unica piattaforma semplice, modulare e piacevole da usare.
            </p>
            <p className={styles.chiText}>
              Ogni aggiornamento è progettato con attenzione ai dettagli e costruito ascoltando il feedback
              di chi lo usa.
            </p>
            <div className={styles.chiSignature}>— Alex</div>
          </div>
        </div>
      </div>
    </section>
  )
}
```

Note: the second paragraph says "ascoltando il feedback di chi lo usa" rather than the original mockup's "della community" — DexHub is an invite-only beta with a handful of real users today, not a public community; this keeps the authentic, non-promotional tone required by the spec without overselling scale.

- [ ] **Step 3: Wire into the orchestrator**

Update `apps/web/src/app/landing-page.tsx`:

```tsx
import styles from './_landing/landing.module.css'
import { Nav } from './_landing/nav'
import { Hero } from './_landing/hero'
import { ModuliSection } from './_landing/moduli-section'
import { PercheSection } from './_landing/perche-section'
import { ComeSection } from './_landing/come-section'
import { ChiSection } from './_landing/chi-section'

export function LandingPage() {
  return (
    <div className={styles.page}>
      <Nav />
      <Hero />
      <ModuliSection />
      <PercheSection />
      <ComeSection />
      <ChiSection />
    </div>
  )
}
```

- [ ] **Step 4: Typecheck**

Run: `pnpm --filter=@dexhub/web exec tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Manual verification**

Dev server, `http://localhost:3000/`. Expected: "Chi c'è dietro" section — a circular "AM" avatar (gradient green→cyan) next to "Costruito da Alex Munafò" and the two paragraphs, signed "— Alex". On mobile the avatar sits centered above the text. Clicking "Chi c'è dietro" in the nav scrolls here.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/app/_landing/landing.module.css apps/web/src/app/_landing/chi-section.tsx apps/web/src/app/landing-page.tsx
git commit -m "feat(landing): add Chi c'è dietro bio section with AM avatar placeholder"
```

---

## Task 7: Invito section — real form moved inline (replaces the modal)

This task also removes the old modal-only invite logic that still technically exists nowhere in the app anymore after Task 1 rewrote `landing-page.tsx` from scratch — there is nothing to delete there; this task's job is to bring the REAL form logic back, inline, in its final home.

**Files:**
- Modify: `apps/web/src/app/_landing/landing.module.css` (append invito classes)
- Create: `apps/web/src/app/_landing/invito-section.tsx`
- Modify: `apps/web/src/app/landing-page.tsx`

**Interfaces:**
- Consumes: `styles`.
- Produces: `InvitoSection` component, no props. Owns its own form state internally (email, phone digits, selected country, dropdown-open, submitted, loading, error) — no state lifted to the orchestrator.

- [ ] **Step 1: Append invito CSS**

Append to `apps/web/src/app/_landing/landing.module.css`:

```css
/* ── Invito ── */
.invitoCard {
  border: 1px solid rgba(47, 230, 160, 0.25);
  background: linear-gradient(135deg, rgba(47, 230, 160, 0.09), rgba(79, 201, 220, 0.06));
  border-radius: 18px;
  padding: 40px 24px;
  text-align: center;
}

@media (min-width: 768px) {
  .invitoCard {
    padding: 44px 48px;
  }
}

.invitoTitle {
  font-size: 24px;
  font-weight: 600;
  color: #fff;
  margin: 0 0 10px;
}

@media (min-width: 768px) {
  .invitoTitle {
    font-size: 28px;
  }
}

.invitoDesc {
  font-size: 15px;
  line-height: 1.6;
  color: rgba(234, 244, 241, 0.65);
  margin: 0 auto 24px;
  max-width: 520px;
  text-wrap: pretty;
}

.invitoForm {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-width: 460px;
  margin: 0 auto;
  text-align: left;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.fieldLabel {
  font-size: 12.5px;
  font-weight: 500;
  color: rgba(234, 244, 241, 0.6);
}

.fieldInput {
  background: rgba(3, 27, 53, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 11px;
  padding: 13px 16px;
  font-size: 14px;
  font-weight: 500;
  color: #fff;
  outline: none;
  width: 100%;
}

.fieldInput:focus {
  border-color: #2fe6a0;
}

.phoneRow {
  position: relative;
  display: flex;
  gap: 8px;
}

.phoneTrigger {
  display: flex;
  align-items: center;
  gap: 6px;
  background: rgba(3, 27, 53, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 11px;
  padding: 0 12px;
  color: #fff;
  font-size: 13.5px;
  cursor: pointer;
  flex: none;
}

.phoneTriggerFlag {
  border-radius: 2px;
}

.phoneDropdown {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  z-index: 10;
  max-height: 260px;
  overflow-y: auto;
  background: #04101f;
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 11px;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
  min-width: 220px;
}

.phoneDropdownItem {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 9px 12px;
  background: transparent;
  border: none;
  color: #eaf4f1;
  font-size: 13px;
  text-align: left;
  cursor: pointer;
}

.phoneDropdownItem:hover {
  background: rgba(255, 255, 255, 0.06);
}

.phoneDropdownItemName {
  flex: 1;
}

.phoneDropdownItemDial {
  color: rgba(234, 244, 241, 0.5);
}

.phoneNumber {
  flex: 1;
  background: rgba(3, 27, 53, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 11px;
  padding: 13px 16px;
  font-size: 14px;
  color: #fff;
  outline: none;
}

.phoneNumber:focus {
  border-color: #2fe6a0;
}

.formError {
  font-size: 13px;
  color: hsl(0 72% 65%);
  margin: 0;
}

.invitoSubmitRow {
  margin-top: 4px;
}

.btnSubmit {
  width: 100%;
  background: #2fe6a0;
  color: #031b35;
  font-size: 14px;
  font-weight: 600;
  padding: 13px 22px;
  border-radius: 11px;
  border: none;
  cursor: pointer;
}

.btnSubmit:hover {
  background: #5cf0b8;
}

.btnSubmit:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.invitoMicro {
  margin-top: 14px;
  font-family: var(--font-mono);
  font-size: 11px;
  color: rgba(234, 244, 241, 0.35);
}

.invitoSuccess {
  font-size: 15px;
  font-weight: 600;
  color: #2fe6a0;
  padding: 13px;
}
```

- [ ] **Step 2: Create the Invito section component (real form, ported from the old modal)**

Create `apps/web/src/app/_landing/invito-section.tsx`:

```tsx
'use client'

import { useEffect, useRef, useState } from 'react'
import styles from './landing.module.css'

const API = process.env['NEXT_PUBLIC_API_URL'] ?? ''

const COUNTRIES = [
  { iso: 'it', name: 'Italia', dial: '+39' },
  { iso: 'de', name: 'Germania', dial: '+49' },
  { iso: 'fr', name: 'Francia', dial: '+33' },
  { iso: 'es', name: 'Spagna', dial: '+34' },
  { iso: 'pt', name: 'Portogallo', dial: '+351' },
  { iso: 'ch', name: 'Svizzera', dial: '+41' },
  { iso: 'at', name: 'Austria', dial: '+43' },
  { iso: 'gb', name: 'Regno Unito', dial: '+44' },
  { iso: 'be', name: 'Belgio', dial: '+32' },
  { iso: 'nl', name: 'Olanda', dial: '+31' },
  { iso: 'lu', name: 'Lussemburgo', dial: '+352' },
  { iso: 'mc', name: 'Monaco', dial: '+377' },
  { iso: 'sm', name: 'San Marino', dial: '+378' },
  { iso: 'ad', name: 'Andorra', dial: '+376' },
  { iso: 'gr', name: 'Grecia', dial: '+30' },
  { iso: 'hr', name: 'Croazia', dial: '+385' },
  { iso: 'si', name: 'Slovenia', dial: '+386' },
  { iso: 'rs', name: 'Serbia', dial: '+381' },
  { iso: 'ba', name: 'Bosnia Erzegovina', dial: '+387' },
  { iso: 'me', name: 'Montenegro', dial: '+382' },
  { iso: 'al', name: 'Albania', dial: '+355' },
  { iso: 'mk', name: 'Macedonia del Nord', dial: '+389' },
  { iso: 'pl', name: 'Polonia', dial: '+48' },
  { iso: 'ro', name: 'Romania', dial: '+40' },
  { iso: 'bg', name: 'Bulgaria', dial: '+359' },
  { iso: 'hu', name: 'Ungheria', dial: '+36' },
  { iso: 'cz', name: 'Rep. Ceca', dial: '+420' },
  { iso: 'sk', name: 'Slovacchia', dial: '+421' },
  { iso: 'lt', name: 'Lituania', dial: '+370' },
  { iso: 'lv', name: 'Lettonia', dial: '+371' },
  { iso: 'ee', name: 'Estonia', dial: '+372' },
  { iso: 'se', name: 'Svezia', dial: '+46' },
  { iso: 'no', name: 'Norvegia', dial: '+47' },
  { iso: 'dk', name: 'Danimarca', dial: '+45' },
  { iso: 'fi', name: 'Finlandia', dial: '+358' },
  { iso: 'ie', name: 'Irlanda', dial: '+353' },
  { iso: 'mt', name: 'Malta', dial: '+356' },
  { iso: 'cy', name: 'Cipro', dial: '+357' },
  { iso: 'ua', name: 'Ucraina', dial: '+380' },
  { iso: 'ru', name: 'Russia', dial: '+7' },
  { iso: 'tr', name: 'Turchia', dial: '+90' },
  { iso: 'us', name: 'USA', dial: '+1' },
  { iso: 'ca', name: 'Canada', dial: '+1' },
  { iso: 'mx', name: 'Messico', dial: '+52' },
  { iso: 'br', name: 'Brasile', dial: '+55' },
  { iso: 'ar', name: 'Argentina', dial: '+54' },
  { iso: 'au', name: 'Australia', dial: '+61' },
  { iso: 'jp', name: 'Giappone', dial: '+81' },
  { iso: 'cn', name: 'Cina', dial: '+86' },
  { iso: 'in', name: 'India', dial: '+91' },
  { iso: 'ae', name: 'Emirati Arabi', dial: '+971' },
  { iso: 'sa', name: 'Arabia Saudita', dial: '+966' },
  { iso: 'il', name: 'Israele', dial: '+972' },
  { iso: 'za', name: 'Sudafrica', dial: '+27' },
] as const

type Country = typeof COUNTRIES[number]

export function InvitoSection() {
  const [email, setEmail] = useState('')
  const [country, setCountry] = useState<Country>(COUNTRIES[0]!)
  const [digits, setDigits] = useState('')
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [formError, setFormError] = useState('')

  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!dropdownOpen) return
    function handleOutside(e: MouseEvent) {
      if (!dropdownRef.current?.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [dropdownOpen])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError('')
    setLoading(true)
    const phone = digits ? `${country.dial}${digits}` : undefined
    try {
      const res = await fetch(`${API}/api/v1/invite-requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, phone }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.message ?? 'Errore durante l\'invio')
      }
      setSubmitted(true)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Errore durante l\'invio. Riprova.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section id="invito" className={styles.section}>
      <div className={styles.container}>
        <div className={styles.invitoCard}>
          <h2 className={styles.invitoTitle}>L&rsquo;accesso è su invito</h2>
          <p className={styles.invitoDesc}>
            DexHub è in beta privata. Lascia i tuoi contatti e ti invieremo un link di accesso personalizzato.
          </p>

          {submitted ? (
            <div className={styles.invitoSuccess}>
              &#10003; Richiesta inviata — riceverai un invito personalizzato non appena verrà elaborata.
            </div>
          ) : (
            <form onSubmit={handleSubmit} className={styles.invitoForm}>
              <div className={styles.field}>
                <label htmlFor="invite-email" className={styles.fieldLabel}>Indirizzo email</label>
                <input
                  id="invite-email"
                  type="email"
                  required
                  placeholder="tu@esempio.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={styles.fieldInput}
                  autoComplete="email"
                />
              </div>
              <div className={styles.field}>
                <label htmlFor="invite-phone" className={styles.fieldLabel}>Numero di cellulare</label>
                <div className={styles.phoneRow} ref={dropdownRef}>
                  <button
                    type="button"
                    className={styles.phoneTrigger}
                    onClick={() => setDropdownOpen((o) => !o)}
                    aria-haspopup="listbox"
                    aria-expanded={dropdownOpen}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`https://flagcdn.com/20x15/${country.iso}.png`}
                      width={20}
                      height={15}
                      alt={country.name}
                      className={styles.phoneTriggerFlag}
                    />
                    <span>{country.dial}</span>
                  </button>

                  {dropdownOpen && (
                    <div className={styles.phoneDropdown} role="listbox">
                      {COUNTRIES.map((c, i) => (
                        <button
                          key={`${c.iso}-${i}`}
                          type="button"
                          role="option"
                          aria-selected={c.iso === country.iso && c.dial === country.dial}
                          className={styles.phoneDropdownItem}
                          onClick={() => {
                            setCountry(c)
                            setDropdownOpen(false)
                          }}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={`https://flagcdn.com/20x15/${c.iso}.png`} width={20} height={15} alt="" />
                          <span className={styles.phoneDropdownItemName}>{c.name}</span>
                          <span className={styles.phoneDropdownItemDial}>{c.dial}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  <input
                    id="invite-phone"
                    type="text"
                    inputMode="numeric"
                    placeholder="333 000 0000"
                    value={digits}
                    onChange={(e) => setDigits(e.target.value.replace(/\D/g, ''))}
                    className={styles.phoneNumber}
                    autoComplete="tel-national"
                  />
                </div>
              </div>

              {formError && <p className={styles.formError}>{formError}</p>}

              <div className={styles.invitoSubmitRow}>
                <button type="submit" className={styles.btnSubmit} disabled={loading}>
                  {loading ? 'Invio in corso…' : 'Richiedi un invito'}
                </button>
              </div>
            </form>
          )}

          <div className={styles.invitoMicro}>niente spam, un solo invito quando è pronto</div>
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 3: Wire into the orchestrator**

Update `apps/web/src/app/landing-page.tsx`:

```tsx
import styles from './_landing/landing.module.css'
import { Nav } from './_landing/nav'
import { Hero } from './_landing/hero'
import { ModuliSection } from './_landing/moduli-section'
import { PercheSection } from './_landing/perche-section'
import { ComeSection } from './_landing/come-section'
import { ChiSection } from './_landing/chi-section'
import { InvitoSection } from './_landing/invito-section'

export function LandingPage() {
  return (
    <div className={styles.page}>
      <Nav />
      <Hero />
      <ModuliSection />
      <PercheSection />
      <ComeSection />
      <ChiSection />
      <InvitoSection />
    </div>
  )
}
```

- [ ] **Step 4: Typecheck**

Run: `pnpm --filter=@dexhub/web exec tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Manual verification (real submission against the real endpoint)**

Dev server, `http://localhost:3000/`. Click "Richiedi un invito" (nav or hero) — the page scrolls down to the invito card (no modal opens anymore). Fill in a real-looking test email and a phone number, submit. Expected: loading state ("Invio in corso…"), then either the success message ("✓ Richiesta inviata…") or a real error from the API if the email is already registered — confirm in the Network tab that a `POST /api/v1/invite-requests` request actually fires with `{ email, phone }` in the body, same as before this redesign. Also open the country dropdown, pick a different country, confirm the dial code updates and clicking outside the dropdown closes it.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/app/_landing/landing.module.css apps/web/src/app/_landing/invito-section.tsx apps/web/src/app/landing-page.tsx
git commit -m "feat(landing): move real invite form inline (replaces modal), keep email+phone logic intact"
```

---

## Task 8: Footer

**Files:**
- Modify: `apps/web/src/app/_landing/landing.module.css` (append footer classes)
- Create: `apps/web/src/app/_landing/footer.tsx`
- Modify: `apps/web/src/app/landing-page.tsx`

**Interfaces:**
- Consumes: `styles`.
- Produces: `Footer` component, no props.

- [ ] **Step 1: Append footer CSS**

Append to `apps/web/src/app/_landing/landing.module.css`:

```css
/* ── Footer ── */
.footer {
  display: flex;
  flex-direction: column;
  gap: 16px;
  align-items: center;
  text-align: center;
  padding: 32px 20px 40px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}

@media (min-width: 768px) {
  .footer {
    flex-direction: row;
    justify-content: space-between;
    text-align: left;
    padding: 36px 48px;
  }
}

.footerBrand {
  display: flex;
  align-items: center;
  gap: 9px;
  flex-wrap: wrap;
  justify-content: center;
}

@media (min-width: 768px) {
  .footerBrand {
    justify-content: flex-start;
  }
}

.footerLogo {
  width: 24px;
  height: 24px;
  border-radius: 6px;
  display: block;
}

.footerName {
  font-size: 14px;
  font-weight: 600;
  color: #fff;
}

.footerCopy {
  font-size: 12px;
  color: rgba(234, 244, 241, 0.4);
}

.footerLinks {
  display: flex;
  gap: 22px;
}

.footerLink {
  font-size: 13px;
  font-weight: 500;
  color: rgba(234, 244, 241, 0.6);
  text-decoration: none;
}

.footerLink:hover {
  color: #fff;
}
```

- [ ] **Step 2: Create the Footer component**

Create `apps/web/src/app/_landing/footer.tsx`:

```tsx
import Image from 'next/image'
import styles from './landing.module.css'

export function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.footerBrand}>
        <Image src="/icon.png" alt="" width={24} height={24} className={styles.footerLogo} />
        <span className={styles.footerName}>
          <span className={styles.navAccent}>Dex</span>Hub
        </span>
        <span className={styles.footerCopy}>© 2026 — le app di tutti i giorni, in un posto solo</span>
      </div>
      <div className={styles.footerLinks}>
        <a href="#moduli" className={styles.footerLink}>Moduli</a>
        <a href="#come" className={styles.footerLink}>Come funziona</a>
        <a href="#chi" className={styles.footerLink}>Chi c&rsquo;è dietro</a>
      </div>
    </footer>
  )
}
```

- [ ] **Step 3: Wire into the orchestrator**

Update `apps/web/src/app/landing-page.tsx`:

```tsx
import styles from './_landing/landing.module.css'
import { Nav } from './_landing/nav'
import { Hero } from './_landing/hero'
import { ModuliSection } from './_landing/moduli-section'
import { PercheSection } from './_landing/perche-section'
import { ComeSection } from './_landing/come-section'
import { ChiSection } from './_landing/chi-section'
import { InvitoSection } from './_landing/invito-section'
import { Footer } from './_landing/footer'

export function LandingPage() {
  return (
    <div className={styles.page}>
      <Nav />
      <Hero />
      <ModuliSection />
      <PercheSection />
      <ComeSection />
      <ChiSection />
      <InvitoSection />
      <Footer />
    </div>
  )
}
```

- [ ] **Step 4: Typecheck**

Run: `pnpm --filter=@dexhub/web exec tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Manual verification**

Dev server, `http://localhost:3000/`. Expected: footer at the very bottom with logo+wordmark+copyright on one side and Moduli/Come funziona/Chi c'è dietro links on the other (stacked and centered on mobile). Confirm there is no "Privacy" link anywhere.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/app/_landing/landing.module.css apps/web/src/app/_landing/footer.tsx apps/web/src/app/landing-page.tsx
git commit -m "feat(landing): add footer"
```

---

## Task 9: Cleanup + full verification

**Files:**
- Delete: `apps/web/src/app/page.module.css`

**Interfaces:** none (final integration check, no new code).

- [ ] **Step 1: Confirm the old CSS module has no remaining importers**

Run: `grep -rn "page.module.css" apps/web/src --include="*.tsx" --include="*.ts"`
Expected: no output (nothing imports it anymore — `landing-page.tsx` has used `./_landing/landing.module.css` since Task 1).

- [ ] **Step 2: Delete the old CSS module**

```bash
rm apps/web/src/app/page.module.css
```

- [ ] **Step 3: Typecheck**

Run: `pnpm --filter=@dexhub/web exec tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Full manual verification pass**

Run the dev server, open `http://localhost:3000/` in an incognito window (so the redirect-if-logged-in gate doesn't fire) and walk the whole page:

1. **Desktop width (≥1200px):** nav links visible inline, hero split two-column with the console on the right, moduli grid 4-across, perché/come 3-across, chi c'è dietro two-column card, invito card centered, footer split left/right.
2. **Tablet width (~800px):** same layout as desktop for the 768px-gated grids, nav still inline (768px is the nav breakpoint too — confirm the hamburger does NOT appear yet at 800px, only below 768px).
3. **Mobile width (~375px):** hamburger menu appears and works, hero stacks (console still visible, never hidden), moduli grid 2×2, perché/come/chi all single-column, no horizontal scrollbar anywhere on the page (check the html element's scrollWidth doesn't exceed innerWidth).
4. Click every nav link (desktop and mobile) and confirm each scrolls to the right section (`#moduli`, `#come`, `#chi`, `#invito`).
5. Click "Accedi" — confirm it navigates to `/login`.
6. Submit the invite form with a real test email — confirm the same `/api/v1/invite-requests` network call as before the redesign, and the success/error states render correctly.
7. Log in as a real test account, navigate to `/` again — confirm the redirect-if-logged-in gate still fires (`page.tsx` was never touched) and you land on `/dashboard`, never seeing the landing page.
8. Confirm no console errors in the browser devtools on any of the above.

Since there is no browser automation tool available in this environment, this step must be performed and confirmed by a human before the work is considered done — do not declare this task complete from code review alone.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore(landing): remove unused legacy page.module.css after full redesign"
```

---

## Self-Review Notes

- **Spec coverage:** every spec section (Nav w/ Accedi, Hero w/ non-technical console + copy-as-reference, Moduli real 4-card grid, Perché unchanged, Come funziona new copy, Chi c'è dietro w/ tone constraint + AM placeholder, Invito real form inline, Footer w/o Privacy, Responsive mobile-first, "cosa non cambia") maps to Task 1–9 above.
- **Font decision:** resolved during planning (Geist Sans/Mono, zero external requests) after discovering the app already has Geist installed — spec was amended to match before this plan was written, so plan and spec agree.
- **No placeholders:** every task has complete, runnable TSX/CSS — no TBD/TODO, no "similar to Task N" shortcuts, no undefined types.
- **Type/name consistency check:** `styles` (CSS Modules import) used identically across all 8 `_landing/*.tsx` files; `LandingPage` remains the single default export name expected by `apps/web/src/app/page.tsx` (which imports `{ LandingPage } from './landing-page'` — untouched by this plan, still matches).
