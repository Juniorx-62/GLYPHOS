/**
 * The explore page: search, filters by category and style, sorting, the
 * virtual grid and the selected icon's panel. The URL keeps the state
 * (?q=&category=&style=&sort=&icon=), so a link reopens the same view.
 */
import { useNavigate } from '@tanstack/react-router'
import { useEffect, useMemo, useRef, useState } from 'react'
import { CATEGORIES, catalogInfo, categoryById, loadManifest, manifestIfLoaded, styleById, type SortKey } from '~/catalog'
import type { ManifestEntry, ShardIcon, StyleId } from '~/catalog/types'
import { updateSettings, useSettings } from '~/data/stores/settings'
import { useHydrated } from '~/hooks/use-media-query'
import { cn, formatNumber, plural } from '~/lib/utils'
import { UiIcon } from '~/components/icons/UiIcon'
import { Button, Chip, EmptyState, IconButton, Kbd, Segmented, Select } from '~/components/ui/primitives'
import { AppearanceControls } from '~/features/customization/AppearanceControls'
import { useSearchEngine } from '~/features/search/use-search'
import { IconGrid, StaticIconGrid } from './IconGrid'
import { QuickPanel } from './QuickPanel'
import { SORT_LABEL, queryIcons, type ExploreParams } from './query'

export interface ExploreSearch extends ExploreParams {
  icon?: string
}

export interface ExploreInitial {
  total: number
  entries: ManifestEntry[]
  icons: Record<string, ShardIcon>
}

