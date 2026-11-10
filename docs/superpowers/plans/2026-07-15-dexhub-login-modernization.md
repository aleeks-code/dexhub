# DexHub Login Modernization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a login modal to the landing page (triggered from Nav's "Accedi") and modernize the standalone `/login` page to the same navy visual language as the landing redesign, sharing one restyled `LoginForm` component between both containers with zero duplicated auth logic.

**Architecture:** `LoginForm` (existing component, `packages/ui`'s `Button` swapped for plain buttons styled by a new colocated CSS Module) keeps its exact current behavior (passkey/recovery/emergency state machine, fetch calls, i18n) and stops rendering its own outer card — the card chrome is now owned by whichever container mounts it. Two containers: a new `LoginModal` (triggered from `Nav`, which owns the open/close state) and the existing `/login` page (rewritten to a navy full-page background). Both wrap `<LoginForm/>` in the same shared `.card` class.

**Tech Stack:** Next.js App Router, React, TypeScript, CSS Modules, lucide-react (`X` icon for the modal close button), Geist Sans/Mono (already installed, no new fonts).

## Global Constraints

- `login-form.tsx`'s behavior is **never** touched: same 3 modes (passkey default / recovery / emergency), same fetch calls to `/api/v1/auth/*`, same `startAuthentication` from `@simplewebauthn/browser`, same `t.login.*` i18n keys — this is a visual-only redesign.
- Route `/login` stays reachable directly — never removed.
- No new API endpoints, no migrations, no new i18n keys.
- No external fonts — reuse Geist Sans/Mono already in `layout.tsx`.
- No test runner exists for `apps/web` (confirmed, no vitest/jest, zero `*.test.tsx`) — verification is `tsc --noEmit` + manual check against the real dev/prod stack, matching this project's established convention.

---

## Task 1: Restyle `LoginForm` (shared card + navy classes, logic untouched)

**Files:**
- Create: `apps/web/src/core/components/login-form.module.css`
- Modify: `apps/web/src/core/components/login-form.tsx`

**Interfaces:**
- Produces: `styles` export surface in `login-form.module.css` — `.card` (shared outer container, consumed by Task 2 and Task 3), plus all internal classes (`.header`, `.title`, `.subtitle`, `.errorText`, `.btnPrimary`, `.btnDanger`, `.troubleToggle`, `.troubleChevron`, `.troublePanel`, `.troubleOptionRecovery`, `.troubleOptionEmergency`, `.form`, `.field`, `.label`, `.input`, `.inputMono`, `.backLink`, `.warningBox`, `.warningText`).
- Consumes: nothing new — `LoginForm`'s props/exports (`export function LoginForm()`, no props) are unchanged, so every existing caller keeps working once Tasks 2/3 wrap it in `.card`.

- [ ] **Step 1: Create the CSS module**

Create `apps/web/src/core/components/login-form.module.css`:

```css
/* ── Shared card — owned here, consumed by the login modal AND the /login page ── */
.card {
  background: #04101f;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 18px;
  box-shadow: 0 30px 80px rgba(0, 0, 0, 0.5);
  padding: 32px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.header {
  display: flex;
  flex-direction: column;
  gap: 4px;
  text-align: center;
}

.title {
  font-size: 24px;
  font-weight: 700;
  color: #fff;
  margin: 0;
}

.subtitle {
  font-size: 14px;
  color: rgba(234, 244, 241, 0.6);
  margin: 0;
}

.passkeyBody {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.errorText {
  font-size: 13px;
  color: hsl(0 72% 65%);
  margin: 0;
}

.btnPrimary {
  width: 100%;
  background: #2fe6a0;
  color: #031b35;
  font-size: 14px;
  font-weight: 600;
  padding: 12px 22px;
  border-radius: 11px;
  border: none;
  cursor: pointer;
}

.btnPrimary:hover {
  background: #5cf0b8;
}

.btnPrimary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btnDanger {
  width: 100%;
  background: hsl(0 72% 55%);
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  padding: 12px 22px;
  border-radius: 11px;
  border: none;
  cursor: pointer;
}

.btnDanger:hover {
  background: hsl(0 72% 48%);
}

.btnDanger:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.troubleWrap {
  padding-top: 4px;
}

.troubleToggle {
  width: 100%;
  background: transparent;
  border: none;
  color: rgba(234, 244, 241, 0.45);
  font-size: 12px;
  cursor: pointer;
  transition: color 0.15s;
}

.troubleToggle:hover {
  color: rgba(234, 244, 241, 0.7);
}

.troubleChevron {
  display: inline-block;
  margin-left: 4px;
  transition: transform 0.2s;
}

.troublePanel {
  margin-top: 8px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 11px;
  background: rgba(255, 255, 255, 0.03);
  padding: 12px;
}

.troubleOptionRecovery {
  background: transparent;
  border: none;
  text-align: left;
  font-size: 12px;
  color: rgba(234, 244, 241, 0.7);
  cursor: pointer;
  transition: color 0.15s;
}

.troubleOptionRecovery:hover {
  color: #fff;
}

.troubleOptionEmergency {
  background: transparent;
  border: none;
  text-align: left;
  font-size: 12px;
  color: rgba(234, 244, 241, 0.45);
  cursor: pointer;
  transition: color 0.15s;
}

.troubleOptionEmergency:hover {
  color: rgba(234, 244, 241, 0.7);
}

.form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.label {
  font-size: 13px;
  font-weight: 500;
  color: #eaf4f1;
}

.input {
  width: 100%;
  background: rgba(3, 27, 53, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 10px;
  padding: 10px 14px;
  font-size: 14px;
  color: #fff;
  outline: none;
}

.input:focus {
  border-color: #2fe6a0;
}

.inputMono {
  font-family: var(--font-mono);
}

.backLink {
  background: transparent;
  border: none;
  text-align: left;
  font-size: 12px;
  color: rgba(234, 244, 241, 0.5);
  cursor: pointer;
}

.backLink:hover {
  color: rgba(234, 244, 241, 0.8);
}

.warningBox {
  border: 1px solid rgba(245, 166, 35, 0.35);
  background: rgba(245, 166, 35, 0.12);
  border-radius: 10px;
  padding: 12px;
}

.warningText {
  font-size: 12px;
  color: #f5a623;
  margin: 0;
}
```

- [ ] **Step 2: Rewrite the component's JSX (behavior untouched, classes + plain buttons)**

Replace the full contents of `apps/web/src/core/components/login-form.tsx` with:

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { startAuthentication } from '@simplewebauthn/browser'
import { useT } from '@/i18n'
import styles from './login-form.module.css'

type Mode = 'passkey' | 'recovery' | 'emergency'

const API = process.env['NEXT_PUBLIC_API_URL'] ?? ''

export function LoginForm() {
  const router = useRouter()
  const t = useT()
  const [mode, setMode] = useState<Mode>('passkey')
  const [troubleOpen, setTroubleOpen] = useState(false)
  const [recoveryEmail, setRecoveryEmail] = useState('')
  const [recoveryCode, setRecoveryCode] = useState('')
  const [emergencyToken, setEmergencyToken] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handlePasskey() {
    setError('')
    setLoading(true)
    try {
      const optRes = await fetch(`${API}/api/v1/auth/passkey/authenticate/options`, {
        credentials: 'include',
      })
      if (!optRes.ok) throw new Error('Failed to get passkey options')
      const options = await optRes.json()

      const credential = await startAuthentication({ optionsJSON: options })

      const verifyRes = await fetch(`${API}/api/v1/auth/passkey/authenticate/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credential),
        credentials: 'include',
      })
      if (!verifyRes.ok) {
        const data = await verifyRes.json().catch(() => ({}))
        throw new Error(data?.error?.message ?? 'Passkey sign-in failed')
      }
      router.push('/dashboard')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Passkey sign-in failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  async function handleRecovery(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch(`${API}/api/v1/auth/recovery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: recoveryEmail, code: recoveryCode }),
        credentials: 'include',
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.error?.message ?? 'Invalid recovery code')
      }
      router.push('/dashboard')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  async function handleEmergency(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch(`${API}/api/v1/auth/emergency/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: emergencyToken }),
        credentials: 'include',
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.error?.message ?? 'Invalid emergency token')
      }
      router.push('/dashboard')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  function backToPasskey() {
    setMode('passkey')
    setTroubleOpen(false)
    setError('')
  }

  return (
    <div>
      <div className={styles.header}>
        <h1 className={styles.title}>DexHub</h1>
        <p className={styles.subtitle}>{t.login.subtitle}</p>
      </div>

      {mode === 'passkey' && (
        <div className={styles.passkeyBody} style={{ marginTop: 24 }}>
          {error && <p className={styles.errorText}>{error}</p>}
          <button type="button" className={styles.btnPrimary} onClick={handlePasskey} disabled={loading}>
            {loading ? t.login.signingIn : t.login.signIn}
          </button>

          <div className={styles.troubleWrap}>
            <button
              type="button"
              className={styles.troubleToggle}
              onClick={() => setTroubleOpen((v) => !v)}
            >
              {t.login.trouble}
              <span
                className={styles.troubleChevron}
                style={{ transform: troubleOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
                aria-hidden="true"
              >
                ▾
              </span>
            </button>

            {troubleOpen && (
              <div className={styles.troublePanel}>
                <button
                  className={styles.troubleOptionRecovery}
                  onClick={() => { setMode('recovery'); setError('') }}
                >
                  {t.login.useRecovery}
                </button>
                <button
                  className={styles.troubleOptionEmergency}
                  onClick={() => { setMode('emergency'); setError('') }}
                >
                  {t.login.emergency}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {mode === 'recovery' && (
        <form onSubmit={handleRecovery} className={styles.form} style={{ marginTop: 24 }}>
          <div className={styles.field}>
            <label className={styles.label}>{t.login.recovery.emailLabel}</label>
            <input
              type="email"
              value={recoveryEmail}
              onChange={(e) => setRecoveryEmail(e.target.value)}
              required
              placeholder={t.login.recovery.emailPh}
              className={styles.input}
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>{t.login.recovery.label}</label>
            <input
              type="text"
              value={recoveryCode}
              onChange={(e) => setRecoveryCode(e.target.value.toUpperCase())}
              required
              placeholder={t.login.recovery.placeholder}
              className={`${styles.input} ${styles.inputMono}`}
            />
          </div>
          {error && <p className={styles.errorText}>{error}</p>}
          <button type="submit" className={styles.btnPrimary} disabled={loading}>
            {loading ? t.login.recovery.verifying : t.login.recovery.submit}
          </button>
          <button type="button" className={styles.backLink} onClick={backToPasskey}>
            {t.login.recovery.back}
          </button>
        </form>
      )}

      {mode === 'emergency' && (
        <form onSubmit={handleEmergency} className={styles.form} style={{ marginTop: 24 }}>
          <div className={styles.warningBox}>
            <p className={styles.warningText}>{t.login.emergencyMode.warning}</p>
          </div>
          <div className={styles.field}>
            <label className={styles.label}>{t.login.emergencyMode.label}</label>
            <input
              type="password"
              value={emergencyToken}
              onChange={(e) => setEmergencyToken(e.target.value)}
              required
              placeholder={t.login.emergencyMode.placeholder}
              className={styles.input}
            />
          </div>
          {error && <p className={styles.errorText}>{error}</p>}
          <button type="submit" className={styles.btnDanger} disabled={loading}>
            {loading ? t.login.emergencyMode.verifying : t.login.emergencyMode.submit}
          </button>
          <button type="button" className={styles.backLink} onClick={backToPasskey}>
            {t.login.emergencyMode.back}
          </button>
        </form>
      )}
    </div>
  )
}
```

Note: `LoginForm` no longer renders its own outer `rounded-xl border ... bg-surface p-8` wrapper — that visual role moves to `.card` in this same CSS module, applied by whoever mounts the component (Task 2's modal, Task 3's page). The `@dexhub/ui` `Button` import is dropped in favor of plain `<button>` elements styled by the classes above — `Button`'s variants (`bg-primary`, `bg-error`) are light-theme app tokens that would fight the navy restyle; plain buttons avoid that specificity conflict, matching the same pattern already used in `_landing/hero.tsx` and `_landing/invito-section.tsx`.

- [ ] **Step 3: Typecheck**

Run: `pnpm --filter=@dexhub/web exec tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Manual verification (transitional — page background still old, card content already restyled)**

Run: `pnpm --filter=@dexhub/web dev`, open `http://localhost:3000/login`.
Expected: the page background is still the old light theme (fixed in Task 3), but the form itself — title, subtitle, "Sign in" button, "problemi con accesso?" toggle — now renders with the new dark card styling floating on that light background. This transitional look is expected and temporary. Click "problemi con accesso?" and confirm the recovery/emergency options appear and switching modes still works (do not need to actually complete a real passkey/recovery/emergency login yet — that full check happens in Task 4).

- [ ] **Step 5: Commit**

Skip — this project has no git repository (confirmed at session start, `git status` returns "fatal: not a git repository"). No commit step for any task in this plan.

---

## Task 2: Login modal on the landing page (Nav-owned trigger)

**Files:**
- Modify: `apps/web/src/app/_landing/landing.module.css` (append modal classes)
- Create: `apps/web/src/app/_landing/login-modal.tsx`
- Modify: `apps/web/src/app/_landing/nav.tsx`

**Interfaces:**
- Consumes: `LoginForm` (Task 1, `export function LoginForm()`, no props) and its `.card` class from `login-form.module.css`.
- Produces: `LoginModal` component with props `{ open: boolean; onClose: () => void }`.

- [ ] **Step 1: Append modal CSS to the landing stylesheet**

Append to `apps/web/src/app/_landing/landing.module.css`:

```css
/* ── Login modal ── */
.modalBackdrop {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: rgba(3, 27, 53, 0.75);
  backdrop-filter: blur(4px);
}

.modalCard {
  position: relative;
  width: 100%;
  max-width: 420px;
  max-height: 90vh;
  overflow-y: auto;
  outline: none;
}

.modalClose {
  position: absolute;
  top: 16px;
  right: 16px;
  background: transparent;
  border: none;
  color: rgba(234, 244, 241, 0.6);
  cursor: pointer;
  padding: 4px;
  border-radius: 8px;
  transition: background 0.15s, color 0.15s;
}

.modalClose:hover {
  background: rgba(255, 255, 255, 0.08);
  color: #fff;
}
```

- [ ] **Step 2: Create the LoginModal component**

Create `apps/web/src/app/_landing/login-modal.tsx`:

```tsx
'use client'

import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { LoginForm } from '@/core/components/login-form'
import loginFormStyles from '@/core/components/login-form.module.css'
import styles from './landing.module.css'

interface LoginModalProps {
  open: boolean
  onClose: () => void
}

export function LoginModal({ open, onClose }: LoginModalProps) {
  const cardRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    cardRef.current?.focus()

    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)

    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', handleKey)
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className={styles.modalBackdrop}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      role="presentation"
    >
      <div
        ref={cardRef}
        className={`${loginFormStyles.card} ${styles.modalCard}`}
        role="dialog"
        aria-modal="true"
        aria-label="Accedi"
        tabIndex={-1}
      >
        <button type="button" className={styles.modalClose} onClick={onClose} aria-label="Chiudi">
          <X size={18} aria-hidden="true" />
        </button>
        <LoginForm />
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Wire the modal into Nav ("Accedi" opens it instead of navigating)**

Replace the full contents of `apps/web/src/app/_landing/nav.tsx` with:

```tsx
'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Menu, X } from 'lucide-react'
import styles from './landing.module.css'
import { LoginModal } from './login-modal'

const LINKS = [
  { href: '#moduli', label: 'Moduli' },
  { href: '#come', label: 'Come funziona' },
  { href: '#chi', label: 'Chi c’è dietro' },
]

export function Nav() {
  const [open, setOpen] = useState(false)
  const [loginOpen, setLoginOpen] = useState(false)

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
          <button type="button" className={styles.navLink} onClick={() => setLoginOpen(true)}>Accedi</button>
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
          <button
            type="button"
            className={styles.navMobileLink}
            onClick={() => { setOpen(false); setLoginOpen(true) }}
          >
            Accedi
          </button>
          <a href="#invito" className={styles.navMobileCta} onClick={() => setOpen(false)}>Richiedi un invito</a>
        </nav>
      )}

      <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} />
    </header>
  )
}
```

Note: the `Link` import from `next/link` is dropped — `next/link` is no longer used anywhere in this file now that "Accedi" is a button, not a navigation link.

- [ ] **Step 4: Typecheck**

Run: `pnpm --filter=@dexhub/web exec tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Manual verification**

