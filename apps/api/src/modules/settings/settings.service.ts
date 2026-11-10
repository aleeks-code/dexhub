import { Injectable } from '@nestjs/common'
import { eq, getClient, settings } from '@dexhub/db'

@Injectable()
export class SettingsService {
  private get db() {
    return getClient()
  }

  async getAll(): Promise<Record<string, unknown>> {
    const rows = await this.db.select().from(settings)
    return Object.fromEntries(rows.map((r) => [r.key, r.value]))
  }

  async get(key: string): Promise<unknown | null> {
    const row = await this.db
      .select()
      .from(settings)
      .where(eq(settings.key, key))
      .limit(1)
      .then((r) => r[0])
    return row?.value ?? null
  }

  async set(key: string, value: unknown, updatedBy: string): Promise<void> {
    await this.db
      .insert(settings)
      .values({ key, value, updatedAt: new Date(), updatedBy })
      .onConflictDoUpdate({
        target: settings.key,
        set: { value, updatedAt: new Date(), updatedBy },
      })
  }

  async delete(key: string): Promise<void> {
    await this.db.delete(settings).where(eq(settings.key, key))
  }
}
