import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { CATEGORIES, COLLECTIONS, catalogInfo, loadIcons, loadManifest, sortEntries } from '~/catalog'
import type { ShardIcon } from '~/catalog/types'
import { useSettings } from '~/data/stores/settings'
import { Glyph } from '~/components/icons/Glyph'
import { UiIcon } from '~/components/icons/UiIcon'
import { StaticIconGrid } from '~/features/exploration/IconGrid'
import { Anatomy, CONTEXT_SLUGS, InContext, Mosaic, SPECIMEN_SLUGS, Specimen } from '~/features/showcase/Showcase'
import { pageHead, websiteLd } from '~/lib/seo'
import { SITE_DESCRIPTION } from '~/lib/site'
import { cn, formatDate, formatNumber } from '~/lib/utils'

const SUGGESTIONS = ['carrinho de compras', 'calendário', 'nuvem', 'usuário', 'seta', 'lixeira', 'chuva', 'gráfico']
const ANATOMY_SLUGS = ['camera', 'folder', 'heart', 'lock', 'cloud', 'gift']
const SCALE_SLUGS = ['bell', 'map-pin', 'image', 'clock', 'star', 'trash', 'globe', 'wallet']
const MOSAIC_PER_CATEGORY = 16

export const Route = createFileRoute('/')({
  loader: async () => {
    const manifest = await loadManifest()
    const popular = sortEntries(manifest, 'popular').slice(0, 40)
    const latest = catalogInfo.latestAdded
    const recent = sortEntries(
      manifest.filter((e) => e.added === latest),
      'popular',
    ).slice(0, 24)
    const slugs = new Set([...popular, ...recent].map((e) => e.slug))
    const byCategory: Record<string, string[]> = {}
    for (const c of CATEGORIES) {
      const list = sortEntries(manifest.filter((e) => e.category === c.id), 'popular').slice(0, MOSAIC_PER_CATEGORY).map((e) => e.slug)
      byCategory[c.id] = list
      list.forEach((s) => slugs.add(s))
    }
    for (const s of [...SPECIMEN_SLUGS, ...ANATOMY_SLUGS, ...SCALE_SLUGS, ...CONTEXT_SLUGS]) slugs.add(s)
    for (const c of COLLECTIONS) c.icons.slice(0, 6).forEach((s) => slugs.add(s))
    const icons = Object.fromEntries((await loadIcons([...slugs])).map((i) => [i.slug, i])) as Record<string, ShardIcon>
    return { popular, recent, icons, byCategory }
  },
  head: () =>
    pageHead({
      title: 'GLYPHOS · Biblioteca de ícones SVG originais',
      description: SITE_DESCRIPTION,
      path: '/',
      jsonLd: [websiteLd(SITE_DESCRIPTION)],
    }),
  component: HomePage,
})

