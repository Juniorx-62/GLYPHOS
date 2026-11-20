/** Canonical text of a metadata file (src/catalog/metadata/<category>.json). */
import type { IconMeta } from '../../src/catalog/types.ts'

const KEY_ORDER: Array<keyof IconMeta> = ['id', 'slug', 'name', 'subcategory', 'family', 'variantOf', 'aliases', 'synonyms', 'tags', 'popularity', 'added', 'updated', 'author', 'source', 'license']

export function formatMetadata(entries: IconMeta[]): string {
  const sorted = [...entries].sort((a, b) => String(a.slug).localeCompare(String(b.slug)))
  const ordered = sorted.map((e) => {
    const out: Record<string, unknown> = {}
    for (const k of KEY_ORDER) if (e[k] !== undefined) out[k] = e[k]
    for (const k of Object.keys(e)) if (!(k in out)) out[k] = (e as unknown as Record<string, unknown>)[k]
    return out
  })
  // One icon per block, short lists on one line: diffs stay readable.
  const body = ordered
    .map((o) => '  ' + JSON.stringify(o, null, 2).replace(/\n/g, '\n  ').replace(/\[\s+([^\[\]{}]*?)\s+\]/g, (_, inner: string) => `[${inner.replace(/\s*\n\s*/g, ' ')}]`))
    .join(',\n')
  return `[\n${body}\n]\n`
}

