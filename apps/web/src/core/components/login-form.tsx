'use client'

import { useState } from 'react'
import Image from 'next/image'
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
      router.push('/home')
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
      router.push('/home')
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
      router.push('/home')
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
        <div className="flex justify-center mb-3">
          <Image
            src="/dexhub-mark.png"
            alt="DexHub"
            width={48}
            height={48}
            unoptimized
            priority
            className="h-12 w-12 object-contain drop-shadow-md"
          />
        </div>
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
