/**
 * Search state for any component: loads the manifest and the index on first
 * use, runs queries without blocking typing (useDeferredValue) and returns
 * manifest entries in rank order.
 */
import { useDeferredValue, useEffect, useMemo, useState } from 'react'
import { loadManifest, loadSearcher, manifestIfLoaded } from '~/catalog'
import type { ManifestEntry } from '~/catalog/types'
import type { Searcher } from '~/catalog/search/engine'

export function useSearchEngine(enabled = true) {
  const [searcher, setSearcher] = useState<Searcher | null>(null)
  const [manifest, setManifest] = useState<ManifestEntry[] | null>(() => manifestIfLoaded())
  const [error, setError] = useState(false)
  useEffect(() => {
    if (!enabled) return
    let alive = true
    Promise.all([loadSearcher(), loadManifest()])
      .then(([s, m]) => {
        if (!alive) return
        setSearcher(() => s)
        setManifest(m)
      })
      .catch(() => alive && setError(true))
    return () => {
      alive = false
    }
  }, [enabled])
  return { searcher, manifest, ready: !!searcher && !!manifest, error }
}

export interface SearchOutcome {
  entries: ManifestEntry[]
  partial: boolean
  unmatched: string[]
  /** True while the latest keystroke is still being processed. */
  stale: boolean
}

export function useIconSearch(query: string, { enabled = true, limit }: { enabled?: boolean; limit?: number } = {}) {
  const engine = useSearchEngine(enabled)
  const deferred = useDeferredValue(query)
  const outcome = useMemo<Omit<SearchOutcome, 'stale'> | null>(() => {
    if (!engine.ready || !deferred.trim()) return null
    const result = engine.searcher!.search(deferred, { limit })
    const byIndex = engine.manifest!
    // The index and the manifest share the same order.
    return { entries: result.hits.map((h) => byIndex[h.index]).filter(Boolean), partial: result.partial, unmatched: result.unmatched }
  }, [engine.ready, engine.searcher, engine.manifest, deferred, limit])
  return { ...engine, outcome: outcome ? { ...outcome, stale: deferred !== query } : null }
}
