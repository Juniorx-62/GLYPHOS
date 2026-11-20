import { useMemo, useSyncExternalStore } from 'react'
import { dataEvents } from './events'
import { getBackend } from './persistence'

export type StoreStatus = 'loading' | 'ready' | 'error'

export interface StoreSnapshot<T> {
  status: StoreStatus
  data: T
}

interface Envelope<T> {
  v: number
  data: T
  updatedAt: string
}

export interface PersistentStore<T> {
  readonly key: string
  /** Version of the persisted shape (see StoreOptions.version). */
  readonly version: number
  getSnapshot(): StoreSnapshot<T>
  getServerSnapshot(): StoreSnapshot<T>
  subscribe(listener: () => void): () => void
  /** Update state; persisted after a short debounce. */
  set(updater: T | ((prev: T) => T)): void
  /** Resolves once the persisted value has been loaded. */
  ready(): Promise<T>
  /** Replace state with the initial value and persist it. */
  reset(): void
  /** Reload from the backend (used by cross-tab sync and imports). */
  reload(): Promise<void>
  /** Saves now whatever is still waiting for the debounce. */
  flush(): Promise<void>
  /**
   * Reads a value that came from outside (a backup file) the way a persisted
   * one is read: through `migrate`. Undefined when it is not valid.
   */
  accept(data: unknown, fromVersion: number): T | undefined
}

export interface StoreOptions<T> {
  key: string
  version: number
  initial: () => T
  /** Upgrade or sanitise a persisted value. Return undefined to discard it. */
  migrate?: (data: unknown, fromVersion: number) => T | undefined
}

const SAVE_DELAY = 120
const isBrowser = typeof window !== 'undefined'
const channel: BroadcastChannel | null = isBrowser && 'BroadcastChannel' in window ? new BroadcastChannel('glyphos-sync') : null
const registry = new Map<string, PersistentStore<unknown>>()

if (channel) {
  channel.onmessage = (event: MessageEvent<{ key: string }>) => {
    void registry.get(event.data?.key)?.reload()
  }
}

/** Closing or hiding the page saves what is still waiting for the debounce. */
if (isBrowser && typeof addEventListener === 'function' && typeof document !== 'undefined') {
  const flushAll = () => registry.forEach((store) => void store.flush())
  addEventListener('pagehide', flushAll)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushAll()
  })
}

