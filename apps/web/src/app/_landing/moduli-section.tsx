import { CheckSquare, Clock, FileText, Layers } from 'lucide-react'
import styles from './landing.module.css'

const MODULES = [
  {
    icon: FileText,
    badge: '@dexhub/notes',
    name: 'Note & Documenti',
    desc: 'Editor pulito con supporto Markdown, tag personalizzati e organizzazione per categorie. Pensato per scrivere appunti tecnici, idee e liste senza attriti.',
  },
  {
    icon: CheckSquare,
    badge: '@dexhub/tasks',
    name: 'Attività & Spazi',
    desc: 'Gestione to-do con priorità, sotto-attività e scadenze. Supporta spazi di lavoro personali o collaborativi, condivisibili tramite codice d’accesso.',
  },
  {
    icon: Clock,
    badge: '@dexhub/worklog',
    name: 'Cartellino & Cedolino',
    desc: 'Registrazione giornaliera di presenze, straordinari, ferie e permessi. Include il motore economico di calcolo del netto mensile basato su CCNL reale.',
  },
  {
    icon: Layers,
    badge: 'Architettura',
    name: 'Workspace Modulare',
    desc: 'Ogni modulo è un package isolato e indipendente. Attivi solo gli strumenti di cui hai bisogno: l’interfaccia e il database restano puliti e veloci.',
  },
]

export function ModuliSection() {
  return (
    <section id="moduli" className={styles.section}>
      <div className={styles.container}>
        <div className={styles.sectionEyebrow}>I Moduli</div>
        <h2 className={styles.sectionTitle}>Strumenti concreti per ogni giorno.</h2>
        <p className={`${styles.sectionSubline} ${styles.measure}`}>
          Nessuna funzionalità superflua o menu ingombranti: solo tre workspace ben progettati per la produttività personale e professionale.
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
      </div>
    </section>
  )
}
