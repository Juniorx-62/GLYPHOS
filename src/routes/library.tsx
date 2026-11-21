import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useMemo, useRef, useState } from 'react'
import { loadManifest } from '~/catalog'
import type { ManifestEntry } from '~/catalog/types'
import { clearAllData, createBackup, restoreBackup } from '~/data/backup'
import { createCollection, deleteCollection, renameCollection, toggleCreationInCollection, toggleInCollection, useCollections } from '~/data/stores/collections'
import { useCreations } from '~/data/stores/creations'
import { CreationBadge, CreationThumb, CreationsLibrary } from '~/features/editor/CreationsLibrary'
import { clearFavorites, useFavorites } from '~/data/stores/favorites'
import { clearHistory, useHistory } from '~/data/stores/history'
import { useSettings } from '~/data/stores/settings'
import { useHydrated } from '~/hooks/use-media-query'
import { downloadBlob, plural } from '~/lib/utils'
import { Button, EmptyState, IconButton, Segmented, TextInput } from '~/components/ui/primitives'
import { toast } from '~/components/ui/toast'
import { StaticIconGrid } from '~/features/exploration/IconGrid'
import { pageHead } from '~/lib/seo'
import { UiIcon } from '~/components/icons/UiIcon'
import type { UiIconName } from '~/components/icons/ui-icon-names'

type Tab = 'favorites' | 'recent' | 'creations' | 'collections' | 'data'
const TABS: Tab[] = ['favorites', 'recent', 'creations', 'collections', 'data']

export const Route = createFileRoute('/library')({
  validateSearch: (raw: Record<string, unknown>): { tab?: Tab } => ({ tab: TABS.includes(raw.tab as Tab) ? (raw.tab as Tab) : undefined }),
  head: () => pageHead({ title: 'Minha biblioteca · GLYPHOS', description: 'Seus ícones favoritos, vistos recentemente, criações próprias e coleções pessoais, salvos neste navegador.', path: '/library', noindex: true }),
  component: LibraryPage,
})

function useManifestMap() {
  const [map, setMap] = useState<Map<string, ManifestEntry> | null>(null)
  useEffect(() => {
    let alive = true
    loadManifest().then((m) => alive && setMap(new Map(m.map((e) => [e.slug, e]))))
    return () => {
      alive = false
    }
  }, [])
  return map
}

function LibraryPage() {
  const { tab = 'favorites' } = Route.useSearch()
  const navigate = useNavigate({ from: '/library' })
  const hydrated = useHydrated()
  const favorites = useFavorites()
  const history = useHistory()
  const collections = useCollections()
  const creations = useCreations()
  return (
    <div className="mx-auto max-w-[1440px] px-4 pt-10 sm:px-6">
      <h1 className="text-2xl font-medium text-fg sm:text-3xl">Minha biblioteca</h1>
      <p className="mt-2 max-w-2xl text-base text-fg-muted">Favoritos, ícones vistos por último, os ícones que você criou e suas coleções. Tudo fica neste navegador, sem cadastro; leve para outro aparelho com a cópia de segurança.</p>
      <div className="mt-6 overflow-x-auto">
        <Segmented
          label="Seção da biblioteca"
          value={tab}
          onChange={(t) => void navigate({ search: { tab: t === 'favorites' ? undefined : t }, replace: true })}
          options={[
            { value: 'favorites', label: `Favoritos${hydrated ? ` (${favorites.length})` : ''}` },
            { value: 'recent', label: `Vistos por último${hydrated ? ` (${history.length})` : ''}` },
            { value: 'creations', label: `Criações${hydrated ? ` (${creations.length})` : ''}` },
            { value: 'collections', label: `Coleções${hydrated ? ` (${collections.length})` : ''}` },
            { value: 'data', label: 'Dados e backup' },
          ]}
        />
      </div>
      <div className="mt-8">
        {!hydrated ? null : tab === 'favorites' ? (
          <SlugList icon="heart" slugs={favorites.map((f) => f.slug)} empty="Nenhum favorito ainda" hint="Toque no coração de um ícone para guardá-lo aqui." onClear={favorites.length ? () => clearFavorites() : undefined} clearLabel="Limpar favoritos" />
        ) : tab === 'recent' ? (
          <SlugList icon="history" slugs={history.map((h) => h.slug)} empty="Nenhum ícone visto ainda" hint="Os ícones que você abrir, na grade ou na página de cada um, aparecem aqui, do mais recente para o mais antigo." onClear={history.length ? () => clearHistory() : undefined} clearLabel="Limpar histórico" />
        ) : tab === 'creations' ? (
          <CreationsLibrary />
        ) : tab === 'collections' ? (
          <Collections />
        ) : (
          <DataPanel counts={{ favorites: favorites.length, history: history.length, collections: collections.length, creations: creations.length }} />
        )}
      </div>
    </div>
  )
}

