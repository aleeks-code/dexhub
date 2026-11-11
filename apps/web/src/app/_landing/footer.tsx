import Image from 'next/image'
import Link from 'next/link'
import styles from './landing.module.css'

export function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.footerBrand}>
        <Image src="/icon.png" alt="" width={22} height={22} className={styles.footerLogo} />
        <span className={styles.footerName}>
          <span className={styles.navAccent}>Dex</span>Hub
        </span>
        <span className={styles.footerCopy}>© 2026 — software personale modulare</span>
      </div>
      <div className={styles.footerLinks}>
        <a href="#moduli" className={styles.footerLink}>Moduli</a>
        <a href="#perche" className={styles.footerLink}>Confronto</a>
        <a href="#chi" className={styles.footerLink}>La Storia</a>
        <a href="#faq" className={styles.footerLink}>FAQ</a>
        <Link href="/cookie-policy" className={styles.footerLink}>Privacy & Cookie</Link>
      </div>
    </footer>
  )
}
