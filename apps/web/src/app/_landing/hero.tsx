'use client'

import { useState } from 'react'
import { CheckSquare, Clock, FileText, WalletCards } from 'lucide-react'
import styles from './landing.module.css'

interface HeroProps {
  onOpenLogin?: () => void
}

type TabKey = 'worklog' | 'finanze' | 'tasks' | 'note'

export function Hero({ onOpenLogin }: HeroProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('worklog')

  return (
    <section className={styles.hero}>
      <div className={styles.heroGlow} aria-hidden="true" />
      <div className={`${styles.container} ${styles.heroGrid}`}>
        <div>
          <div className={styles.heroEyebrow}>Software personale indipendente &middot; Self-hosted & Cloud-free</div>
          <h1 className={styles.heroHeadline}>
            Basta fogli Excel rotti e <span className={styles.heroAccent}>dieci abbonamenti diversi.</span>
          </h1>
          <p className={`${styles.heroSubline} ${styles.measure}`}>
            DexHub è il tuo hub personale per cartellino con stima stipendio netto CCNL, gestione prestiti e debiti, note e to-do. Veloce, privato, installato sul tuo server o computer.
          </p>
          <div className={styles.heroActions}>
            <a href="#invito" className={styles.btnPrimary}>Richiedi un invito</a>
            {onOpenLogin ? (
              <button type="button" className={styles.btnSecondary} onClick={onOpenLogin}>
                Accedi al tuo hub
              </button>
            ) : (
              <a href="#moduli" className={styles.btnSecondary}>Esplora i moduli</a>
            )}
          </div>
          <div className={styles.heroMicro}>
            🔒 Zero cloud di terzi &middot; ⚡ Accesso biometrico con Passkey &middot; 💰 Nessun canone mensile
          </div>
        </div>

        <div className={styles.previewWindow}>
          <div className={styles.previewHeader}>
            <div className={styles.previewDots}>
              <span className={styles.previewDot} style={{ background: '#ef4444' }} />
              <span className={styles.previewDot} style={{ background: '#f59e0b' }} />
              <span className={styles.previewDot} style={{ background: '#10b981' }} />
            </div>

            <div className={styles.previewTabs} role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'worklog'}
                className={`${styles.previewTab} ${activeTab === 'worklog' ? styles.previewTabActive : ''}`}
                onClick={() => setActiveTab('worklog')}
              >
                <Clock size={13} aria-hidden="true" />
                <span>Cartellino</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'finanze'}
                className={`${styles.previewTab} ${activeTab === 'finanze' ? styles.previewTabActive : ''}`}
                onClick={() => setActiveTab('finanze')}
              >
                <WalletCards size={13} aria-hidden="true" />
                <span>Finanze</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'tasks'}
                className={`${styles.previewTab} ${activeTab === 'tasks' ? styles.previewTabActive : ''}`}
                onClick={() => setActiveTab('tasks')}
              >
                <CheckSquare size={13} aria-hidden="true" />
                <span>Attività</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'note'}
                className={`${styles.previewTab} ${activeTab === 'note' ? styles.previewTabActive : ''}`}
                onClick={() => setActiveTab('note')}
              >
                <FileText size={13} aria-hidden="true" />
                <span>Note</span>
              </button>
            </div>
          </div>

          <div className={styles.previewBody}>
            {activeTab === 'worklog' && (
              <div className={styles.previewWorklog}>
                <div className={styles.previewMetricGrid}>
                  <div className={styles.previewMetric}>
                    <span className={styles.previewMetricLabel}>Ore registrate (Novembre)</span>
                    <span className={styles.previewMetricValue}>168h</span>
                    <span className={styles.previewMetricSub}>160h ordinarie + 8h straordinario 25%</span>
                  </div>
                  <div className={styles.previewMetric}>
                    <span className={styles.previewMetricLabel}>Stima netto calcolato</span>
                    <span className={styles.previewMetricValueHighlight}>€ 2.140,50</span>
                    <span className={styles.previewMetricSub}>CCNL Metalmeccanico &middot; Livello B1</span>
                  </div>
                </div>

                <div>
                  <div className={styles.previewWorklogBar}>
                    <div className={styles.previewProgressBar} style={{ width: '92%' }} />
                  </div>
                  <div className={styles.previewWorklogStatus} style={{ marginTop: 8 }}>
                    <span>Avanzamento mese: 21 gg lavorati</span>
                    <span style={{ color: '#2dd4bf' }}>Storno CIG & trattenute calcolate</span>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'finanze' && (
              <div className={styles.previewWorklog}>
                <div className={styles.previewMetricGrid}>
                  <div className={styles.previewMetric}>
                    <span className={styles.previewMetricLabel}>Rata prestito auto</span>
                    <span className={styles.previewMetricValueHighlight}>€ 248,50 / m</span>
                    <span className={styles.previewMetricSub}>Ammortamento francese &middot; 4,20% TAN</span>
                  </div>
                  <div className={styles.previewMetric}>
                    <span className={styles.previewMetricLabel}>Registro Debiti / Crediti</span>
                    <span className={styles.previewMetricValue}>+€ 45,00</span>
                    <span className={styles.previewMetricSub}>2 crediti aperti &middot; 0 debiti scaduti</span>
                  </div>
                </div>

                <div className={styles.previewTasks}>
                  <div className={styles.previewTaskItem}>
                    <div className={styles.previewTaskLeft}>
                      <span className={styles.previewCheckDone}>€</span>
                      <span className={styles.previewTaskText}>Cena sushi venerdì (Marco)</span>
                    </div>
                    <span className={styles.previewPriorityActive}>+€ 35,00 da ricevere</span>
                  </div>
                  <div className={styles.previewTaskItem}>
                    <div className={styles.previewTaskLeft}>
                      <span className={styles.previewCheckDone}>✓</span>
                      <span className={styles.previewTaskDone}>Quota regalo compleanno Laura</span>
                    </div>
                    <span className={styles.previewPriorityDone}>Saldato € 20,00</span>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'tasks' && (
              <div className={styles.previewTasks}>
                <div className={styles.previewTaskItem}>
                  <div className={styles.previewTaskLeft}>
                    <span className={styles.previewCheckDone}>✓</span>
                    <span className={styles.previewTaskDone}>Inviare cartellino presenze firmato</span>
                  </div>
                  <span className={styles.previewPriorityDone}>Completato</span>
                </div>
                <div className={styles.previewTaskItem}>
                  <div className={styles.previewTaskLeft}>
                    <span className={styles.previewCheckDone}>✓</span>
                    <span className={styles.previewTaskDone}>Pagare rata finanziamento auto</span>
                  </div>
                  <span className={styles.previewPriorityDone}>Completato</span>
                </div>
                <div className={styles.previewTaskItem}>
                  <div className={styles.previewTaskLeft}>
                    <span className={styles.previewCheckPending} />
                    <span className={styles.previewTaskText}>Verifica conguaglio IRPEF e addizionali</span>
                  </div>
                  <span className={styles.previewPriorityActive}>In corso</span>
                </div>
                <div className={styles.previewTaskItem}>
                  <div className={styles.previewTaskLeft}>
                    <span className={styles.previewCheckPending} />
                    <span className={styles.previewTaskText}>Pizzata del weekend (impasto 70% idratazione)</span>
                  </div>
                  <span className={styles.previewPriorityPending}>Sabato</span>
                </div>
              </div>
            )}

            {activeTab === 'note' && (
              <div className={styles.previewNote}>
                <div className={styles.previewNoteHeader}>
                  <span className={styles.previewNoteTitle}>Promemoria CCNL & Busta Paga</span>
                  <span className={styles.previewBadge}>CCNL Metalmeccanico</span>
                </div>
                <p className={styles.previewNoteBody}>
                  &bull; Straordinario diurno 25% su 8h svolte sabato 19.<br />
                  &bull; Storno CIG orario calcolato con divisore mobile mensile.<br />
                  &bull; Detrazioni da lavoro dipendente e addizionali applicate a conguaglio.
                </p>
                <div className={styles.previewTags}>
                  <span className={styles.previewTag}>#lavoro</span>
                  <span className={styles.previewTag}>#cedolino</span>
                  <span className={styles.previewTag}>#personale</span>
                </div>
              </div>
            )}

            <div className={styles.previewFooter}>
              <span className={styles.previewLiveIndicator}>
                <span className={styles.previewLiveDot} />
                <span>Database locale PostgreSQL</span>
              </span>
              <span>100% self-hosted &middot; Zero telemetria</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
