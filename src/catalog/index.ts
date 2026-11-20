/**
 * The catalogue as the app reads it. Pages never read the authored files or
 * the generated JSON directly: they go through these functions, so the
 * storage behind them (static chunks today, an API tomorrow) can change in
 * one place.
 *
 * What loads when:
 * - bundled with the app: categories, styles, collections, totals
 *   (catalog-meta.json) and the interface's own icons (ui-icons.json);
 * - on demand, as separate cached chunks: the manifest (every icon's name,
 *   category, styles, popularity, date), one shard per category (full records
 *   and drawings) and the search index.
 */
import catalogMeta from './registry/generated/catalog-meta.json'
import aliasMap from './registry/generated/aliases.json'
import type { ManifestEntry, Shard, ShardIcon, StyleId } from './types'

export { CATEGORIES, CATEGORY_IDS, categoryById } from './categories'
export { COLLECTIONS, collectionById } from './collections'
export { STYLES, styleById, renderIcon, toSvgString, unpack, DEFAULT_STROKE, STROKE_RANGE } from './styles'
export { LICENSES, SOURCES } from './licenses'
export type * from './types'

export interface CatalogMeta {
  icons: number
  styles: Partial<Record<StyleId, number>>
  categories: Record<string, number>
  latestAdded: string
  generatedAt: string
}

export const catalogInfo = catalogMeta as CatalogMeta

/** Old slug → current slug, for renamed icons. */
export const resolveAlias = (slug: string): string | undefined => (aliasMap as Record<string, string>)[slug]

/* ------------------------------------------------------------ manifest */

let manifestPromise: Promise<ManifestEntry[]> | null = null
let manifestCache: ManifestEntry[] | null = null
let bySlug: Map<string, ManifestEntry> | null = null

export function loadManifest(): Promise<ManifestEntry[]> {
  manifestPromise ??= import('./registry/generated/manifest.json').then((m) => {
    manifestCache = m.default as ManifestEntry[]
    bySlug = new Map(manifestCache.map((e) => [e.slug, e]))
    return manifestCache
  })
  return manifestPromise
}

/** The manifest if it has already loaded (synchronous; null otherwise). */
export const manifestIfLoaded = () => manifestCache

export async function findEntry(slug: string): Promise<ManifestEntry | undefined> {
  await loadManifest()
  return bySlug!.get(slug)
}

/* ------------------------------------------------------------ shards */

const shardLoaders = import.meta.glob<Shard>('./registry/generated/shards/*.json', { import: 'default' })
const shardCache = new Map<string, Shard>()
const shardPromises = new Map<string, Promise<Shard>>()

export function loadShard(category: string): Promise<Shard> {
  let p = shardPromises.get(category)
  if (!p) {
    const loader = shardLoaders[`./registry/generated/shards/${category}.json`]
    p = loader
      ? loader().then((s) => {
          shardCache.set(category, s)
          return s
        })
      : Promise.resolve({})
    shardPromises.set(category, p)
  }
  return p
}

/** A shard if it has already loaded (synchronous; undefined otherwise). */
export const shardIfLoaded = (category: string) => shardCache.get(category)

/** Full record and drawing of one icon. */
export async function loadIcon(slug: string): Promise<ShardIcon | undefined> {
  const entry = await findEntry(slug)
  if (!entry) return undefined
  return (await loadShard(entry.category))[slug]
}

/** Full records of several icons, loading only the shards they live in. */
export async function loadIcons(slugs: string[]): Promise<ShardIcon[]> {
  await loadManifest()
  const entries = slugs.map((s) => bySlug!.get(s)).filter((e): e is ManifestEntry => !!e)
  const shards = await Promise.all([...new Set(entries.map((e) => e.category))].map(async (c) => [c, await loadShard(c)] as const))
  const map = new Map(shards)
  return entries.map((e) => map.get(e.category)![e.slug]).filter(Boolean)
}

/* ------------------------------------------------------------ search */

let searcherPromise: Promise<import('./search/engine').Searcher> | null = null

/** The search engine, loaded on first use (index chunk + engine). */
export function loadSearcher() {
  searcherPromise ??= Promise.all([import('./registry/generated/search-index.json'), import('./search/engine')]).then(([index, engine]) =>
    engine.createSearcher(index.default as import('./search/engine').SearchIndex),
  )
  return searcherPromise
}

/* ------------------------------------------------------------ derived lists */

export type SortKey = 'popular' | 'name' | 'newest'

export function sortEntries(list: ManifestEntry[], sort: SortKey): ManifestEntry[] {
  const out = [...list]
  if (sort === 'name') out.sort((a, b) => a.name.pt.localeCompare(b.name.pt, 'pt-BR'))
  else if (sort === 'newest') out.sort((a, b) => b.added.localeCompare(a.added) || b.popularity - a.popularity || a.slug.localeCompare(b.slug))
  else out.sort((a, b) => b.popularity - a.popularity || a.name.pt.localeCompare(b.name.pt, 'pt-BR'))
  return out
}

/**
 * Icons related to one: same family first, then the same subcategory, then
 * the same category, ranked by popularity.
 */
export function relatedEntries(icon: { slug: string; family?: string; variantOf?: string; category: string; subcategory?: string }, manifest: ManifestEntry[], limit = 16): ManifestEntry[] {
  const score = (e: ManifestEntry) => {
    if (e.slug === icon.slug) return -1
    let s = 0
    if (icon.family && e.family === icon.family) s += 100
    if (icon.variantOf && (e.slug === icon.variantOf || e.family === icon.variantOf)) s += 90
    if (e.category === icon.category) s += 10
    if (icon.subcategory && e.subcategory === icon.subcategory && e.category === icon.category) s += 20
    return s ? s + e.popularity : 0
  }
  return manifest
    .map((e) => [e, score(e)] as const)
    .filter(([, s]) => s > 0)
    .sort((a, b) => b[1] - a[1] || a[0].slug.localeCompare(b[0].slug))
    .slice(0, limit)
    .map(([e]) => e)
}
