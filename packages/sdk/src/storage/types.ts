export interface QueryOptions {
  where?: Record<string, unknown>
  orderBy?: { column: string; direction: 'asc' | 'desc' }
  limit?: number
  offset?: number
}

export interface ModuleStorageAdapter {
  readonly namespace: string
  query<T>(table: string, options?: QueryOptions): Promise<T[]>
  findOne<T>(table: string, id: string): Promise<T | null>
  insert<T>(table: string, data: Omit<T, 'id'>): Promise<T>
  update<T>(table: string, id: string, data: Partial<T>): Promise<T>
  delete(table: string, id: string): Promise<void>
  transaction<T>(fn: (tx: ModuleStorageAdapter) => Promise<T>): Promise<T>
}

export interface ModuleKVAdapter {
  get<T>(key: string): Promise<T | null>
  set<T>(key: string, value: T, options?: { ttlSeconds?: number }): Promise<void>
  delete(key: string): Promise<void>
  clear(): Promise<void>
}

export interface CacheAdapter {
  get<T>(key: string): Promise<T | null>
  set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>
  delete(key: string): Promise<void>
  invalidatePattern(pattern: string): Promise<void>
}
