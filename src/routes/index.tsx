import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { CATEGORIES, COLLECTIONS, STYLES, catalogInfo, loadIcons, loadManifest, sortEntries } from '~/catalog'
import type { ManifestEntry, ShardIcon, StyleId } from '~/catalog/types'
import { useSettings } from '~/data/stores/settings'
import { Glyph } from '~/components/icons/Glyph'
import { UiIcon } from '~/components/icons/UiIcon'
import { Button, Kbd, SectionHeader } from '~/components/ui/primitives'
import { useCommandPalette } from '~/features/search/CommandPalette'
import { StaticIconGrid } from '~/features/exploration/IconGrid'
import { useModKey } from '~/hooks/use-media-query'
import { pageHead, websiteLd } from '~/lib/seo'
import { SITE_DESCRIPTION } from '~/lib/site'
import { cn, formatDate, formatNumber } from '~/lib/utils'

const SUGGESTIONS = ['carrinho de compras', 'calendário', 'nuvem', 'usuário', 'seta', 'lixeira', 'chuva', 'gráfico']
const STYLE_SAMPLE = ['bell', 'folder', 'heart', 'map-pin', 'message', 'lock', 'image', 'clock']

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
    for (const c of CATEGORIES) slugs.add(c.symbol)
    for (const s of STYLE_SAMPLE) slugs.add(s)
    for (const c of COLLECTIONS) c.icons.slice(0, 6).forEach((s) => slugs.add(s))
    const icons = Object.fromEntries((await loadIcons([...slugs])).map((i) => [i.slug, i])) as Record<string, ShardIcon>
    return { popular, recent, icons }
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
  const { popular, recent, icons } = Route.useLoaderData()
  const settings = useSettings()
  const gridOptions = { appearance: settings.appearance, showNames: true, density: 'comfortable' as const }
  const styleCount = STYLES.filter((s) => (catalogInfo.styles[s.id] ?? 0) > 0).length

  return (
    <div>
      <Hero icons={icons} popular={popular} />

      <div className="mx-auto max-w-[1280px] px-4 sm:px-6">
        <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-4">
          {[
            [formatNumber(catalogInfo.icons), 'ícones originais'],
            [String(CATEGORIES.length), 'categorias'],
            [String(styleCount), 'estilos derivados do mesmo desenho'],
            ['MIT', 'licença livre, inclusive comercial'],
          ].map(([value, label]) => (
            <div key={label} className="bg-surface px-5 py-4">
              <dt className="sr-only">{label}</dt>
              <dd>
                <span className="block text-xl font-semibold tracking-tight text-fg">{value}</span>
                <span className="text-xs text-fg-muted">{label}</span>
              </dd>
            </div>
          ))}
        </dl>

        <section className="mt-20" aria-labelledby="popular-title">
          <SectionHeader
            id="popular-title"
            title="Populares"
            description="Os conceitos que quase toda interface usa."
            action={
              <Link to="/icons">
                <Button size="sm" variant="ghost">
                  Ver todos
                </Button>
              </Link>
            }
          />
          <StaticIconGrid entries={popular} icons={icons} options={gridOptions} label="Ícones populares" />
        </section>

        <section className="mt-20" aria-labelledby="categories-title">
          <SectionHeader
            id="categories-title"
            title="Categorias"
            description="A biblioteca organizada pelo que cada ícone desenha."
            action={
              <Link to="/categories">
                <Button size="sm" variant="ghost">
                  Todas as categorias
                </Button>
              </Link>
            }
          />
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
            {CATEGORIES.map((c) => (
              <li key={c.id}>
                <Link
                  to="/categories/$categoryId"
                  params={{ categoryId: c.id }}
                  className="group flex h-full flex-col gap-3 rounded-xl border border-border bg-surface p-4 transition-colors hover:border-border-strong"
                >
                  <span className="text-fg">{icons[c.symbol] ? <Glyph nodes={icons[c.symbol].nodes} size={22} /> : <span className="block size-[22px]" />}</span>
                  <span className="text-sm leading-snug font-medium text-fg">{c.name.pt}</span>
                  <span className="inscription mt-auto text-fg-subtle">{formatNumber(catalogInfo.categories[c.id] ?? 0)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <StylesShowcase icons={icons} />

        {recent.length > 0 && (
          <section className="mt-20" aria-labelledby="recent-title">
            <SectionHeader
              id="recent-title"
              title="Adicionados recentemente"
              description={`Entraram no catálogo em ${formatDate(catalogInfo.latestAdded)}.`}
              action={
                <Link to="/icons" search={{ sort: 'newest' }}>
                  <Button size="sm" variant="ghost">
                    Ver novidades
                  </Button>
                </Link>
              }
            />
            <StaticIconGrid entries={recent} icons={icons} options={gridOptions} label="Ícones adicionados recentemente" />
          </section>
        )}

        {COLLECTIONS.length > 0 && (
          <section className="mt-20" aria-labelledby="collections-title">
            <SectionHeader
              id="collections-title"
              title="Coleções temáticas"
              description="Conjuntos prontos para um tipo de produto."
              action={
                <Link to="/collections">
                  <Button size="sm" variant="ghost">
                    Todas as coleções
                  </Button>
                </Link>
              }
            />
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {COLLECTIONS.slice(0, 6).map((c) => (
                <li key={c.id}>
                  <Link to="/collections/$collectionId" params={{ collectionId: c.id }} className="flex h-full flex-col gap-4 rounded-xl border border-border bg-surface p-5 hover:border-border-strong">
                    <span className="flex gap-3 text-fg">
                      {c.icons.slice(0, 6).map((s) => (icons[s] ? <Glyph key={s} nodes={icons[s].nodes} size={20} /> : null))}
                    </span>
                    <span>
                      <span className="block font-medium text-fg">{c.name}</span>
                      <span className="mt-1 line-clamp-2 block text-sm text-fg-muted">{c.description}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        <HowTo />
      </div>
    </div>
  )
}

function Hero({ icons, popular }: { icons: Record<string, ShardIcon>; popular: ManifestEntry[] }) {
  const navigate = useNavigate()
  const palette = useCommandPalette()
  const mod = useModKey()
  const [query, setQuery] = useState('')
  const specimen = popular.slice(0, 32)
  return (
    <section className="relative overflow-hidden border-b border-border">
      <div aria-hidden className="canvas-grid pointer-events-none absolute inset-0 opacity-60 [mask-image:radial-gradient(ellipse_at_top,black,transparent_70%)]" style={{ backgroundSize: '48px 48px' }} />
      <div className="relative mx-auto grid max-w-[1280px] items-center gap-12 px-4 pt-16 pb-20 sm:px-6 lg:grid-cols-[1.1fr_1fr] lg:pt-24 lg:pb-28">
        <div>
          <p className="inscription inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-fg-muted">
            <span className="size-1.5 rounded-xs bg-accent" aria-hidden />
            Biblioteca de ícones do ecossistema THOTH
          </p>
          <h1 className="mt-6 text-3xl font-semibold tracking-tight text-fg sm:text-4xl">Ícones desenhados com a mesma pena.</h1>
          <p className="mt-5 max-w-xl text-md text-fg-muted">
            {formatNumber(catalogInfo.icons)} ícones SVG originais num grid de 24, com traço de 1,5. Busque em português ou em inglês, personalize e leve para o seu projeto em SVG, JSX, CSS ou PNG.
          </p>
          <form
            role="search"
            className="mt-8 flex max-w-xl gap-2"
            onSubmit={(e) => {
              e.preventDefault()
              void navigate({ to: '/icons', search: { q: query.trim() || undefined } })
            }}
          >
            <div className="relative flex-1">
              <UiIcon name="search" size={18} className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-fg-subtle" />
              <label htmlFor="hero-search" className="sr-only">
                Buscar ícones
              </label>
              <input
                id="hero-search"
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar ícones: carrinho, calendar, nuvem…"
                className="h-12 w-full rounded-xl border border-border-strong/50 bg-surface pr-4 pl-11 text-base text-fg shadow-xs placeholder:text-fg-subtle hover:border-border-strong"
              />
            </div>
            <Button type="submit" variant="primary" size="lg" className="h-12 rounded-xl">
              Buscar
            </Button>
          </form>
          <div className="mt-4 flex flex-wrap items-center gap-1.5 text-xs text-fg-subtle">
            <span>Experimente:</span>
            {SUGGESTIONS.map((s) => (
              <Link key={s} to="/icons" search={{ q: s }} className="rounded-full border border-border bg-surface px-2.5 py-1 text-fg-muted hover:border-border-strong hover:text-fg">
                {s}
              </Link>
            ))}
          </div>
          <p className="mt-6 hidden items-center gap-1.5 text-xs text-fg-subtle sm:flex">
            Em qualquer página,{' '}
            <button type="button" onClick={() => palette.open()} className="inline-flex items-center gap-1 hover:text-fg">
              <Kbd>{mod}</Kbd>
              <Kbd>K</Kbd>
            </button>{' '}
            abre a busca global.
          </p>
        </div>
        <div aria-hidden className="relative hidden rounded-2xl border border-border bg-surface/80 p-6 shadow-sm backdrop-blur-sm sm:block">
          <div className="grid grid-cols-8 gap-1 text-fg">
            {specimen.map((e, i) => (
              <span key={e.slug} className={cn('grid aspect-square place-items-center rounded-md', i === 10 && 'bg-fg text-background')}>
                {icons[e.slug] ? <Glyph nodes={icons[e.slug].nodes} size={22} /> : null}
              </span>
            ))}
          </div>
          <div className="mt-5 flex items-center justify-between border-t border-border pt-4">
            <span className="inscription text-fg-subtle">24 × 24 · traço 1,5 · currentColor</span>
            <span className="inscription text-accent-emphasis">{specimen[10]?.slug}</span>
          </div>
        </div>
      </div>
    </section>
  )
}

function StylesShowcase({ icons }: { icons: Record<string, ShardIcon> }) {
  const styles = STYLES.filter((s) => (catalogInfo.styles[s.id] ?? 0) > 0)
  return (
    <section className="mt-20" aria-labelledby="styles-title">
      <SectionHeader id="styles-title" title="Um desenho, vários estilos" description="Sólido e Duotone nascem do desenho-mestre: uma correção no Contorno chega a todos os estilos." />
      <ul className="grid gap-3 md:grid-cols-3">
        {styles.map((s) => (
          <li key={s.id} className="rounded-xl border border-border bg-surface p-5">
            <div className="grid grid-cols-4 gap-4 text-fg">
              {STYLE_SAMPLE.map((slug) => {
                const icon = icons[slug]
                if (!icon) return null
                const style: StyleId = icon.styles.includes(s.id) ? s.id : 'outline'
                return (
                  <span key={slug} className="grid aspect-square place-items-center rounded-lg bg-background-subtle">
                    <Glyph nodes={icon.nodes} override={icon.overrides?.[style]} style={style} size={24} />
                  </span>
                )
              })}
            </div>
            <div className="mt-4 flex items-baseline justify-between gap-2">
              <h3 className="font-medium text-fg">{s.name.pt}</h3>
              <Link to="/icons" search={{ style: s.id === 'outline' ? undefined : s.id }} className="inscription text-fg-subtle hover:text-fg">
                {formatNumber(catalogInfo.styles[s.id] ?? 0)} ícones
              </Link>
            </div>
            <p className="mt-1 text-sm text-fg-muted">{s.description}</p>
          </li>
        ))}
      </ul>
    </section>
  )
}

function HowTo() {
  const steps = [
    { icon: 'search' as const, title: 'Encontre', text: 'Busque pelo nome, por um sinônimo ou pela palavra em inglês. A busca tolera plural, acento e erro de digitação.' },
    { icon: 'sliders' as const, title: 'Personalize', text: 'Escolha o estilo, a espessura do traço, a cor, o tamanho e a opacidade. A prévia muda na hora.' },
    { icon: 'copy' as const, title: 'Leve para o projeto', text: 'Copie o SVG, um componente React (JSX ou TSX) ou uma classe CSS, ou baixe em SVG e PNG.' },
  ]
  return (
    <section className="mt-20" aria-labelledby="howto-title">
      <SectionHeader id="howto-title" title="Como usar" />
      <ol className="grid gap-3 md:grid-cols-3">
        {steps.map((s, i) => (
          <li key={s.title} className="rounded-xl border border-border bg-surface p-5">
            <div className="flex items-center gap-3">
              <span className="grid size-9 place-items-center rounded-lg bg-muted text-fg">
                <UiIcon name={s.icon} size={18} />
              </span>
              <span className="inscription text-fg-subtle">0{i + 1}</span>
            </div>
            <h3 className="mt-4 font-medium text-fg">{s.title}</h3>
            <p className="mt-1 text-sm text-fg-muted">{s.text}</p>
          </li>
        ))}
      </ol>
      <p className="mt-6 text-sm text-fg-muted">
        Sem cadastro: favoritos, histórico e coleções ficam neste navegador, com cópia de segurança em JSON na{' '}
        <Link to="/library" className="text-fg underline underline-offset-2">
          sua biblioteca
        </Link>
        .
      </p>
    </section>
  )
}
