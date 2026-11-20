import { createPersistentStore, useStoreSelector } from '../store'
import type { PersonalCollection } from '../types'
import { isIso, isRecord, isSlug } from '../validate'

const MAX_COLLECTIONS = 200
const MAX_ICONS = 1000

function clean(data: unknown): PersonalCollection[] | undefined {
  if (!Array.isArray(data)) return undefined
  const out: PersonalCollection[] = []
  for (const c of data) {
    if (!isRecord(c) || typeof c.id !== 'string' || !/^[a-z0-9-]{1,40}$/.test(c.id)) continue
    if (typeof c.name !== 'string' || !c.name.trim() || !Array.isArray(c.icons)) continue
    out.push({
      id: c.id,
      name: c.name.trim().slice(0, 80),
      icons: [...new Set(c.icons.filter(isSlug))].slice(0, MAX_ICONS),
      createdAt: isIso(c.createdAt) ? c.createdAt : new Date().toISOString(),
      updatedAt: isIso(c.updatedAt) ? c.updatedAt : new Date().toISOString(),
    })
    if (out.length >= MAX_COLLECTIONS) break
  }
  return out
}

export const collectionsStore = createPersistentStore<PersonalCollection[]>({
  key: 'collections',
  version: 1,
  initial: () => [],
  migrate: (data) => clean(data),
})

const newId = () => Math.random().toString(36).slice(2, 10)

export function createCollection(name: string, icons: string[] = []): string {
  const id = newId()
  const now = new Date().toISOString()
  const title = name.trim().slice(0, 80) || 'Nova coleção'
  collectionsStore.set((list) => [{ id, name: title, icons: [...new Set(icons)], createdAt: now, updatedAt: now }, ...list].slice(0, MAX_COLLECTIONS))
  return id
}

export function renameCollection(id: string, name: string) {
  const title = name.trim().slice(0, 80)
  if (!title) return
  collectionsStore.set((list) => list.map((c) => (c.id === id ? { ...c, name: title, updatedAt: new Date().toISOString() } : c)))
}

export function deleteCollection(id: string) {
  collectionsStore.set((list) => list.filter((c) => c.id !== id))
}

export function toggleInCollection(id: string, slug: string) {
  collectionsStore.set((list) =>
    list.map((c) =>
      c.id !== id
        ? c
        : {
            ...c,
            icons: c.icons.includes(slug) ? c.icons.filter((s) => s !== slug) : [...c.icons, slug].slice(0, MAX_ICONS),
            updatedAt: new Date().toISOString(),
          },
    ),
  )
}

export const useCollections = () => useStoreSelector(collectionsStore, (list) => list)
