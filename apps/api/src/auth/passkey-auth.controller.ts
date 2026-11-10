import { Body, Controller, ForbiddenException, Get, NotFoundException, Post, Req, Res, UseGuards } from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import { Public } from './auth.guard'
import { FastifyThrottlerGuard } from '../common/guards/fastify-throttler.guard'
import {
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
  type VerifiedAuthenticationResponse,
  type AuthenticatorTransportFuture,
} from '@simplewebauthn/server'
import type { FastifyReply, FastifyRequest } from 'fastify'
import { eq, getClient, passkeys, settings, users } from '@dexhub/db'
import { AuthService } from './auth.service'
import { successResponse } from '../common/response/api-response'

const ALLOW_NON_ADMIN_LOGINS_KEY = 'auth.allowNonAdminLogins'

const RP_ID = process.env['WEBAUTHN_RP_ID']!
const ORIGIN = process.env['WEBAUTHN_ORIGIN']!

const pendingChallenges = new Map<string, string>()
const activeChallenges = new Map<string, number>()

function cleanExpiredChallenges() {
  const now = Date.now()
  for (const [ch, exp] of activeChallenges.entries()) {
    if (exp < now) activeChallenges.delete(ch)
  }
}

@Public()
@Controller('auth/passkey')
export class PasskeyAuthController {
  constructor(private readonly authService: AuthService) {}

  @UseGuards(FastifyThrottlerGuard)
  @Throttle({ default: { ttl: 60_000, limit: 30 } })
  @Get('authenticate/options')
  async getOptions() {
    const options = await generateAuthenticationOptions({
      rpID: RP_ID,
      userVerification: 'preferred',
    })

    cleanExpiredChallenges()
    activeChallenges.set(options.challenge, Date.now() + 120_000)
    pendingChallenges.set('global', options.challenge)

    return options
  }

  @UseGuards(FastifyThrottlerGuard)
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @Post('authenticate/verify')
  async verify(
    @Body() credential: object,
    @Req() req: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    let challenge: string | undefined
    const cred = credential as { response?: { clientDataJSON?: string } }
    if (cred.response?.clientDataJSON) {
      try {
        const raw = Buffer.from(cred.response.clientDataJSON, 'base64url').toString('utf-8')
        const parsed = JSON.parse(raw) as { challenge?: string }
        if (parsed.challenge && activeChallenges.has(parsed.challenge)) {
          const exp = activeChallenges.get(parsed.challenge)
          if (exp && exp >= Date.now()) {
            challenge = parsed.challenge
            activeChallenges.delete(parsed.challenge)
          }
        }
      } catch {
        // fallback to global challenge
      }
    }

    if (!challenge) {
      challenge = pendingChallenges.get('global')
    }

    if (!challenge) {
      throw new NotFoundException('No active authentication challenge')
    }

    const db = getClient()
    const credentialId = (credential as { id: string }).id

    const passkeyRows = await db
      .select()
      .from(passkeys)
      .where(eq(passkeys.id, credentialId))
      .limit(1)

    const passkey = passkeyRows[0]
    if (!passkey) throw new NotFoundException('Passkey not found')

    let verification: VerifiedAuthenticationResponse
    try {
      verification = await verifyAuthenticationResponse({
        response: credential as Parameters<typeof verifyAuthenticationResponse>[0]['response'],
        expectedChallenge: challenge,
        expectedOrigin: ORIGIN,
        expectedRPID: RP_ID,
        requireUserVerification: false,
        credential: {
          id: passkey.id,
          publicKey: new Uint8Array(Buffer.from(passkey.publicKey, 'base64url')),
          counter: passkey.counter,
          transports: passkey.transports?.split(',') as AuthenticatorTransportFuture[] | undefined,
        },
      })
    } catch {
      throw new NotFoundException('Passkey verification failed')
    }

    if (!verification.verified) throw new NotFoundException('Passkey verification failed')

    await db
      .update(passkeys)
      .set({ counter: verification.authenticationInfo.newCounter })
      .where(eq(passkeys.id, passkey.id))

    const userRow = await db
      .select()
      .from(users)
      .where(eq(users.id, passkey.userId))
      .limit(1)
      .then((r) => r[0])

    if (!userRow) throw new NotFoundException('User not found')
    if (!userRow.isActive) {
      throw new ForbiddenException('This account has been disabled. Please contact your administrator.')
    }

    const allowSetting = await db
      .select({ value: settings.value })
      .from(settings)
      .where(eq(settings.key, ALLOW_NON_ADMIN_LOGINS_KEY))
      .limit(1)
      .then((r) => r[0]?.value)

    if (allowSetting === false && !userRow.isAdmin) {
      throw new ForbiddenException('Non-admin logins are currently disabled.')
    }

    await db
      .update(users)
      .set({ lastLoginAt: new Date() })
      .where(eq(users.id, userRow.id))

    if (challenge) {
      activeChallenges.delete(challenge)
    }
    pendingChallenges.delete('global')

    const sessionCookie = await this.authService.createSession(userRow.id)
    reply.header('Set-Cookie', sessionCookie)

    return successResponse({
      userId: userRow.id,
      name: userRow.name,
      email: userRow.email,
      isAdmin: userRow.isAdmin,
    })
  }
}