function SlugList({ icon, slugs, empty, hint, onClear, clearLabel }: { icon: UiIconName; slugs: string[]; empty: string; hint: string; onClear?: () => void; clearLabel: string }) {
  const map = useManifestMap()
  const settings = useSettings()
  const entries = useMemo(() => (map ? slugs.map((s) => map.get(s)).filter((e): e is ManifestEntry => !!e) : []), [map, slugs])
  if (!slugs.length) {
    return (
      <EmptyState icon={icon} title={empty}>
        <p>{hint}</p>
        <Link to="/icons" className="mt-4 inline-block">
          <Button variant="primary" icon="search">
            Explorar ícones
          </Button>
        </Link>
      </EmptyState>
    )
  }
  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-fg-muted">{plural(slugs.length, 'ícone', 'ícones')}</p>
        {onClear && (
          <Button size="sm" variant="ghost" icon="trash" onClick={onClear}>
            {clearLabel}
          </Button>
        )}
      </div>
      {map && <StaticIconGrid entries={entries} options={{ appearance: settings.appearance, showNames: true, density: settings.gridDensity }} label={empty} />}
    </div>
  )
}

function Collections() {
  const collections = useCollections()
  const creations = useCreations()
  const map = useManifestMap()
  const settings = useSettings()
  const [name, setName] = useState('')
  return (
    <div className="grid gap-8">
      <form
        className="flex max-w-md gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          if (!name.trim()) return
          createCollection(name)
          toast(`Coleção "${name.trim()}" criada`)
          setName('')
        }}
      >
        <label htmlFor="new-collection" className="sr-only">
          Nome da nova coleção
        </label>
        <TextInput id="new-collection" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome da nova coleção" />
        <Button type="submit" variant="primary" icon="plus">
          Criar
        </Button>
      </form>
      {!collections.length && (
        <EmptyState icon="bookmark" title="Nenhuma coleção pessoal">
          <p>Crie uma coleção aqui, ou use o botão "Coleção" na página de qualquer ícone. As coleções temáticas do site também podem ser copiadas para cá.</p>
        </EmptyState>
      )}
      {collections.map((c) => {
        const entries = map ? c.icons.map((s) => map.get(s)).filter((e): e is ManifestEntry => !!e) : []
        return (
          <section key={c.id} aria-label={c.name} className="border-t border-border pt-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-md font-medium text-fg">{c.name}</h2>
                <p className="text-xs text-fg-subtle">
                  {plural(c.icons.length, 'ícone', 'ícones')}
                  {c.creations.length > 0 && ` · ${plural(c.creations.length, 'criação', 'criações')}`}
                </p>
              </div>
              <div className="flex gap-1">
                <IconButton
                  icon="settings"
                  label={`Renomear "${c.name}"`}
                  onClick={() => {
                    const next = prompt('Novo nome da coleção', c.name)
                    if (next) renameCollection(c.id, next)
                  }}
                />
                <IconButton
                  icon="trash"
                  label={`Apagar "${c.name}"`}
                  onClick={() => {
                    if (confirm(`Apagar a coleção "${c.name}"? Os ícones continuam no catálogo.`)) deleteCollection(c.id)
                  }}
                />
              </div>
            </div>
            {(() => {
              const own = c.creations.map((id) => creations.find((x) => x.id === id)).filter((x): x is NonNullable<typeof x> => !!x)
              if (!own.length) return null
              return (
                <ul className="mb-3 grid grid-cols-[repeat(auto-fill,minmax(96px,1fr))] gap-1" aria-label={`Criações em ${c.name}`}>
                  {own.map((cr) => (
                    <li key={cr.id} className="group relative">
                      <Link to="/create" search={{ project: cr.id }} className="grid h-24 place-items-center gap-1 rounded-lg p-2 text-fg hover:bg-muted" title={`Editar "${cr.name}"`}>
                        <CreationThumb doc={cr.doc} size={28} style={settings.appearance.style} />
                        <span className="w-full truncate text-center text-xs text-fg-muted">{cr.name}</span>
                      </Link>
                      <CreationBadge className="pointer-events-none absolute top-1 left-1" />
                      <button
                        type="button"
                        onClick={() => toggleCreationInCollection(c.id, cr.id)}
                        aria-label={`Tirar "${cr.name}" de "${c.name}"`}
                        className="absolute top-1 right-1 hidden size-6 place-items-center rounded-md bg-surface-overlay text-fg-muted shadow-xs group-focus-within:grid group-hover:grid hover:text-fg"
                      >
                        ×
                      </button>
                    </li>
                  ))}
                </ul>
              )
            })()}
            {entries.length ? (
              <ul className="grid grid-cols-[repeat(auto-fill,minmax(96px,1fr))] gap-1">
                {entries.map((e) => (
                  <li key={e.slug} className="group relative">
                    <StaticIconGrid entries={[e]} options={{ appearance: settings.appearance, showNames: true, density: 'comfortable' }} label={e.name.pt} />
                    <button
                      type="button"
                      onClick={() => toggleInCollection(c.id, e.slug)}
                      aria-label={`Tirar "${e.name.pt}" de "${c.name}"`}
                      className="absolute top-1 right-1 hidden size-6 place-items-center rounded-md bg-surface-overlay text-fg-muted shadow-xs group-focus-within:grid group-hover:grid hover:text-fg"
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            ) : c.creations.length ? null : (
              <p className="text-sm text-fg-muted">Vazia. Abra um ícone e use o botão "Coleção" para incluir; suas criações entram pelo botão de coleção do cartão em Criações.</p>
            )}
          </section>
        )
      })}
    </div>
  )
}

function DataPanel({ counts }: { counts: { favorites: number; history: number; collections: number; creations: number } }) {
  const fileRef = useRef<HTMLInputElement>(null)
  const settings = useSettings()
  const saved: Array<{ icon: UiIconName; label: string; value: string }> = [
    { icon: 'heart', label: 'Favoritos', value: plural(counts.favorites, 'ícone', 'ícones') },
    { icon: 'history', label: 'Vistos por último', value: plural(counts.history, 'ícone', 'ícones') },
    { icon: 'pen-tool', label: 'Criações (projetos do editor)', value: plural(counts.creations, 'ícone', 'ícones') },
    { icon: 'bookmark', label: 'Coleções pessoais', value: plural(counts.collections, 'coleção', 'coleções') },
    { icon: 'sliders', label: 'Preferências', value: `Tema ${settings.theme === 'dark' ? 'escuro' : 'claro'}, traço ${String(settings.appearance.strokeWidth).replace('.', ',')}` },
  ]
  return (
    <div className="grid gap-x-16 gap-y-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <section aria-labelledby="saved-title" className="lg:row-span-2">
        <h2 id="saved-title" className="text-md font-medium text-fg">
          O que está salvo neste navegador
        </h2>
        <p className="mt-1 text-sm text-fg-muted">Nada sai do seu aparelho: não há conta nem servidor. Os dados ficam no armazenamento do navegador.</p>
        <ul className="mt-4 divide-y divide-border border-y border-border">
          {saved.map((item) => (
            <li key={item.label} className="flex items-center gap-3 py-3">
              <span className="grid shrink-0 place-items-center text-fg-muted">
                <UiIcon name={item.icon} size={16} />
              </span>
              <span className="flex-1 text-sm text-fg">{item.label}</span>
              <span className="text-sm text-fg-muted tabular-nums">{item.value}</span>
            </li>
          ))}
        </ul>
      </section>
      <section aria-labelledby="backup-title">
        <h2 id="backup-title" className="text-md font-medium text-fg">
          Cópia de segurança
        </h2>
        <p className="mt-1 text-sm text-fg-muted">Um arquivo JSON com favoritos, histórico, criações, coleções e preferências. Use para levar seus dados a outro navegador ou aparelho.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            variant="primary"
            icon="download"
            onClick={async () => {
              const backup = await createBackup()
              downloadBlob(new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' }), `glyphos-backup-${new Date().toISOString().slice(0, 10)}.json`)
              toast('Cópia de segurança baixada')
            }}
          >
            Exportar JSON
          </Button>
          <Button icon="upload" onClick={() => fileRef.current?.click()}>
            Importar JSON
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="sr-only"
            aria-label="Arquivo de cópia de segurança"
            onChange={async (e) => {
              const file = e.target.files?.[0]
              e.target.value = ''
              if (!file) return
              if (file.size > 5_000_000) return toast('O arquivo é grande demais para uma cópia do GLYPHOS.', 'error')
              try {
                const result = await restoreBackup(JSON.parse(await file.text()))
                toast(result.ok ? 'Dados restaurados' : result.reason, result.ok ? 'success' : 'error')
              } catch {
                toast('O arquivo não é um JSON válido.', 'error')
              }
            }}
          />
        </div>
        <p className="mt-3 text-xs text-fg-subtle">Ao importar, o arquivo inteiro é conferido antes: se alguma parte estiver danificada, nada muda.</p>
      </section>
      <section aria-labelledby="erase-title" className="border-t border-border pt-6">
        <h2 id="erase-title" className="text-md font-medium text-fg">
          Apagar dados deste navegador
        </h2>
        <p className="mt-1 text-sm text-fg-muted">Remove favoritos, histórico, criações, coleções e preferências. Não dá para desfazer: exporte uma cópia antes.</p>
        <Button
          className="mt-4 text-error hover:border-error/60"
          icon="trash"
          onClick={async () => {
            if (!confirm('Apagar todos os seus dados do GLYPHOS neste navegador? Isso não pode ser desfeito.')) return
            await clearAllData()
            toast('Dados apagados', 'info')
          }}
        >
          Apagar tudo
        </Button>
      </section>
    </div>
  )
}