Dev server, `http://localhost:3000/`. Click "Accedi" in the desktop nav — a dark modal card appears over a blurred navy backdrop, showing the restyled login form (title, subtitle, Sign in button, "problemi con accesso?" toggle). Click the X in the top-right corner — modal closes. Reopen it, press `Esc` — closes. Reopen it, click the backdrop outside the card — closes. Reopen it, click inside the card — stays open. Narrow the window to mobile width, open the hamburger menu, tap "Accedi" — the mobile menu closes and the login modal opens (not both at once).

- [ ] **Step 6: Commit**

Skip — no git repository in this project.

---

## Task 3: Modernize the standalone `/login` page

**Files:**
- Create: `apps/web/src/app/(auth)/login/login.module.css`
- Modify: `apps/web/src/app/(auth)/login/page.tsx`

**Interfaces:**
- Consumes: `LoginForm` and its `.card` class (Task 1).
- Produces: nothing new consumed elsewhere — this is the final page-level container.

- [ ] **Step 1: Create the page-level CSS module**

Create `apps/web/src/app/(auth)/login/login.module.css`:

```css
.page {
  position: relative;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: hsl(207 84% 11%);
  overflow: hidden;
}

.glow {
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
  .glow {
    animation: none;
  }
}

.cardWrap {
  position: relative;
  width: 100%;
  max-width: 400px;
}
```

