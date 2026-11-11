import { Clock, Wallet, CheckSquare, Pizza } from 'lucide-react'
import styles from './landing.module.css'

const MODULES = [
  {
    icon: Clock,
    badge: 'CCNL Metalmeccanico',
    name: 'Cartellino & Stima Busta Paga',
    desc: 'Registrazione giornaliera di ore ordinarie, straordinari al 25%/50%, storni CIG, ferie e permessi. Include il motore fiscale deterministico per la stima del netto mensile, con scaglioni IRPEF, contributi INPS e detrazioni reali.',
  },
  {
    icon: Wallet,
    badge: 'Finanze & Ammortamento',
    name: 'Prestiti & Registro Debiti',
    desc: 'Calcola rate e piani di ammortamento alla francese con quote capitale e interessi per mutui o finanziamenti. In più, tieni traccia di crediti e spese condivise tra amici e colleghi senza passare per fogli volanti.',
  },
  {
    icon: CheckSquare,
    badge: 'Markdown & Spazi',
    name: 'Attività & Note Veloci',
    desc: 'Editor essenziale in Markdown per appunti, documentazione tecnica e liste to-do con priorità, tag e scadenze. Nessun caricamento pesante: digiti, organizzi e ritrovi le informazioni in frazioni di secondo.',
  },
  {
    icon: Pizza,
    badge: 'Utility Quotidiana',
    name: 'Calcolatore Impasti Pizza',
    desc: 'Calcolo di precisione per idratazione, farina, lievito di birra e sale per pizza napoletana, teglia e prefermenti. Salva le tue ricette collaudate direttamente sul tuo dispositivo in modalità offline.',
  },
]

export function ModuliSection() {
  return (
    <section id="moduli" className={styles.section}>
      <div className={styles.container}>
        <div className={styles.sectionEyebrow}>Cosa c’è dentro</div>
        <h2 className={styles.sectionTitle}>Strumenti concreti per la vita e il lavoro di ogni giorno.</h2>
        <p className={`${styles.sectionSubline} ${styles.measure}`}>
          Nessuna funzione superflua o menu ingombranti: solo moduli pratici e focalizzati, progettati per risolvere esigenze quotidiane reali senza complicazioni.
        </p>

        <div className={styles.moduliGrid}>
          {MODULES.map(({ icon: Icon, badge, name, desc }) => (
            <div key={name} className={styles.moduleCard}>
              <div className={styles.moduleHeader}>
                <div className={styles.moduleIcon}>
                  <Icon size={20} aria-hidden="true" />
                </div>
                <span className={styles.moduleBadge}>{badge}</span>
              </div>
              <h3 className={styles.moduleTitle}>{name}</h3>
              <p className={styles.moduleDesc}>{desc}</p>
            </div>
          ))}
        </div>

        <div className={styles.moduliBanner}>
          <div>
            <span className={styles.moduliBannerHighlight}>Modularità reale in 1-click</span>
            <p className={styles.moduliBannerText}>
              Non ti serve il calcolatore impasti o non hai prestiti da tracciare? Dalle Impostazioni puoi disattivare qualsiasi modulo con un interruttore: l’interfaccia si snellisce all’istante e il sistema non carica nulla di superfluo.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
