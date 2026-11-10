import { Injectable } from '@nestjs/common'
import { and, eq, isNotNull, lt, getClient, moduleKvStore } from '@dexhub/db'

@Injectable()
export class ModuleStorageService {
  private get db() {
    return getClient()
  }

  async kvGet(namespace: string, key: string): Promise<unknown | null> {
    const row = await this.db
      .select()
      .from(moduleKvStore)
      .where(and(eq(moduleKvStore.namespace, namespace), eq(moduleKvStore.key, key)))
      .limit(1)
      .then((r) => r[0])

    if (!row) return null

    if (row.expiresAt && row.expiresAt < new Date()) {
      await this.kvDelete(namespace, key)
      return null
    }

    return row.value
  }

  async kvSet(namespace: string, key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    const expiresAt = ttlSeconds ? new Date(Date.now() + ttlSeconds * 1000) : null
    await this.db
      .insert(moduleKvStore)
      .values({ namespace, key, value, expiresAt, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: [moduleKvStore.namespace, moduleKvStore.key],
        set: { value, expiresAt, updatedAt: new Date() },
      })
  }

  async kvDelete(namespace: string, key: string): Promise<void> {
    await this.db
      .delete(moduleKvStore)
      .where(and(eq(moduleKvStore.namespace, namespace), eq(moduleKvStore.key, key)))
  }

  async kvClear(namespace: string): Promise<void> {
    await this.db.delete(moduleKvStore).where(eq(moduleKvStore.namespace, namespace))
  }

  async purgeExpired(): Promise<void> {
    await this.db
      .delete(moduleKvStore)
      .where(and(isNotNull(moduleKvStore.expiresAt), lt(moduleKvStore.expiresAt, new Date())))
  }
}
