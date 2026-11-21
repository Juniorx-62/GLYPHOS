import { Link, createFileRoute, notFound } from '@tanstack/react-router'
import { collectionById, loadIcons, loadManifest } from '~/catalog'
import type { ManifestEntry } from '~/catalog/types'
import { useSettings } from '~/data/stores/settings'
import { UiIcon } from '~/components/icons/UiIcon'
import { Button } from '~/components/ui/primitives'
import { toast } from '~/components/ui/toast'
import { createCollection } from '~/data/stores/collections'
import { StaticIconGrid } from '~/features/exploration/IconGrid'
import { breadcrumbLd, clip, collectionLd, pageHead } from '~/lib/seo'
import { plural } from '~/lib/utils'

export const Route = createFileRoute('/collections/$collectionId')({
  loader: async ({ params }) => {
    const collection = collectionById(params.collectionId)
    if (!collection) throw notFound()
    const manifest = await loadManifest()
    const bySlug = new Map(manifest.map((e) => [e.slug, e]))
    const entries = collection.icons.map((s) => bySlug.get(s)).filter((e): e is ManifestEntry => !!e)
    const icons = Object.fromEntries((await loadIcons(entries.map((e) => e.slug))).map((i) => [i.slug, i]))
    return { id: collection.id, entries, icons }
  },
  head: ({ loaderData }) => {
    if (!loaderData) return {}
    const c = collectionById(loaderData.id)!
    const path = `/collections/${c.id}`
    return pageHead({
      title: `${c.name}: ${loaderData.entries.length} ícones SVG · GLYPHOS`,
      description: clip(`${c.description} ${loaderData.entries.length} ícones prontos para copiar em SVG, JSX ou CSS.`),
      path,
      jsonLd: [
        collectionLd({ name: c.name, description: c.description, path, items: loaderData.entries.map((e) => ({ name: e.name.pt, path: `/icons/${e.slug}` })) }),
        breadcrumbLd([
          { name: 'Coleções', path: '/collections' },
          { name: c.name, path },
        ]),
      ],
    })
  },
  component: CollectionPage,
})

function CollectionPage() {
  const { id, entries, icons } = Route.useLoaderData()
  const collection = collectionById(id)!
  const settings = useSettings()
  return (
    <div className="mx-auto max-w-[1440px] px-4 pt-6 sm:px-6">
      <nav aria-label="Trilha" className="flex items-center gap-1.5 text-sm text-fg-subtle">
        <Link to="/collections" className="hover:text-fg">
          Coleções
        </Link>
        <UiIcon name="chevron-right" size={14} />
        <span aria-current="page" className="text-fg-muted">
          {collection.name}
        </span>
      </nav>
      <header className="mt-5 flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-2xl">
          <h1 className="text-2xl font-semibold tracking-tight text-fg">{collection.name}</h1>
          <p className="mt-2 text-base text-fg-muted">{collection.description}</p>
          <p className="mt-2 text-sm text-fg-subtle">{plural(entries.length, 'ícone', 'ícones')}</p>
        </div>
        <Button
          icon="bookmark"
          onClick={() => {
            createCollection(collection.name, entries.map((e) => e.slug))
            toast(`"${collection.name}" copiada para a sua biblioteca`)
          }}
        >
          Copiar para minha biblioteca
        </Button>
      </header>
      <div className="mt-8">
        <StaticIconGrid entries={entries} icons={icons} options={{ appearance: settings.appearance, showNames: true, density: settings.gridDensity }} label={collection.name} />
      </div>
    </div>
  )
}
