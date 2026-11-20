/** Guards for values read back from storage or from a backup file: they are user data. */
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export const isSlug = (v: unknown): v is string => typeof v === 'string' && v.length <= 80 && SLUG.test(v)
export const isIso = (v: unknown): v is string => typeof v === 'string' && !Number.isNaN(Date.parse(v))
export const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)

/** Keeps valid { slug, at } entries, first occurrence of each slug, at most `max`. */
export function cleanSlugEntries(data: unknown, max: number) {
  if (!Array.isArray(data)) return undefined
  const seen = new Set<string>()
  const out: Array<{ slug: string; at: string }> = []
  for (const e of data) {
    if (!isRecord(e) || !isSlug(e.slug) || !isIso(e.at) || seen.has(e.slug)) continue
    seen.add(e.slug)
    out.push({ slug: e.slug, at: e.at })
    if (out.length >= max) break
  }
  return out
}
