import { Link, createFileRoute } from '@tanstack/react-router'
import { CATEGORIES, catalogInfo, loadIcons } from '~/catalog'
import type { ShardIcon } from '~/catalog/types'
import { Glyph } from '~/components/icons/Glyph'
import { breadcrumbLd, collectionLd, pageHead } from '~/lib/seo'
import { formatNumber, plural } from '~/lib/utils'

export const Route = createFileRoute('/categories/')({
  loader: async () => {
    const symbols = await loadIcons(CATEGORIES.map((c) => c.symbol))
    return { symbols: Object.fromEntries(symbols.map((s) => [s.slug, s])) as Record<string, ShardIcon> }
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
  const { symbols } = Route.useLoaderData()
  return (
    <div className="mx-auto max-w-[1440px] px-4 pt-10 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight text-fg">Categorias</h1>
      <p className="mt-2 max-w-2xl text-base text-fg-muted">
        A biblioteca organizada pelo que cada ícone desenha. Cada ícone mora em uma categoria; a busca encontra todos por sinônimos e tags, em português e em inglês.
      </p>
      <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {CATEGORIES.map((c) => {
          const symbol = symbols[c.symbol]
          const count = catalogInfo.categories[c.id] ?? 0
          return (
            <li key={c.id}>
              <Link
                to="/categories/$categoryId"
                params={{ categoryId: c.id }}
                className="group flex h-full gap-4 rounded-xl border border-border bg-surface p-5 transition-colors hover:border-border-strong"
              >
                <span className="grid size-12 shrink-0 place-items-center rounded-lg bg-muted text-fg transition-colors group-hover:bg-fg group-hover:text-background">
                  {symbol ? <Glyph nodes={symbol.nodes} size={24} /> : null}
                </span>
                <span className="min-w-0">
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="font-medium text-fg">{c.name.pt}</span>
                    <span className="inscription shrink-0 text-fg-subtle">{plural(count, 'ícone', 'ícones')}</span>
                  </span>
                  <span className="mt-1 line-clamp-2 block text-sm text-fg-muted">{c.description}</span>
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
