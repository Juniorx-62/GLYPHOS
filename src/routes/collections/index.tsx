import { Link, createFileRoute } from '@tanstack/react-router'
import { COLLECTIONS, loadIcons } from '~/catalog'
import type { ShardIcon } from '~/catalog/types'
import { Glyph } from '~/components/icons/Glyph'
import { EmptyState } from '~/components/ui/primitives'
import { breadcrumbLd, collectionLd, pageHead } from '~/lib/seo'
import { plural } from '~/lib/utils'

export const Route = createFileRoute('/collections/')({
  loader: async () => {
    const covers = await loadIcons(COLLECTIONS.flatMap((c) => c.icons.slice(0, 12)))
    return { icons: Object.fromEntries(covers.map((i) => [i.slug, i])) as Record<string, ShardIcon> }
  },
  head: () =>
    pageHead({
      title: 'Coleções temáticas de ícones · GLYPHOS',
      description: 'Conjuntos de ícones prontos para um tipo de produto: loja virtual, painel de dados, aplicativo de clima, viagem, saúde, ferramentas de desenvolvimento e outros.',
      path: '/collections',
      jsonLd: [
        collectionLd({
          name: 'Coleções temáticas',
          description: 'Conjuntos de ícones por tipo de produto.',
          path: '/collections',
          items: COLLECTIONS.map((c) => ({ name: c.name, path: `/collections/${c.id}` })),
        }),
        breadcrumbLd([{ name: 'Coleções', path: '/collections' }]),
      ],
    }),
  component: CollectionsPage,
})

function CollectionsPage() {
  const { icons } = Route.useLoaderData()
  return (
    <div className="mx-auto max-w-[1440px] px-4 pt-12 sm:px-6">
      <h1 className="text-2xl font-medium text-fg sm:text-3xl">Coleções</h1>
      <p className="mt-2 max-w-2xl text-base text-fg-muted">
        Conjuntos escolhidos para um tipo de produto: o que uma loja, um painel ou um aplicativo de clima costuma precisar. Para montar as suas, use os favoritos e as coleções da{' '}
        <Link to="/library" className="text-fg underline underline-offset-2">
          sua biblioteca
        </Link>
        .
      </p>
      {COLLECTIONS.length ? (
        <ul className="mt-12 grid gap-x-16 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
          {COLLECTIONS.map((c) => (
            <li key={c.id}>
              <Link to="/collections/$collectionId" params={{ collectionId: c.id }} className="group block">
                <span className="grid grid-cols-6 gap-y-4 text-fg">
                  {c.icons.slice(0, 12).map((slug) => (
                    <span key={slug} className="grid place-items-start">
                      {icons[slug] ? <Glyph nodes={icons[slug].nodes} size={22} /> : null}
                    </span>
                  ))}
                </span>
                <span className="mt-5 flex items-baseline gap-3">
                  <span className="font-medium text-fg group-hover:underline group-hover:decoration-accent group-hover:underline-offset-4">{c.name}</span>
                  <span className="inscription text-fg-subtle">{plural(c.icons.length, 'ícone', 'ícones')}</span>
                </span>
                <span className="mt-1 line-clamp-2 block text-sm text-fg-muted">{c.description}</span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-8">
          <EmptyState icon="bookmark" title="Nenhuma coleção publicada ainda" />
        </div>
      )}
    </div>
  )
}
