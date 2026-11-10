import { Injectable } from '@nestjs/common'
import { eq, getClient, taskSpaces } from '@dexhub/db'
import { randomBytes } from 'node:crypto'

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

@Injectable()
export class JoinCodeService {
  private get db() {
    return getClient()
  }

  generate(): string {
    const bytes = randomBytes(6)
    return Array.from(bytes)
      .map((b) => ALPHABET[b % ALPHABET.length])
      .join('')
  }

  /** Strip hyphens/spaces and uppercase for consistent DB lookup */
  normalize(input: string): string {
    return input.replace(/[-\s]/g, '').toUpperCase()
  }

  /** Format for display: XXXX-XX */
  format(code: string): string {
    return `${code.slice(0, 4)}-${code.slice(4)}`
  }

  async generateUnique(): Promise<string> {
    for (let attempt = 0; attempt < 10; attempt++) {
      const code = this.generate()
      const existing = await this.db
        .select({ id: taskSpaces.id })
        .from(taskSpaces)
        .where(eq(taskSpaces.joinCode, code))
        .limit(1)
      if (existing.length === 0) return code
    }
    throw new Error('Failed to generate unique join code after 10 attempts')
  }
}
