import type { PersistenceBackend } from './driver'
import { createLocalStorageDriver, createMemoryDriver } from './fallbacks'
import { dataEvents } from '../events'
import { DatabaseBlockedError, createIndexedDbDriver, openDatabase } from './indexeddb'

export type { PersistenceBackend, PersistenceDriver } from './driver'

let backend: Promise<PersistenceBackend> | null = null

/**
 * Resolves the best available backend, once per page:
 * IndexedDB → localStorage → memory (nothing persists).
 *
 * To plug in a server, return a driver that implements PersistenceDriver
 * with fetch() calls here — stores and UI stay untouched.
 */
export function getBackend(): Promise<PersistenceBackend> {
  if (backend) return backend
  backend = (async () => {
    try {
      const db = await openDatabase()
      return { driver: createIndexedDbDriver(db), degraded: false }
    } catch (cause) {
      // Blocked by another tab: the data is fine, just not reachable now.
      // Saving to localStorage instead would split it in two places, so this
      // page keeps changes in memory and says why.
      if (cause instanceof DatabaseBlockedError) {
        dataEvents.emit('error', { message: cause.message, cause })
        return { driver: createMemoryDriver(), degraded: true, blocked: true }
      }
      try {
        const probe = '__glyphos_probe__'
        window.localStorage.setItem(probe, '1')
        window.localStorage.removeItem(probe)
        return { driver: createLocalStorageDriver(window.localStorage), degraded: true }
      } catch {
        return { driver: createMemoryDriver(), degraded: true }
      }
    }
  })()
  return backend
}
