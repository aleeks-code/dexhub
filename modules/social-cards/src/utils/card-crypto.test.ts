import { describe, it, expect } from 'vitest'
import {
  isEncrypted,
  encryptSensitiveField,
  decryptSensitiveField,
} from './card-crypto'

describe('Card Vault Encryption (AES-256-GCM)', () => {
  it('correctly identifies encrypted format', () => {
    expect(isEncrypted('12345')).toBe(false)
    expect(isEncrypted('5333171234567890')).toBe(false)
    expect(isEncrypted(undefined)).toBe(false)
    expect(isEncrypted('enc:v1:abc1234:def5678')).toBe(true)
  })

  it('encrypts sensitive PAN and decrypts back to identical string', async () => {
    const rawPan = '5333 1712 3456 7890'
    const encrypted = await encryptSensitiveField(rawPan)

    expect(encrypted).toBeDefined()
    expect(encrypted).not.toContain('5333')
    expect(encrypted).not.toContain('7890')
    expect(encrypted!.startsWith('enc:v1:')).toBe(true)

    const decrypted = await decryptSensitiveField(encrypted)
    expect(decrypted).toBe(rawPan)
  })

  it('encrypts PIN and CVV securely', async () => {
    const pin = '94821'
    const cvv = '842'

    const encPin = await encryptSensitiveField(pin)
    const encCvv = await encryptSensitiveField(cvv)

    expect(encPin).not.toBe(pin)
    expect(encCvv).not.toBe(cvv)
    expect(encPin).not.toContain(pin)
    expect(encCvv).not.toContain(cvv)

    expect(await decryptSensitiveField(encPin)).toBe(pin)
    expect(await decryptSensitiveField(encCvv)).toBe(cvv)
  })

  it('produces different ciphertexts for the same plaintext due to random IVs', async () => {
    const pin = '12345'
    const enc1 = await encryptSensitiveField(pin)
    const enc2 = await encryptSensitiveField(pin)

    expect(enc1).not.toBe(enc2)
    expect(await decryptSensitiveField(enc1)).toBe(pin)
    expect(await decryptSensitiveField(enc2)).toBe(pin)
  })

  it('preserves legacy unencrypted data transparently', async () => {
    const legacyPlain = '5333123456789012'
    const decrypted = await decryptSensitiveField(legacyPlain)
    expect(decrypted).toBe(legacyPlain)
  })

  it('returns undefined for empty or null inputs', async () => {
    expect(await encryptSensitiveField('')).toBeUndefined()
    expect(await encryptSensitiveField(undefined)).toBeUndefined()
    expect(await decryptSensitiveField('')).toBeUndefined()
    expect(await decryptSensitiveField(undefined)).toBeUndefined()
  })

  it('fails safely and returns undefined if ciphertext is tampered with', async () => {
    const validEnc = await encryptSensitiveField('99999')
    const tampered = validEnc!.slice(0, -4) + 'ffff'
    const result = await decryptSensitiveField(tampered)
    expect(result).toBeUndefined()
  })
})
