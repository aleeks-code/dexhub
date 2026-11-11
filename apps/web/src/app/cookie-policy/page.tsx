import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import {
  ShieldCheck,
  Lock,
  Cookie as CookieIcon,
  HardDrive,
  Info,
  ArrowLeft,
  CheckCircle2,
  ExternalLink,
  Scale,
  FileText,
  Mail,
  Server,
} from 'lucide-react'

export const metadata: Metadata = {
  title: 'Informativa Privacy & Cookie Policy — DexHub',
  description: 'Informativa completa sul trattamento dei dati personali, cookie tecnici e matrice di conformità dello storage di DexHub ex artt. 13-14 GDPR e art. 122 Codice Privacy.',
}

export default function CookiePolicyPage() {
  return (
    <div className="min-h-screen bg-bg text-text">
      {/* Top Header */}
      <header className="border-b border-border bg-surface/60 backdrop-blur-md sticky top-0 z-10">
        <div className="mx-auto max-w-4xl px-4 py-4 sm:px-6 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 transition-opacity hover:opacity-85">
            <Image src="/icon.png" alt="DexHub Logo" width={26} height={26} className="rounded-md" />
            <span className="text-base font-bold tracking-tight text-text">
              <span className="text-primary">Dex</span>Hub
            </span>
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-text hover:bg-surface-raised transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Torna alla Home
          </Link>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 space-y-9">
        {/* Title & Badge */}
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>GDPR (UE 2016/679) & D.Lgs. 196/2003</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-text sm:text-4xl">
            Informativa Privacy e Gestione dei Cookie & Storage Locale
          </h1>
          <p className="text-sm text-text-muted leading-relaxed">
            Informativa estesa resa ai sensi degli artt. 12, 13 e 14 del Regolamento UE 2016/679 (GDPR), dell&apos;art. 122 del D.Lgs. 196/2003 (Codice Privacy), delle Linee Guida del Garante per la protezione dei dati personali del 10 giugno 2021 (doc. web n. 9677876) e delle Linee Guida EDPB 5/2019 e 2/2023.
          </p>
          <div className="flex flex-wrap items-center gap-4 text-xs text-text-subtle pt-1">
            <span>Ultimo aggiornamento normativo: <strong>11 Novembre 2026</strong></span>
            <span>•</span>
            <span>Ambito applicativo: <strong>Piattaforma Web DexHub (dexhub.it)</strong></span>
          </div>
        </div>

        {/* Banner Informativo / Esenzione Banner Cookie */}
        <section className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-5 space-y-3">
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
            <CheckCircle2 className="h-5 w-5 shrink-0" />
            <span>Assenza di Cookie di Profilazione e Fondamento Giuridico dell&apos;Esenzione dal Banner</span>
          </div>
          <p className="text-xs text-text-muted leading-relaxed">
            <strong>Principio di Privacy-by-Design e Minimizzazione (Art. 5 GDPR):</strong> DexHub è una piattaforma personale modulare progettata per operare senza tracciamento pubblicitario, senza cessione di dati a data broker e <strong>senza alcun cookie o strumento di profilazione commerciale</strong>.
          </p>
          <p className="text-xs text-text-muted leading-relaxed">
            In conformità all&apos;<strong>art. 122, comma 1 del Codice Privacy</strong> e ai chiarimenti ufficiali delle <strong>FAQ del Garante Privacy</strong>, per l&apos;installazione di cookie e strumenti di memorizzazione locale aventi natura meramente tecnica <strong>non è richiesto il preventivo consenso dell&apos;utente</strong>. Non avrebbe senso giuridico richiedere all&apos;utente di accettare tecnologie per le quali la legge non prescrive il consenso: l&apos;obbligo di legge è assolto mediante la presente informativa trasparente e documentata.
          </p>
        </section>

        {/* 1. Titolare del Trattamento e DPO */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-text flex items-center gap-2">
            <Lock className="h-4 w-4 text-primary" />
            1. Titolare del Trattamento e DPO
          </h2>
          <div className="text-xs text-text-muted space-y-2 leading-relaxed">
            <p>
              <strong>Titolare del Trattamento:</strong> L&apos;amministratore dell&apos;istanza software DexHub (dominio <code>dexhub.it</code>). Email di contatto: <a href="mailto:alexmunni@outlook.it" className="text-primary hover:underline font-medium">alexmunni@outlook.it</a>.
            </p>
            <p>
              <strong>Responsabile della Protezione dei Dati (DPO):</strong> Ai sensi dell&apos;art. 37 del GDPR, la designazione del DPO non è obbligatoria, poiché il trattamento non è effettuato da un&apos;autorità pubblica e le attività principali non consistono in trattamenti che richiedono il monitoraggio regolare e sistematico degli interessati su larga scala, né nel trattamento su larga scala di categorie particolari di dati ex art. 9 GDPR. L&apos;utente può rivolgersi direttamente al Titolare per qualunque istanza privacy.
            </p>
          </div>
        </section>

        {/* 2. Basi Giuridiche e Finalità del Trattamento (Art. 13.1.c GDPR) */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-text flex items-center gap-2">
            <Scale className="h-4 w-4 text-primary" />
            2. Finalità e Basi Giuridiche del Trattamento
          </h2>
          <div className="text-xs text-text-muted space-y-2 leading-relaxed">
            <p>I dati personali trattati da DexHub sono raccolti esclusivamente per le seguenti finalità:</p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>
                <strong>Erogazione dei Servizi e Moduli Applicativi (Art. 6.1.b GDPR):</strong> gestione del cartellino presenze, turni, calcolo stima busta paga CCNL, registro debiti/crediti, gestione piani di ammortamento e ricette pizza. Il conferimento è necessario per l&apos;esecuzione del servizio esplicitamente richiesto dall&apos;utente.
              </li>
              <li>
                <strong>Autenticazione e Sicurezza Informatica (Art. 6.1.b e Art. 6.1.f GDPR):</strong> verifica dell&apos;identità tramite credenziali WebAuthn/Passkeys, prevenzione accessi abusivi, protezione anti-CSRF e tenuta degli audit log di sicurezza.
              </li>
              <li>
                <strong>Personalizzazione dell&apos;Esperienza d&apos;Uso (Art. 6.1.b GDPR e Art. 122 co. 1 Codice Privacy):</strong> memorizzazione delle preferenze esplicitamente impostate dall&apos;utente (lingua, tema visivo, formati date e valute).
              </li>
              <li>
                <strong>Comunicazioni Transazionali di Servizio (Art. 6.1.b GDPR):</strong> invio di email relative a link di invito e notifiche critiche di sistema.
              </li>
            </ul>
          </div>
        </section>

        {/* 3. Matrice Definitiva di Conformità Giuridica dello Storage */}
        <section className="space-y-4">
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-text flex items-center gap-2">
              <HardDrive className="h-4 w-4 text-primary" />
              3. Matrice di Conformità Giuridica dello Storage (Cookie & Web Storage)
            </h2>
            <p className="text-xs text-text-muted">
              Valutazione analitica e motivazione giuridica dell&apos;esenzione dal consenso ai sensi dell&apos;art. 122, comma 1 del Codice Privacy (Criterio A e Criterio B) e del Parere WP29 04/2012:
            </p>
          </div>

          <div className="overflow-x-auto rounded-xl border border-border bg-surface">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border bg-surface-raised text-text-muted font-semibold">
                  <th className="p-3 w-40">Chiave / Identificativo</th>
                  <th className="p-3 w-24">Vettore</th>
                  <th className="p-3">Finalità Concreta</th>
                  <th className="p-3 w-36">Motivazione Giuridica Esenzione</th>
                  <th className="p-3 w-28">Durata</th>
                  <th className="p-3 w-28">Misure di Sicurezza</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {/* better-auth.session_token */}
                <tr className="hover:bg-surface-raised/40 transition-colors">
                  <td className="p-3 font-mono font-bold text-primary">
                    better-auth.session_token
                  </td>
                  <td className="p-3">
                    <span className="rounded bg-surface-raised px-1.5 py-0.5 font-medium text-text">
                      Cookie HTTP (First-Party)
                    </span>
                  </td>
                  <td className="p-3 text-text-muted leading-relaxed">
                    <strong>Autenticazione di Sessione:</strong> mantiene l&apos;associazione crittografica sicura tra il browser dell&apos;utente loggato e la sessione lato server.
                  </td>
                  <td className="p-3 text-text-muted leading-relaxed">
                    <strong>Criterio B (Servizio Richiesto):</strong> strettamente necessario per erogare l&apos;accesso all&apos;area riservata richiesta dall&apos;utente all&apos;atto del login.
                  </td>
                  <td className="p-3 text-text-muted tabular-nums">
                    7 giorni (o fino a disconnessione esplicita)
                  </td>
                  <td className="p-3">
                    <span className="text-[11px] text-emerald-400 font-semibold block">HttpOnly</span>
                    <span className="text-[11px] text-emerald-400 font-semibold block">Secure (HTTPS)</span>
                    <span className="text-[11px] text-text-subtle block">SameSite=Lax</span>
                  </td>
                </tr>

                {/* dexhub-app-store & dexhub-language */}
                <tr className="hover:bg-surface-raised/40 transition-colors">
                  <td className="p-3 font-mono font-bold text-text">
                    dexhub-app-store<br />
                    <span className="text-[11px] font-normal text-text-subtle">dexhub-language</span>
                  </td>
                  <td className="p-3">
                    <span className="rounded bg-surface-raised px-1.5 py-0.5 font-medium text-text">
                      localStorage
                    </span>
                  </td>
                  <td className="p-3 text-text-muted leading-relaxed">
                    <strong>Personalizzazione Interfaccia Utente (UI Customization):</strong> memorizza le preferenze esplicitamente selezionate dall&apos;utente (tema dark/light, lingua it/en, palette colori, densità, formati data/valuta).
                    <div className="mt-1 text-[11px] text-text-subtle">
                      <em>Distinzione valori:</em> I valori predefiniti (es. dark mode, EUR, DD/MM/YYYY) risiedono staticamente nel bundle software; lo storage viene scritto unicamente a seguito di una variazione attiva dell&apos;utente.
                    </div>
                  </td>
                  <td className="p-3 text-text-muted leading-relaxed">
                    <strong>Criterio B & Parere WP29 04/2012:</strong> le preferenze di interfaccia impostate su espressa richiesta dell&apos;utente sono esenti da consenso in quanto funzionali al servizio richiesto.
                  </td>
                  <td className="p-3 text-text-muted">
                    Persistente fino a reset manuale
                  </td>
                  <td className="p-3 text-text-subtle text-[11px]">
                    Non inviato su rete HTTP (solo client-side)
                  </td>
                </tr>

                {/* dexhub:worklog:month */}
                <tr className="hover:bg-surface-raised/40 transition-colors">
                  <td className="p-3 font-mono font-medium text-text">
                    dexhub:worklog:month
                  </td>
                  <td className="p-3">
                    <span className="rounded bg-surface-raised px-1.5 py-0.5 font-medium text-text">
                      localStorage
                    </span>
                  </td>
                  <td className="p-3 text-text-muted leading-relaxed">
                    <strong>Preservazione Contesto di Lavoro (SPA State):</strong> mantiene l&apos;ultimo mese visualizzato nel cartellino durante la navigazione tra le schede.
                  </td>
                  <td className="p-3 text-text-muted leading-relaxed">
                    <strong>Criterio B (Funzionalità Richiesta):</strong> strumento tecnico di gestione dello stato applicativo interno al modulo richiesto.
                  </td>
                  <td className="p-3 text-text-muted">
                    Persistente locale
                  </td>
                  <td className="p-3 text-text-subtle text-[11px]">
                    Isolato nel browser
                  </td>
                </tr>

                {/* dexhub:worklog:stima_details_open */}
                <tr className="hover:bg-surface-raised/40 transition-colors">
                  <td className="p-3 font-mono font-medium text-text">
                    dexhub:worklog:stima_details_open
                  </td>
                  <td className="p-3">
                    <span className="rounded bg-surface-raised px-1.5 py-0.5 font-medium text-text">
                      localStorage
                    </span>
                  </td>
                  <td className="p-3 text-text-muted leading-relaxed">
                    <strong>Stato Componente UI:</strong> ricorda lo stato aperto/chiuso della vista dettagliata della stima busta paga.
                  </td>
                  <td className="p-3 text-text-muted leading-relaxed">
                    <strong>Criterio B:</strong> preferenza di visualizzazione dell&apos;utente strettamente legata al componente.
                  </td>
                  <td className="p-3 text-text-muted">
                    Persistente locale
                  </td>
                  <td className="p-3 text-text-subtle text-[11px]">
                    Isolato nel browser
                  </td>
                </tr>

                {/* dismissed_broadcast_* */}
                <tr className="hover:bg-surface-raised/40 transition-colors">
                  <td className="p-3 font-mono font-medium text-text">
                    dismissed_broadcast_[id]
                  </td>
                  <td className="p-3">
                    <span className="rounded bg-surface-raised px-1.5 py-0.5 font-medium text-text">
                      sessionStorage
                    </span>
                  </td>
                  <td className="p-3 text-text-muted leading-relaxed">
                    <strong>Soppressione Annunci Chiusi:</strong> registra l&apos;avvenuta chiusura di un avviso di sistema per evitarne la reiterazione nella stessa sessione.
                  </td>
                  <td className="p-3 text-text-muted leading-relaxed">
                    <strong>Criterio B:</strong> strettamente tecnico, necessario per dare corso all&apos;azione &quot;Chiudi avviso&quot; richiesta dall&apos;utente.
                  </td>
                  <td className="p-3 text-text-muted">
                    Sessione (cancellato alla chiusura della scheda)
                  </td>
                  <td className="p-3 text-text-subtle text-[11px]">
                    Volatile in memoria
                  </td>
                </tr>

                {/* dexhub:pizza:* */}
                <tr className="hover:bg-surface-raised/40 transition-colors">
                  <td className="p-3 font-mono font-medium text-text">
                    dexhub:pizza:calc_mode / recipes
                  </td>
                  <td className="p-3">
                    <span className="rounded bg-surface-raised px-1.5 py-0.5 font-medium text-text">
                      localStorage
                    </span>
                  </td>
                  <td className="p-3 text-text-muted leading-relaxed">
                    <strong>Dati Offline Calcolatore Pizza:</strong> salvataggio sul dispositivo dei parametri di impasto e delle ricette salvate localmente.
                  </td>
                  <td className="p-3 text-text-muted leading-relaxed">
                    <strong>Criterio B:</strong> erogazione del servizio di calcolo e archivio locale richiesto dall&apos;utente.
                  </td>
                  <td className="p-3 text-text-muted">
                    Persistente locale
                  </td>
                  <td className="p-3 text-text-subtle text-[11px]">
                    Non trasmesso al server
                  </td>
                </tr>

                {/* dexhub:debts:session_undo/redo */}
                <tr className="hover:bg-surface-raised/40 transition-colors">
                  <td className="p-3 font-mono font-medium text-text">
                    dexhub:debts:session_undo / redo
                  </td>
                  <td className="p-3">
                    <span className="rounded bg-surface-raised px-1.5 py-0.5 font-medium text-text">
                      sessionStorage
                    </span>
                  </td>
                  <td className="p-3 text-text-muted leading-relaxed">
                    <strong>Gestione Undo/Redo Modulo Debiti:</strong> memorizzazione temporanea delle operazioni per consentire il ripristino durante la modifica.
                  </td>
                  <td className="p-3 text-text-muted leading-relaxed">
                    <strong>Criterio B:</strong> funzionalità tecnica di editor richiesta dall&apos;utente.
                  </td>
                  <td className="p-3 text-text-muted">
                    Sessione attiva
                  </td>
                  <td className="p-3 text-text-subtle text-[11px]">
                    Volatile
                  </td>
                </tr>

                {/* feedbackBugsLastSeen & feedbackFeaturesLastSeen */}
                <tr className="hover:bg-surface-raised/40 transition-colors">
                  <td className="p-3 font-mono font-medium text-text">
                    feedbackBugsLastSeen<br />
                    <span className="text-[11px] font-normal text-text-subtle">feedbackFeaturesLastSeen</span>
                  </td>
                  <td className="p-3">
                    <span className="rounded bg-surface-raised px-1.5 py-0.5 font-medium text-text">
                      localStorage
                    </span>
                  </td>
                  <td className="p-3 text-text-muted leading-relaxed">
                    <strong>Contatori Badge Amministrazione:</strong> memorizza il numero di segnalazioni già visualizzate dall&apos;amministratore per evidenziare nuovi elementi non letti.
                  </td>
                  <td className="p-3 text-text-muted leading-relaxed">
                    <strong>Criterio B:</strong> strumento tecnico di stato visivo dell&apos;interfaccia amministrativa richiesta dall&apos;amministratore.
                  </td>
                  <td className="p-3 text-text-muted">
                    Persistente locale
                  </td>
                  <td className="p-3 text-text-subtle text-[11px]">
                    Isolato nel browser
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* 4. Autarchia Tecnica e Fornitori di Servizi (Art. 13.1.e GDPR) */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-text flex items-center gap-2">
            <Server className="h-4 w-4 text-primary" />
            4. Autarchia Tecnica, Fornitori e Destinatari dei Dati
          </h2>
          <div className="text-xs text-text-muted space-y-3 leading-relaxed">
            <p>
              In ottemperanza all&apos;obbligo di piena trasparenza sui destinatari (Art. 13.1.e GDPR), si dichiara:
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong>Totale Indipendenza da CDN Esterne per Font e Immagini:</strong> Tutti i caratteri tipografici (Geist Sans / Mono) e le icone delle bandiere (emoji Unicode native di sistema) sono distribuiti localmente dal server DexHub. <em>Nessuna connessione esterna viene generata verso Google Fonts o CDN di terze parti (incluso flagcdn.com, completamente rimosso)</em>, evitando qualsiasi esposizione dell&apos;indirizzo IP dell&apos;utente.
              </li>
              <li>
                <strong>Fornitore del Database Relazionale (Neon Inc.):</strong> L&apos;istanza PostgreSQL è gestita tramite Neon Serverless su server posizionati fisicamente nell&apos;Unione Europea (Regione <code>eu-central-1</code>, Francoforte, Germania). I dati sono crittografati a riposo (AES-256) e in transito (TLS 1.3).
              </li>
              <li>
                <strong>Fornitore di Posta Transazionale (Brevo / Sendinblue SAS):</strong> Utilizzato dal backend esclusivamente per l&apos;inoltro via SMTP di comunicazioni essenziali richieste dall&apos;utente (inviti e alert di sicurezza). I server di recapito risiedono nell&apos;Unione Europea (Francia/Germania) e operano in qualità di Responsabile del Trattamento (Data Processing Agreement conforme all&apos;Art. 28 GDPR). Nelle comunicazioni non è presente alcun pixel o tracker di apertura.
              </li>
              <li>
                <strong>Trasferimenti di Dati Extra-UE:</strong> Nessun dato personale viene trasferito al di fuori dello Spazio Economico Europeo (SEE).
              </li>
            </ul>
          </div>
        </section>

        {/* 5. Periodo di Conservazione dei Dati (Art. 13.2.a GDPR) */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-text flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            5. Tempi di Conservazione (Retention Policy)
          </h2>
          <div className="text-xs text-text-muted space-y-2 leading-relaxed">
            <ul className="list-disc pl-5 space-y-1.5">
              <li><strong>Cookie di sessione:</strong> 7 giorni dall&apos;emissione o eliminazione immediata al comando di logout.</li>
              <li><strong>Dati di profilo e moduli (cartellino, debiti, prestiti, task):</strong> conservati per l&apos;intera durata dell&apos;account attivo, fino alla richiesta di cancellazione da parte dell&apos;utente o chiusura dell&apos;istanza.</li>
              <li><strong>Audit log amministrativi:</strong> conservati per 90 giorni con rotazione automatica per sole finalità di sicurezza informatica e accertamento di accessi abusivi.</li>
              <li><strong>Web Storage del dispositivo:</strong> sotto il diretto controllo dell&apos;utente, persistente fino alla cancellazione dei dati del browser o ripristino della cache dalla sezione Impostazioni.</li>
            </ul>
          </div>
        </section>

        {/* 6. Come Disabilitare o Cancellare Cookie e Storage */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-text flex items-center gap-2">
            <CookieIcon className="h-4 w-4 text-primary" />
            6. Modalità di Gestione e Cancellazione dello Storage nel Browser
          </h2>
          <div className="text-xs text-text-muted space-y-3 leading-relaxed">
            <p>
              L&apos;utente può verificare, limitare o cancellare in ogni momento i cookie e lo storage locale direttamente dalle impostazioni del proprio browser:
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
              {[
                { name: 'Google Chrome', url: 'https://support.google.com/chrome/answer/95647' },
                { name: 'Mozilla Firefox', url: 'https://support.mozilla.org/kb/enhanced-tracking-protection-firefox-desktop' },
                { name: 'Apple Safari', url: 'https://support.apple.com/guide/safari/manage-cookies-sfri11471/mac' },
                { name: 'Microsoft Edge', url: 'https://support.microsoft.com/microsoft-edge/delete-cookies-in-microsoft-edge-63947406-40ac-c3b8-57b9-2a946a29ae09' },
                { name: 'Brave Browser', url: 'https://support.brave.com/hc/en-us/articles/360022806292' },
                { name: 'Opera', url: 'https://help.opera.com/latest/web-preferences/#cookies' },
              ].map((b) => (
                <a
                  key={b.name}
                  href={b.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-lg border border-border bg-surface p-2.5 text-center text-xs font-semibold text-text hover:border-primary hover:text-primary transition-colors flex items-center justify-center gap-1.5"
                >
                  <span>{b.name}</span>
                  <ExternalLink className="h-3 w-3 opacity-60" />
                </a>
              ))}
            </div>
            <p className="text-[11px] text-text-subtle pt-2">
              All&apos;interno di DexHub, è inoltre possibile svuotare la cache e le preferenze locali in 1-click dal menu <em>Impostazioni → Dati & Privacy → Ripristina Cache Locale</em>.
            </p>
          </div>
        </section>

        {/* 7. Diritti dell'Interessato e Diritto di Reclamo (Artt. 15-22 & 77 GDPR) */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-text flex items-center gap-2">
            <Scale className="h-4 w-4 text-primary" />
            7. Diritti dell&apos;Interessato e Reclamo all&apos;Autorità Garante
          </h2>
          <div className="text-xs text-text-muted space-y-2.5 leading-relaxed">
            <p>
              In conformità agli artt. 15-22 del Regolamento UE 2016/679, l&apos;utente ha diritto di:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Ottenere la conferma dell&apos;esistenza o meno di dati personali che lo riguardano e la loro comunicazione in forma intelligibile (Diritto di Accesso).</li>
              <li>Ottenere l&apos;aggiornamento, la rettificazione o l&apos;integrazione dei dati.</li>
              <li>Ottenere la cancellazione completa dei dati personali trattati (Diritto all&apos;Oblio), disponibile anche tramite download preventivo dell&apos;archivio completo in formato JSON (Diritto alla Portabilità dei Dati, Art. 20 GDPR).</li>
              <li>Ottenere la limitazione del trattamento o opporsi allo stesso per motivi legittimi.</li>
            </ul>
            <div className="rounded-xl border border-border bg-surface-raised p-4 space-y-2 mt-3">
              <p className="font-semibold text-text">Diritto di Reclamo all&apos;Autorità di Controllo (Art. 77 GDPR):</p>
              <p>
                Qualora ritenga che il trattamento violi il Regolamento (UE) 2016/679, l&apos;interessato ha il diritto di proporre formale reclamo al <strong>Garante per la protezione dei dati personali</strong>:
              </p>
              <p className="text-[11px] text-text-subtle">
                Piazza Venezia n. 11, 00187 Roma (Italia) • Centralino: (+39) 06.696771 • PEC: <code>protocollo@pec.gpdp.it</code> • Web: <a href="https://www.garanteprivacy.it" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">www.garanteprivacy.it</a>
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="mt-12 border-t border-border py-6 text-center text-xs text-text-muted">
        <p>© 2026 DexHub — Piattaforma personale modulare self-hosted. Tutti i diritti riservati.</p>
      </footer>
    </div>
  )
}
