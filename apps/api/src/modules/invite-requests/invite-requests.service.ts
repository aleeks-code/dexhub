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
  inArray,
  inviteRequests,
  isNull,
  sql,
  type InviteRequest,
  users,
  userInvites,
} from '@dexhub/db'
import { AdminUsersService } from '../admin/admin-users.service'
import { MailService } from '../mail/mail.service'

export interface EnrichedInviteRequest extends InviteRequest {
  registered: boolean
  userName: string | null
  registeredAt: Date | null
  lastLoginAt: Date | null
  inviteExpiresAt: Date | null
  inviteExpired: boolean
  inviteUsed: boolean
}

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

  private getFrontendUrl(preferredOrigin?: string): string {
    const isProd = process.env['NODE_ENV'] === 'production'

    if (preferredOrigin) {
      const clean = preferredOrigin.trim().replace(/\/$/, '')
      if (!isProd || (!clean.includes('localhost') && !clean.includes('127.0.0.1'))) {
        return clean.startsWith('http') ? clean : `https://${clean}`
      }
    }

    const candidates = [
      process.env['FRONTEND_URL'],
      process.env['DOMAIN']
        ? process.env['DOMAIN'].startsWith('http')
          ? process.env['DOMAIN']
          : `https://${process.env['DOMAIN']}`
        : null,
      process.env['WEBAUTHN_ORIGIN'],
      process.env['BETTER_AUTH_URL'],
    ]

    for (const cand of candidates) {
      if (!cand) continue
      const trimmed = cand.trim().replace(/\/$/, '')
      if (isProd && (trimmed.includes('localhost') || trimmed.includes('127.0.0.1'))) {
        continue
      }
      if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
        return trimmed
      }
      return `https://${trimmed}`
    }

    return isProd ? 'https://dexhub.it' : 'http://localhost:3000'
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

  async list(): Promise<EnrichedInviteRequest[]> {
    const requests = await this.db
      .select()
      .from(inviteRequests)
      .orderBy(desc(inviteRequests.createdAt))

    if (requests.length === 0) return []

    const emails = Array.from(new Set(requests.map((r) => r.email.toLowerCase().trim())))

    // Cerca utenti già registrati
    const registeredUsers = await this.db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        createdAt: users.createdAt,
        lastLoginAt: users.lastLoginAt,
      })
      .from(users)
      .where(inArray(users.email, emails))

    const userMap = new Map(registeredUsers.map((u) => [u.email.toLowerCase().trim(), u]))

    // Cerca gli ultimi inviti emessi
    const recentInvites = await this.db
      .select({
        email: userInvites.email,
        expiresAt: userInvites.expiresAt,
        usedAt: userInvites.usedAt,
        createdAt: userInvites.createdAt,
      })
      .from(userInvites)
      .where(inArray(userInvites.email, emails))
      .orderBy(desc(userInvites.createdAt))

    const inviteMap = new Map<string, (typeof recentInvites)[0]>()
    for (const inv of recentInvites) {
      if (inv.email) {
        const key = inv.email.toLowerCase().trim()
        if (!inviteMap.has(key)) {
          inviteMap.set(key, inv)
        }
      }
    }

    const now = new Date()

    return requests.map((req) => {
      const emailKey = req.email.toLowerCase().trim()
      const registeredUser = userMap.get(emailKey)
      const lastInvite = inviteMap.get(emailKey)

      const isRegistered = !!registeredUser
      const inviteExpiresAt = lastInvite?.expiresAt ?? null
      const isExpired = inviteExpiresAt ? inviteExpiresAt < now : false
      const inviteUsed = !!lastInvite?.usedAt || isRegistered

      return {
        ...req,
        registered: isRegistered,
        userName: registeredUser?.name ?? null,
        registeredAt: registeredUser?.createdAt ?? null,
        lastLoginAt: registeredUser?.lastLoginAt ?? null,
        inviteExpiresAt,
        inviteExpired: isExpired,
        inviteUsed,
      }
    })
  }

  async updateStatus(id: string, status: 'pending' | 'invited' | 'dismissed'): Promise<void> {
    await this.db
      .update(inviteRequests)
      .set({ status })
      .where(eq(inviteRequests.id, id))
  }

  /**
   * Crea un invito diretto dall'amministrazione (senza passare dalla landing)
   */
  async createDirectInvite(
    email: string,
    phone: string | undefined,
    sendEmail: boolean,
    actorId: string,
    preferredOrigin?: string,
  ): Promise<{ id: string; token: string; inviteUrl: string; emailSent: boolean; emailError?: string }> {
    const cleanEmail = email.toLowerCase().trim()
    const cleanPhone = phone?.trim() || null

    const existingUser = await this.db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, cleanEmail))
      .limit(1)

    if (existingUser.length > 0) {
      throw new ConflictException(`L'utente ${cleanEmail} ha già un account registrato su DexHub`)
    }

    // Controlla se esiste già un record in invite_requests
    const existingReq = await this.db
      .select()
      .from(inviteRequests)
      .where(eq(inviteRequests.email, cleanEmail))
      .limit(1)
      .then((r) => r[0])

    let requestId: string

    if (existingReq) {
      requestId = existingReq.id
      await this.db
        .update(inviteRequests)
        .set({ status: 'invited', phone: cleanPhone || existingReq.phone, deletedAt: null })
        .where(eq(inviteRequests.id, requestId))
    } else {
      const inserted = await this.db
        .insert(inviteRequests)
        .values({
          email: cleanEmail,
          phone: cleanPhone,
          status: 'invited',
        })
        .returning({ id: inviteRequests.id })
      requestId = inserted[0]!.id
    }

    const { token } = await this.adminUsers.inviteUser(cleanEmail, actorId)

    const frontendUrl = this.getFrontendUrl(preferredOrigin)
    const inviteUrl = `${frontendUrl}/invite/${token}`

    let emailSent = false
    let emailError: string | undefined

    if (sendEmail) {
      const mailResult = await this.mailService.sendInviteAccepted({
        to: cleanEmail,
        inviteUrl,
      })
      emailSent = mailResult.success
      emailError = mailResult.error
    }

    await this.db.insert(auditLogs).values({
      category: 'ADMIN',
      action: 'invite_request.direct_created',
      severity: 'info',
      outcome: 'success',
      actorId,
      actorType: 'user',
      metadata: { id: requestId, email: cleanEmail, emailSent },
    })

    return {
      id: requestId,
      token,
      inviteUrl,
      emailSent,
      emailError,
    }
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
    preferredOrigin?: string,
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

    // Controlla se l'utente esiste già
    const existing = await this.db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, request.email.toLowerCase().trim()))
      .limit(1)

    if (existing.length > 0) {
      throw new ConflictException(`L'utente ${request.email} ha già un account registrato su DexHub`)
    }

    // Genera l'invito nel database tramite AdminUsersService
    const { token } = await this.adminUsers.inviteUser(request.email, actorId)

    // Segna la richiesta come invitata
    await this.db
      .update(inviteRequests)
      .set({ status: 'invited' })
      .where(eq(inviteRequests.id, id))

    const frontendUrl = this.getFrontendUrl(preferredOrigin)
    const inviteUrl = `${frontendUrl}/invite/${token}`

    // Invia l'email all'utente
    const mailResult = await this.mailService.sendInviteAccepted({
      to: request.email,
      inviteUrl,
    })

    await this.db.insert(auditLogs).values({
      category: 'ADMIN',
      action: 'invite_request.accepted',
      severity: 'info',
      outcome: 'success',
      actorId,
      actorType: 'user',
      metadata: { id, email: request.email, emailSent: mailResult.success },
    })

    return {
      token,
      inviteUrl,
      emailSent: mailResult.success,
      emailError: mailResult.error,
    }
  }

  /**
   * Reinvia un invito (generando un nuovo token 48h e rispedendo l'email)
   */
  async resend(
    id: string,
    actorId: string,
    preferredOrigin?: string,
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

    const existing = await this.db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, request.email.toLowerCase().trim()))
      .limit(1)

    if (existing.length > 0) {
      throw new ConflictException(`L'utente ${request.email} ha già un account registrato su DexHub`)
    }

    const { token } = await this.adminUsers.inviteUser(request.email, actorId)

    await this.db
      .update(inviteRequests)
      .set({ status: 'invited' })
      .where(eq(inviteRequests.id, id))

    await this.db.insert(auditLogs).values({
      category: 'ADMIN',
      action: 'invite_request.resent',
      severity: 'info',
      outcome: 'success',
      actorId,
      actorType: 'user',
      metadata: { id, email: request.email },
    })

    const frontendUrl = this.getFrontendUrl(preferredOrigin)
    const inviteUrl = `${frontendUrl}/invite/${token}`

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

  async bulkReject(
    ids: string[],
    actorId: string,
    sendEmail = false,
  ): Promise<{ affected: number }> {
    if (ids.length === 0) return { affected: 0 }

    const targetRequests = await this.db
      .select()
      .from(inviteRequests)
      .where(inArray(inviteRequests.id, ids))

    await this.db
      .update(inviteRequests)
      .set({ status: 'dismissed' })
      .where(inArray(inviteRequests.id, ids))

    if (sendEmail) {
      for (const req of targetRequests) {
        await this.mailService.sendInviteRejected({ to: req.email }).catch(() => {})
      }
    }

    await this.db.insert(auditLogs).values({
      category: 'ADMIN',
      action: 'invite_request.bulk_rejected',
      severity: 'info',
      outcome: 'success',
      actorId,
      actorType: 'user',
      metadata: { count: ids.length, ids },
    })

    return { affected: targetRequests.length }
  }

  async bulkDelete(ids: string[]): Promise<void> {
    if (ids.length === 0) return
    await this.db
      .update(inviteRequests)
      .set({ deletedAt: new Date() })
      .where(inArray(inviteRequests.id, ids))
  }

  async delete(id: string): Promise<void> {
    await this.db
      .update(inviteRequests)
      .set({ deletedAt: new Date() })
      .where(eq(inviteRequests.id, id))
  }
}
