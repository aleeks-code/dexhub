import { Injectable } from '@nestjs/common'
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
  scrypt,
  timingSafeEqual,
} from 'crypto'
import { and, eq, isNull, getClient, recoveryCodes } from '@dexhub/db'

const SCRYPT_PARAMS = { N: 16384, r: 8, p: 1 }
const CODE_LENGTH = 10

// ---------------------------------------------------------------------------
// Code generation
// ---------------------------------------------------------------------------

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  const bytes = randomBytes(CODE_LENGTH)
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += chars[bytes[i]! % chars.length]
  }
  return code
}

// ---------------------------------------------------------------------------
// Scrypt hashing — used for authentication (one-way, timing-safe)
// ---------------------------------------------------------------------------

function scryptAsync(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, 32, SCRYPT_PARAMS, (err, buf) => {
      if (err) reject(err)
      else resolve(buf)
    })
  })
}

async function hashCode(code: string): Promise<string> {
  const salt = randomBytes(16)
  const derived = await scryptAsync(code, salt)
  return `${salt.toString('hex')}:${derived.toString('hex')}`
}

async function verifyCode(code: string, hash: string): Promise<boolean> {
  const [saltHex, hashHex] = hash.split(':')
  if (!saltHex || !hashHex) return false
  const salt = Buffer.from(saltHex, 'hex')
  const storedHash = Buffer.from(hashHex, 'hex')
  const derived = await scryptAsync(code, salt)
  return timingSafeEqual(derived, storedHash)
}

// ---------------------------------------------------------------------------
// AES-256-GCM encryption — used for admin viewing (reversible)
//
// Key is derived from RECOVERY_CODE_ENCRYPTION_KEY env var via SHA-256.
// Legacy fallback: if decryption with the new key fails, the old key
// (derived from DATABASE_URL) is tried and the ciphertext is re-encrypted.
// ---------------------------------------------------------------------------

function getNewEncryptionKey(): Buffer {
  const secret = process.env['RECOVERY_CODE_ENCRYPTION_KEY'] ?? ''
  return createHash('sha256').update('dexhub:rck:' + secret).digest()
}

function getLegacyEncryptionKey(): Buffer {
  const secret = process.env['DATABASE_URL'] ?? 'fallback-recovery-key-change-me'
  return createHash('sha256').update('dexhub:recovery-code-key:' + secret).digest()
}

function encryptCode(plaintext: string, key: Buffer): string {
  const iv = randomBytes(12) // 96-bit IV standard for GCM
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag() // 16 bytes
  // Layout: iv(12) || tag(16) || ciphertext → base64url
  return Buffer.concat([iv, tag, encrypted]).toString('base64url')
}

function decryptCode(encoded: string, key: Buffer): string {
  const buf = Buffer.from(encoded, 'base64url')
  const iv = buf.subarray(0, 12)
  const tag = buf.subarray(12, 28)
  const ciphertext = buf.subarray(28)
  const decipher = createDecipheriv('aes-256-gcm', key, iv)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8')
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

@Injectable()
export class RecoveryCodesService {
  private get db() {
    return getClient()
  }

  /**
   * Deletes all existing codes for the user, generates a new single code,
   * stores it hashed (for auth) and encrypted (for admin viewing),
   * and returns the plaintext code.
   */
  async generateForUser(userId: string): Promise<string[]> {
    const db = this.db

    await db.delete(recoveryCodes).where(eq(recoveryCodes.userId, userId))

    const code = generateCode()
    const key = getNewEncryptionKey()
    await db.insert(recoveryCodes).values({
      userId,
      codeHash: await hashCode(code),
      codeEncrypted: encryptCode(code, key),
    })

    return [code]
  }

  /**
   * Returns the plaintext of the user's current (unused) recovery code.
   * Tries the new key first; falls back to the legacy DATABASE_URL-derived key
   * and re-encrypts with the new key on success (transparent migration).
   * Returns null if no unused code exists or decryption fails with both keys.
   */
  async getPlainCodeForUser(userId: string): Promise<string | null> {
    const db = this.db
    const row = await db
      .select({ id: recoveryCodes.id, codeEncrypted: recoveryCodes.codeEncrypted })
      .from(recoveryCodes)
      .where(and(eq(recoveryCodes.userId, userId), isNull(recoveryCodes.usedAt)))
      .limit(1)
      .then((r) => r[0])

    if (!row?.codeEncrypted) return null

    const newKey = getNewEncryptionKey()

    // Try new key first
    try {
      return decryptCode(row.codeEncrypted, newKey)
    } catch {
      // Key mismatch — try legacy key and migrate
    }

    const legacyKey = getLegacyEncryptionKey()
    try {
      const plaintext = decryptCode(row.codeEncrypted, legacyKey)
      // Re-encrypt with new key (transparent migration, no user action required)
      await db
        .update(recoveryCodes)
        .set({ codeEncrypted: encryptCode(plaintext, newKey) })
        .where(eq(recoveryCodes.id, row.id))
      return plaintext
    } catch {
      return null
    }
  }

  async verify(userId: string, code: string): Promise<boolean> {
    const unused = await this.db
      .select()
      .from(recoveryCodes)
      .where(and(eq(recoveryCodes.userId, userId), isNull(recoveryCodes.usedAt)))

    for (const entry of unused) {
      const valid = await verifyCode(code.toUpperCase(), entry.codeHash)
      if (valid) {
        await this.db
          .update(recoveryCodes)
          .set({ usedAt: new Date() })
          .where(eq(recoveryCodes.id, entry.id))
        return true
      }
    }

    return false
  }

  async countUnused(userId: string): Promise<number> {
    const unused = await this.db
      .select({ id: recoveryCodes.id })
      .from(recoveryCodes)
      .where(and(eq(recoveryCodes.userId, userId), isNull(recoveryCodes.usedAt)))
    return unused.length
  }
}
