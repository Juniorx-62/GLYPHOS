/**
 * Global search (Ctrl K / ⌘K, or "/"): icons first, then categories,
 * collections and pages. A native <dialog> (focus trapped, Esc closes and
 * returns focus) with a combobox + listbox driven by aria-activedescendant.
 *
 * Enter opens the item; Ctrl/⌘ + Enter copies the SVG of the selected icon.
 */
import { useNavigate } from '@tanstack/react-router'
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { CATEGORIES, COLLECTIONS, loadShard, renderIcon, toSvgString, unpack } from '~/catalog'
import type { ManifestEntry } from '~/catalog/types'
import { fold } from '~/catalog/search/normalize'
import { useAppearance } from '~/data/stores/settings'
import { useModKey } from '~/hooks/use-media-query'
import { cn, copyText } from '~/lib/utils'
import { LazyGlyph } from '~/features/exploration/LazyGlyph'
import { UiIcon } from '~/components/icons/UiIcon'
import type { UiIconName } from '~/components/icons/ui-icon-names'
import { Kbd } from '~/components/ui/primitives'
import { toast } from '~/components/ui/toast'
import { useIconSearch } from './use-search'

interface PaletteApi {
  open: (query?: string) => void
}
const PaletteContext = createContext<PaletteApi>({ open: () => {} })
export const useCommandPalette = () => useContext(PaletteContext)

interface PageItem {
  label: string
  to: string
  icon: UiIconName
  keywords: string
}

const PAGES: PageItem[] = [
  { label: 'Início', to: '/', icon: 'house', keywords: 'inicio home pagina inicial' },
  { label: 'Explorar ícones', to: '/icons', icon: 'layout-grid', keywords: 'explorar icones todos biblioteca grade' },
  { label: 'Categorias', to: '/categories', icon: 'layers', keywords: 'categorias grupos temas' },
  { label: 'Coleções', to: '/collections', icon: 'bookmark', keywords: 'colecoes conjuntos temas kits' },
  { label: 'Minha biblioteca', to: '/library', icon: 'heart', keywords: 'favoritos recentes historico minhas colecoes biblioteca backup' },
  { label: 'Sobre, grid e licença', to: '/about', icon: 'info', keywords: 'sobre licenca mit grid estilo contribuir creditos' },
]

type Item =
  | { kind: 'icon'; id: string; entry: ManifestEntry }
  | { kind: 'category'; id: string; label: string; to: string; count?: number }
  | { kind: 'collection'; id: string; label: string; to: string }
  | { kind: 'page'; id: string; page: PageItem }

export function CommandPaletteProvider({ children }: { children: ReactNode }) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [isOpen, setOpen] = useState(false)
  const [initial, setInitial] = useState('')
  const open = useCallback((query = '') => {
    setInitial(query)
    setOpen(true)
    dialogRef.current?.showModal()
  }, [])
  const close = useCallback(() => dialogRef.current?.close(), [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      const typing = !!target && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))
      if ((e.key === 'k' || e.key === 'K') && (e.ctrlKey || e.metaKey) && !e.altKey) {
        e.preventDefault()
        if (dialogRef.current?.open) close()
        else open()
      } else if (e.key === '/' && !typing && !e.ctrlKey && !e.metaKey && !dialogRef.current?.open) {
        e.preventDefault()
        open()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, close])

  const api = useMemo(() => ({ open }), [open])
  return (
    <PaletteContext.Provider value={api}>
      {children}
      <dialog
        ref={dialogRef}
        aria-label="Busca global"
        onClose={() => setOpen(false)}
        onClick={(e) => e.target === dialogRef.current && close()}
        className="m-auto mt-[10vh] w-[calc(100%-2rem)] max-w-xl overflow-hidden rounded-xl border border-border bg-surface-overlay p-0 text-fg shadow-lg max-sm:mt-4"
      >
        {isOpen && <PaletteBody initial={initial} onClose={close} />}
      </dialog>
    </PaletteContext.Provider>
  )
}

