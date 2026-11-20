import { createPersistentStore, useStoreSelector } from '../store'
import type { SlugEntry } from '../types'
import { cleanSlugEntries } from '../validate'

const MAX = 60

export const historyStore = createPersistentStore<SlugEntry[]>({
  key: 'history',
  version: 1,
  initial: () => [],
  migrate: (data) => cleanSlugEntries(data, MAX),
})

/** Records that an icon page was opened (most recent first, no repeats). */
export function recordView(slug: string) {
  historyStore.set((list) => {
    if (list[0]?.slug === slug) return list
    return [{ slug, at: new Date().toISOString() }, ...list.filter((e) => e.slug !== slug)].slice(0, MAX)
  })
}

export function clearHistory() {
  historyStore.set([])
}

export const useHistory = () => useStoreSelector(historyStore, (list) => list)
