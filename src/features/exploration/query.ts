/**
 * The explore page's list: search, category and style filters, then sorting.
 * Shared by the route loader (server render of the first rows) and the page.
 */
import { sortEntries, type SortKey } from '~/catalog'
import type { Searcher } from '~/catalog/search/engine'
import type { ManifestEntry, StyleId } from '~/catalog/types'

export interface ExploreParams {
  q?: string
  category?: string
  style?: StyleId
  sort?: SortKey
}

export interface ExploreResult {
  entries: ManifestEntry[]
  partial: boolean
}

export function queryIcons(manifest: ManifestEntry[], searcher: Searcher | null, params: ExploreParams): ExploreResult {
  let entries = manifest
  let partial = false
  const q = params.q?.trim()
  if (q && searcher) {
    const result = searcher.search(q)
    partial = result.partial
    entries = result.hits.map((h) => manifest[h.index]).filter(Boolean)
  }
  if (params.category) entries = entries.filter((e) => e.category === params.category)
  if (params.style && params.style !== 'outline') entries = entries.filter((e) => e.styles.includes(params.style!))
  // With a query, relevance is the default order; an explicit sort replaces it.
  if (!q || (params.sort && params.sort !== 'popular')) entries = sortEntries(entries, params.sort ?? 'popular')
  return { entries, partial }
}

export const SORT_LABEL: Record<SortKey, string> = { popular: 'Populares', name: 'A–Z', newest: 'Novidades' }
