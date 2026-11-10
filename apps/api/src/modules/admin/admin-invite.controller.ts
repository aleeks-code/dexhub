import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Query,
  Req,
  Res,
} from '@nestjs/common'
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  type VerifiedRegistrationResponse,
} from '@simplewebauthn/server'
import type { FastifyReply, FastifyRequest } from 'fastify'
import { randomUUID } from 'crypto'
import { auditLogs, eq, getClient, passkeys, users } from '@dexhub/db'
import { Public } from '../../auth/auth.guard'
import { AuthService } from '../../auth/auth.service'
import { RecoveryCodesService } from '../../auth/recovery-codes.service'
import { AdminUsersService } from './admin-users.service'
import { successResponse } from '../../common/response/api-response'

const RP_NAME = process.env['WEBAUTHN_RP_NAME'] ?? 'DexHub'
const RP_ID = process.env['WEBAUTHN_RP_ID']!
const ORIGIN = process.env['WEBAUTHN_ORIGIN']!

interface PendingInviteRegistration {
  userId: string
  name: string
  email: string
  challenge: string
}

@Public()
@Controller('invite')
export class AdminInviteController {
  private pending = new Map<string, PendingInviteRegistration>()

  constructor(
    private readonly adminUsers: AdminUsersService,
    private readonly authService: AuthService,
    private readonly recoveryCodes: RecoveryCodesService,
  ) {}

  @Get(':token')
  async validateInvite(@Param('token') token: string) {
    const result = await this.adminUsers.validateInviteToken(token)
    if (!result.valid) {
      throw new NotFoundException(result.expired ? 'Invite link has expired' : 'Invalid invite link')
    }
    return successResponse({ email: result.email ?? null })
  }

  @Get(':token/passkey/options')
  async getPasskeyOptions(
    @Param('token') token: string,
    @Query('name') name: string,
    @Query('email') email: string,
  ) {
    if (!name?.trim()) throw new BadRequestException('Name is required')
    if (!email?.trim()) throw new BadRequestException('Email is required')

    const result = await this.adminUsers.validateInviteToken(token)
    if (!result.valid) {
      throw new NotFoundException(result.expired ? 'Invite link has expired' : 'Invalid invite link')
    }

    const db = getClient()
    const existing = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email.toLowerCase().trim()))
      .limit(1)
    if (existing.length > 0) throw new BadRequestException('A user with this email already exists')

    const userId = randomUUID()

    const options = await generateRegistrationOptions({
      rpName: RP_NAME,
      rpID: RP_ID,
      userName: email.toLowerCase().trim(),
      userDisplayName: name.trim(),
      userID: new TextEncoder().encode(userId),
      attestationType: 'none',
      authenticatorSelection: {
        residentKey: 'preferred',
        userVerification: 'preferred',
      },
    })

    this.pending.set(token, {
      userId,
      name: name.trim(),
      email: email.toLowerCase().trim(),
      challenge: options.challenge,
    })

    return options
  }

  @Post(':token/passkey/verify')
  async verifyPasskey(
    @Param('token') token: string,
    @Body() credential: object,
    @Res({ passthrough: true }) reply: FastifyReply,
    @Req() _req: FastifyRequest,
  ) {
    const result = await this.adminUsers.validateInviteToken(token)
    if (!result.valid) {
      throw new NotFoundException(result.expired ? 'Invite link has expired' : 'Invalid invite link')
    }

    const pending = this.pending.get(token)
    if (!pending) throw new BadRequestException('No pending registration for this invite')

    let verification: VerifiedRegistrationResponse
    try {
      verification = await verifyRegistrationResponse({
        response: credential as Parameters<typeof verifyRegistrationResponse>[0]['response'],
        expectedChallenge: pending.challenge,
        expectedOrigin: ORIGIN,
        expectedRPID: RP_ID,
        requireUserVerification: false,
      })
    } catch {
      throw new BadRequestException('Passkey verification failed')
    }

    if (!verification.verified || !verification.registrationInfo) {
      throw new BadRequestException('Passkey verification failed')
    }

    const { credential: cred, credentialDeviceType, credentialBackedUp } =
      verification.registrationInfo
    const transports = (credential as { response?: { transports?: string[] } }).response?.transports

    const db = getClient()

    await db.insert(users).values({
      id: pending.userId,
      name: pending.name,
      email: pending.email,
      emailVerified: true,
      isAdmin: false,
      isActive: true,
    })

    await db.insert(passkeys).values({
      id: cred.id,
      name: 'Primary passkey',
      publicKey: Buffer.from(cred.publicKey).toString('base64url'),
      userId: pending.userId,
      webauthnUserId: pending.userId,
      counter: cred.counter,
      deviceType: credentialDeviceType,
      backedUp: credentialBackedUp,
      transports: transports?.join(','),
    })

    const codes = await this.recoveryCodes.generateForUser(pending.userId)

    await this.adminUsers.markInviteUsed(token)

    await db.insert(auditLogs).values({
      category: 'AUTH',
      action: 'user.registered_via_invite',
      severity: 'info',
      outcome: 'success',
      actorId: pending.userId,
      actorType: 'user',
      targetType: 'user',
      targetId: pending.userId,
      metadata: { email: pending.email },
    })

    this.pending.delete(token)

    const sessionCookie = await this.authService.createSession(pending.userId)
    reply.header('Set-Cookie', sessionCookie)

    return successResponse({ recoveryCodes: codes })
  }
}