export function Explorer({ search, initial }: { search: ExploreSearch; initial: ExploreInitial | null }) {
  const navigate = useNavigate({ from: '/icons/' })
  const settings = useSettings()
  const hydrated = useHydrated()
  const [manifest, setManifest] = useState<ManifestEntry[] | null>(() => (hydrated ? manifestIfLoaded() : null))
  const engine = useSearchEngine(!!search.q)
  const [query, setQuery] = useState(search.q ?? '')
  const [showCustomize, setShowCustomize] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    let alive = true
    loadManifest().then((m) => alive && setManifest(m))
    return () => {
      alive = false
    }
  }, [])

  // URL → input (back/forward), input → URL (debounced, replacing history).
  useEffect(() => setQuery(search.q ?? ''), [search.q])
  useEffect(() => {
    if ((search.q ?? '') === query.trim()) return
    const t = setTimeout(() => void navigate({ search: (s: ExploreSearch) => ({ ...s, q: query.trim() || undefined, icon: undefined }), replace: true }), 250)
    return () => clearTimeout(t)
  }, [query, search.q, navigate])

  // Opening or closing an icon's panel keeps the scroll where it is: the
  // router would otherwise reset it to the top on every navigation.
  const setParam = (patch: Partial<ExploreSearch>) => {
    const iconOnly = Object.keys(patch).every((k) => k === 'icon')
    void navigate({ search: (s: ExploreSearch) => ({ ...s, ...patch }), replace: 'icon' in patch, resetScroll: !iconOnly })
  }

  const result = useMemo(() => {
    if (!manifest) return null
    if (search.q && !engine.searcher) return null
    return queryIcons(manifest, engine.searcher, search)
  }, [manifest, engine.searcher, search])

  const entries = result?.entries
  const selectedEntry = useMemo(() => (search.icon ? (manifest ?? initial?.entries)?.find((e) => e.slug === search.icon) : undefined), [search.icon, manifest, initial])
  const counts = useMemo(() => {
    if (!manifest) return catalogInfo.categories
    const base = search.q && engine.searcher ? queryIcons(manifest, engine.searcher, { q: search.q, style: search.style }).entries : manifest.filter((e) => !search.style || search.style === 'outline' || e.styles.includes(search.style))
    const c: Record<string, number> = {}
    for (const e of base) c[e.category] = (c[e.category] ?? 0) + 1
    return c
  }, [manifest, engine.searcher, search.q, search.style])

  const total = entries?.length ?? initial?.total ?? 0
  const category = search.category ? categoryById(search.category) : undefined
  const style = search.style ? styleById(search.style) : undefined
  const filtersActive = !!(search.q || search.category || (search.style && search.style !== 'outline'))
  const gridOptions = { appearance: settings.appearance, showNames: settings.showNames, density: settings.gridDensity }
  const onSelect = (e: ManifestEntry) => setParam({ icon: e.slug === search.icon ? undefined : e.slug })

  return (
    <div className="mx-auto max-w-[1440px] px-4 pt-8 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-fg">{category ? category.name.pt : 'Todos os ícones'}</h1>
          <p className="mt-1 text-sm text-fg-muted" aria-live="polite">
            {entries || initial ? plural(total, 'ícone', 'ícones') : 'Carregando…'}
            {search.q ? ` para "${search.q}"` : ''}
            {style && style.id !== 'outline' ? ` em ${style.name.pt}` : ''}
          </p>
        </div>
      </div>

      <div className="sticky top-14 z-20 -mx-4 mt-5 border-b border-border bg-background/90 px-4 py-3 backdrop-blur-md sm:-mx-6 sm:px-6">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-0 flex-1 basis-64">
            <UiIcon name="search" size={16} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-fg-subtle" />
            <label htmlFor="explore-search" className="sr-only">
              Buscar ícones
            </label>
            <input
              ref={inputRef}
              id="explore-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape' && query) {
                  e.preventDefault()
                  setQuery('')
                }
              }}
              placeholder="Buscar em português ou inglês: carrinho, lixeira, calendar…"
              autoComplete="off"
              spellCheck={false}
              className="h-control-lg w-full rounded-lg border border-border-strong/40 bg-surface pr-10 pl-9 text-sm text-fg placeholder:text-fg-subtle hover:border-border-strong"
            />
            {query && <IconButton icon="x" label="Limpar busca" size="sm" className="absolute top-1/2 right-1.5 -translate-y-1/2" onClick={() => setQuery('')} />}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label htmlFor="explore-category" className="sr-only">
              Categoria
            </label>
            <Select id="explore-category" value={search.category ?? ''} onChange={(e) => setParam({ category: e.target.value || undefined, icon: undefined })} className="w-48 lg:hidden">
              <option value="">Todas as categorias</option>
              {CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name.pt}
                </option>
              ))}
            </Select>
            <label htmlFor="explore-sort" className="sr-only">
              Ordenar por
            </label>
            <Select id="explore-sort" value={search.sort ?? (search.q ? 'relevance' : 'popular')} onChange={(e) => setParam({ sort: e.target.value === 'relevance' ? undefined : (e.target.value as SortKey) })} className="w-40">
              {search.q && <option value="relevance">Relevância</option>}
              {(Object.keys(SORT_LABEL) as SortKey[]).map((k) => (
                <option key={k} value={k}>
                  {SORT_LABEL[k]}
                </option>
              ))}
            </Select>
            <div className="hidden sm:block">
              <Segmented
                label="Filtrar por estilo"
                value={(search.style ?? 'outline') as StyleId}
                onChange={(s) => {
                  setParam({ style: s === 'outline' ? undefined : s })
                  updateSettings({ appearance: { style: s } })
                }}
                options={[
                  { value: 'outline', label: 'Contorno' },
                  { value: 'solid', label: 'Sólido' },
                  { value: 'duotone', label: 'Duotone' },
                ]}
              />
            </div>
            <Button variant={showCustomize ? 'secondary' : 'outline'} icon="sliders" aria-expanded={showCustomize} aria-controls="explore-customize" onClick={() => setShowCustomize((v) => !v)}>
              Personalizar
            </Button>
          </div>
        </div>
        {showCustomize && (
          <div id="explore-customize" className="animate-in mt-3 grid gap-6 rounded-xl border border-border bg-surface p-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto]">
            <AppearanceControls idPrefix="explore" showSize />
            <div className="grid content-start gap-4">
              <div className="grid gap-1.5">
                <span className="text-xs font-medium text-fg-muted">Grade</span>
                <Segmented
                  label="Densidade da grade"
                  value={settings.gridDensity}
                  onChange={(gridDensity) => updateSettings({ gridDensity })}
                  options={[
                    { value: 'comfortable', label: 'Confortável' },
                    { value: 'compact', label: 'Compacta' },
                  ]}
                />
              </div>
              <label className="flex items-center gap-2 text-sm text-fg-muted">
                <input type="checkbox" checked={settings.showNames} onChange={(e) => updateSettings({ showNames: e.target.checked })} className="size-4 accent-[var(--color-fg)]" />
                Mostrar nomes
              </label>
              <p className="text-xs text-fg-subtle">A personalização vale para a grade, as prévias e as exportações, e fica salva neste navegador. Os arquivos originais não mudam.</p>
            </div>
          </div>
        )}
        {filtersActive && (
          <div className="mt-3 flex flex-wrap items-center gap-1.5" aria-label="Filtros ativos">
            {search.q && (
              <Chip onRemove={() => setQuery('')} removeLabel="Remover busca">
                "{search.q}"
              </Chip>
            )}
            {category && (
              <Chip onRemove={() => setParam({ category: undefined })} removeLabel={`Remover filtro ${category.name.pt}`}>
                {category.name.pt}
              </Chip>
            )}
            {style && style.id !== 'outline' && (
              <Chip onRemove={() => setParam({ style: undefined })} removeLabel={`Remover filtro ${style.name.pt}`}>
                {style.name.pt}
              </Chip>
            )}
            <button type="button" onClick={() => void navigate({ search: {} })} className="ml-1 text-xs font-medium text-fg-muted underline-offset-2 hover:text-fg hover:underline">
              Limpar filtros
            </button>
          </div>
        )}
      </div>

      <div className="mt-6 flex items-start gap-6">
        <nav aria-label="Categorias" className="scrollbar-none sticky top-40 hidden max-h-[calc(100dvh-11rem)] w-56 shrink-0 overflow-y-auto pr-2 lg:block">
          <CategoryLink active={!search.category} label="Todas" count={Object.values(counts).reduce((a, b) => a + b, 0)} onClick={() => setParam({ category: undefined, icon: undefined })} />
          {CATEGORIES.map((c) => (
            <CategoryLink key={c.id} active={search.category === c.id} label={c.name.pt} count={counts[c.id] ?? 0} onClick={() => setParam({ category: c.id, icon: undefined })} />
          ))}
        </nav>

        <div className="min-w-0 flex-1">
          {result?.partial && entries && entries.length > 0 && (
            <p className="mb-3 rounded-md bg-muted px-3 py-2 text-xs text-fg-muted">Nenhum ícone tem todas as palavras da busca. Mostrando os que têm algumas delas.</p>
          )}
          {entries ? (
            entries.length ? (
              <IconGrid entries={entries} selected={search.icon} onSelect={onSelect} options={gridOptions} initialIcons={initial?.icons} label="Ícones encontrados" />
            ) : (
              <EmptyState title={search.q ? `Nenhum ícone para "${search.q}"` : 'Nenhum ícone com esses filtros'}>
                <p>
                  {search.q ? 'Tente um sinônimo, a palavra em inglês ou menos palavras.' : 'Tente outra categoria ou outro estilo.'} Nem todo ícone tem os estilos Sólido e Duotone: só os que têm uma silhueta fechada.
                </p>
                <Button className="mt-4" onClick={() => void navigate({ search: {} })}>
                  Ver todos os ícones
                </Button>
              </EmptyState>
            )
          ) : initial ? (
            <StaticIconGrid entries={initial.entries} icons={initial.icons} options={gridOptions} onSelect={onSelect} selected={search.icon} label="Ícones encontrados" />
          ) : (
            <GridSkeleton />
          )}
        </div>

        <QuickPanel entry={selectedEntry} onClose={() => setParam({ icon: undefined })} />
      </div>
      {!hydrated && (
        <p className="sr-only">
          <Kbd>Ctrl K</Kbd> abre a busca global.
        </p>
      )}
    </div>
  )
}

function CategoryLink({ active, label, count, onClick }: { active: boolean; label: string; count: number; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? 'true' : undefined}
      className={cn('flex w-full items-center justify-between gap-2 rounded-md px-2.5 py-1.5 text-left text-sm transition-colors', active ? 'bg-muted font-medium text-fg' : 'text-fg-muted hover:bg-muted/60 hover:text-fg')}
    >
      <span className="truncate">{label}</span>
      <span className="inscription text-fg-subtle">{formatNumber(count)}</span>
    </button>
  )
}

function GridSkeleton() {
  return (
    <div aria-busy="true" aria-label="Carregando ícones" className="grid grid-cols-[repeat(auto-fill,minmax(96px,1fr))] gap-1">
      {Array.from({ length: 48 }, (_, i) => (
        <div key={i} className="grid aspect-[1/0.86] place-items-center rounded-lg">
          <span className="size-6 rounded-sm bg-muted" />
        </div>
      ))}
    </div>
  )
}
