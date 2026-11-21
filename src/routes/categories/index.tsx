import { Link, createFileRoute } from '@tanstack/react-router'
import { CATEGORIES, catalogInfo, loadIcons, loadManifest, sortEntries } from '~/catalog'
import type { ShardIcon } from '~/catalog/types'
import { Glyph } from '~/components/icons/Glyph'
import { breadcrumbLd, collectionLd, pageHead } from '~/lib/seo'
import { formatNumber, plural } from '~/lib/utils'

export const Route = createFileRoute('/categories/')({
  loader: async () => {
    const manifest = await loadManifest()
    const byCategory: Record<string, string[]> = {}
    for (const c of CATEGORIES) byCategory[c.id] = sortEntries(manifest.filter((e) => e.category === c.id), 'popular').slice(0, 12).map((e) => e.slug)
    const icons = await loadIcons(Object.values(byCategory).flat())
    return { byCategory, icons: Object.fromEntries(icons.map((s) => [s.slug, s])) as Record<string, ShardIcon> }
  },
  head: () =>
    pageHead({
      title: 'Categorias de ícones · GLYPHOS',
      description: `Os ${formatNumber(catalogInfo.icons)} ícones do GLYPHOS organizados em ${CATEGORIES.length} categorias: interface, setas, arquivos, comércio, finanças, saúde, clima, transporte e muito mais.`,
      path: '/categories',
      jsonLd: [
        collectionLd({
          name: 'Categorias de ícones',
          description: 'Todas as categorias da biblioteca GLYPHOS.',
          path: '/categories',
          items: CATEGORIES.map((c) => ({ name: c.name.pt, path: `/categories/${c.id}` })),
        }),
        breadcrumbLd([{ name: 'Categorias', path: '/categories' }]),
      ],
    }),
  component: CategoriesPage,
})

function CategoriesPage() {
  const { byCategory, icons } = Route.useLoaderData()
  return (
    <div className="mx-auto max-w-[1440px] px-4 pt-12 sm:px-6">
      <div className="grid gap-4 lg:grid-cols-2 lg:gap-16">
        <h1 className="text-2xl font-medium text-fg sm:text-3xl">Categorias</h1>
        <p className="max-w-xl text-base text-fg-muted lg:pt-2">
          A biblioteca organizada pelo que cada ícone desenha. Cada ícone mora em uma categoria; a busca encontra todos por sinônimos e tags, em português e em inglês.
        </p>
      </div>
      <ul className="mt-12 divide-y divide-border border-y border-border">
        {CATEGORIES.map((c) => {
          const count = catalogInfo.categories[c.id] ?? 0
          return (
            <li key={c.id}>
              <Link to="/categories/$categoryId" params={{ categoryId: c.id }} className="group grid gap-x-12 gap-y-3 py-5 md:grid-cols-[minmax(0,22rem)_1fr] md:items-center">
                <span className="min-w-0">
                  <span className="flex items-baseline gap-3">
                    <span className="font-medium text-fg group-hover:underline group-hover:decoration-accent group-hover:underline-offset-4">{c.name.pt}</span>
                    <span className="inscription text-fg-subtle">{plural(count, 'ícone', 'ícones')}</span>
                  </span>
                  <span className="mt-1 line-clamp-2 block text-sm text-fg-muted">{c.description}</span>
                </span>
                <span className="flex min-w-0 gap-4 overflow-hidden text-fg-muted transition-colors duration-base group-hover:text-fg [mask-image:linear-gradient(to_right,black_85%,transparent)]">
                  {(byCategory[c.id] ?? []).map((slug) => (icons[slug] ? <Glyph key={slug} nodes={icons[slug].nodes} size={22} /> : null))}
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
