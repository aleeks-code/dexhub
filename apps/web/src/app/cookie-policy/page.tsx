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
} from 'lucide-react'

export const metadata: Metadata = {
  title: 'Cookie Policy — DexHub',
  description: 'Informativa estesa sui cookie e strumenti di memorizzazione tecnica di DexHub conforme al GDPR e alle linee guida del Garante Privacy.',
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
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 space-y-8">
        {/* Title & Badge */}
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>GDPR & Garante della Privacy</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-text sm:text-4xl">
            Informativa sui Cookie e Strumenti di Archiviazione Locale
          </h1>
          <p className="text-sm text-text-muted leading-relaxed">
            Informativa estesa resa ai sensi dell&apos;art. 13 del Regolamento UE 2016/679 (GDPR), dell&apos;art. 122 del D.Lgs. 196/2003 (Codice Privacy) e in conformità alle Linee Guida del Garante per la protezione dei dati personali del 10 giugno 2021.
          </p>
          <p className="text-xs text-text-subtle">
            Ultimo aggiornamento: <strong>11 Novembre 2026</strong>
          </p>
        </div>

        {/* Banner Informativo / Garante Notice */}
        <section className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-5 space-y-3">
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
            <CheckCircle2 className="h-5 w-5 shrink-0" />
            <span>Nessun Cookie di Profilazione o Tracciamento Pubblicitario</span>
          </div>
          <p className="text-xs text-text-muted leading-relaxed">
            <strong>DexHub adotta una politica rigorosa di minimizzazione dei dati:</strong> la piattaforma utilizza <strong>esclusivamente cookie tecnici essenziali</strong> e strumenti di archiviazione locale (Web Storage) strettamente necessari per garantire l&apos;autenticazione sicura dell&apos;utente, la memorizzazione delle preferenze di visualizzazione e l&apos;erogazione del servizio.
          </p>
          <p className="text-xs text-text-muted leading-relaxed">
            Ai sensi della normativa vigente e dei chiarimenti ufficiali del Garante della Privacy, <strong>per l&apos;installazione di tali strumenti tecnici non è richiesto il preventivo consenso dell&apos;utente</strong> e non è pertanto necessario mostrare un banner di blocco/accettazione preventiva all&apos;accesso.
          </p>
        </section>

        {/* 1. Titolare del Trattamento */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-text flex items-center gap-2">
            <Lock className="h-4 w-4 text-primary" />
            1. Titolare del Trattamento
          </h2>
          <p className="text-xs text-text-muted leading-relaxed">
            Il Titolare del trattamento è l&apos;amministratore dell&apos;istanza software DexHub (dominio <code>dexhub.it</code>). Per qualsiasi richiesta in merito al trattamento dei dati personali o per l&apos;esercizio dei diritti previsti dagli artt. 15-22 del GDPR, è possibile contattare l&apos;amministratore all&apos;indirizzo email: <a href="mailto:alexmunni@outlook.it" className="text-primary hover:underline font-medium">alexmunni@outlook.it</a> o tramite il pannello di Feedback interno alla piattaforma.
          </p>
        </section>

        {/* 2. Cosa sono i Cookie e il Web Storage */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-text flex items-center gap-2">
            <CookieIcon className="h-4 w-4 text-primary" />
            2. Cosa sono i Cookie e gli Strumenti di Archiviazione Locale
          </h2>
          <div className="text-xs text-text-muted space-y-2 leading-relaxed">
            <p>
              I <strong>cookie</strong> sono stringhe di testo di piccole dimensioni che i siti visitati dall&apos;utente inviano al suo terminale (solitamente al browser), dove vengono memorizzati per essere poi ritrasmessi agli stessi siti alla successiva visita del medesimo utente.
            </p>
            <p>
              Il <strong>Web Storage</strong> (suddiviso in <code>localStorage</code> e <code>sessionStorage</code>) è una tecnologia standard HTML5 che consente all&apos;applicazione di salvare informazioni direttamente sul browser del dispositivo dell&apos;utente, con maggiore sicurezza e senza trasmettere automaticamente tali dati al server a ogni singola richiesta HTTP.
            </p>
          </div>
        </section>

        {/* 3. Mappa Dettagliata degli Strumenti Utilizzati */}
        <section className="space-y-4">
          <h2 className="text-lg font-bold text-text flex items-center gap-2">
            <HardDrive className="h-4 w-4 text-primary" />
            3. Registro Completo dei Cookie e delle Tecnologie Tecniche Utilizzate
          </h2>
          <p className="text-xs text-text-muted">
            La tabella seguente elenca in maniera trasparente e verificabile tutti gli elementi memorizzati da DexHub, la loro natura, la finalità esatta e il periodo di conservazione:
          </p>

          <div className="overflow-x-auto rounded-xl border border-border bg-surface">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border bg-surface-raised text-text-muted font-semibold">
                  <th className="p-3 w-44">Strumento / Chiave</th>
                  <th className="p-3 w-28">Tipologia</th>
                  <th className="p-3">Finalità Tecnica</th>
                  <th className="p-3 w-32">Durata</th>
                  <th className="p-3 w-28">Sicurezza</th>
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
                      Cookie HTTP (Prima Parte)
                    </span>
                  </td>
                  <td className="p-3 text-text-muted leading-relaxed">
                    <strong>Autenticazione essenziale:</strong> mantiene la sessione crittografata dell&apos;utente loggato. Permette l&apos;accesso sicuro alle API protette di DexHub e ai moduli personali.
                  </td>
                  <td className="p-3 text-text-muted tabular-nums">
                    7 giorni (o fino a disconnessione / logout)
                  </td>
                  <td className="p-3">
                    <span className="text-[11px] text-emerald-400 font-semibold block">HttpOnly</span>
                    <span className="text-[11px] text-emerald-400 font-semibold block">Secure (HTTPS)</span>
                    <span className="text-[11px] text-text-subtle block">SameSite=Lax</span>
                  </td>
                </tr>

                {/* dexhub-app-store */}
                <tr className="hover:bg-surface-raised/40 transition-colors">
                  <td className="p-3 font-mono font-bold text-text">
                    dexhub-app-store
                  </td>
                  <td className="p-3">
                    <span className="rounded bg-surface-raised px-1.5 py-0.5 font-medium text-text">
                      localStorage
                    </span>
                  </td>
                  <td className="p-3 text-text-muted leading-relaxed">
                    <strong>Preferenze dell&apos;interfaccia utente:</strong> memorizza le scelte espressamente impostate dall&apos;utente: tema (scuro/chiaro), lingua (italiano/inglese), colore d&apos;accento, densità visiva, stato aperto/chiuso della barra laterale e formati data/valuta.
                  </td>
                  <td className="p-3 text-text-muted">
                    Persistente fino alla pulizia del browser o ripristino impostazioni
                  </td>
                  <td className="p-3 text-text-subtle text-[11px]">
                    Locale (dispositivo)
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
                    <strong>Navigazione Cartellino:</strong> memorizza l&apos;ultimo mese visualizzato nel cartellino per evitare di dover riselezionare la data a ogni cambio di pagina.
                  </td>
                  <td className="p-3 text-text-muted">
                    Persistente locale
                  </td>
                  <td className="p-3 text-text-subtle text-[11px]">
                    Locale (dispositivo)
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
                    <strong>Visualizzazione Stima Busta Paga:</strong> ricorda se l&apos;utente ha lasciato espanso o collassato il dettaglio analitico del calcolo cedolino.
                  </td>
                  <td className="p-3 text-text-muted">
                    Persistente locale
                  </td>
                  <td className="p-3 text-text-subtle text-[11px]">
                    Locale (dispositivo)
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
                    <strong>Notifiche Broadcast:</strong> evita la riproposizione di un banner di annuncio di sistema già chiuso dall&apos;utente durante la sessione di navigazione attiva.
                  </td>
                  <td className="p-3 text-text-muted">
                    Sessione (cancellato alla chiusura della scheda)
                  </td>
                  <td className="p-3 text-text-subtle text-[11px]">
                    Temporaneo
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
                    <strong>Modulo Calcolatore Pizza:</strong> memorizza la modalità di calcolo preferita (diretto, biga, poolish) e le ricette personali salvate localmente.
                  </td>
                  <td className="p-3 text-text-muted">
                    Persistente locale
                  </td>
                  <td className="p-3 text-text-subtle text-[11px]">
                    Locale (dispositivo)
                  </td>
                </tr>

                {/* dexhub:debts:session_undo */}
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
                    <strong>Modulo Debiti & Crediti:</strong> cronologia temporanea per consentire l&apos;annullamento o ripristino immediato (Undo/Redo) delle modifiche ai record.
                  </td>
                  <td className="p-3 text-text-muted">
                    Sessione
                  </td>
                  <td className="p-3 text-text-subtle text-[11px]">
                    Temporaneo
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* 4. Servizi Terzi e Chiamate Esterne */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-text flex items-center gap-2">
            <Info className="h-4 w-4 text-primary" />
            4. Servizi, Fornitori Terzi e Chiamate Esterne
          </h2>
          <div className="text-xs text-text-muted space-y-3 leading-relaxed">
            <p>
              In conformità all&apos;obbligo di trasparenza, si segnala lo stato delle risorse e delle connessioni esterne utilizzate dall&apos;applicazione:
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong>Caratteri Tipografici (Font):</strong> I font utilizzati (Geist Sans e Geist Mono) sono distribuiti come pacchetti software interni e serviti direttamente dal server di DexHub. Non viene effettuata alcuna richiesta verso i server di Google Fonts o altre CDN terze.
              </li>
              <li>
                <strong>Icone Bandiere Internazionali (flagcdn.com):</strong> Nella sola landing page pubblica, all&apos;interno del selettore del prefisso telefonico per la richiesta di invito, vengono caricate piccole immagini statiche di bandiere da <code>flagcdn.com</code>. Tale fornitore non installa cookie e riceve unicamente la richiesta HTTP standard per la visualizzazione dell&apos;immagine.
              </li>
              <li>
                <strong>Infrastruttura Database (Neon):</strong> Il database PostgreSQL è gestito tramite Neon Serverless su server situati nell&apos;Unione Europea (Francoforte, Germania), con connessioni crittografate end-to-end con protocollo TLS.
              </li>
              <li>
                <strong>Email Transazionali (Brevo Relay):</strong> Le email di sistema (richieste invito e notifiche amministrative) vengono inviate tramite protocollo SMTP sicuro direttamente dal backend dell&apos;applicazione. Nessun tracker di profilazione o pixel invisibile di marketing viene inserito nelle email.
              </li>
            </ul>
          </div>
        </section>

        {/* 5. Come Disabilitare o Cancellare Cookie e Storage */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-text flex items-center gap-2">
            <CookieIcon className="h-4 w-4 text-primary" />
            5. Come Gestire o Cancellare i Cookie e lo Storage dal Tuo Browser
          </h2>
          <div className="text-xs text-text-muted space-y-3 leading-relaxed">
            <p>
              L&apos;utente può gestire, limitare o cancellare i cookie e i dati salvati in <code>localStorage</code> e <code>sessionStorage</code> direttamente dalle impostazioni del proprio browser. Di seguito i collegamenti alle guide ufficiali dei principali browser:
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
              <em>Nota tecnica:</em> La disabilitazione del cookie tecnico <code>better-auth.session_token</code> comporterà l&apos;impossibilità di effettuare l&apos;accesso e di mantenere attiva la sessione autenticata su DexHub.
            </p>
          </div>
        </section>

        {/* 6. Diritti dell'Interessato */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-text flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" />
            6. Diritti dell&apos;Interessato (GDPR)
          </h2>
          <p className="text-xs text-text-muted leading-relaxed">
            In ogni momento, gli utenti possono esercitare i diritti garantiti dagli artt. 15 e seguenti del Regolamento UE 2016/679 (accesso, rettifica, cancellazione dei dati, limitazione e portabilità), nonché richiedere la cancellazione totale del proprio account e dei relativi dati memorizzati, contattando direttamente il Titolare o utilizzando le funzioni di esportazione e cancellazione presenti nella sezione <em>Impostazioni → Dati & Privacy</em> di DexHub.
          </p>
        </section>
      </main>

      {/* Footer */}
      <footer className="mt-12 border-t border-border py-6 text-center text-xs text-text-muted">
        <p>© 2026 DexHub — Software personale modulare self-hosted. Tutti i diritti riservati.</p>
      </footer>
    </div>
  )
}
