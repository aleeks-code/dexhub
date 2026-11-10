'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { startRegistration } from '@simplewebauthn/browser'
import { Button } from '@dexhub/ui'
import { useT } from '@/i18n'

type Step = 'account' | 'passkey' | 'recovery'

const API = process.env['NEXT_PUBLIC_API_URL'] ?? ''

async function apiPost(path: string, body?: unknown) {
  const hasBody = body !== undefined
  const res = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: hasBody ? { 'Content-Type': 'application/json' } : {},
    body: hasBody ? JSON.stringify(body) : undefined,
    credentials: 'include',
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error?.message ?? `Request failed: ${res.status}`)
  }
  return res.json()
}

async function apiGet(path: string) {
  const res = await fetch(`${API}${path}`, { credentials: 'include' })
  if (!res.ok) throw new Error(`Request failed: ${res.status}`)
  return res.json()
}

export function SetupWizard() {
  const router = useRouter()
  const t = useT()
  const [step, setStep] = useState<Step>('account')
  const [setupToken, setSetupToken] = useState('')
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([])
  const [savedCodes, setSavedCodes] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')

  async function handleAccount(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await apiPost('/api/v1/setup/init', { name, email })
      setSetupToken(res.data.setupToken)
      setStep('passkey')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  async function handlePasskey() {
    setError('')
    setLoading(true)
    try {
      const options = await apiGet(`/api/v1/setup/passkey/options?token=${setupToken}`)

      let credential
      try {
        credential = await startRegistration({ optionsJSON: options })
      } catch {
        throw new Error(t.setup.passkey.cancelled)
      }

      await apiPost(`/api/v1/setup/passkey/verify?token=${setupToken}`, credential)
      setStep('recovery')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  async function handleComplete() {
    setLoading(true)
    setError('')
    try {
      const res = await apiPost(`/api/v1/setup/complete?token=${setupToken}`)
      setRecoveryCodes(res.data.recoveryCodes)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  function copyAll() {
    navigator.clipboard.writeText(recoveryCodes.join('\n'))
  }

  const steps = [
    { id: 'account', label: t.setup.steps.account },
    { id: 'passkey', label: t.setup.steps.passkey },
    { id: 'recovery', label: t.setup.steps.recovery },
  ] as const

  return (
    <div className="w-full max-w-md space-y-6">
      {/* Progress */}
      <div className="flex items-center justify-between">
        {steps.map((s, i) => (
          <div key={s.id} className="flex items-center gap-2">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
                s.id === step
                  ? 'bg-primary text-primary-foreground'
                  : steps.findIndex((x) => x.id === step) > i
                    ? 'bg-success text-white'
                    : 'bg-surface-raised text-text-muted'
              }`}
            >
              {i + 1}
            </div>
            <span
              className={`text-sm ${s.id === step ? 'text-text font-medium' : 'text-text-muted'}`}
            >
              {s.label}
            </span>
            {i < steps.length - 1 && <div className="mx-2 h-px w-8 bg-border" />}
          </div>
        ))}
      </div>

      {/* Card */}
      <div className="rounded-xl border border-border bg-surface p-8">
        {step === 'account' && (
          <form onSubmit={handleAccount} className="space-y-5">
            <div>
              <h1 className="text-xl font-bold text-text">{t.setup.account.title}</h1>
              <p className="mt-1 text-sm text-text-muted">{t.setup.account.subtitle}</p>
            </div>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-text">{t.setup.account.nameLbl}</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder={t.setup.account.namePh}
                  className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text placeholder:text-text-subtle focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-text">{t.setup.account.emailLbl}</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder={t.setup.account.emailPh}
                  className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text placeholder:text-text-subtle focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
            {error && <p className="text-sm text-error">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? t.setup.account.creating : t.setup.account.continue}
            </Button>
          </form>
        )}

        {step === 'passkey' && (
          <div className="space-y-5">
            <div>
              <h1 className="text-xl font-bold text-text">{t.setup.passkey.title}</h1>
              <p className="mt-1 text-sm text-text-muted">{t.setup.passkey.desc}</p>
            </div>
            <div className="rounded-lg border border-border bg-bg p-4">
              <p className="text-sm text-text-muted">{t.setup.passkey.hint}</p>
            </div>
            {error && <p className="text-sm text-error">{error}</p>}
            <div className="flex flex-col gap-2">
              <Button onClick={handlePasskey} className="w-full" disabled={loading}>
                {loading ? t.setup.passkey.registering : t.setup.passkey.create}
              </Button>
            </div>
          </div>
        )}

        {step === 'recovery' && recoveryCodes.length === 0 && (
          <div className="space-y-5">
            <div>
              <h1 className="text-xl font-bold text-text">{t.setup.recovery.title}</h1>
              <p className="mt-1 text-sm text-text-muted">{t.setup.recovery.desc}</p>
            </div>
            {error && <p className="text-sm text-error">{error}</p>}
            <Button onClick={handleComplete} className="w-full" disabled={loading}>
              {loading ? t.setup.recovery.generating : t.setup.recovery.generate}
            </Button>
          </div>
        )}

        {step === 'recovery' && recoveryCodes.length > 0 && (
          <div className="space-y-5">
            <div>
              <h1 className="text-xl font-bold text-text">{t.setup.recovery.saveTitle}</h1>
              <p className="mt-1 text-sm text-text-muted">{t.setup.recovery.saveDesc}</p>
            </div>
            <div className="rounded-lg border border-border bg-bg p-4 space-y-3">
              <code className="block text-center font-mono text-lg tracking-widest text-text">
                {recoveryCodes[0]}
              </code>
              <button onClick={copyAll} className="text-xs text-primary hover:underline">
                {t.setup.recovery.copyAll}
              </button>
            </div>
            <label className="flex items-center gap-2 text-sm text-text">
              <input
                type="checkbox"
                checked={savedCodes}
                onChange={(e) => setSavedCodes(e.target.checked)}
                className="rounded"
              />
              {t.setup.recovery.savedCheck}
            </label>
            {error && <p className="text-sm text-error">{error}</p>}
            <Button
              className="w-full"
              disabled={!savedCodes}
              onClick={() => router.push('/login')}
            >
              {t.setup.recovery.complete}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
