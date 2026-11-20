/**
 * Persistence contract. Stores never talk to IndexedDB/localStorage directly —
 * they go through a driver, so a remote (HTTP) driver can replace the local one
 * without touching the stores or the UI.
 */
export interface PersistenceDriver {
  readonly name: 'indexeddb' | 'localstorage' | 'memory'
  get<T>(key: string): Promise<T | undefined>
  set<T>(key: string, value: T): Promise<void>
  delete(key: string): Promise<void>
  keys(): Promise<string[]>
}

export interface PersistenceBackend {
  driver: PersistenceDriver
  /** True when we had to fall back to a non-durable or size-limited backend. */
  degraded: boolean
  /** IndexedDB exists but another tab blocks its upgrade: changes stay in memory until a reload. */
  blocked?: boolean
}
