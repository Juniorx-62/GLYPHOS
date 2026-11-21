import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { CATEGORIES, COLLECTIONS, STYLES, catalogInfo, loadIcons, loadManifest, sortEntries } from '~/catalog'
import type { ShardIcon } from '~/catalog/types'
import { useSettings } from '~/data/stores/settings'
import { Glyph } from '~/components/icons/Glyph'
import { UiIcon } from '~/components/icons/UiIcon'
import { Button, Kbd, SectionHeader } from '~/components/ui/primitives'
import { useCommandPalette } from '~/features/search/CommandPalette'
import { StaticIconGrid } from '~/features/exploration/IconGrid'
import { Anatomy, CONTEXT_SLUGS, Chapter, InContext, Mosaic, SPECIMEN_SLUGS, ScaleRuler, Specimen } from '~/features/showcase/Showcase'
import { useModKey } from '~/hooks/use-media-query'
import { pageHead, websiteLd } from '~/lib/seo'
import { SITE_DESCRIPTION } from '~/lib/site'
import { formatDate, formatNumber } from '~/lib/utils'

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

  return (
    <div>
      <Hero icons={icons} />

      <div className="mx-auto max-w-[1440px] px-4 sm:px-6">
        <section className="mt-24" aria-labelledby="anatomy-title">
          <Chapter index="01 · Estilos" id="anatomy-title" title="Um desenho, três leituras.">
            Cada conceito é desenhado uma vez. Sólido e Duotone são derivados das formas do desenho-mestre, então uma correção no Contorno chega a todos os estilos.
          </Chapter>
          <Anatomy icons={icons} slugs={ANATOMY_SLUGS} />
        </section>

        <section className="mt-24" aria-labelledby="scale-title">
          <Chapter index="02 · Medida" id="scale-title" title="Do 16 ao 48 sem perder a linha.">
            Os ícones são desenhados para ler bem em 16 px e escalam sem retoques. O traço é um parâmetro, não uma decisão gravada no arquivo.
          </Chapter>
          <ScaleRuler icons={icons} slugs={SCALE_SLUGS} />
        </section>

        <section className="mt-24" aria-labelledby="context-title">
          <Chapter index="03 · Aplicação" id="context-title" title="Onde o ícone trabalha.">
            Ao lado do texto, na navegação, numa lista. Mude estilo, traço e cor e veja a mesma família se comportar numa tela.
          </Chapter>
          <InContext icons={icons} />
        </section>

        <section className="mt-24" aria-labelledby="mosaic-title">
          <Chapter
            index="04 · Biblioteca"
            id="mosaic-title"
            title={`${formatNumber(catalogInfo.icons)} desenhos, ${CATEGORIES.length} categorias.`}
            aside={
              <Link to="/categories">
                <Button size="sm" variant="ghost">
                  Todas as categorias
                </Button>
              </Link>
            }
          >
            Os mais usados de cada categoria, lado a lado. A mesma pena em comida, finanças, mapas ou código.
          </Chapter>
          <Mosaic icons={icons} byCategory={byCategory} />
        </section>

        <section className="mt-24" aria-labelledby="popular-title">
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

        {recent.length > 0 && (
          <section className="mt-24" aria-labelledby="recent-title">
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
          <section className="mt-24" aria-labelledby="collections-title">
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

function Hero({ icons }: { icons: Record<string, ShardIcon> }) {
  const navigate = useNavigate()
  const palette = useCommandPalette()
  const mod = useModKey()
  const [query, setQuery] = useState('')
  const styles = STYLES.filter((s) => (catalogInfo.styles[s.id] ?? 0) > 0)
  const facts = [
    { value: formatNumber(catalogInfo.icons), label: 'ícones' },
    { value: String(CATEGORIES.length), label: 'categorias' },
    { value: String(styles.length), label: 'estilos' },
    { value: '24 · 1,5', label: 'grid · traço' },
  ]
  return (
    <section className="relative overflow-hidden border-b border-border">
      <div aria-hidden className="canvas-grid pointer-events-none absolute inset-0 opacity-70 [mask-image:radial-gradient(ellipse_at_70%_30%,black,transparent_70%)]" style={{ backgroundSize: '32px 32px' }} />
      <div className="relative mx-auto grid max-w-[1440px] items-center gap-12 px-4 pt-14 pb-16 sm:px-6 lg:grid-cols-[1.15fr_1fr] lg:pt-20 lg:pb-24">
        <div className="min-w-0">
          <p className="inscription flex items-center gap-2 text-fg-muted">
            <span aria-hidden className="size-2 bg-accent" />
            Biblioteca de ícones SVG · licença MIT
          </p>
          <h1 className="mt-5 max-w-[14ch] text-3xl leading-none font-semibold tracking-tight text-fg sm:text-4xl">Ícones desenhados com a mesma pena.</h1>
          <p className="mt-6 max-w-xl text-md text-fg-muted">
            Desenhos originais num grid de 24, com traço de 1,5 e regras de construção que valem para todos. Busque em português ou em inglês, personalize e leve em SVG, JSX, CSS ou PNG.
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
              <Link key={s} to="/icons" search={{ q: s }} className="rounded-full border border-border bg-surface px-2.5 py-1 text-fg-muted transition-colors duration-fast hover:border-border-strong hover:text-fg">
                {s}
              </Link>
            ))}
          </div>
          <dl className="mt-10 grid max-w-xl grid-cols-2 border-t border-border sm:grid-cols-4">
            {facts.map((f) => (
              <div key={f.label} className="py-3 pr-3">
                <dt className="inscription text-fg-subtle">{f.label}</dt>
                <dd className="mt-1 text-lg font-semibold tracking-tight text-fg tabular-nums">{f.value}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-4 hidden items-center gap-1.5 text-xs text-fg-subtle sm:flex">
            Em qualquer página,{' '}
            <button type="button" onClick={() => palette.open()} className="inline-flex items-center gap-1 hover:text-fg">
              <Kbd>{mod}</Kbd>
              <Kbd>K</Kbd>
            </button>{' '}
            abre a busca global.
          </p>
        </div>
        <Specimen icons={icons} />
      </div>
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
    <section className="mt-24" aria-labelledby="howto-title">
      <SectionHeader id="howto-title" title="Como usar" />
      <ol className="grid gap-x-10 gap-y-6 md:grid-cols-3">
        {steps.map((s) => (
          <li key={s.title} className="border-t border-border pt-4">
            <h3 className="flex items-center gap-2 font-medium text-fg">
              <UiIcon name={s.icon} size={16} className="text-fg-muted" />
              {s.title}
            </h3>
            <p className="mt-1.5 text-sm text-fg-muted">{s.text}</p>
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
