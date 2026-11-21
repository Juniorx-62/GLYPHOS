/**
 * Backup of the visitor's data as one JSON file: favourites, history,
 * personal collections, own creations and settings. Restoring checks the whole file first
 * (every store through its own migrate); if any part is invalid, nothing
 * changes.
 */
import { allStores, type PersistentStore } from './store'
import { collectionsStore } from './stores/collections'
import { creationsStore } from './stores/creations'
import { favoritesStore } from './stores/favorites'
import { historyStore } from './stores/history'
import { THEME_STORAGE_KEY, settingsStore } from './stores/settings'
import { isRecord } from './validate'

export const BACKUP_APP = 'glyphos'
export const BACKUP_VERSION = 1

const STORES = [favoritesStore, historyStore, collectionsStore, creationsStore, settingsStore] as unknown as PersistentStore<unknown>[]

export interface BackupFile {
  app: typeof BACKUP_APP
  version: number
  exportedAt: string
  stores: Record<string, { v: number; data: unknown }>
}

export async function createBackup(): Promise<BackupFile> {
  const stores: BackupFile['stores'] = {}
  for (const store of STORES) stores[store.key] = { v: store.version, data: await store.ready() }
  return { app: BACKUP_APP, version: BACKUP_VERSION, exportedAt: new Date().toISOString(), stores }
}

export type RestoreResult = { ok: true; restored: string[] } | { ok: false; reason: string }

/** Validates the whole file, then applies it. Never applies part of a damaged file. */
export async function restoreBackup(raw: unknown): Promise<RestoreResult> {
  if (!isRecord(raw) || raw.app !== BACKUP_APP) return { ok: false, reason: 'O arquivo não é uma cópia de segurança do GLYPHOS.' }
  if (typeof raw.version !== 'number' || raw.version > BACKUP_VERSION) {
    return { ok: false, reason: 'A cópia é de uma versão mais nova do GLYPHOS. Atualize a página e tente de novo.' }
  }
  if (!isRecord(raw.stores)) return { ok: false, reason: 'O arquivo não traz nenhum dado.' }
  const accepted: Array<[PersistentStore<unknown>, unknown]> = []
  for (const [key, entry] of Object.entries(raw.stores)) {
    const store = STORES.find((s) => s.key === key)
    if (!store) continue
    const value = isRecord(entry) && typeof entry.v === 'number' ? store.accept(entry.data, entry.v) : undefined
    if (value === undefined) return { ok: false, reason: `A parte "${key}" do arquivo está danificada. Nada foi alterado.` }
    accepted.push([store, value])
  }
  if (!accepted.length) return { ok: false, reason: 'O arquivo não traz nenhum dado reconhecido.' }
  for (const [store, value] of accepted) store.set(value)
  await Promise.all(accepted.map(([store]) => store.flush()))
  const settings = accepted.find(([s]) => s === (settingsStore as unknown))?.[1] as { theme?: string } | undefined
  if (settings?.theme) {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, settings.theme)
    } catch {
      /* ignore */
    }
  }
  return { ok: true, restored: accepted.map(([s]) => s.key) }
}

/** Erases favourites, history, collections and settings in this browser. */
export async function clearAllData() {
  for (const store of allStores()) store.reset()
  await Promise.all(allStores().map((s) => s.flush()))
  try {
    localStorage.removeItem(THEME_STORAGE_KEY)
  } catch {
    /* ignore */
  }
}