export function createPersistentStore<T>(options: StoreOptions<T>): PersistentStore<T> {
  const { key, version, initial, migrate } = options
  const serverSnapshot: StoreSnapshot<T> = { status: 'loading', data: initial() }
  let snapshot: StoreSnapshot<T> = serverSnapshot
  const listeners = new Set<() => void>()
  let loading: Promise<T> | null = null
  let saveTimer: ReturnType<typeof setTimeout> | null = null
  /**
   * Writes not saved yet, in order. Whenever the saved value is read (the
   * first load, or a reload after another tab saved), they are replayed on top
   * of it: an early write (a view recorded on mount, a backup restored into a
   * store nothing has opened yet) and a write still waiting for the debounce
   * add to what was saved instead of replacing it.
   */
  let unsaved: Array<(prev: T) => T> = []

  const emit = () => listeners.forEach((l) => l())

  const decode = (raw: unknown): T | undefined => {
    if (raw == null) return undefined
    const env = raw as Partial<Envelope<unknown>>
    if (typeof env !== 'object' || !('data' in env)) return undefined
    if (env.v === version && !migrate) return env.data as T
    return migrate ? migrate(env.data, env.v ?? 0) : undefined
  }

  const load = async (): Promise<T> => {
    try {
      const { driver } = await getBackend()
      const stored = decode(await driver.get<Envelope<unknown>>(key))
      const writes = unsaved.length
      const data = unsaved.reduce((acc, write) => write(acc), stored ?? initial())
      snapshot = { status: 'ready', data }
      if (writes) schedulePersist()
      emit()
      return data
    } catch (cause) {
      snapshot = { status: 'error', data: snapshot.data }
      emit()
      dataEvents.emit('error', { message: `Não foi possível carregar os dados salvos neste navegador (${key}). Recarregue a página para tentar de novo.`, cause })
      return snapshot.data
    } finally {
      loading = null
    }
  }

  const startLoad = () => {
    if (!loading && isBrowser) loading = load()
    return loading
  }

  const persist = async () => {
    if (saveTimer) clearTimeout(saveTimer)
    saveTimer = null
    if (snapshot.status !== 'ready') return
    // A reload is reading what another tab saved: save after it, on top of it.
    if (loading) {
      await loading
      if (snapshot.status !== 'ready') return
    }
    const sent = unsaved.length
    try {
      const { driver } = await getBackend()
      const env: Envelope<T> = { v: version, data: snapshot.data, updatedAt: new Date().toISOString() }
      await driver.set(key, env)
      unsaved.splice(0, sent)
      channel?.postMessage({ key })
    } catch (cause) {
      const quota = cause instanceof DOMException && cause.name === 'QuotaExceededError'
      dataEvents.emit('error', {
        message: quota
          ? 'O armazenamento do navegador está cheio e a última alteração não foi salva. Exporte uma cópia de segurança e apague coleções que não usa mais.'
          : `Não foi possível salvar a última alteração (${key}). Tente de novo em instantes.`,
        cause,
      })
    }
  }

  function schedulePersist() {
    if (saveTimer) clearTimeout(saveTimer)
    saveTimer = setTimeout(() => void persist(), SAVE_DELAY)
  }

  const store: PersistentStore<T> = {
    key,
    version,
    getSnapshot: () => snapshot,
    getServerSnapshot: () => serverSnapshot,
    subscribe(listener) {
      listeners.add(listener)
      if (snapshot.status === 'loading') startLoad()
      return () => listeners.delete(listener)
    },
    set(updater) {
      const write = typeof updater === 'function' ? (updater as (p: T) => T) : () => updater
      const next = write(snapshot.data)
      if (Object.is(next, snapshot.data)) return
      if (isBrowser) unsaved.push(write)
      if (snapshot.status === 'ready') {
        snapshot = { status: 'ready', data: next }
        emit()
        schedulePersist()
        return
      }
      // Not loaded yet (or the last load failed): the write waits in `unsaved`
      // and lands on top of the saved value. Nothing may have opened this store
      // yet (a detail page records the view, a backup restore fills every
      // store), so start the load here.
      snapshot = { status: snapshot.status, data: next }
      emit()
      startLoad()
    },
    ready() {
      if (snapshot.status !== 'ready') startLoad()
      return loading ?? Promise.resolve(snapshot.data)
    },
    reset() {
      store.set(initial())
    },
    async reload() {
      // A load already running reads the latest saved value and replays the
      // unsaved writes; a second one alongside could finish first with less.
      if (loading) {
        await loading
        return
      }
      if (!isBrowser) return
      loading = load()
      await loading
    },
    async flush() {
      if (loading) await loading
      if (saveTimer || (unsaved.length && snapshot.status === 'ready')) await persist()
    },
    accept(data, fromVersion) {
      return decode({ v: fromVersion, data })
    },
  }
  registry.set(key, store as PersistentStore<unknown>)
  return store
}

/** Subscribe a component to a store. Returns the full snapshot. */
export function useStore<T>(store: PersistentStore<T>): StoreSnapshot<T> {
  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot)
}

/** Subscribe and derive. The selector re-runs only when the store changes. */
export function useStoreSelector<T, R>(store: PersistentStore<T>, selector: (data: T) => R, deps: unknown[] = []): R {
  const snap = useStore(store)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => selector(snap.data), [snap, ...deps])
}

export function allStores() {
  return [...registry.values()]
}
