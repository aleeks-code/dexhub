'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import styles from './landing.module.css'

const FAQS = [
  {
    q: 'Serve essere programmatori o avere competenze tecniche per usare DexHub?',
    a: 'Assolutamente no. DexHub è una moderna applicazione web pronta all’uso, ottimizzata per l’utilizzo quotidiano sia da computer che da smartphone. Se utilizzi l’istanza ospitata, ti basta ricevere l’invito ed effettuare l’accesso in un secondo con impronta digitale, Face ID o Windows Hello tramite lo standard sicuro Passkey.',
  },
  {
    q: 'Come fa il cartellino a stimare con precisione lo stipendio netto?',
    a: 'A differenza di un foglio di calcolo con formule generiche, DexHub integra un motore fiscale e contrattuale deterministico basato sui parametri ufficiali del CCNL (come il CCNL Metalmeccanico). Calcola in automatico la retribuzione fissa, i contributi INPS a carico lavoratore, gli scaglioni IRPEF attuali, le maggiorazioni per straordinari diurni e festivi e l’indennità/storno per ore di Cassa Integrazione (CIG).',
  },
  {
    q: 'Posso utilizzare solo i moduli che mi interessano?',
    a: 'Certamente. L’architettura di DexHub è modulare al 100%: dal menu Impostazioni puoi abilitare o disattivare ogni modulo con un semplice interruttore (es. prestiti, calcolatore impasti pizza, note o attività). I moduli disattivati non appaiono nella navigazione e non occupano risorse, lasciando l’interfaccia pulita e minimale.',
  },
  {
    q: 'I miei dati personali e le mie finanze sono davvero privati?',
    a: 'Sì. DexHub è progettato con una politica di zero telemetria: non esiste alcun cookie di terze parti o di profilazione, nessun pixel pubblicitario (Google, Meta, ecc.) e nessun dato viene ceduto a terzi. Inoltre, puoi esportare in formato JSON o cancellare l’intero archivio dei tuoi dati in 1-click in ogni momento.',
  },
  {
    q: 'Perché l’accesso è attualmente su invito e quanto costa?',
    a: 'DexHub è in fase di beta privata per garantire la massima stabilità e un’assistenza diretta. Gli slot vengono assegnati a piccoli scaglioni per raccogliere feedback sul campo e continuare a perfezionare i contratti e le funzionalità. L’accesso durante questa fase è completamente gratuito e privo di abbonamenti.',
  },
]

export function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0)

  function toggle(idx: number) {
    setOpenIndex((curr) => (curr === idx ? null : idx))
  }

  return (
    <section id="faq" className={styles.section}>
      <div className={styles.container}>
        <div className={styles.sectionEyebrow}>Domande Frequenti</div>
        <h2 className={styles.sectionTitle}>Tutto quello che c’è da sapere.</h2>
        <p className={`${styles.sectionSubline} ${styles.measure}`}>
          Risposte chiare e dirette ai dubbi più comuni prima di richiedere l’accesso al tuo hub personale.
        </p>

        <div className={styles.faqGrid}>
          {FAQS.map((faq, i) => {
            const isOpen = openIndex === i
            return (
              <div
                key={faq.q}
                className={`${styles.faqItem} ${isOpen ? styles.faqItemOpen : ''}`}
              >
                <button
                  type="button"
                  className={styles.faqQuestionBtn}
                  onClick={() => toggle(i)}
                  aria-expanded={isOpen}
                  aria-controls={`faq-answer-${i}`}
                >
                  <span className={styles.faqQuestionText}>{faq.q}</span>
                  <ChevronDown
                    size={18}
                    className={`${styles.faqIcon} ${isOpen ? styles.faqIconRotated : ''}`}
                    aria-hidden="true"
                  />
                </button>
                {isOpen && (
                  <div id={`faq-answer-${i}`} className={styles.faqAnswer}>
                    {faq.a}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
