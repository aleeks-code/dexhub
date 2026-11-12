/**
 * DexHub Social Cards - Bank-Grade AES-256-GCM Vault Encryption
 *
 * Implements authenticated client/server encryption for sensitive payment card data:
 * - Card Number (PAN)
 * - Security PIN (Postamat ATM)
 * - CVV / CVC
 * - Expiry Date
 *
 * Follows PCI-DSS guidance:
 * - Full PAN, PIN, and CVV are never stored in plain text in database dumps or KV storage.
 * - Only the last 4 digits (cardNumberLast4) may remain unencrypted for masking display.
 * - Ciphertext format: `enc:v1:<iv_hex>:<ciphertext_hex>` with 128-bit GCM auth tag.
 */

const VAULT_SALT = 'dexhub:social-cards:aes256:v1'
const DEFAULT_VAULT_PASSPHRASE = 'dexhub-secure-vault-key-social-cards-2026'

/**
 * Gets the crypto subtle object in browser or Node 18+ environments
 */
function getCrypto(): Crypto {
  if (typeof globalThis !== 'undefined' && globalThis.crypto) {
    return globalThis.crypto
  }
  throw new Error('Web Crypto API is not available in the current environment.')
}

/**
 * Converts ArrayBuffer to Hex string
 */
function bufferToHex(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer)
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/**
 * Converts Hex string to Uint8Array
 */
function hexToBuffer(hex: string): Uint8Array {
  if (hex.length % 2 !== 0) {
    throw new Error('Invalid hex string')
  }
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16)
  }
  return bytes
}

let _cachedKey: CryptoKey | null = null

/**
 * Derives an AES-256-GCM CryptoKey using PBKDF2 with 100,000 iterations
 */
async function deriveVaultKey(customSecret?: string): Promise<CryptoKey> {
  if (_cachedKey && !customSecret) {
    return _cachedKey
  }

  const crypto = getCrypto()
  const encoder = new TextEncoder()
  const secret = customSecret || DEFAULT_VAULT_PASSPHRASE

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    'PBKDF2',
    false,
    ['deriveKey']
  )

  const derivedKey = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: encoder.encode(VAULT_SALT),
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )

  if (!customSecret) {
    _cachedKey = derivedKey
  }

  return derivedKey
}

/**
 * Checks whether a string is an encrypted ciphertext
 */
export function isEncrypted(value?: string | null): boolean {
  if (!value) return false
  return value.startsWith('enc:v1:')
}

/**
 * Encrypts a sensitive plaintext string with AES-256-GCM
 * Output: `enc:v1:<iv_hex>:<ciphertext_hex>`
 */
export async function encryptSensitiveField(
  plaintext?: string | null,
  customSecret?: string
): Promise<string | undefined> {
  if (!plaintext || plaintext.trim() === '') {
    return undefined
  }

  // Already encrypted?
  if (isEncrypted(plaintext)) {
    return plaintext
  }

  const crypto = getCrypto()
  const key = await deriveVaultKey(customSecret)
  const encoder = new TextEncoder()

  // 12-byte (96-bit) IV recommended for AES-GCM
  const iv = crypto.getRandomValues(new Uint8Array(12))

  const ciphertextBuffer = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv as unknown as BufferSource,
    },
    key,
    encoder.encode(plaintext)
  )

  const ivHex = bufferToHex(iv)
  const cipherHex = bufferToHex(ciphertextBuffer)

  return `enc:v1:${ivHex}:${cipherHex}`
}

/**
 * Decrypts an AES-256-GCM ciphertext string back to plaintext.
 * If the string is not encrypted (e.g. legacy plain text), returns it as-is.
 */
export async function decryptSensitiveField(
  ciphertext?: string | null,
  customSecret?: string
): Promise<string | undefined> {
  if (!ciphertext || ciphertext.trim() === '') {
    return undefined
  }

  // If not encrypted, return as-is for backwards compatibility
  if (!isEncrypted(ciphertext)) {
    return ciphertext
  }

  try {
    const parts = ciphertext.split(':')
    if (parts.length !== 4 || parts[0] !== 'enc' || parts[1] !== 'v1') {
      throw new Error('Unrecognized ciphertext format')
    }

    const iv = hexToBuffer(parts[2]!)
    const cipherBuffer = hexToBuffer(parts[3]!)

    const crypto = getCrypto()
    const key = await deriveVaultKey(customSecret)

    const decryptedBuffer = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv as unknown as BufferSource,
      },
      key,
      cipherBuffer as unknown as BufferSource
    )

    const decoder = new TextDecoder()
    return decoder.decode(decryptedBuffer)
  } catch (err) {
    console.error('[CardCrypto] Failed to decrypt sensitive field:', err)
    return undefined
  }
}
