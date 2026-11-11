import styles from './landing.module.css'

export function ChiSection() {
  return (
    <section id="chi" className={styles.section}>
      <div className={styles.container}>
        <div className={styles.chiCard}>
          <div className={styles.chiAvatar} aria-hidden="true">AM</div>
          <div>
            <div className={styles.sectionEyebrow}>La storia del progetto</div>
            <h2 className={styles.chiTitle}>Perché ho costruito DexHub</h2>
            <p className={styles.chiText}>
              Ero stanco di avere la mia vita organizzata su cinque app diverse a pagamento e, soprattutto, di impazzire a fine mese su fogli Excel da quaranta colonne solo per capire quanto avrei preso in busta paga calcolando straordinari, addizionali regionali e storni CIG.
            </p>
            <p className={styles.chiText}>
              Ho iniziato a sviluppare DexHub innanzitutto per me stesso: volevo uno strumento veloce, pulito da usare ogni giorno, capace di calcoli esatti al centesimo e che non mandasse i miei dati personali in giro per il cloud. È software artigianale, sviluppato e curato con passione.
            </p>
            <p className={styles.chiText}>
              Oggi sto aprendo l&rsquo;accesso a un numero limitato di persone tramite invito per raccogliere feedback reali e continuare a perfezionarlo. Se condividi l&rsquo;idea di riprenderti il controllo dei tuoi strumenti e dei tuoi dati, sei il benvenuto.
            </p>
            <div className={styles.chiSignature}>— Alex Munafò &middot; Ideatore e sviluppatore di DexHub</div>
          </div>
        </div>
      </div>
    </section>
  )
}
