'use client'

import { useState } from 'react'
import { CheckSquare, Clock, FileText } from 'lucide-react'
import styles from './landing.module.css'

interface HeroProps {
  onOpenLogin?: () => void
}

type TabKey = 'note' | 'tasks' | 'worklog'

export function Hero({ onOpenLogin }: HeroProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('worklog')

  return (
    <section className={styles.hero}>
      <div className={styles.heroGlow} aria-hidden="true" />
      <div className={`${styles.container} ${styles.heroGrid}`}>
        <div>
          <div className={styles.heroEyebrow}>Beta privata &middot; Self-hosted</div>
          <h1 className={styles.heroHeadline}>
            Il tuo spazio personale, <span className={styles.heroAccent}>senza intermediari.</span>
          </h1>
          <p className={`${styles.heroSubline} ${styles.measure}`}>
            DexHub unisce note, gestione attività e conteggio ore con stima stipendio in un’unica web app modulare.
            I tuoi dati rimangono sul tuo server, senza cloud di terzi né abbonamenti.
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
            Self-hosted con Docker &middot; Nessun tracciamento &middot; Motore di calcolo locale
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
                aria-selected={activeTab === 'note'}
                className={`${styles.previewTab} ${activeTab === 'note' ? styles.previewTabActive : ''}`}
                onClick={() => setActiveTab('note')}
              >
                <FileText size={13} aria-hidden="true" />
                <span>Note</span>
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
                aria-selected={activeTab === 'worklog'}
                className={`${styles.previewTab} ${activeTab === 'worklog' ? styles.previewTabActive : ''}`}
                onClick={() => setActiveTab('worklog')}
              >
                <Clock size={13} aria-hidden="true" />
                <span>Cartellino</span>
              </button>
            </div>
          </div>

          <div className={styles.previewBody}>
            {activeTab === 'note' && (
              <div className={styles.previewNote}>
                <div className={styles.previewNoteHeader}>
                  <span className={styles.previewNoteTitle}>Appunti di lavoro — Q4</span>
                  <span className={styles.previewBadge}>Markdown</span>
                </div>
                <p className={styles.previewNoteBody}>
                  • Verifica quadratura ore e maggiorazioni CCNL Metalmeccanico.<br />
                  • Configurazione reverse proxy Caddy e certificato TLS interno.<br />
                  • Pianificazione backup crittografati AES-256 su storage locale.
                </p>
                <div className={styles.previewTags}>
                  <span className={styles.previewTag}>#personale</span>
                  <span className={styles.previewTag}>#infrastruttura</span>
                </div>
              </div>
            )}

            {activeTab === 'tasks' && (
              <div className={styles.previewTasks}>
                <div className={styles.previewTaskItem}>
                  <div className={styles.previewTaskLeft}>
                    <span className={styles.previewCheckDone}>✓</span>
                    <span className={styles.previewTaskDone}>Deploy container monorepo DexHub</span>
                  </div>
                  <span className={styles.previewPriorityDone}>Completato</span>
                </div>
                <div className={styles.previewTaskItem}>
                  <div className={styles.previewTaskLeft}>
                    <span className={styles.previewCheckDone}>✓</span>
                    <span className={styles.previewTaskDone}>Aggiornamento record DNS nip.io</span>
                  </div>
                  <span className={styles.previewPriorityDone}>Completato</span>
                </div>
                <div className={styles.previewTaskItem}>
                  <div className={styles.previewTaskLeft}>
                    <span className={styles.previewCheckPending} />
                    <span className={styles.previewTaskText}>Verifica conguaglio e addizionali IRPEF</span>
                  </div>
                  <span className={styles.previewPriorityActive}>In corso</span>
                </div>
                <div className={styles.previewTaskItem}>
                  <div className={styles.previewTaskLeft}>
                    <span className={styles.previewCheckPending} />
                    <span className={styles.previewTaskText}>Revisione note settimanali</span>
                  </div>
                  <span className={styles.previewPriorityPending}>Da fare</span>
                </div>
              </div>
            )}

            {activeTab === 'worklog' && (
              <div className={styles.previewWorklog}>
                <div className={styles.previewMetricGrid}>
                  <div className={styles.previewMetric}>
                    <span className={styles.previewMetricLabel}>Ore registrate (Novembre)</span>
                    <span className={styles.previewMetricValue}>168h</span>
                    <span className={styles.previewMetricSub}>160h ordinarie + 8h straordinario</span>
                  </div>
                  <div className={styles.previewMetric}>
                    <span className={styles.previewMetricLabel}>Stima netto calcolato</span>
                    <span className={styles.previewMetricValueHighlight}>€ 2.140,00</span>
                    <span className={styles.previewMetricSub}>CCNL Metalmeccanico &middot; Liv. B1</span>
                  </div>
                </div>

                <div>
                  <div className={styles.previewWorklogBar}>
                    <div className={styles.previewProgressBar} style={{ width: '92%' }} />
                  </div>
                  <div className={styles.previewWorklogStatus} style={{ marginTop: 8 }}>
                    <span>Avanzamento mese: 21 gg lavorati</span>
                    <span>100% in regola</span>
                  </div>
                </div>
              </div>
            )}

            <div className={styles.previewFooter}>
              <span className={styles.previewLiveIndicator}>
                <span className={styles.previewLiveDot} />
                <span>Database locale PostgreSQL</span>
              </span>
              <span>Workspace isolato</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