function PaletteBody({ initial, onClose }: { initial: string; onClose: () => void }) {
  const [query, setQuery] = useState(initial)
  const [active, setActive] = useState(0)
  const navigate = useNavigate()
  const appearance = useAppearance()
  const mod = useModKey()
  const { outcome, ready, error } = useIconSearch(query, { limit: 40 })
  const listRef = useRef<HTMLDivElement>(null)

  const items = useMemo<Item[]>(() => {
    const q = fold(query)
    const out: Item[] = []
    if (!q) {
      PAGES.forEach((p) => out.push({ kind: 'page', id: `page-${p.to}`, page: p }))
      return out
    }
    for (const e of outcome?.entries.slice(0, 24) ?? []) out.push({ kind: 'icon', id: `icon-${e.slug}`, entry: e })
    for (const c of CATEGORIES) {
      if (fold(`${c.name.pt} ${c.name.en}`).includes(q)) out.push({ kind: 'category', id: `cat-${c.id}`, label: c.name.pt, to: `/categories/${c.id}` })
    }
    for (const c of COLLECTIONS) if (fold(`${c.name} ${c.description}`).includes(q)) out.push({ kind: 'collection', id: `col-${c.id}`, label: c.name, to: `/collections/${c.id}` })
    for (const p of PAGES) if (fold(`${p.label} ${p.keywords}`).includes(q)) out.push({ kind: 'page', id: `page-${p.to}`, page: p })
    return out
  }, [query, outcome])

  useEffect(() => setActive(0), [query])
  useEffect(() => {
    listRef.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [active])

  const go = (item: Item) => {
    onClose()
    if (item.kind === 'icon') void navigate({ to: '/icons/$slug', params: { slug: item.entry.slug } })
    else if (item.kind === 'page') void navigate({ to: item.page.to })
    else void navigate({ to: item.to })
  }

  const copySvg = async (entry: ManifestEntry) => {
    const shard = await loadShard(entry.category)
    const icon = shard[entry.slug]
    if (!icon) return
    const style = icon.styles.includes(appearance.style) ? appearance.style : 'outline'
    const svg = toSvgString(
      renderIcon(unpack(icon.nodes), { style, strokeWidth: appearance.strokeWidth, color: appearance.color, opacity: appearance.opacity, override: icon.overrides?.[style] ? unpack(icon.overrides[style]!) : undefined }),
    )
    if (await copyText(svg)) toast(`SVG de "${entry.name.pt}" copiado`)
    else toast('Não foi possível copiar. Tente pela página do ícone.', 'error')
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((i) => Math.min(items.length - 1, i + 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((i) => Math.max(0, i - 1))
    } else if (e.key === 'Home') {
      setActive(0)
    } else if (e.key === 'End') {
      setActive(items.length - 1)
    } else if (e.key === 'Enter') {
      const item = items[active]
      if (!item) return
      e.preventDefault()
      if ((e.ctrlKey || e.metaKey) && item.kind === 'icon') void copySvg(item.entry)
      else go(item)
    }
  }

  const iconCount = items.filter((i) => i.kind === 'icon').length
  const activeId = items[active] ? `palette-${items[active].id}` : undefined

  return (
    <div onKeyDown={onKeyDown}>
      <div className="flex items-center gap-3 border-b border-border px-4">
        <UiIcon name="search" size={18} className="text-fg-subtle" />
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar ícones em português ou inglês…"
          role="combobox"
          aria-expanded="true"
          aria-controls="palette-list"
          aria-activedescendant={activeId}
          aria-autocomplete="list"
          className="h-14 min-w-0 flex-1 bg-transparent text-base text-fg outline-none placeholder:text-fg-subtle"
        />
        <Kbd>Esc</Kbd>
      </div>
      <div ref={listRef} id="palette-list" role="listbox" aria-label="Resultados" className="max-h-[min(60vh,28rem)] overflow-y-auto p-2">
        {query.trim() && !ready && !error && <p className="px-3 py-6 text-center text-sm text-fg-muted">Carregando o índice de busca…</p>}
        {error && <p className="px-3 py-6 text-center text-sm text-error">Não foi possível carregar a busca. Verifique a conexão e tente de novo.</p>}
        {query.trim() && ready && !items.length && (
          <p className="px-3 py-6 text-center text-sm text-fg-muted">Nada encontrado para "{query}". Tente um sinônimo, em português ou em inglês.</p>
        )}
        {outcome?.partial && iconCount > 0 && <p className="px-3 pt-1 pb-2 text-xs text-fg-subtle">Nenhum ícone tem todas as palavras; mostrando os mais próximos.</p>}
        {items.map((item, index) => {
          const selected = index === active
          const common = {
            id: `palette-${item.id}`,
            role: 'option' as const,
            'aria-selected': selected,
            'data-index': index,
            onMouseMove: () => setActive(index),
            onClick: () => go(item),
            className: cn('flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm', selected ? 'bg-muted text-fg' : 'text-fg-muted'),
          }
          if (item.kind === 'icon') {
            return (
              <div key={item.id} {...common}>
                <span className="grid size-8 place-items-center rounded-md border border-border bg-surface text-fg">
                  <LazyGlyph entry={item.entry} size={18} />
                </span>
                <span className="min-w-0 flex-1 truncate">
                  <span className="text-fg">{item.entry.name.pt}</span>
                  <span className="inscription ml-2 text-fg-subtle">{item.entry.slug}</span>
                </span>
                {selected && <span className="hidden text-xs text-fg-subtle sm:inline">{mod} ↵ copia o SVG</span>}
              </div>
            )
          }
          const label = item.kind === 'page' ? item.page.label : item.label
          const icon: UiIconName = item.kind === 'page' ? item.page.icon : item.kind === 'category' ? 'layers' : 'bookmark'
          const kind = item.kind === 'page' ? 'Página' : item.kind === 'category' ? 'Categoria' : 'Coleção'
          return (
            <div key={item.id} {...common}>
              <span className="grid size-8 place-items-center rounded-md bg-muted text-fg-muted">
                <UiIcon name={icon} size={16} />
              </span>
              <span className="flex-1 truncate text-fg">{label}</span>
              <span className="text-xs text-fg-subtle">{kind}</span>
            </div>
          )
        })}
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-border px-4 py-2.5 text-xs text-fg-subtle">
        <span className="inline-flex items-center gap-1">
          <Kbd>↑</Kbd>
          <Kbd>↓</Kbd> navegar
        </span>
        <span className="inline-flex items-center gap-1">
          <Kbd>↵</Kbd> abrir
        </span>
        <span className="inline-flex items-center gap-1">
          <Kbd>{mod}</Kbd>
          <Kbd>↵</Kbd> copiar SVG
        </span>
      </div>
    </div>
  )
}
