import { Injectable, OnModuleInit } from '@nestjs/common'
import { createAuth, type Auth } from './auth.config'
import { toNodeHandler } from 'better-auth/node'
import type { IncomingMessage } from 'http'
import { randomUUID, randomBytes } from 'crypto'
import { eq, getClient, sessions, users } from '@dexhub/db'

const SESSION_COOKIE = 'better-auth.session_token'
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

@Injectable()
export class AuthService implements OnModuleInit {
  private _auth!: Auth

  onModuleInit() {
    this._auth = createAuth()
  }

  get auth(): Auth {
    return this._auth
  }

  getHandler() {
    return toNodeHandler(this._auth)
  }

  async getSession(req: IncomingMessage) {
    const cookieHeader = req.headers['cookie']
    if (!cookieHeader) return null

    const match = String(cookieHeader).match(/better-auth\.session_token=([^;]+)/)
    if (!match) return null
    const token = match[1]!.trim()

    const db = getClient()

    const sessionRow = await db
      .select()
      .from(sessions)
      .where(eq(sessions.token, token))
      .limit(1)
      .then((r) => r[0])

    if (!sessionRow || sessionRow.expiresAt < new Date()) return null

    // Sliding Window Session: se la sessione attiva ha consumato più di 24 ore
    // (rimangono meno di 6 giorni rispetto ai 7 originari), estendiamo la validità
    // per altri 7 giorni garantendo continuità operativa agli utenti attivi.
    const sixDaysRemaining = Date.now() + 6 * 24 * 60 * 60 * 1000
    if (sessionRow.expiresAt.getTime() < sixDaysRemaining) {
      const newExpiresAt = new Date(Date.now() + SESSION_DURATION_MS)
      sessionRow.expiresAt = newExpiresAt
      void db
        .update(sessions)
        .set({ expiresAt: newExpiresAt, updatedAt: new Date() })
        .where(eq(sessions.id, sessionRow.id))
        .catch(() => {})
    }

    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, sessionRow.userId))
      .limit(1)
      .then((r) => r[0])

    if (!user || !user.isActive) return null

    return { session: sessionRow, user }
  }

  async logout(cookieHeader: string | undefined): Promise<string> {
    if (cookieHeader) {
      const match = String(cookieHeader).match(/better-auth\.session_token=([^;]+)/)
      if (match) {
        const token = match[1]!.trim()
        await getClient().delete(sessions).where(eq(sessions.token, token))
      }
    }
    return `${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Max-Age=0`
  }

  async createSession(userId: string): Promise<string> {
    const token = randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + SESSION_DURATION_MS)

    await getClient().insert(sessions).values({
      id: randomUUID(),
      userId,
      token,
      expiresAt,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    return [
      `${SESSION_COOKIE}=${token}`,
      `Path=/`,
      `HttpOnly`,
      `Secure`,
      `SameSite=Lax`,
      `Expires=${expiresAt.toUTCString()}`,
    ].join('; ')
  }
}
