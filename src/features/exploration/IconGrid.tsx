/**
 * The icon grid. Only the rows on screen (plus a margin) are in the DOM, so
 * the catalogue can grow to tens of thousands of icons with the same cost;
 * each tile loads its drawing through its category shard.
 *
 * Keyboard: Tab enters the grid on the selected (or first) icon; arrows move,
 * Home/End jump to the ends, Enter/Space open the icon.
 */
import { useWindowVirtualizer } from '@tanstack/react-virtual'
import { memo, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { ManifestEntry, ShardIcon } from '~/catalog/types'
import type { IconAppearance } from '~/data/types'
import { useIsFavorite } from '~/data/stores/favorites'
import { cn } from '~/lib/utils'
import { UiIcon } from '~/components/icons/UiIcon'
import { LazyGlyph } from './LazyGlyph'

const useIsoLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect

export interface GridOptions {
  appearance: IconAppearance
  showNames: boolean
  density: 'comfortable' | 'compact'
}

const MIN_CELL = { comfortable: 104, compact: 76 }
/** Below this width the virtual grid uses smaller cells, so phones show four columns. */
const NARROW = 520

export const IconTile = memo(function IconTile({ entry, selected, onSelect, appearance, showNames, density, index, initial, tabbable }: {
  entry: ManifestEntry
  selected: boolean
  onSelect: (e: ManifestEntry) => void
  appearance: IconAppearance
  showNames: boolean
  density: GridOptions['density']
  index: number
  initial?: ShardIcon
  tabbable: boolean
}) {
  const favorite = useIsFavorite(entry.slug)
  const iconSize = density === 'compact' ? 22 : 26
  return (
    <button
      type="button"
      data-index={index}
      data-slug={entry.slug}
      tabIndex={tabbable ? 0 : -1}
      onClick={() => onSelect(entry)}
      aria-label={entry.name.pt}
      aria-pressed={selected}
      title={`${entry.name.pt} · ${entry.slug}`}
      className={cn(
        'group relative flex h-full w-full flex-col items-center justify-center gap-2 rounded-lg border text-fg transition-colors duration-fast',
        selected ? 'border-fg bg-surface-elevated' : 'border-transparent hover:border-border hover:bg-surface',
      )}
    >
      <LazyGlyph entry={entry} initial={initial} size={iconSize} style={appearance.style} strokeWidth={appearance.strokeWidth} color={appearance.color} opacity={appearance.opacity} />
      {showNames && (
        <span className={cn('w-full truncate px-2 text-center leading-tight', density === 'compact' ? 'text-xs' : 'text-xs', selected ? 'text-fg' : 'text-fg-subtle group-hover:text-fg-muted')}>{entry.slug}</span>
      )}
      {favorite && <UiIcon name="heart" style="solid" size={12} className="absolute top-2 right-2 text-accent" />}
    </button>
  )
})

export function IconGrid({ entries, selected, onSelect, options, initialIcons, label }: {
  entries: ManifestEntry[]
  selected?: string
  onSelect: (e: ManifestEntry) => void
  options: GridOptions
  initialIcons?: Record<string, ShardIcon>
  label: string
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)
  const [offset, setOffset] = useState(0)

  useIsoLayoutEffect(() => {
    const el = containerRef.current
    if (!el) return
    const measure = () => {
      setWidth(el.clientWidth)
      setOffset(el.getBoundingClientRect().top + window.scrollY)
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const min = width && width < NARROW ? Math.min(MIN_CELL[options.density], 80) : MIN_CELL[options.density]
  const columns = Math.max(3, Math.floor((width || 960) / min))
  const cell = (width || 960) / columns
  const rowHeight = Math.round(options.showNames ? cell * 0.86 + 6 : cell * 0.72)
  const rows = Math.ceil(entries.length / columns)

  const virtualizer = useWindowVirtualizer({
    count: rows,
    estimateSize: () => rowHeight,
    overscan: 6,
    scrollMargin: offset,
    initialRect: { width: 1280, height: 900 },
  })
  useEffect(() => virtualizer.measure(), [rowHeight, columns, virtualizer])

  const selectedIndex = selected ? entries.findIndex((e) => e.slug === selected) : -1
  const [focusIndex, setFocusIndex] = useState(0)
  const tabIndex = selectedIndex >= 0 ? selectedIndex : Math.min(focusIndex, entries.length - 1)

  const focusAt = useCallback(
    (i: number) => {
      const index = Math.max(0, Math.min(entries.length - 1, i))
      setFocusIndex(index)
      virtualizer.scrollToIndex(Math.floor(index / columns), { align: 'auto' })
      requestAnimationFrame(() => requestAnimationFrame(() => containerRef.current?.querySelector<HTMLButtonElement>(`[data-index="${index}"]`)?.focus()))
    },
    [entries.length, columns, virtualizer],
  )

  const onKeyDown = (e: React.KeyboardEvent) => {
    const current = Number((e.target as HTMLElement).dataset.index)
    if (Number.isNaN(current)) return
    const moves: Record<string, number> = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: columns, ArrowUp: -columns, PageDown: columns * 4, PageUp: -columns * 4 }
    if (e.key in moves) {
      e.preventDefault()
      focusAt(current + moves[e.key])
    } else if (e.key === 'Home') {
      e.preventDefault()
      focusAt(0)
    } else if (e.key === 'End') {
      e.preventDefault()
      focusAt(entries.length - 1)
    }
  }

  return (
    <div ref={containerRef} role="group" aria-label={label} onKeyDown={onKeyDown} className="relative w-full" style={{ height: rows * rowHeight }}>
      {virtualizer.getVirtualItems().map((row) => {
        const start = row.index * columns
        return (
          <div
            key={row.key}
            className="absolute inset-x-0 grid"
            style={{ top: row.start - virtualizer.options.scrollMargin, height: rowHeight, gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
          >
            {entries.slice(start, start + columns).map((entry, k) => (
              <div key={entry.slug} className="p-0.5">
                <IconTile
                  entry={entry}
                  index={start + k}
                  selected={entry.slug === selected}
                  tabbable={start + k === tabIndex}
                  onSelect={onSelect}
                  appearance={options.appearance}
                  showNames={options.showNames}
                  density={options.density}
                  initial={initialIcons?.[entry.slug]}
                />
              </div>
            ))}
          </div>
        )
      })}
    </div>
  )
}

/** A plain, non-virtual grid for small lists (category and collection pages, home). Server-rendered. */
export function StaticIconGrid({ entries, icons, onSelect, options, selected, label }: {
  entries: ManifestEntry[]
  icons?: Record<string, ShardIcon>
  onSelect?: (e: ManifestEntry) => void
  options: GridOptions
  selected?: string
  label: string
}) {
  const min = MIN_CELL[options.density]
  return (
    <ul aria-label={label} className="grid gap-1" style={{ gridTemplateColumns: `repeat(auto-fill, minmax(min(${min - 8}px, 22vw), 1fr))` }}>
      {entries.map((entry, i) => (
        <li key={entry.slug} className={options.showNames ? 'aspect-[1/0.86]' : 'aspect-square'}>
          {onSelect ? (
            <IconTile
              entry={entry}
              index={i}
              selected={entry.slug === selected}
              tabbable
              onSelect={onSelect}
              appearance={options.appearance}
              showNames={options.showNames}
              density={options.density}
              initial={icons?.[entry.slug]}
            />
          ) : (
            <a
              href={`/icons/${entry.slug}`}
              title={`${entry.name.pt} · ${entry.slug}`}
              className="group flex h-full w-full flex-col items-center justify-center gap-2 rounded-lg border border-transparent text-fg transition-colors hover:border-border hover:bg-surface"
            >
              <LazyGlyph
                entry={entry}
                initial={icons?.[entry.slug]}
                size={26}
                style={options.appearance.style}
                strokeWidth={options.appearance.strokeWidth}
                color={options.appearance.color}
                opacity={options.appearance.opacity}
              />
              {options.showNames && <span className="w-full truncate px-2 text-center text-xs text-fg-subtle group-hover:text-fg-muted">{entry.name.pt}</span>}
              <span className="sr-only">{entry.slug}</span>
            </a>
          )}
        </li>
      ))}
    </ul>
  )
}