- [ ] **Step 2: Rewrite the login page**

Replace the full contents of `apps/web/src/app/(auth)/login/page.tsx` with:

```tsx
import { LoginForm } from '@/core/components/login-form'
import loginFormStyles from '@/core/components/login-form.module.css'
import styles from './login.module.css'

export default function LoginPage() {
  return (
    <main className={styles.page}>
      <div className={styles.glow} aria-hidden="true" />
      <div className={styles.cardWrap}>
        <div className={loginFormStyles.card}>
          <LoginForm />
        </div>
      </div>
    </main>
  )
}
```

- [ ] **Step 3: Typecheck**

Run: `pnpm --filter=@dexhub/web exec tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Manual verification**

Dev server, open `http://localhost:3000/login` directly (not via the landing). Expected: full navy background with the same drifting mint-green glow as the landing hero, the login card centered on top, identical content/behavior to the modal version from Task 2 (same title, same 3 modes). Confirm this is now visually consistent with the modal — no more transitional light background from Task 1.

- [ ] **Step 5: Commit**

Skip — no git repository in this project.

---

## Task 4: Full verification against the real stack

**Files:** none — verification only.

- [ ] **Step 1: Rebuild the real `web` container**

```bash
docker compose up -d --build web
```

Expected: `dexhub-web-1` recreated and started (this also rebuilds `api` if it's a dependency in the compose file — harmless, matches this project's established rebuild pattern).

