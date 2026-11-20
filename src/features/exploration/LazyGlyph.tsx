/**
 * Draws an icon known only by its manifest entry: the shard of its category
 * loads on first need (one cached request per category) and every icon of that
 * category becomes available at once. Until then a quiet placeholder keeps the
 * layout still.
 */
import { useEffect, useState } from 'react'
import { loadShard, shardIfLoaded } from '~/catalog'
import type { ManifestEntry, ShardIcon, StyleId } from '~/catalog/types'
import { Glyph } from '~/components/icons/Glyph'

export function useShardIcon(entry: Pick<ManifestEntry, 'slug' | 'category'> | undefined): ShardIcon | undefined {
  // The server never draws from this cache (the browser would not have it while hydrating);
  // server-rendered drawings come from loader data through `initial`.
  const [icon, setIcon] = useState<ShardIcon | undefined>(() => (entry && typeof window !== 'undefined' ? shardIfLoaded(entry.category)?.[entry.slug] : undefined))
  useEffect(() => {
    if (!entry) return
    const cached = shardIfLoaded(entry.category)?.[entry.slug]
    if (cached) {
      setIcon(cached)
      return
    }
    let alive = true
    loadShard(entry.category).then((s) => alive && setIcon(s[entry.slug]))
    return () => {
      alive = false
    }
  }, [entry?.slug, entry?.category])
  return icon
}

export function LazyGlyph({ entry, size = 24, style = 'outline', strokeWidth, color, opacity, className, initial }: {
  entry: Pick<ManifestEntry, 'slug' | 'category'>
  size?: number
  style?: StyleId
  strokeWidth?: number
  color?: string
  opacity?: number
  className?: string
  /** Drawing already known (from a loader): renders on the server with no request. */
  initial?: ShardIcon
}) {
  const loaded = useShardIcon(initial ? undefined : entry)
  const icon = initial ?? loaded
  if (!icon) return <span aria-hidden className="block rounded-xs bg-muted/70" style={{ width: size * 0.7, height: size * 0.7 }} />
  const s = icon.styles.includes(style) ? style : 'outline'
  return <Glyph nodes={icon.nodes} override={icon.overrides?.[s]} style={s} size={size} strokeWidth={strokeWidth} color={color} opacity={opacity} className={className} />
}
