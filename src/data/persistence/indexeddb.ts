import { dataEvents } from '../events'
import type { PersistenceDriver } from './driver'

const DB_NAME = 'glyphos'
const DB_VERSION = 1
const KV = 'kv'

function request<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error ?? new Error('Não foi possível acessar o armazenamento do navegador (IndexedDB).'))
  })
}

export function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('O IndexedDB não está disponível neste navegador.'))
      return
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(KV)) db.createObjectStore(KV)
    }
    req.onsuccess = () => {
      const db = req.result
      // A newer GLYPHOS (in another tab) needs to upgrade the database: let it,
      // and tell the person this tab stopped saving until it reloads.
      db.onversionchange = () => {
        db.close()
        dataEvents.emit('error', { message: 'O GLYPHOS foi atualizado em outra aba. Recarregue esta página para continuar salvando.' })
      }
      resolve(db)
    }
    req.onerror = () => reject(req.error ?? new Error('Não foi possível abrir o armazenamento do navegador (IndexedDB).'))
    req.onblocked = () => reject(new DatabaseBlockedError())
  })
}

/** Another tab, on an older version, keeps the database open and blocks the upgrade. */
export class DatabaseBlockedError extends Error {
  constructor() {
    super('Outra aba do GLYPHOS está impedindo a atualização do armazenamento. Feche as outras abas do GLYPHOS e recarregue esta página.')
    this.name = 'DatabaseBlockedError'
  }
}

function storeApi(db: IDBDatabase, name: string) {
  const tx = (mode: IDBTransactionMode) => db.transaction(name, mode).objectStore(name)
  return {
    get: <T>(key: string) => request<T | undefined>(tx('readonly').get(key)),
    set: async (key: string, value: unknown) => {
      await request(tx('readwrite').put(value, key))
    },
    delete: async (key: string) => {
      await request(tx('readwrite').delete(key))
    },
    keys: async () => (await request(tx('readonly').getAllKeys())).map(String),
  }
}

export function createIndexedDbDriver(db: IDBDatabase): PersistenceDriver {
  const kv = storeApi(db, KV)
  return { name: 'indexeddb', ...kv, get: kv.get }
}

