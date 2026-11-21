import { Link, createFileRoute, notFound } from '@tanstack/react-router'
import { CATEGORIES, categoryById, loadManifest, loadShard, sortEntries } from '~/catalog'
import { useSettings } from '~/data/stores/settings'
import { UiIcon } from '~/components/icons/UiIcon'
import { Button } from '~/components/ui/primitives'
import { StaticIconGrid } from '~/features/exploration/IconGrid'
import { breadcrumbLd, clip, collectionLd, pageHead } from '~/lib/seo'
import { plural } from '~/lib/utils'

export const Route = createFileRoute('/categories/$categoryId')({
  loader: async ({ params }) => {
    const category = categoryById(params.categoryId)
    if (!category) throw notFound()
    const [manifest, shard] = await Promise.all([loadManifest(), loadShard(category.id)])
    const entries = sortEntries(
      manifest.filter((e) => e.category === category.id),
      'name',
    )
    return { categoryId: category.id, entries, icons: shard }
  },
  head: ({ loaderData }) => {
    if (!loaderData) return {}
    const category = categoryById(loaderData.categoryId)!
    const path = `/categories/${category.id}`
    const examples = loaderData.entries
      .slice()
      .sort((a, b) => b.popularity - a.popularity)
      .slice(0, 6)
      .map((e) => e.name.pt.toLowerCase())
    return pageHead({
      title: `Ícones de ${category.name.pt.toLowerCase()} · ${loaderData.entries.length} SVGs · GLYPHOS`,
      description: clip(`${loaderData.entries.length} ícones SVG de ${category.name.pt.toLowerCase()}: ${examples.join(', ')} e outros. ${category.description}`),
      path,
      jsonLd: [
        collectionLd({
          name: `Ícones de ${category.name.pt}`,
          description: category.description,
          path,
          items: loaderData.entries.map((e) => ({ name: e.name.pt, path: `/icons/${e.slug}` })),
        }),
        breadcrumbLd([
          { name: 'Categorias', path: '/categories' },
          { name: category.name.pt, path },
        ]),
      ],
    })
  },
  component: CategoryPage,
})

function CategoryPage() {
  const { categoryId, entries, icons } = Route.useLoaderData()
  const category = categoryById(categoryId)!
  const settings = useSettings()
  const groups = [
    ...category.subcategories.map((s) => ({ id: s.id, name: s.name.pt, entries: entries.filter((e) => e.subcategory === s.id) })),
    { id: 'other', name: 'Outros', entries: entries.filter((e) => !e.subcategory || !category.subcategories.some((s) => s.id === e.subcategory)) },
  ].filter((g) => g.entries.length)
  const index = CATEGORIES.findIndex((c) => c.id === category.id)
  const prev = CATEGORIES[index - 1]
  const next = CATEGORIES[index + 1]
  const options = { appearance: settings.appearance, showNames: true, density: settings.gridDensity }

  return (
    <div className="mx-auto max-w-[1440px] px-4 pt-6 sm:px-6">
      <nav aria-label="Trilha" className="flex items-center gap-1.5 text-sm text-fg-subtle">
        <Link to="/categories" className="hover:text-fg">
          Categorias
        </Link>
        <UiIcon name="chevron-right" size={14} />
        <span aria-current="page" className="text-fg-muted">
          {category.name.pt}
        </span>
      </nav>
      <header className="mt-5 flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-2xl">
          <h1 className="text-2xl font-medium text-fg sm:text-3xl">Ícones de {category.name.pt.toLowerCase()}</h1>
          <p className="mt-2 text-base text-fg-muted">{category.description}</p>
          <p className="mt-2 text-sm text-fg-subtle">
            {plural(entries.length, 'ícone', 'ícones')} · {category.name.en}
          </p>
        </div>
        <Link to="/icons" search={{ category: category.id }}>
          <Button icon="sliders">Explorar com filtros</Button>
        </Link>
      </header>

      {groups.length > 1 && (
        <nav aria-label="Subcategorias" className="mt-6 flex flex-wrap gap-1.5">
          {groups.map((g) => (
            <a key={g.id} href={`#${g.id}`} className="rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-fg-muted hover:border-border-strong hover:text-fg">
              {g.name} <span className="text-fg-subtle">{g.entries.length}</span>
            </a>
          ))}
        </nav>
      )}

      {groups.map((g) => (
        <section key={g.id} id={g.id} aria-labelledby={`${g.id}-title`} className="mt-10 scroll-mt-20">
          <h2 id={`${g.id}-title`} className="mb-3 text-md font-medium text-fg">
            {g.name} <span className="text-sm font-normal text-fg-subtle">{g.entries.length}</span>
          </h2>
          <StaticIconGrid entries={g.entries} icons={icons} options={options} label={`${category.name.pt}: ${g.name}`} />
        </section>
      ))}

      <nav aria-label="Outras categorias" className="mt-16 flex justify-between gap-4 border-t border-border pt-6 text-sm">
        {prev ? (
          <Link to="/categories/$categoryId" params={{ categoryId: prev.id }} className="flex items-center gap-2 text-fg-muted hover:text-fg">
            <UiIcon name="arrow-left" size={16} /> {prev.name.pt}
          </Link>
        ) : (
          <span />
        )}
        {next && (
          <Link to="/categories/$categoryId" params={{ categoryId: next.id }} className="flex items-center gap-2 text-fg-muted hover:text-fg">
            {next.name.pt} <UiIcon name="arrow-right" size={16} />
          </Link>
        )}
      </nav>
    </div>
  )
}
