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
            DexHub è attualmente in fase di test privato. Inserisci i tuoi contatti per ricevere un invito non appena si renderà disponibile uno slot.
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

          <div className={styles.invitoMicro}>I tuoi dati verranno utilizzati esclusivamente per l’invio dell’invito personale.</div>
        </div>
      </div>
    </section>
  )
}
