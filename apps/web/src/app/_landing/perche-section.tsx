import { XCircle, CheckCircle2 } from 'lucide-react'
import styles from './landing.module.css'

const OLD_WAY = [
  {
    title: 'Frammentazione continua',
    desc: 'Quattro app diverse per note, turni, prestiti e conti con gli amici. Password multiple, notifiche invadenti e interfacce slegate.',
  },
  {
    title: 'Fogli Excel fragili',
    desc: 'Formule artigianali da decine di colonne per calcolare le ore del cartellino e il netto in busta paga, che si rompono al primo straordinario o storno CIG.',
  },
  {
    title: 'Abbonamenti SaaS infiniti',
    desc: 'Canoni da 8€ a 15€ al mese per ogni singolo servizio, con funzioni bloccate dietro paywall crescenti e costi che lievitano anno dopo anno.',
  },
  {
    title: 'I tuoi dati venduti nel cloud',
    desc: 'Dati lavorativi, stipendi e abitudini finanziarie archiviati su server terzi oltreoceano, spesso usati per profilazione o telemetria.',
  },
]

const DEXHUB_WAY = [
  {
    title: 'Un solo hub coerente',
    desc: 'Cartellino presenze, calcolo cedolino, debiti, prestiti, note e to-do riuniti in un’unica web app scattante, pulita e accessibile ovunque.',
  },
  {
    title: 'Motore di calcolo CCNL integrato',
    desc: 'Nessuna formula da inventare: inserisci le ore e ottieni all’istante la stima del netto basata sul CCNL Metalmeccanico reale, con contributi, scaglioni e CIG.',
  },
  {
    title: 'Zero abbonamenti o paywall',
    desc: 'Software indipendente e self-hosted. Lo installi sul tuo server o computer locale: niente canoni ricorrenti, niente costi nascosti.',
  },
  {
    title: '100% Privacy & Sovranità dei dati',
    desc: 'Zero cookie di profilazione, zero tracker di terze parti e database PostgreSQL privato. Accesso istantaneo e sicuro con Passkey biometrica.',
  },
]

export function PercheSection() {
  return (
    <section id="perche" className={styles.section}>
      <div className={styles.container}>
        <div className={styles.sectionEyebrow}>Il Confronto</div>
        <h2 className={styles.sectionTitle}>Perché non è il solito software.</h2>
        <p className={`${styles.sectionSubline} ${styles.measure}`}>
          Un confronto trasparente tra il caos di gestire la propria quotidianità tra decine di app diverse e la semplicità di un hub personale.
        </p>

        <div className={styles.confrontoGrid}>
          {/* Colonna Vecchia Maniera */}
          <div className={styles.confrontoCardOld}>
            <div className={styles.confrontoBadgeOld}>
              <XCircle size={13} aria-hidden="true" />
              <span>La vecchia maniera</span>
            </div>
            <h3 className={styles.confrontoHeading}>La giungla dei SaaS & fogli sparsi</h3>
            <ul className={styles.confrontoList}>
              {OLD_WAY.map((item) => (
                <li key={item.title} className={styles.confrontoItem}>
                  <XCircle size={18} className={styles.confrontoIconBad} aria-hidden="true" />
                  <div>
                    <strong style={{ color: '#ffffff' }}>{item.title}:</strong>{' '}
                    <span>{item.desc}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* Colonna DexHub */}
          <div className={styles.confrontoCardNew}>
            <div className={styles.confrontoBadgeNew}>
              <CheckCircle2 size={13} aria-hidden="true" />
              <span>Con DexHub</span>
            </div>
            <h3 className={styles.confrontoHeading}>Il nuovo standard personale</h3>
            <ul className={styles.confrontoList}>
              {DEXHUB_WAY.map((item) => (
                <li key={item.title} className={styles.confrontoItem}>
                  <CheckCircle2 size={18} className={styles.confrontoIconGood} aria-hidden="true" />
                  <div>
                    <strong style={{ color: '#ffffff' }}>{item.title}:</strong>{' '}
                    <span>{item.desc}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  )
}
