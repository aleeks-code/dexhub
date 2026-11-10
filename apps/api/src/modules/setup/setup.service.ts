import { BadRequestException, Injectable, OnModuleInit } from '@nestjs/common'
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  type VerifiedRegistrationResponse,
} from '@simplewebauthn/server'
import { randomUUID, randomBytes } from 'crypto'
import { eq, getClient, users, passkeys, setupTokens } from '@dexhub/db'
import { RecoveryCodesService } from '../../auth/recovery-codes.service'

const RP_NAME = process.env['WEBAUTHN_RP_NAME'] ?? 'DexHub'
const RP_ID = process.env['WEBAUTHN_RP_ID']!
const ORIGIN = process.env['WEBAUTHN_ORIGIN']!

@Injectable()
export class SetupService implements OnModuleInit {
  private pendingChallenges = new Map<string, { challenge: string }>()
  private pendingSetups = new Map<string, { name: string; email: string }>()

  constructor(private readonly recoveryCodes: RecoveryCodesService) {}

  onModuleInit() {}

  private get db() {
    return getClient()
  }

  async isSetupNeeded(): Promise<boolean> {
    const result = await this.db.select({ id: users.id }).from(users).limit(1)
    return result.length === 0
  }

  async assertSetupNeeded() {
    if (!(await this.isSetupNeeded())) {
      throw new BadRequestException('Setup already completed')
    }
  }

  async validateSetupToken(token: string): Promise<boolean> {
    const rows = await this.db
      .select()
      .from(setupTokens)
      .where(eq(setupTokens.token, token))
      .limit(1)
    const entry = rows[0]
    if (!entry) return false
    if (entry.usedAt) return false
    if (entry.expiresAt < new Date()) return false
    return true
  }

  /**
   * Initialises setup: stores the user's name and email in memory and creates
   * a setup token. The administrator account is NOT created here — it is
   * created atomically with the passkey in verifyPasskeyRegistration().
   * This prevents a permanently broken state if the user abandons the wizard
   * after the first step.
   */
  async initSetup(name: string, email: string): Promise<{ setupToken: string }> {
    await this.assertSetupNeeded()

    const token = randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000)

    this.pendingSetups.set(token, { name, email: email.toLowerCase().trim() })
    await this.db.insert(setupTokens).values({ token, expiresAt })

    return { setupToken: token }
  }

  async getPasskeyRegistrationOptions(setupToken: string): Promise<object> {
    const valid = await this.validateSetupToken(setupToken)
    if (!valid) throw new BadRequestException('Invalid or expired setup token')

    const setupData = this.pendingSetups.get(setupToken)
    if (!setupData) {
      throw new BadRequestException(
        'Setup session not found — the server may have restarted. Please start over.',
      )
    }

    const options = await generateRegistrationOptions({
      rpName: RP_NAME,
      rpID: RP_ID,
      userName: setupData.email,
      userDisplayName: setupData.name,
      // Use the setup token as the userID placeholder; the real user ID is
      // assigned atomically when the passkey is verified.
      userID: new TextEncoder().encode(setupToken),
      attestationType: 'none',
      authenticatorSelection: {
        residentKey: 'preferred',
        userVerification: 'preferred',
      },
    })

    this.pendingChallenges.set(setupToken, { challenge: options.challenge })

    return options
  }

  /**
   * Verifies the passkey response and — on success — atomically creates the
   * administrator user, inserts the passkey, and updates the setup token with
   * the new user ID. Any failure rolls back the entire transaction, leaving
   * the database unchanged.
   */
  async verifyPasskeyRegistration(setupToken: string, credential: object): Promise<void> {
    const pending = this.pendingChallenges.get(setupToken)
    if (!pending) throw new BadRequestException('No pending challenge for this token')

    const setupData = this.pendingSetups.get(setupToken)
    if (!setupData) {
      throw new BadRequestException(
        'Setup session not found — the server may have restarted. Please start over.',
      )
    }

    let verification: VerifiedRegistrationResponse
    try {
      verification = await verifyRegistrationResponse({
        response: credential as Parameters<typeof verifyRegistrationResponse>[0]['response'],
        expectedChallenge: pending.challenge,
        expectedOrigin: [ORIGIN, 'https://dexhub.it', 'https://www.dexhub.it'].filter(Boolean),
        expectedRPID: RP_ID,
        requireUserVerification: false,
      })
    } catch (err) {
      process.stdout.write(
        JSON.stringify({
          timestamp: new Date().toISOString(),
          level: 'error',
          context: 'SetupService',
          message: 'Passkey verification error',
          reason: String(err),
          expectedOrigin: ORIGIN,
          expectedRPID: RP_ID,
        }) + '\n',
      )
      throw new BadRequestException('Passkey verification failed')
    }

    if (!verification.verified || !verification.registrationInfo) {
      throw new BadRequestException('Passkey verification failed')
    }

    const { credential: cred, credentialDeviceType, credentialBackedUp } =
      verification.registrationInfo

    const transports = (credential as { response?: { transports?: string[] } }).response?.transports

    const userId = randomUUID()
    const db = this.db

    await db.transaction(async (tx) => {
      await tx.insert(users).values({
        id: userId,
        name: setupData.name,
        email: setupData.email,
        emailVerified: true,
        isAdmin: true,
        isActive: true,
      })

      await tx.insert(passkeys).values({
        id: cred.id,
        name: 'Primary passkey',
        publicKey: Buffer.from(cred.publicKey).toString('base64url'),
        userId,
        webauthnUserId: userId,
        counter: cred.counter,
        deviceType: credentialDeviceType,
        backedUp: credentialBackedUp,
        transports: transports?.join(','),
      })

      await tx.update(setupTokens).set({ userId }).where(eq(setupTokens.token, setupToken))
    })

    this.pendingChallenges.delete(setupToken)
    this.pendingSetups.delete(setupToken)
  }

  async completeSetup(setupToken: string): Promise<{ recoveryCodes: string[] }> {
    const valid = await this.validateSetupToken(setupToken)
    if (!valid) throw new BadRequestException('Invalid or expired setup token')

    const tokenRow = await this.db
      .select()
      .from(setupTokens)
      .where(eq(setupTokens.token, setupToken))
      .limit(1)

    const userId = tokenRow[0]?.userId
    if (!userId) throw new BadRequestException('Passkey registration must be completed first')

    const codes = await this.recoveryCodes.generateForUser(userId)

    await this.db
      .update(setupTokens)
      .set({ usedAt: new Date() })
      .where(eq(setupTokens.token, setupToken))

    return { recoveryCodes: codes }
  }
}
