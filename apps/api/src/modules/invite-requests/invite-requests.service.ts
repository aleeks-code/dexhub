import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common'
import {
  and,
  auditLogs,
  desc,
  eq,
  getClient,
  inviteRequests,
  isNull,
  sql,
  type InviteRequest,
} from '@dexhub/db'
import { AdminUsersService } from '../admin/admin-users.service'
import { MailService } from '../mail/mail.service'

@Injectable()
export class InviteRequestsService implements OnModuleInit {
  private readonly logger = new Logger(InviteRequestsService.name)

  constructor(
    private readonly adminUsers: AdminUsersService,
    private readonly mailService: MailService,
  ) {}

  async onModuleInit(): Promise<void> {
    try {
      await this.db.execute(
        sql`ALTER TABLE IF EXISTS "invite_requests" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;`,
      )
    } catch (err) {
      this.logger.warn('Could not auto-ensure deleted_at column on invite_requests', err)
    }
  }

  private get db() {
    return getClient()
  }

  private getFrontendUrl(): string {
    const base =
      process.env['FRONTEND_URL']?.trim() ||
      (process.env['DOMAIN'] ? `https://${process.env['DOMAIN'].trim()}` : null) ||
      process.env['WEBAUTHN_ORIGIN']?.trim() ||
      'https://dexhub.it'
    return base.replace(/\/$/, '')
  }

  async create(email: string, phone?: string): Promise<void> {
    const cleanEmail = email.toLowerCase().trim()
    const cleanPhone = phone?.trim() || null

    // Controlla se esiste già una richiesta pendente per questa email
    const existing = await this.db
      .select({ id: inviteRequests.id })
      .from(inviteRequests)
      .where(
        and(
          eq(inviteRequests.email, cleanEmail),
          eq(inviteRequests.status, 'pending'),
        ),
      )
      .limit(1)

    if (existing.length > 0) {
      this.logger.log(`Richiesta già pendente per ${cleanEmail}, skip duplicato.`)
      return
    }

    const now = new Date()

    await this.db.insert(inviteRequests).values({
      email: cleanEmail,
      phone: cleanPhone,
      createdAt: now,
    })

    // Invia email di notifica all'amministratore (in background, non bloccante)
    this.mailService
      .notifyAdminNewInviteRequest({
        email: cleanEmail,
        phone: cleanPhone,
        createdAt: now,
      })
      .then((res) => {
        if (!res.success) {
          this.logger.warn(`Notifica admin non inviata per ${cleanEmail}: ${res.error}`)
        }
      })
      .catch((err) => {
        this.logger.error(`Errore invio notifica admin per ${cleanEmail}`, err)
      })
  }

  async list(): Promise<InviteRequest[]> {
    return this.db.select().from(inviteRequests).orderBy(desc(inviteRequests.createdAt))
  }

  async updateStatus(id: string, status: 'pending' | 'invited' | 'dismissed'): Promise<void> {
    await this.db
      .update(inviteRequests)
      .set({ status })
      .where(eq(inviteRequests.id, id))
  }

  /**
   * Accetta una richiesta di invito:
   * 1. Genera il token univoco di invito (con scadenza 48h) per l'utente
   * 2. Aggiorna lo stato della richiesta in 'invited'
   * 3. Spedisce automaticamente l'email con il link di registrazione da noreply
   */
  async accept(
    id: string,
    actorId: string,
  ): Promise<{ token: string; inviteUrl: string; emailSent: boolean; emailError?: string }> {
    const request = await this.db
      .select()
      .from(inviteRequests)
      .where(eq(inviteRequests.id, id))
      .limit(1)
      .then((r) => r[0])

    if (!request) {
      throw new NotFoundException('Richiesta di invito non trovata')
    }

    // Genera l'invito nel database tramite AdminUsersService
    const { token } = await this.adminUsers.inviteUser(request.email, actorId)

    // Segna la richiesta come invitata
    await this.db
      .update(inviteRequests)
      .set({ status: 'invited' })
      .where(eq(inviteRequests.id, id))

    const frontendUrl = this.getFrontendUrl()
    const inviteUrl = `${frontendUrl}/invite/${token}`

    // Invia l'email all'utente
    const mailResult = await this.mailService.sendInviteAccepted({
      to: request.email,
      inviteUrl,
    })

    return {
      token,
      inviteUrl,
      emailSent: mailResult.success,
      emailError: mailResult.error,
    }
  }

  /**
   * Rifiuta una richiesta di invito:
   * 1. Aggiorna lo stato in 'dismissed'
   * 2. Registra l'evento negli audit log
   * 3. Opzionalmente invia un'email di cortesia da noreply
   */
  async reject(
    id: string,
    actorId: string,
    sendEmail = true,
  ): Promise<{ id: string; status: 'dismissed'; emailSent: boolean; emailError?: string }> {
    const request = await this.db
      .select()
      .from(inviteRequests)
      .where(eq(inviteRequests.id, id))
      .limit(1)
      .then((r) => r[0])

    if (!request) {
      throw new NotFoundException('Richiesta di invito non trovata')
    }

    await this.db
      .update(inviteRequests)
      .set({ status: 'dismissed' })
      .where(eq(inviteRequests.id, id))

    await this.db.insert(auditLogs).values({
      category: 'ADMIN',
      action: 'invite_request.rejected',
      severity: 'info',
      outcome: 'success',
      actorId,
      actorType: 'user',
      metadata: { id, email: request.email },
    })

    let emailSent = false
    let emailError: string | undefined

    if (sendEmail) {
      const mailResult = await this.mailService.sendInviteRejected({
        to: request.email,
      })
      emailSent = mailResult.success
      emailError = mailResult.error
    }

    return {
      id,
      status: 'dismissed',
      emailSent,
      emailError,
    }
  }

  async delete(id: string): Promise<void> {
    await this.db
      .update(inviteRequests)
      .set({ deletedAt: new Date() })
      .where(eq(inviteRequests.id, id))
  }
}
