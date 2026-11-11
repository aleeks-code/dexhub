import { Injectable, Logger } from '@nestjs/common'
import nodemailer, { type Transporter } from 'nodemailer'
import { and, eq, getClient, users } from '@dexhub/db'

export interface SendMailOptions {
  to: string | string[]
  subject: string
  text: string
  html: string
}

export interface SendResult {
  success: boolean
  error?: string
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name)
  private transporter: Transporter | null = null

  constructor() {
    this.initTransporter()
  }

  private createTransporter(
    host: string,
    port: number,
    secure: boolean,
    user: string,
    pass: string,
  ): Transporter {
    return nodemailer.createTransport({
      host,
      port,
      secure,
      auth: {
        user,
        pass,
      },
      connectionTimeout: 5000,
      greetingTimeout: 5000,
      socketTimeout: 7000,
    })
  }

  private initTransporter(): void {
    const host = process.env['SMTP_HOST']?.trim()
    const portRaw = process.env['SMTP_PORT']?.trim()
    const port = portRaw ? Number(portRaw) : 587
    const user = process.env['SMTP_USER']?.trim()
    const pass = process.env['SMTP_PASS']?.trim()
    const secure = process.env['SMTP_SECURE'] === 'true' || port === 465

    if (!host || !user || !pass) {
      this.logger.warn(
        'Configurazione SMTP non completa (mancano SMTP_HOST, SMTP_USER o SMTP_PASS). Le email verranno registrate nei log senza essere trasmesse.',
      )
      this.transporter = null
      return
    }

    try {
      this.transporter = this.createTransporter(host, port, secure, user, pass)
      this.logger.log(
        `Transporter SMTP configurato con successo su ${host}:${port} (secure: ${secure})`,
      )
    } catch (err) {
      this.logger.error("Errore durante l'inizializzazione di nodemailer", err)
      this.transporter = null
    }
  }

  private getFromAddress(): string {
    let raw =
      process.env['SMTP_FROM']?.trim() ||
      process.env['MAIL_FROM']?.trim() ||
      '"DexHub" <noreply@dexhub.it>'
    if (raw.startsWith("'") && raw.endsWith("'")) {
      raw = raw.slice(1, -1).trim()
    }
    return raw
  }

  private getFrontendUrl(): string {
    const base =
      process.env['FRONTEND_URL']?.trim() ||
      (process.env['DOMAIN'] ? `https://${process.env['DOMAIN'].trim()}` : null) ||
      process.env['WEBAUTHN_ORIGIN']?.trim() ||
      'https://dexhub.it'
    return base.replace(/\/$/, '')
  }

  async sendMail(options: SendMailOptions): Promise<SendResult> {
    // Se il transporter non era ancora inizializzato (es. env caricate dinamicamente), riproviamo
    if (!this.transporter) {
      this.initTransporter()
    }

    const from = this.getFromAddress()
    const to = Array.isArray(options.to) ? options.to.join(', ') : options.to

    if (!this.transporter) {
      this.logger.warn(
        `[MOCK EMAIL] A: ${to} | Oggetto: "${options.subject}" (SMTP non configurato).`,
      )
      return { success: false, error: 'SMTP not configured' }
    }

    try {
      await this.transporter.sendMail({
        from,
        to,
        subject: options.subject,
        text: options.text,
        html: options.html,
      })
      this.logger.log(`Email inviata con successo a ${to} (Oggetto: "${options.subject}")`)
      return { success: true }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      this.logger.warn(`Invio SMTP primario non riuscito per ${to}: ${msg}`)

      const host = process.env['SMTP_HOST']?.trim()
      const user = process.env['SMTP_USER']?.trim()
      const pass = process.env['SMTP_PASS']?.trim()
      const currentPort = Number(process.env['SMTP_PORT'] ?? '587')

      // Fallback automatico su altre porte se la porta corrente va in timeout o rifiutata (frequente sui cloud hosting)
      if (host && user && pass && /timeout|refused|econn|etimedout/i.test(msg)) {
        const fallbacks: Array<{ port: number; secure: boolean }> = [
          { port: 465, secure: true },
          { port: 2525, secure: false },
          { port: 587, secure: false },
        ].filter((f) => f.port !== currentPort)

        for (const fb of fallbacks) {
          try {
            this.logger.log(
              `Tentativo fallback SMTP su ${host}:${fb.port} (secure: ${fb.secure})...`,
            )
            const fbTransporter = this.createTransporter(host, fb.port, fb.secure, user, pass)
            await fbTransporter.sendMail({
              from,
              to,
              subject: options.subject,
              text: options.text,
              html: options.html,
            })
            this.transporter = fbTransporter
            this.logger.log(
              `Email inviata con successo a ${to} tramite fallback su porta ${fb.port}!`,
            )
            return { success: true }
          } catch (fbErr: any) {
            this.logger.warn(
              `Fallback su porta ${fb.port} non riuscito: ${fbErr?.message || fbErr}`,
            )
          }
        }
      }

      this.logger.error(`Impossibile inviare email a ${to}: ${msg}`, err)
      return { success: false, error: msg }
    }
  }

  /**
   * Invia una notifica email all'amministratore (o agli amministratori)
   * quando viene sottomessa una nuova richiesta di invito dalla landing page.
   */
  async notifyAdminNewInviteRequest(data: {
    email: string
    phone?: string | null
    createdAt: Date
  }): Promise<SendResult> {
    const frontendUrl = this.getFrontendUrl()
    const adminLink = `${frontendUrl}/settings/administration/invite-requests`

    // Recupera gli indirizzi email degli amministratori attivi
    const recipients = new Set<string>()
    try {
      const db = getClient()
      const adminUsers = await db
        .select({ email: users.email })
        .from(users)
        .where(and(eq(users.isAdmin, true), eq(users.isActive, true)))

      for (const u of adminUsers) {
        if (u.email?.trim()) recipients.add(u.email.toLowerCase().trim())
      }
    } catch (dbErr) {
      this.logger.warn('Impossibile recuperare admin dal database per invio notifica', dbErr)
    }

    if (process.env['ADMIN_EMAIL']?.trim()) {
      recipients.add(process.env['ADMIN_EMAIL'].toLowerCase().trim())
    }

    if (recipients.size === 0) {
      this.logger.warn(
        `Nessun indirizzo admin trovato per notificare la richiesta di ${data.email}.`,
      )
      return { success: false, error: 'No admin recipient found' }
    }

    const formattedDate = data.createdAt.toLocaleString('it-IT', {
      timeZone: 'Europe/Rome',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })

    const phoneStr = data.phone?.trim() ? data.phone.trim() : 'Non specificato'

    const subject = `[DexHub] Nuova richiesta di invito ricevuta (${data.email})`

    const text = [
      `Ciao Amministratore,`,
      ``,
      `È stata ricevuta una nuova richiesta di invito per accedere a DexHub.`,
      ``,
      `Dettagli richiedente:`,
      `- Email: ${data.email}`,
      `- Telefono: ${phoneStr}`,
      `- Data: ${formattedDate}`,
      ``,
      `Per esaminare la richiesta, approvarla o rifiutarla, visita il pannello di amministrazione:`,
      `${adminLink}`,
      ``,
      `-- `,
      `DexHub System Notification`,
    ].join('\n')

    const html = `
<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0b0f19; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f1f5f9;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #0b0f19; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 560px; background-color: #111827; border: 1px solid #1f293d; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.5);">
          <!-- Header -->
          <tr>
            <td style="padding: 24px 28px; border-bottom: 1px solid #1f293d; background: linear-gradient(180deg, #162033 0%, #111827 100%);">
              <table role="presentation" width="100%">
                <tr>
                  <td>
                    <span style="font-size: 20px; font-weight: 700; color: #ffffff; letter-spacing: -0.5px;">DexHub</span>
                    <span style="display: inline-block; margin-left: 8px; padding: 2px 8px; background-color: #3b82f620; color: #60a5fa; border: 1px solid #3b82f640; border-radius: 9999px; font-size: 11px; font-weight: 600;">Amministrazione</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding: 28px;">
              <h1 style="margin: 0 0 12px 0; font-size: 18px; font-weight: 600; color: #ffffff;">Nuova richiesta di accesso</h1>
              <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.5; color: #94a3b8;">
                Un visitatore ha inviato una richiesta di invito dalla landing page di DexHub.
              </p>
              
              <!-- Info Box -->
              <table role="presentation" width="100%" style="background-color: #0b0f19; border: 1px solid #1e293b; border-radius: 12px; margin-bottom: 24px; padding: 16px;">
                <tr>
                  <td style="padding: 6px 12px; font-size: 13px; color: #64748b; width: 100px;">Email:</td>
                  <td style="padding: 6px 12px; font-size: 14px; color: #38bdf8; font-weight: 600;">${data.email}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 12px; font-size: 13px; color: #64748b;">Telefono:</td>
                  <td style="padding: 6px 12px; font-size: 14px; color: #f1f5f9;">${phoneStr}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 12px; font-size: 13px; color: #64748b;">Data ricezione:</td>
                  <td style="padding: 6px 12px; font-size: 13px; color: #94a3b8;">${formattedDate}</td>
                </tr>
              </table>

              <!-- Action button -->
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 28px 0 12px 0;">
                <tr>
                  <td align="center" style="border-radius: 10px; background-color: #2563eb;">
                    <a href="${adminLink}" target="_blank" style="display: inline-block; padding: 12px 24px; font-size: 14px; font-weight: 600; color: #ffffff; text-decoration: none; border-radius: 10px;">
                      Esamina Richiesta nel Pannello
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin: 16px 0 0 0; font-size: 12px; color: #64748b;">
                Oppure copia questo link: <a href="${adminLink}" style="color: #60a5fa; text-decoration: underline;">${adminLink}</a>
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding: 16px 28px; background-color: #0b0f19; border-top: 1px solid #1f293d; text-align: center;">
              <p style="margin: 0; font-size: 11px; color: #475569;">
                Questa è una notifica automatica generata da DexHub per gli amministratori della piattaforma.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`

    return this.sendMail({
      to: Array.from(recipients),
      subject,
      text,
      html,
    })
  }

  /**
   * Invia un'email da noreply all'utente quando la sua richiesta di invito è stata accettata,
   * contenente il link di registrazione personalizzato valido 48 ore.
   */
  async sendInviteAccepted(data: {
    to: string
    inviteUrl: string
  }): Promise<SendResult> {
    const subject = `[DexHub] La tua richiesta di invito è stata accettata!`

    const text = [
      `Ciao,`,
      ``,
      `Siamo felici di comunicarti che la tua richiesta di accesso a DexHub è stata accettata!`,
      ``,
      `Per completare la creazione del tuo profilo e configurare l'accesso con la tua Passkey (impronta digitale, Face ID o chiave di sicurezza), clicca sul seguente link:`,
      `${data.inviteUrl}`,
      ``,
      `IMPORTANTE: Questo link di invito è personale e scadrà tra 48 ore.`,
      ``,
      `Se non hai effettuato tu questa richiesta, puoi tranquillamente ignorare questo messaggio.`,
      ``,
      `A presto,`,
      `Il team di DexHub`,
      ``,
      `--`,
      `Questa è un'email generata automaticamente da un indirizzo non monitorato (noreply). Si prega di non rispondere.`,
    ].join('\n')

    const html = `
<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0b0f19; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f1f5f9;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #0b0f19; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 560px; background-color: #111827; border: 1px solid #1f293d; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.5);">
          <!-- Header -->
          <tr>
            <td style="padding: 24px 28px; border-bottom: 1px solid #1f293d; background: linear-gradient(180deg, #162033 0%, #111827 100%);">
              <span style="font-size: 20px; font-weight: 700; color: #ffffff; letter-spacing: -0.5px;">DexHub</span>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding: 28px;">
              <h1 style="margin: 0 0 12px 0; font-size: 19px; font-weight: 600; color: #ffffff;">La tua richiesta è stata approvata! 🎉</h1>
              <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.6; color: #cbd5e1;">
                Ciao, abbiamo ottime notizie: la tua richiesta di accesso a <strong>DexHub</strong> è stata accolta.
              </p>
              <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 1.6; color: #cbd5e1;">
                Per completare la configurazione del tuo account e associare la tua chiave di accesso sicura (<strong>Passkey</strong> con Face ID, Touch ID o Windows Hello), clicca sul pulsante qui sotto:
              </p>

              <!-- CTA Button -->
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 28px 0 24px 0;">
                <tr>
                  <td align="center" style="border-radius: 10px; background-color: #2563eb;">
                    <a href="${data.inviteUrl}" target="_blank" style="display: inline-block; padding: 13px 28px; font-size: 14px; font-weight: 600; color: #ffffff; text-decoration: none; border-radius: 10px;">
                      Completa la Registrazione
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Expiry Callout -->
              <div style="background-color: #0b0f19; border: 1px solid #1e293b; border-left: 3px solid #3b82f6; border-radius: 8px; padding: 12px 16px; margin: 20px 0;">
                <p style="margin: 0; font-size: 12px; line-height: 1.5; color: #94a3b8;">
                  ⏱️ <strong>Nota di sicurezza:</strong> Questo invito è strettamente personale e scadrà tra <strong>48 ore</strong>.
                </p>
              </div>

              <p style="margin: 20px 0 0 0; font-size: 12px; color: #64748b;">
                Se il pulsante non funziona, copia e incolla questo indirizzo nel tuo browser:<br>
                <a href="${data.inviteUrl}" style="color: #60a5fa; word-break: break-all; text-decoration: underline;">${data.inviteUrl}</a>
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding: 16px 28px; background-color: #0b0f19; border-top: 1px solid #1f293d; text-align: center;">
              <p style="margin: 0; font-size: 11px; color: #475569;">
                Questa è un'email automatica inviata da un indirizzo non monitorato (noreply). Si prega di non rispondere.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`

    return this.sendMail({
      to: data.to,
      subject,
      text,
      html,
    })
  }

  /**
   * Invia un'email da noreply all'utente quando la sua richiesta di invito è stata rifiutata.
   */
  async sendInviteRejected(data: { to: string }): Promise<SendResult> {
    const subject = `[DexHub] Aggiornamento sulla tua richiesta di invito`

    const text = [
      `Ciao,`,
      ``,
      `Ti ringraziamo per l'interesse mostrato nei confronti di DexHub e per aver richiesto l'accesso alla piattaforma.`,
      ``,
      `Desideriamo informarti che al momento non è stato possibile accogliere la tua richiesta di accesso, in quanto i posti per la fase attuale sono limitati e riservati.`,
      ``,
      `Terremo traccia della tua richiesta per eventuali prossime aperture del servizio.`,
      ``,
      `Se ritieni ci sia stato un errore o desideri richiedere maggiori informazioni, puoi metterti in contatto con l'amministrazione.`,
      ``,
      `Cordiali saluti,`,
      `Il team di DexHub`,
      ``,
      `--`,
      `Questa è un'email generata automaticamente da un indirizzo non monitorato (noreply). Si prega di non rispondere.`,
    ].join('\n')

    const html = `
<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0b0f19; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f1f5f9;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #0b0f19; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 560px; background-color: #111827; border: 1px solid #1f293d; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.5);">
          <!-- Header -->
          <tr>
            <td style="padding: 24px 28px; border-bottom: 1px solid #1f293d; background: linear-gradient(180deg, #162033 0%, #111827 100%);">
              <span style="font-size: 20px; font-weight: 700; color: #ffffff; letter-spacing: -0.5px;">DexHub</span>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding: 28px;">
              <h1 style="margin: 0 0 12px 0; font-size: 18px; font-weight: 600; color: #ffffff;">Aggiornamento sulla tua richiesta di accesso</h1>
              <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.6; color: #cbd5e1;">
                Ciao, ti ringraziamo per l'interesse che hai mostrato nei confronti di <strong>DexHub</strong> e per aver richiesto di accedere alla piattaforma.
              </p>
              <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.6; color: #cbd5e1;">
                Desideriamo informarti che al momento <strong>non è stato possibile accogliere la tua richiesta</strong>, in quanto gli accessi per l'attuale fase di utilizzo sono a disponibilità limitata e riservati.
              </p>
              <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.6; color: #94a3b8;">
                Terremo presente la tua richiesta per eventuali future aperture. Se ritieni vi sia stato un errore, puoi metterti in contatto con l'amministratore.
              </p>
              <p style="margin: 24px 0 0 0; font-size: 13px; color: #cbd5e1;">
                A presto,<br>
                <em>Il team di DexHub</em>
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding: 16px 28px; background-color: #0b0f19; border-top: 1px solid #1f293d; text-align: center;">
              <p style="margin: 0; font-size: 11px; color: #475569;">
                Questa è un'email automatica inviata da un indirizzo non monitorato (noreply). Si prega di non rispondere.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`

    return this.sendMail({
      to: data.to,
      subject,
      text,
      html,
    })
  }
}
