import { createFileRoute } from '@tanstack/react-router'
import { CATEGORY_IDS, STYLES, catalogInfo, loadIcons, loadManifest, loadSearcher, type SortKey } from '~/catalog'
import type { StyleId } from '~/catalog/types'
import { Explorer, type ExploreInitial, type ExploreSearch } from '~/features/exploration/Explorer'
import { queryIcons } from '~/features/exploration/query'
import { pageHead } from '~/lib/seo'
import { formatNumber } from '~/lib/utils'

const SORTS: SortKey[] = ['popular', 'name', 'newest']

export const Route = createFileRoute('/icons/')({
  validateSearch: (raw: Record<string, unknown>): ExploreSearch => ({
    q: typeof raw.q === 'string' && raw.q.trim() ? raw.q.slice(0, 100) : undefined,
    category: typeof raw.category === 'string' && CATEGORY_IDS.includes(raw.category) ? raw.category : undefined,
    style: typeof raw.style === 'string' && STYLES.some((s) => s.id === raw.style) ? (raw.style as StyleId) : undefined,
    sort: typeof raw.sort === 'string' && SORTS.includes(raw.sort as SortKey) ? (raw.sort as SortKey) : undefined,
    icon: typeof raw.icon === 'string' && /^[a-z0-9-]{1,80}$/.test(raw.icon) ? raw.icon : undefined,
  }),
  loaderDeps: ({ search }) => ({ q: search.q, category: search.category, style: search.style, sort: search.sort }),
  /**
   * On the server, the first rows are rendered with their drawings (fast first
   * paint, no layout shift). In the browser the page computes the list itself,
   * so typing never waits for a loader; here it only starts the manifest download.
   */
  loader: async ({ deps }): Promise<{ initial: ExploreInitial | null }> => {
    if (typeof window !== 'undefined') {
      void loadManifest()
      return { initial: null }
    }
    const manifest = await loadManifest()
    const searcher = deps.q ? await loadSearcher() : null
    const { entries } = queryIcons(manifest, searcher, deps)
    const first = entries.slice(0, 48)
    const icons = await loadIcons(first.map((e) => e.slug))
    return { initial: { total: entries.length, entries: first, icons: Object.fromEntries(icons.map((i) => [i.slug, i])) } }
  },
  head: ({ match }) => {
    const s = match.search
    const indexable = !s.q && !s.style && !s.sort && !s.icon && !s.category
    return pageHead({
      title: s.q ? `"${s.q}" · ícones · GLYPHOS` : 'Explorar ícones · GLYPHOS',
      description: `Explore ${formatNumber(catalogInfo.icons)} ícones SVG originais em Contorno, Sólido e Duotone. Busque em português ou inglês, filtre por categoria e copie em SVG, JSX ou CSS.`,
      path: '/icons',
      // Filtered views repeat the category pages: only the plain list is indexed.
      noindex: !indexable,
    })
  },
  component: ExplorePage,
})

function ExplorePage() {
  const search = Route.useSearch()
  const { initial } = Route.useLoaderData()
  return <Explorer search={search} initial={initial} />
}