- [ ] **Step 2: Full manual walkthrough on the real domain**

Open `https://192-168-1-3.nip.io` (or whatever the current LAN IP is — check with `ipconfig` if unreachable, this project's `.env` `DOMAIN` must match the machine's actual current IP).

1. Click "Accedi" in the nav → modal opens with the restyled form.
2. Complete a real passkey sign-in (if a registered passkey is available on the test device) → confirm redirect to `/dashboard` still works exactly as before this redesign.
3. Open the modal again, click "problemi con accesso?" → click "use recovery" → confirm the recovery form renders correctly inside the modal card, test with a real recovery email+code if available.
4. Same for the emergency-token mode → confirm the amber warning box renders and the danger-styled submit button appears.
5. Close the modal (X, Esc, backdrop click) — confirm all three work and `document.body` scrolling is restored after closing (scroll the page a bit while the modal is closed to confirm it's not stuck at `overflow: hidden`).
6. Navigate directly to `https://192-168-1-3.nip.io/login` (typed URL, not via the landing) → confirm the full navy page renders with the same card, same 3 modes, same behavior as the modal.
7. Confirm no console errors in the browser devtools throughout.

Since there is no browser automation tool available in this environment, this step must be performed and confirmed by a human before the work is considered done — do not declare this task complete from code review alone.

- [ ] **Step 3: Commit**

Skip — no git repository in this project.

---

## Self-Review Notes

- **Spec coverage:** shared `LoginForm` restyle (Task 1), modal on landing with Nav-owned state (Task 2), navy `/login` page reusing the same card (Task 3), full real-stack verification (Task 4) — every section of the spec maps to a task.
- **Placeholder scan:** every step has complete, runnable code — no TBD, no "similar to Task N".
- **Type/name consistency:** `LoginForm` (no props) used identically in Task 2 (`login-modal.tsx`) and Task 3 (`page.tsx`); `.card` class from `login-form.module.css` consumed by both with the same import path; `LoginModal` props (`open: boolean`, `onClose: () => void`) match exactly between its definition (Task 2, Step 2) and its usage in `nav.tsx` (Task 2, Step 3).
- **Deviation flagged inline:** dropping the `@dexhub/ui` `Button` component from `login-form.tsx` in favor of plain styled buttons — not explicitly requested, but necessary to avoid the app's light-theme token classes (`bg-primary`, `bg-error`) fighting the navy restyle; documented in Task 1 Step 2's note, matches the pattern already used in `_landing/hero.tsx` and `_landing/invito-section.tsx`.
