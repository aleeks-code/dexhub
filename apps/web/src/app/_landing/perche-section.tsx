import styles from './landing.module.css'

const PRINCIPLES = [
  {
    number: '01',
    title: 'Self-hosted & Sovranità dei dati',
    desc: 'L’intera applicazione gira in container Docker sul tuo hardware (PC, home server, NAS). Nessun dato lascia la tua rete locale e non esistono database cloud condivisi.',
  },
  {
    number: '02',
    title: 'Zero abbonamenti o tracciamento',
    desc: 'DexHub non include telemetria, annunci o modelli a consumo. È software artigianale costruito per essere affidabile e funzionare senza dipendenze commerciali.',
  },
  {
    number: '03',
    title: 'Motore di calcolo integrato',
    desc: 'Il modulo cartellino integra un motore deterministico per il calcolo di contributi INPS, scaglioni IRPEF e addizionali secondo i contratti nazionali italiani (CCNL).',
  },
]

export function PercheSection() {
  return (
    <section id="perche" className={styles.section}>
      <div className={styles.container}>
        <div className={styles.sectionEyebrow}>I Principi</div>
        <h2 className={styles.sectionTitle}>Un approccio diverso al software personale.</h2>
        <p className={`${styles.sectionSubline} ${styles.measure}`}>
          DexHub nasce per sostituire la frammentazione di decine di servizi SaaS a pagamento con un unico hub privato e trasparente.
        </p>

        <div className={styles.percheGrid}>
          {PRINCIPLES.map(({ number, title, desc }) => (
            <div key={title} className={styles.percheCard}>
              <span className={styles.percheNumber}>{number}</span>
              <h3 className={styles.percheTitle}>{title}</h3>
              <p className={styles.percheDesc}>{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
