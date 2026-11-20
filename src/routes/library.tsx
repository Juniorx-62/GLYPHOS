import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useMemo, useRef, useState } from 'react'
import { loadManifest } from '~/catalog'
import type { ManifestEntry } from '~/catalog/types'
import { clearAllData, createBackup, restoreBackup } from '~/data/backup'
import { createCollection, deleteCollection, renameCollection, toggleInCollection, useCollections } from '~/data/stores/collections'
import { clearFavorites, useFavorites } from '~/data/stores/favorites'
import { clearHistory, useHistory } from '~/data/stores/history'
import { useSettings } from '~/data/stores/settings'
import { useHydrated } from '~/hooks/use-media-query'
import { downloadBlob, plural } from '~/lib/utils'
import { Button, EmptyState, IconButton, Segmented, TextInput } from '~/components/ui/primitives'
import { toast } from '~/components/ui/toast'
import { StaticIconGrid } from '~/features/exploration/IconGrid'
import { pageHead } from '~/lib/seo'

type Tab = 'favorites' | 'recent' | 'collections' | 'data'
const TABS: Tab[] = ['favorites', 'recent', 'collections', 'data']

export const Route = createFileRoute('/library')({
  validateSearch: (raw: Record<string, unknown>): { tab?: Tab } => ({ tab: TABS.includes(raw.tab as Tab) ? (raw.tab as Tab) : undefined }),
  head: () => pageHead({ title: 'Minha biblioteca · GLYPHOS', description: 'Seus ícones favoritos, vistos recentemente e coleções pessoais, salvos neste navegador.', path: '/library', noindex: true }),
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
  return (
    <div className="mx-auto max-w-[1280px] px-4 pt-10 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight text-fg">Minha biblioteca</h1>
      <p className="mt-2 max-w-2xl text-base text-fg-muted">Favoritos, ícones vistos por último e suas coleções. Tudo fica neste navegador, sem cadastro; leve para outro aparelho com a cópia de segurança.</p>
      <div className="mt-6 overflow-x-auto">
        <Segmented
          label="Seção da biblioteca"
          value={tab}
          onChange={(t) => void navigate({ search: { tab: t === 'favorites' ? undefined : t }, replace: true })}
          options={[
            { value: 'favorites', label: `Favoritos${hydrated ? ` (${favorites.length})` : ''}` },
            { value: 'recent', label: 'Vistos por último' },
            { value: 'collections', label: `Coleções${hydrated ? ` (${collections.length})` : ''}` },
            { value: 'data', label: 'Dados e backup' },
          ]}
        />
      </div>
      <div className="mt-8">
        {!hydrated ? null : tab === 'favorites' ? (
          <SlugList slugs={favorites.map((f) => f.slug)} empty="Nenhum favorito ainda" hint="Toque no coração de um ícone para guardá-lo aqui." onClear={favorites.length ? () => clearFavorites() : undefined} clearLabel="Limpar favoritos" />
        ) : tab === 'recent' ? (
          <SlugList slugs={history.map((h) => h.slug)} empty="Nenhum ícone visto ainda" hint="Os ícones que você abrir aparecem aqui, do mais recente para o mais antigo." onClear={history.length ? () => clearHistory() : undefined} clearLabel="Limpar histórico" />
        ) : tab === 'collections' ? (
          <Collections />
        ) : (
          <DataPanel />
        )}
      </div>
    </div>
  )
}

function SlugList({ slugs, empty, hint, onClear, clearLabel }: { slugs: string[]; empty: string; hint: string; onClear?: () => void; clearLabel: string }) {
  const map = useManifestMap()
  const settings = useSettings()
  const entries = useMemo(() => (map ? slugs.map((s) => map.get(s)).filter((e): e is ManifestEntry => !!e) : []), [map, slugs])
  if (!slugs.length) {
    return (
      <EmptyState icon="heart" title={empty}>
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
          <section key={c.id} aria-label={c.name} className="rounded-xl border border-border bg-surface p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-md font-semibold text-fg">{c.name}</h2>
                <p className="text-xs text-fg-subtle">{plural(c.icons.length, 'ícone', 'ícones')}</p>
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
            ) : (
              <p className="text-sm text-fg-muted">Vazia. Abra um ícone e use o botão "Coleção" para incluir.</p>
            )}
          </section>
        )
      })}
    </div>
  )
}

function DataPanel() {
  const fileRef = useRef<HTMLInputElement>(null)
  return (
    <div className="grid max-w-2xl gap-4">
      <div className="rounded-xl border border-border bg-surface p-5">
        <h2 className="font-semibold text-fg">Cópia de segurança</h2>
        <p className="mt-1 text-sm text-fg-muted">Um arquivo JSON com favoritos, histórico, coleções e preferências. Use para levar seus dados a outro navegador ou aparelho.</p>
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
      </div>
      <div className="rounded-xl border border-border bg-surface p-5">
        <h2 className="font-semibold text-fg">Apagar dados deste navegador</h2>
        <p className="mt-1 text-sm text-fg-muted">Remove favoritos, histórico, coleções e preferências. Não dá para desfazer: exporte uma cópia antes.</p>
        <Button
          className="mt-4"
          icon="trash"
          onClick={async () => {
            if (!confirm('Apagar todos os seus dados do GLYPHOS neste navegador? Isso não pode ser desfeito.')) return
            await clearAllData()
            toast('Dados apagados', 'info')
          }}
        >
          Apagar tudo
        </Button>
      </div>
    </div>
  )
}
