import type { ModuleKVAdapter } from '@dexhub/sdk'
import { DexHubError } from '@dexhub/sdk'

const API = process.env['NEXT_PUBLIC_API_URL'] ?? ''

export class ModuleKVAdapterImpl implements ModuleKVAdapter {
  constructor(private readonly moduleId: string) {}

  private url(key: string): string {
    return `${API}/api/v1/module-storage/${encodeURIComponent(this.moduleId)}/kv/${encodeURIComponent(key)}`
  }

  async get<T>(key: string): Promise<T | null> {
    const res = await fetch(this.url(key), { credentials: 'include' })
    if (res.status === 404) return null
    if (!res.ok) throw new DexHubError('INTERNAL_ERROR', `KV get failed for key "${key}"`)
    const json = (await res.json()) as { data: { value: T } }
    return json.data.value
  }

  async set<T>(key: string, value: T, options?: { ttlSeconds?: number }): Promise<void> {
    const res = await fetch(this.url(key), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value, ttlSeconds: options?.ttlSeconds }),
      credentials: 'include',
    })
    if (!res.ok) throw new DexHubError('INTERNAL_ERROR', `KV set failed for key "${key}"`)
  }

  async delete(key: string): Promise<void> {
    const res = await fetch(this.url(key), { method: 'DELETE', credentials: 'include' })
    if (!res.ok && res.status !== 404) {
      throw new DexHubError('INTERNAL_ERROR', `KV delete failed for key "${key}"`)
    }
  }

  async clear(): Promise<void> {
    const res = await fetch(
      `${API}/api/v1/module-storage/${encodeURIComponent(this.moduleId)}/kv`,
      { method: 'DELETE', credentials: 'include' },
    )
    if (!res.ok) throw new DexHubError('INTERNAL_ERROR', 'KV clear failed')
  }
}
