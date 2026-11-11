'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Menu, X } from 'lucide-react'
import styles from './landing.module.css'

interface NavProps {
  onOpenLogin: () => void
}

const LINKS = [
  { href: '#moduli', label: 'Moduli' },
  { href: '#perche', label: 'Confronto' },
  { href: '#chi', label: 'La Storia' },
  { href: '#faq', label: 'FAQ' },
]

export function Nav({ onOpenLogin }: NavProps) {
  const [open, setOpen] = useState(false)

  return (
    <header className={styles.nav}>
      <div className={styles.navInner}>
        <div className={styles.navBrand}>
          <Image src="/icon.png" alt="DexHub" width={38} height={38} className={styles.navLogo} priority />
          <span className={styles.navName}>
            <span className={styles.navAccent}>Dex</span>Hub
          </span>
        </div>

        <nav className={styles.navLinks} aria-label="Sezioni">
          {LINKS.map((l) => (
            <a key={l.href} href={l.href} className={styles.navLink}>{l.label}</a>
          ))}
          <button type="button" className={styles.navLink} onClick={onOpenLogin}>Accedi</button>
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
            onClick={() => { setOpen(false); onOpenLogin() }}
          >
            Accedi
          </button>
          <a href="#invito" className={styles.navMobileCta} onClick={() => setOpen(false)}>Richiedi un invito</a>
        </nav>
      )}
    </header>
  )
}
