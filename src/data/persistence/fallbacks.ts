import type { PersistenceDriver } from './driver'

const PREFIX = 'glyphos:'

export function createLocalStorageDriver(storage: Storage): PersistenceDriver {
  return {
    name: 'localstorage',
    async get<T>(key: string) {
      const raw = storage.getItem(PREFIX + key)
      return raw == null ? undefined : (JSON.parse(raw) as T)
    },
    async set(key, value) {
      storage.setItem(PREFIX + key, JSON.stringify(value))
    },
    async delete(key) {
      storage.removeItem(PREFIX + key)
    },
    async keys() {
      return Object.keys(storage)
        .filter((k) => k.startsWith(PREFIX))
        .map((k) => k.slice(PREFIX.length))
    },
  }
}

export function createMemoryDriver(): PersistenceDriver {
  const map = new Map<string, unknown>()
  return {
    name: 'memory',
    async get<T>(key: string) {
      return structuredClone(map.get(key)) as T | undefined
    },
    async set(key, value) {
      map.set(key, structuredClone(value))
    },
    async delete(key) {
      map.delete(key)
    },
    async keys() {
      return [...map.keys()]
    },
  }
}

