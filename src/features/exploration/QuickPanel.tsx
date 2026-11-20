/**
 * The selected icon, next to the grid (desktop) or in a bottom sheet (smaller
 * screens): large preview, copy and download, favourite, and the way to the
 * full page.
 */
import { Link } from '@tanstack/react-router'
import { useEffect, useRef } from 'react'
import { categoryById } from '~/catalog'
import type { ManifestEntry } from '~/catalog/types'
import { useAppearance } from '~/data/stores/settings'
import { useMediaQuery } from '~/hooks/use-media-query'
import { Glyph } from '~/components/icons/Glyph'
import { Button, IconButton } from '~/components/ui/primitives'
import { StylePicker } from '~/features/customization/AppearanceControls'
import { QuickExportActions } from '~/features/export/ExportPanel'
import { FavoriteButton } from '~/features/icon-preview/IconActions'
import { useShardIcon } from './LazyGlyph'

function PanelBody({ entry, onClose }: { entry: ManifestEntry; onClose: () => void }) {
  const icon = useShardIcon(entry)
  const a = useAppearance()
  const style = icon && icon.styles.includes(a.style) ? a.style : 'outline'
  const category = categoryById(entry.category)
  return (
    <div className="grid gap-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate text-md font-semibold text-fg">{entry.name.pt}</h2>
          <p className="inscription mt-0.5 truncate text-fg-subtle">{entry.slug}</p>
        </div>
        <IconButton icon="x" label="Fechar painel" size="sm" onClick={onClose} />
      </div>
      <div className="canvas-grid grid aspect-[4/3] place-items-center rounded-xl border border-border bg-surface" style={{ backgroundSize: 'calc(100% / 12) calc(100% / 9)' }}>
        {icon ? (
          <Glyph nodes={icon.nodes} override={icon.overrides?.[style]} style={style} size={96} strokeWidth={a.strokeWidth} color={a.color} opacity={a.opacity} label={entry.name.pt} />
        ) : (
          <span className="size-16 rounded-md bg-muted" aria-hidden />
        )}
      </div>
      <StylePicker available={icon?.styles ?? ['outline']} size="sm" className="w-full" />
      {icon && <QuickExportActions icon={icon} compact />}
      <div className="flex items-center gap-2">
        <FavoriteButton slug={entry.slug} name={entry.name.pt} />
        <Link to="/icons/$slug" params={{ slug: entry.slug }} className="flex-1">
          <Button variant="secondary" className="w-full">
            Ver página do ícone
          </Button>
        </Link>
      </div>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 border-t border-border pt-4 text-xs">
        <dt className="text-fg-subtle">Categoria</dt>
        <dd className="text-fg-muted">
          <Link to="/categories/$categoryId" params={{ categoryId: entry.category }} className="hover:text-fg hover:underline">
            {category?.name.pt}
          </Link>
        </dd>
        <dt className="text-fg-subtle">Inglês</dt>
        <dd className="text-fg-muted">{entry.name.en}</dd>
        <dt className="text-fg-subtle">Estilos</dt>
        <dd className="text-fg-muted">{entry.styles.length}</dd>
      </dl>
    </div>
  )
}

export function QuickPanel({ entry, onClose }: { entry: ManifestEntry | undefined; onClose: () => void }) {
  const desktop = useMediaQuery('(min-width: 1280px)')
  const sheet = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const d = sheet.current
    if (!d) return
    if (entry && !desktop && !d.open) d.showModal()
    if ((!entry || desktop) && d.open) d.close()
  }, [entry, desktop])

  return (
    <>
      {desktop && entry && (
        <aside aria-label="Ícone selecionado" className="sticky top-20 hidden max-h-[calc(100dvh-6rem)] w-80 shrink-0 overflow-y-auto rounded-xl border border-border bg-surface p-5 xl:block">
          <PanelBody entry={entry} onClose={onClose} />
        </aside>
      )}
      <dialog
        ref={sheet}
        aria-label={entry ? `Ícone ${entry.name.pt}` : 'Ícone'}
        onClose={() => entry && onClose()}
        onClick={(e) => e.target === sheet.current && sheet.current?.close()}
        className="mx-auto mt-auto mb-0 max-h-[88dvh] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-border bg-surface-overlay p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] text-fg"
      >
        {entry && !desktop && <PanelBody entry={entry} onClose={() => sheet.current?.close()} />}
      </dialog>
    </>
  )
}