function HomePage() {
  const { popular, recent, icons, byCategory } = Route.useLoaderData()
  const settings = useSettings()
  const gridOptions = { appearance: settings.appearance, showNames: true, density: 'comfortable' as const }
  const [shelf, setShelf] = useState<'popular' | 'recent'>('popular')
  const shelfEntries = shelf === 'recent' && recent.length > 0 ? recent : popular

  return (
    <div>
      <Hero icons={icons} />

      {/* The library leads: a field of drawings right under the opening. */}
      <section aria-labelledby="library-title" className="bg-background-subtle">
        <div className="mx-auto max-w-[1440px] px-4 py-16 sm:px-6 lg:py-20">
          <div className="mb-8 flex flex-wrap items-baseline justify-between gap-x-8 gap-y-2">
            <h2 id="library-title" className="text-xl font-medium text-fg">
              {formatNumber(catalogInfo.icons)} desenhos em {CATEGORIES.length} categorias
            </h2>
            <Link to="/categories" className="text-sm text-fg-muted underline decoration-border-strong underline-offset-4 hover:text-fg hover:decoration-accent">
              Ver as categorias
            </Link>
          </div>
          <Mosaic icons={icons} byCategory={byCategory} />
        </div>
      </section>

      <div className="mx-auto max-w-[1440px] px-4 sm:px-6">
        <section aria-labelledby="anatomy-title" className="pt-24 lg:pt-32">
          <div className="mb-10 grid gap-4 lg:grid-cols-[1fr_1fr] lg:gap-16">
            <h2 id="anatomy-title" className="text-2xl font-medium text-fg">
              Um desenho, três estilos.
            </h2>
            <p className="max-w-xl text-base text-fg-muted lg:pt-2">
              Cada conceito é desenhado uma vez, no Contorno. Sólido e Duotone saem das formas desse desenho, então uma correção no mestre chega a todos os estilos.
            </p>
          </div>
          <Anatomy icons={icons} slugs={ANATOMY_SLUGS} scaleSlugs={SCALE_SLUGS} />
        </section>

        <section aria-labelledby="context-title" className="pt-24 lg:pt-32">
          <InContext icons={icons} />
        </section>

        <section aria-labelledby="shelf-title" className="pt-24 lg:pt-32">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 id="shelf-title" className="text-xl font-medium text-fg">
                Para começar
              </h2>
              <div className="mt-3 flex flex-wrap gap-x-5">
                {(
                  [
                    ['popular', 'Mais usados'],
                    ['recent', `Novos em ${formatDate(catalogInfo.latestAdded)}`],
                  ] as const
                )
                  .filter(([id]) => id === 'popular' || recent.length > 0)
                  .map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      aria-pressed={shelf === id}
                      onClick={() => setShelf(id)}
                      className={cn('py-1 text-sm underline-offset-[6px] transition-colors duration-fast', shelf === id ? 'text-fg underline decoration-accent' : 'text-fg-muted hover:text-fg')}
                    >
                      {label}
                    </button>
                  ))}
              </div>
            </div>
            <Link to="/icons" search={shelf === 'recent' ? { sort: 'newest' } : {}} className="text-sm text-fg-muted underline decoration-border-strong underline-offset-4 hover:text-fg hover:decoration-accent">
              Abrir a biblioteca inteira
            </Link>
          </div>
          <StaticIconGrid entries={shelfEntries} icons={icons} options={gridOptions} label={shelf === 'recent' ? 'Ícones adicionados recentemente' : 'Ícones mais usados'} />
        </section>

        {COLLECTIONS.length > 0 && (
          <section aria-labelledby="collections-title" className="grid gap-10 pt-24 lg:grid-cols-[18rem_1fr] lg:gap-16 lg:pt-32">
            <div>
              <h2 id="collections-title" className="text-xl font-medium text-fg">
                Coleções
              </h2>
              <p className="mt-2 text-sm text-fg-muted">Conjuntos prontos para um tipo de produto. Para montar os seus, use a sua biblioteca.</p>
              <Link to="/collections" className="mt-4 inline-block text-sm text-fg-muted underline decoration-border-strong underline-offset-4 hover:text-fg hover:decoration-accent">
                Todas as coleções
              </Link>
            </div>
            <ul className="grid gap-x-12 gap-y-8 sm:grid-cols-2">
              {COLLECTIONS.slice(0, 6).map((c) => (
                <li key={c.id}>
                  <Link to="/collections/$collectionId" params={{ collectionId: c.id }} className="group block">
                    <span className="flex gap-3 text-fg">
                      {c.icons.slice(0, 6).map((s) => (icons[s] ? <Glyph key={s} nodes={icons[s].nodes} size={20} /> : null))}
                    </span>
                    <span className="mt-3 block font-medium text-fg group-hover:underline group-hover:decoration-accent group-hover:underline-offset-4">{c.name}</span>
                    <span className="mt-1 line-clamp-2 block text-sm text-fg-muted">{c.description}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        <p className="mt-24 max-w-2xl text-base text-fg-muted lg:mt-32">
          Sem cadastro. Favoritos, histórico e coleções ficam neste navegador, com cópia de segurança em JSON na{' '}
          <Link to="/library" className="text-fg underline decoration-border-strong underline-offset-4 hover:decoration-accent">
            sua biblioteca
          </Link>
          . Os desenhos são livres para uso pessoal e comercial, sob a licença MIT.
        </p>
      </div>
    </div>
  )
}

function Hero({ icons }: { icons: Record<string, ShardIcon> }) {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  return (
    <section className="relative overflow-hidden">
      <div aria-hidden className="canvas-grid pointer-events-none absolute inset-0 opacity-60 [mask-image:linear-gradient(to_bottom,black,transparent_85%)]" style={{ backgroundSize: '24px 24px' }} />
      <div className="relative mx-auto grid max-w-[1440px] items-center gap-14 px-4 pt-14 pb-20 sm:px-6 lg:grid-cols-[1.2fr_1fr] lg:gap-20 lg:pt-24 lg:pb-28">
        <div className="min-w-0">
          <h1 className="max-w-[16ch] text-3xl font-medium text-fg sm:text-4xl">Ícones desenhados com a mesma pena.</h1>
          <p className="mt-6 max-w-lg text-md text-fg-muted">
            {formatNumber(catalogInfo.icons)} desenhos originais num grid de 24, com traço de 1,5. Busque em português ou em inglês, ajuste e leve em SVG, JSX, CSS ou PNG.
          </p>
          <form
            role="search"
            className="mt-10 flex max-w-lg items-center border-b border-fg focus-within:border-accent"
            onSubmit={(e) => {
              e.preventDefault()
              void navigate({ to: '/icons', search: { q: query.trim() || undefined } })
            }}
          >
            <UiIcon name="search" size={20} className="pointer-events-none shrink-0 text-fg" />
            <label htmlFor="hero-search" className="sr-only">
              Buscar ícones
            </label>
            <input
              id="hero-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="carrinho, calendar, nuvem…"
              className="h-14 min-w-0 flex-1 bg-transparent px-3 text-md text-fg placeholder:text-fg-subtle focus:outline-none"
            />
            <button type="submit" className="inline-flex h-10 items-center gap-1.5 px-1 text-sm font-medium text-fg hover:text-accent-emphasis">
              Buscar
              <UiIcon name="arrow-right" size={16} />
            </button>
          </form>
          <p className="mt-4 max-w-lg text-sm leading-7 text-fg-muted">
            Experimente{' '}
            {SUGGESTIONS.map((s, i) => (
              <span key={s}>
                <Link to="/icons" search={{ q: s }} className="text-fg underline decoration-border-strong underline-offset-4 hover:decoration-accent">
                  {s}
                </Link>
                {i < SUGGESTIONS.length - 2 ? ', ' : i === SUGGESTIONS.length - 2 ? ' ou ' : '.'}
              </span>
            ))}
          </p>
        </div>
        <Specimen icons={icons} />
      </div>
    </section>
  )
}
