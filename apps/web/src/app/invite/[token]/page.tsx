'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { startRegistration } from '@simplewebauthn/browser'
import { useT } from '@/i18n'

const API = process.env['NEXT_PUBLIC_API_URL'] ?? ''

async function apiGet(path: string) {
  const res = await fetch(`${API}${path}`, { credentials: 'include' })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.message ?? err?.error?.message ?? `HTTP ${res.status}`)
  }
  return res.json()
}

async function apiPost(path: string, body: unknown) {
  const res = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    credentials: 'include',
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.message ?? err?.error?.message ?? `HTTP ${res.status}`)
  }
  return res.json()
}

type Step = 'loading' | 'invalid' | 'account' | 'passkey' | 'recovery'

export default function InvitePage() {
  const params = useParams()
  const router = useRouter()
  const token = params['token'] as string
  const t = useT()
  const ti = t.admin.invite

  const [step, setStep] = useState<Step>('loading')
  const [prefillEmail, setPrefillEmail] = useState('')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([])
  const [savedCodes, setSavedCodes] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [tokenError, setTokenError] = useState('')

  useEffect(() => {
    async function validate() {
      try {
        const res = await apiGet(`/api/v1/invite/${token}`)
        const prefill = res?.data?.email ?? ''
        setPrefillEmail(prefill)
        setEmail(prefill)
        setStep('account')
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : ''
        setTokenError(msg.toLowerCase().includes('expir') ? ti.expiredToken : ti.invalidToken)
        setStep('invalid')
      }
    }
    validate()
  }, [token, ti.expiredToken, ti.invalidToken])

  async function handleAccount(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !email.trim()) return
    setStep('passkey')
  }

  async function handlePasskey() {
    setError('')
    setLoading(true)
    try {
      const optionsRes = await apiGet(
        `/api/v1/invite/${token}/passkey/options?name=${encodeURIComponent(name.trim())}&email=${encodeURIComponent(email.trim())}`,
      )

      let credential
      try {
        credential = await startRegistration({ optionsJSON: optionsRes })
      } catch {
        throw new Error(ti.passkey.cancelled)
      }

      const verifyRes = await apiPost(`/api/v1/invite/${token}/passkey/verify`, credential)
      setRecoveryCodes(verifyRes?.data?.recoveryCodes ?? [])
      setStep('recovery')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error')
    } finally {
      setLoading(false)
    }
  }

  function copyAll() {
    navigator.clipboard.writeText(recoveryCodes.join('\n'))
  }

  const steps = [
    { id: 'account', label: ti.steps.account },
    { id: 'passkey', label: ti.steps.passkey },
    { id: 'recovery', label: ti.steps.recovery },
  ] as const

  const activeStepIdx = step === 'account' ? 0 : step === 'passkey' ? 1 : 2

  return (
    <main className="flex min-h-screen items-center justify-center bg-bg px-4 py-12">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-2xl font-bold text-text">{ti.title}</h1>
          <p className="mt-1 text-sm text-text-muted">{ti.subtitle}</p>
        </div>

        {step === 'loading' && (
          <div className="rounded-xl border border-border bg-surface p-8 text-center">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        )}

        {step === 'invalid' && (
          <div className="rounded-xl border border-border bg-surface p-8 text-center space-y-3">
            <p className="text-sm text-error font-medium">{tokenError}</p>
          </div>
        )}

        {(step === 'account' || step === 'passkey' || step === 'recovery') && (
          <>
            {/* Progress */}
            <div className="flex items-center justify-between">
              {steps.map((s, i) => (
                <div key={s.id} className="flex items-center gap-2">
                  <div
                    className={[
                      'flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium',
                      i === activeStepIdx
                        ? 'bg-primary text-primary-foreground'
                        : i < activeStepIdx
                          ? 'bg-success text-white'
                          : 'bg-surface-raised text-text-muted',
                    ].join(' ')}
                  >
                    {i + 1}
                  </div>
                  <span className={['text-sm', i === activeStepIdx ? 'text-text font-medium' : 'text-text-muted'].join(' ')}>
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
                    <h2 className="text-xl font-bold text-text">{ti.account.title}</h2>
                    <p className="mt-1 text-sm text-text-muted">{ti.account.subtitle}</p>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="mb-1 block text-sm font-medium text-text">{ti.account.nameLbl}</label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        placeholder={ti.account.namePh}
                        className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text placeholder:text-text-subtle focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-text">{ti.account.emailLbl}</label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        readOnly={!!prefillEmail}
                        className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text placeholder:text-text-subtle focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-60"
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    className="w-full rounded-lg bg-primary py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                  >
                    {ti.account.continue}
                  </button>
                </form>
              )}

              {step === 'passkey' && (
                <div className="space-y-5">
                  <div>
                    <h2 className="text-xl font-bold text-text">{ti.passkey.title}</h2>
                    <p className="mt-1 text-sm text-text-muted">{ti.passkey.desc}</p>
                  </div>
                  <div className="rounded-lg border border-border bg-bg p-4">
                    <p className="text-sm text-text-muted">{ti.passkey.hint}</p>
                  </div>
                  {error && <p className="text-sm text-error">{error}</p>}
                  <button
                    onClick={handlePasskey}
                    disabled={loading}
                    className="w-full rounded-lg bg-primary py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                  >
                    {loading ? ti.passkey.registering : ti.passkey.create}
                  </button>
                </div>
              )}

              {step === 'recovery' && (
                <div className="space-y-5">
                  <div>
                    <h2 className="text-xl font-bold text-text">{ti.recovery.title}</h2>
                    <p className="mt-1 text-sm text-text-muted">{ti.recovery.desc}</p>
                  </div>
                  <div className="rounded-lg border border-border bg-bg p-4 space-y-3">
                    <code className="block text-center font-mono text-lg tracking-widest text-text">
                      {recoveryCodes[0]}
                    </code>
                    <button onClick={copyAll} className="text-xs text-primary hover:underline">
                      {ti.recovery.copyAll}
                    </button>
                  </div>
                  <label className="flex items-center gap-2 text-sm text-text cursor-pointer">
                    <input
                      type="checkbox"
                      checked={savedCodes}
                      onChange={(e) => setSavedCodes(e.target.checked)}
                      className="rounded"
                    />
                    {ti.recovery.savedCheck}
                  </label>
                  <button
                    disabled={!savedCodes}
                    onClick={() => router.push('/login')}
                    className="w-full rounded-lg bg-primary py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                  >
                    {ti.recovery.done}
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </main>
  )
}
