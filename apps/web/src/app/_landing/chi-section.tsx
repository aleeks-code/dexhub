import styles from './landing.module.css'

export function ChiSection() {
  return (
    <section id="chi" className={styles.section}>
      <div className={styles.container}>
        <div className={styles.chiCard}>
          <div className={styles.chiAvatar} aria-hidden="true">AM</div>
          <div>
            <div className={styles.sectionEyebrow}>Chi c&rsquo;è dietro</div>
            <h2 className={styles.chiTitle}>Un progetto indipendente di Alex Munafò</h2>
            <p className={styles.chiText}>
              DexHub nasce dalla necessità concreta di non dover più saltare tra piattaforme chiuse, fogli di calcolo sparsi e servizi a pagamento per gestire appunti, to-do e il conteggio delle ore lavorate.
            </p>
            <p className={styles.chiText}>
              È un progetto curato direttamente, rilasciato in container Docker e sviluppato per essere uno strumento affidabile per l’uso quotidiano.
            </p>
            <div className={styles.chiSignature}>— Alex Munafò</div>
          </div>
        </div>
      </div>
    </section>
  )
}
