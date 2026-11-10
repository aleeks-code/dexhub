import Image from 'next/image'
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
        <a href="#perche" className={styles.footerLink}>I Principi</a>
        <a href="#chi" className={styles.footerLink}>Chi c’è dietro</a>
      </div>
    </footer>
  )
}
