/** Favourite and add-to-collection controls for one icon (shared by the quick panel and the icon page). */
import { useId, useRef, useState } from 'react'
import { toggleFavorite, useIsFavorite } from '~/data/stores/favorites'
import { createCollection, toggleInCollection, useCollections } from '~/data/stores/collections'
import { Button, IconButton, TextInput } from '~/components/ui/primitives'
import { toast } from '~/components/ui/toast'
import { useHydrated } from '~/hooks/use-media-query'
import { cn } from '~/lib/utils'
import { UiIcon } from '~/components/icons/UiIcon'

export function FavoriteButton({ slug, name, withLabel = false }: { slug: string; name: string; withLabel?: boolean }) {
  const hydrated = useHydrated()
  const fav = useIsFavorite(slug) && hydrated
  const onClick = () => {
    toggleFavorite(slug)
    toast(fav ? `"${name}" saiu dos favoritos` : `"${name}" adicionado aos favoritos`, 'info')
  }
  if (withLabel) {
    return (
      <Button icon="heart" onClick={onClick} aria-pressed={fav} className={cn(fav && 'border-accent/40 text-accent-emphasis')}>
        {fav ? 'Nos favoritos' : 'Favoritar'}
      </Button>
    )
  }
  return (
    <IconButton
      icon="heart"
      iconStyle={fav ? 'solid' : 'outline'}
      label={fav ? `Remover "${name}" dos favoritos` : `Adicionar "${name}" aos favoritos`}
      pressed={fav}
      onClick={onClick}
      variant="outline"
      className={cn(fav && 'text-accent')}
    />
  )
}

/** A small popover listing the personal collections, with "new collection". */
export function CollectionMenu({ slug, name }: { slug: string; name: string }) {
  const collections = useCollections()
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState('')
  const id = useId()
  const ref = useRef<HTMLDivElement>(null)
  return (
    <div
      ref={ref}
      className="relative"
      onBlur={(e) => {
        if (!ref.current?.contains(e.relatedTarget as Node)) setOpen(false)
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape' && open) {
          e.stopPropagation()
          setOpen(false)
        }
      }}
    >
      <Button icon="bookmark" aria-expanded={open} aria-controls={`${id}-menu`} onClick={() => setOpen((v) => !v)}>
        Coleção
      </Button>
      {open && (
        <div id={`${id}-menu`} className="animate-in absolute top-full left-0 z-30 mt-2 w-64 rounded-lg border border-border bg-surface-overlay p-2 shadow-md">
          <p className="px-2 pt-1 pb-2 text-xs text-fg-subtle">Guardar "{name}" em:</p>
          <ul className="max-h-56 overflow-y-auto">
            {collections.map((c) => {
              const has = c.icons.includes(slug)
              return (
                <li key={c.id}>
                  <button
                    type="button"
                    role="menuitemcheckbox"
                    aria-checked={has}
                    onClick={() => toggleInCollection(c.id, slug)}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-fg hover:bg-muted"
                  >
                    <span className={cn('grid size-4 place-items-center rounded-xs border', has ? 'border-fg bg-fg text-background' : 'border-border-strong')}>{has && <UiIcon name="check" size={12} />}</span>
                    <span className="flex-1 truncate">{c.name}</span>
                    <span className="text-xs text-fg-subtle">{c.icons.length}</span>
                  </button>
                </li>
              )
            })}
            {!collections.length && <li className="px-2 py-1 text-xs text-fg-muted">Você ainda não tem coleções.</li>}
          </ul>
          <form
            className="mt-2 flex gap-1.5 border-t border-border pt-2"
            onSubmit={(e) => {
              e.preventDefault()
              if (!draft.trim()) return
              createCollection(draft, [slug])
              toast(`Coleção "${draft.trim()}" criada com "${name}"`)
              setDraft('')
            }}
          >
            <label htmlFor={`${id}-new`} className="sr-only">
              Nome da nova coleção
            </label>
            <TextInput id={`${id}-new`} value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Nova coleção" className="h-8" />
            <IconButton icon="plus" label="Criar coleção" type="submit" size="sm" variant="primary" className="size-8" />
          </form>
        </div>
      )}
    </div>
  )
}
