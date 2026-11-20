import { createPersistentStore, useStoreSelector } from '../store'
import type { SlugEntry } from '../types'
import { cleanSlugEntries } from '../validate'

const MAX = 2000

export const favoritesStore = createPersistentStore<SlugEntry[]>({
  key: 'favorites',
  version: 1,
  initial: () => [],
  migrate: (data) => cleanSlugEntries(data, MAX),
})

export function toggleFavorite(slug: string) {
  favoritesStore.set((list) =>
    list.some((e) => e.slug === slug) ? list.filter((e) => e.slug !== slug) : [{ slug, at: new Date().toISOString() }, ...list].slice(0, MAX),
  )
}

export function clearFavorites() {
  favoritesStore.set([])
}

export const useFavorites = () => useStoreSelector(favoritesStore, (list) => list)
export const useIsFavorite = (slug: string) => useStoreSelector(favoritesStore, (list) => list.some((e) => e.slug === slug), [slug])
