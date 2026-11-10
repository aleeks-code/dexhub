import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { createHash, randomBytes } from 'crypto'
import {
  and,
  auditLogs,
  count,
  eq,
  getClient,
  passkeys,
  userInvites,
  users,
} from '@dexhub/db'
import { RecoveryCodesService } from '../../auth/recovery-codes.service'

const INVITE_EXPIRY_MS = 48 * 60 * 60 * 1000

@Injectable()
export class AdminUsersService {
  constructor(private readonly recoveryCodes: RecoveryCodesService) {}

  private get db() {
    return getClient()
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex')
  }

  async listUsers() {
    const db = this.db
    const allUsers = await db.select().from(users).orderBy(users.createdAt)

    const passkeyCountsRaw = await db
      .select({ userId: passkeys.userId, cnt: count() })
      .from(passkeys)
      .groupBy(passkeys.userId)

    const passkeyCountMap = new Map(passkeyCountsRaw.map((r) => [r.userId, Number(r.cnt)]))

    return allUsers.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      isAdmin: u.isAdmin,
      isActive: u.isActive,
      lastLoginAt: u.lastLoginAt,
      passkeyCount: passkeyCountMap.get(u.id) ?? 0,
    }))
  }

  async inviteUser(email: string | undefined, createdBy: string): Promise<{ token: string }> {
    if (email) {
      const existing = await this.db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, email.toLowerCase().trim()))
        .limit(1)
      if (existing.length > 0) throw new ConflictException('A user with this email already exists')
    }

    const token = randomBytes(32).toString('hex')
    const tokenHash = this.hashToken(token)
    const expiresAt = new Date(Date.now() + INVITE_EXPIRY_MS)

    await this.db.insert(userInvites).values({
      tokenHash,
      email: email?.toLowerCase().trim(),
      expiresAt,
      createdBy,
    })

    await this.db.insert(auditLogs).values({
      category: 'ADMIN',
      action: 'user.invited',
      severity: 'info',
      outcome: 'success',
      actorId: createdBy,
      actorType: 'user',
      metadata: { email: email ?? null },
    })

    return { token }
  }

  async setUserStatus(targetId: string, isActive: boolean, actorId: string): Promise<void> {
    if (targetId === actorId) {
      throw new ForbiddenException('Cannot change your own account status')
    }

    const user = await this.db
      .select()
      .from(users)
      .where(eq(users.id, targetId))
      .limit(1)
      .then((r) => r[0])
    if (!user) throw new NotFoundException('User not found')

    if (!isActive && user.isAdmin) {
      const adminCount = await this.db
        .select({ cnt: count() })
        .from(users)
        .where(and(eq(users.isAdmin, true), eq(users.isActive, true)))
        .then((r) => Number(r[0]?.cnt ?? 0))
      if (adminCount <= 1) throw new ForbiddenException('Cannot disable the last active administrator')
    }

    await this.db.update(users).set({ isActive }).where(eq(users.id, targetId))

    await this.db.insert(auditLogs).values({
      category: 'ADMIN',
      action: isActive ? 'user.activated' : 'user.disabled',
      severity: isActive ? 'info' : 'warning',
      outcome: 'success',
      actorId,
      actorType: 'user',
      targetType: 'user',
      targetId,
    })
  }

  async deleteUser(targetId: string, actorId: string): Promise<void> {
    if (targetId === actorId) throw new ForbiddenException('Cannot delete your own account')

    const user = await this.db
      .select()
      .from(users)
      .where(eq(users.id, targetId))
      .limit(1)
      .then((r) => r[0])
    if (!user) throw new NotFoundException('User not found')

    if (user.isAdmin) {
      const adminCount = await this.db
        .select({ cnt: count() })
        .from(users)
        .where(eq(users.isAdmin, true))
        .then((r) => Number(r[0]?.cnt ?? 0))
      if (adminCount <= 1) throw new ForbiddenException('Cannot delete the last administrator')
    }

    await this.db.delete(users).where(eq(users.id, targetId))

    await this.db.insert(auditLogs).values({
      category: 'ADMIN',
      action: 'user.deleted',
      severity: 'critical',
      outcome: 'success',
      actorId,
      actorType: 'user',
      targetType: 'user',
      targetId,
      metadata: { name: user.name, email: user.email },
    })
  }

  async regenerateRecoveryCodes(
    targetId: string,
    actorId: string,
  ): Promise<{ code: string }> {
    const user = await this.db
      .select()
      .from(users)
      .where(eq(users.id, targetId))
      .limit(1)
      .then((r) => r[0])
    if (!user) throw new NotFoundException('User not found')

    const [code] = await this.recoveryCodes.generateForUser(targetId)

    await this.db.insert(auditLogs).values({
      category: 'ADMIN',
      action: 'user.recovery_code_regenerated',
      severity: 'warning',
      outcome: 'success',
      actorId,
      actorType: 'user',
      targetType: 'user',
      targetId,
    })

    return { code: code! }
  }

  async getRecoveryCode(
    targetId: string,
    actorId: string,
  ): Promise<{ code: string | null }> {
    const user = await this.db
      .select()
      .from(users)
      .where(eq(users.id, targetId))
      .limit(1)
      .then((r) => r[0])
    if (!user) throw new NotFoundException('User not found')

    await this.db.insert(auditLogs).values({
      category: 'ADMIN',
      action: 'user.recovery_code_viewed',
      severity: 'warning',
      outcome: 'success',
      actorId,
      actorType: 'user',
      targetType: 'user',
      targetId,
    })

    const code = await this.recoveryCodes.getPlainCodeForUser(targetId)
    return { code }
  }

  async logRecoveryCodeCopied(targetId: string, actorId: string): Promise<void> {
    const user = await this.db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, targetId))
      .limit(1)
      .then((r) => r[0])
    if (!user) throw new NotFoundException('User not found')

    await this.db.insert(auditLogs).values({
      category: 'ADMIN',
      action: 'user.recovery_code_copied',
      severity: 'warning',
      outcome: 'success',
      actorId,
      actorType: 'user',
      targetType: 'user',
      targetId,
    })
  }

  async deletePasskey(targetId: string, passkeyId: string, actorId: string): Promise<void> {
    const passkey = await this.db
      .select({ id: passkeys.id, name: passkeys.name })
      .from(passkeys)
      .where(and(eq(passkeys.id, passkeyId), eq(passkeys.userId, targetId)))
      .limit(1)
      .then((r) => r[0])
    if (!passkey) throw new NotFoundException('Passkey not found')

    await this.db.delete(passkeys).where(eq(passkeys.id, passkeyId))

    await this.db.insert(auditLogs).values({
      category: 'ADMIN',
      action: 'user.passkey_deleted',
      severity: 'warning',
      outcome: 'success',
      actorId,
      actorType: 'user',
      targetType: 'user',
      targetId,
      metadata: { passkeyName: passkey.name },
    })
  }

  async getUserPasskeys(targetId: string) {
    const user = await this.db
      .select()
      .from(users)
      .where(eq(users.id, targetId))
      .limit(1)
      .then((r) => r[0])
    if (!user) throw new NotFoundException('User not found')

    return this.db
      .select({
        id: passkeys.id,
        name: passkeys.name,
        createdAt: passkeys.createdAt,
        deviceType: passkeys.deviceType,
      })
      .from(passkeys)
      .where(eq(passkeys.userId, targetId))
  }

  async validateInviteToken(
    token: string,
  ): Promise<{ valid: boolean; email?: string; expired?: boolean }> {
    const tokenHash = this.hashToken(token)
    const row = await this.db
      .select()
      .from(userInvites)
      .where(eq(userInvites.tokenHash, tokenHash))
      .limit(1)
      .then((r) => r[0])

    if (!row) return { valid: false }
    if (row.usedAt) return { valid: false }
    if (row.expiresAt < new Date()) return { valid: false, expired: true }

    return { valid: true, email: row.email ?? undefined }
  }

  async markInviteUsed(token: string): Promise<void> {
    const tokenHash = this.hashToken(token)
    await this.db
      .update(userInvites)
      .set({ usedAt: new Date() })
      .where(eq(userInvites.tokenHash, tokenHash))
  }
}
