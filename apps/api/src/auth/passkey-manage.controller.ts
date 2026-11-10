import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Post,
  Req,
} from '@nestjs/common'
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  type VerifiedRegistrationResponse,
  type AuthenticatorTransportFuture,
} from '@simplewebauthn/server'
import type { FastifyRequest } from 'fastify'
import { and, eq, getClient, passkeys, users } from '@dexhub/db'
import { successResponse } from '../common/response/api-response'

const RP_NAME = process.env['WEBAUTHN_RP_NAME'] ?? 'DexHub'
const RP_ID = process.env['WEBAUTHN_RP_ID']!
const ORIGIN = process.env['WEBAUTHN_ORIGIN']!

const pendingChallenges = new Map<string, string>()

type AuthedRequest = FastifyRequest & {
  session: { user: { id: string }; session: unknown }
}

@Controller('auth/passkey/manage')
export class PasskeyManageController {
  @Get()
  async list(@Req() req: AuthedRequest) {
    const userId = req.session.user.id
    const rows = await getClient()
      .select({
        id: passkeys.id,
        name: passkeys.name,
        deviceType: passkeys.deviceType,
        createdAt: passkeys.createdAt,
      })
      .from(passkeys)
      .where(eq(passkeys.userId, userId))
    return successResponse(rows)
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @Req() req: AuthedRequest) {
    const userId = req.session.user.id
    const db = getClient()
    const existing = await db
      .select({ id: passkeys.id })
      .from(passkeys)
      .where(and(eq(passkeys.id, id), eq(passkeys.userId, userId)))
      .limit(1)
      .then((r) => r[0])
    if (!existing) throw new NotFoundException('Passkey not found')

    await db.delete(passkeys).where(eq(passkeys.id, id))
    return successResponse(null)
  }

  @Get('options')
  async getOptions(@Req() req: AuthedRequest) {
    const userId = req.session.user.id
    const db = getClient()

    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1)
      .then((r) => r[0])
    if (!user) throw new BadRequestException('User not found')

    const existing = await db
      .select({ id: passkeys.id, transports: passkeys.transports })
      .from(passkeys)
      .where(eq(passkeys.userId, userId))

    const options = await generateRegistrationOptions({
      rpName: RP_NAME,
      rpID: RP_ID,
      userName: user.email,
      userDisplayName: user.name,
      userID: new TextEncoder().encode(user.id),
      attestationType: 'none',
      excludeCredentials: existing.map((pk) => ({
        id: pk.id,
        transports: (pk.transports?.split(',') as AuthenticatorTransportFuture[]) ?? [],
      })),
      authenticatorSelection: {
        residentKey: 'preferred',
        userVerification: 'preferred',
      },
    })

    pendingChallenges.set(userId, options.challenge)
    return options
  }

  @Post('verify')
  async verify(@Body() credential: object, @Req() req: AuthedRequest) {
    const userId = req.session.user.id
    const challenge = pendingChallenges.get(userId)
    if (!challenge) throw new BadRequestException('No pending challenge — request options first')

    let verification: VerifiedRegistrationResponse
    try {
      verification = await verifyRegistrationResponse({
        response: credential as Parameters<typeof verifyRegistrationResponse>[0]['response'],
        expectedChallenge: challenge,
        expectedOrigin: [ORIGIN, 'https://dexhub.it', 'https://www.dexhub.it'].filter(Boolean),
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
    const label = `Passkey ${new Date().toLocaleDateString('it-IT')}`

    await getClient().insert(passkeys).values({
      id: cred.id,
      name: label,
      publicKey: Buffer.from(cred.publicKey).toString('base64url'),
      userId,
      webauthnUserId: userId,
      counter: cred.counter,
      deviceType: credentialDeviceType,
      backedUp: credentialBackedUp,
      transports: transports?.join(','),
    })

    pendingChallenges.delete(userId)
    return successResponse({ message: 'Passkey registered' })
  }
}
