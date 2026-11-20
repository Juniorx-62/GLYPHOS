/**
 * GLYPHOS search: an inverted index built once from the catalogue
 * (`buildSearchIndex`, at `npm run catalog:index`) and queried in the browser
 * (`createSearcher`). Pure functions, no DOM, so it runs in tests, in Node and
 * in a worker unchanged.
 *
 * Matching, per query word:
 *   exact word → prefix of a word (as you type) → lexicon equivalents
 *   (excluir ↔ apagar ↔ trash) → one typo of tolerance for longer words.
 * Every query word (or lexicon phrase, "carrinho de compras") must match;
 * when nothing matches all of them, results that match some are returned and
 * flagged as partial. Scores weigh where the word was found (name > synonym >
 * tag > category), then editorial popularity.
 */
import { editDistance, fold, tokenize } from './normalize'

export interface SearchDocument {
  slug: string
  name: { pt: string; en: string }
  synonyms: { pt: string[]; en: string[] }
  tags: { pt: string[]; en: string[] }
  aliases?: string[]
  family?: string
  category: { pt: string; en: string; id: string }
  subcategory?: { pt: string; en: string; id: string }
  popularity: number
}

/** Serializable index (generated JSON). */
export interface SearchIndex {
  v: 1
  slugs: string[]
  /** Folded names, for exact-phrase bonuses: [pt, en] per icon. */
  names: Array<[string, string]>
  popularity: number[]
  /** Sorted unique terms. */
  terms: string[]
  /** For each term, flat pairs [iconIndex, weight, iconIndex, weight, …]. */
  postings: number[][]
  /** Lexicon groups, already tokenised: each entry is one or more tokens. */
  lexicon: string[][][]
}

export const FIELD_WEIGHT = {
  name: 10,
  slug: 9,
  synonym: 7,
  alias: 6,
  tag: 4,
  family: 3,
  subcategory: 2,
  category: 1.5,
} as const

export function buildSearchIndex(docs: SearchDocument[], lexicon: string[][]): SearchIndex {
  const postings = new Map<string, Map<number, number>>()
  const add = (term: string, icon: number, weight: number) => {
    let entry = postings.get(term)
    if (!entry) postings.set(term, (entry = new Map()))
    if ((entry.get(icon) ?? 0) < weight) entry.set(icon, weight)
  }
  docs.forEach((doc, i) => {
    const put = (text: string | undefined, weight: number) => {
      if (text) for (const t of tokenize(text)) add(t, i, weight)
    }
    put(doc.name.pt, FIELD_WEIGHT.name)
    put(doc.name.en, FIELD_WEIGHT.name)
    put(doc.slug.replace(/-/g, ' '), FIELD_WEIGHT.slug)
    for (const s of [...doc.synonyms.pt, ...doc.synonyms.en]) put(s, FIELD_WEIGHT.synonym)
    for (const s of doc.aliases ?? []) put(s.replace(/-/g, ' '), FIELD_WEIGHT.alias)
    for (const s of [...doc.tags.pt, ...doc.tags.en]) put(s, FIELD_WEIGHT.tag)
    if (doc.family) put(doc.family.replace(/-/g, ' '), FIELD_WEIGHT.family)
    if (doc.subcategory) {
      put(doc.subcategory.pt, FIELD_WEIGHT.subcategory)
      put(doc.subcategory.en, FIELD_WEIGHT.subcategory)
    }
    put(doc.category.pt, FIELD_WEIGHT.category)
    put(doc.category.en, FIELD_WEIGHT.category)
  })
  const terms = [...postings.keys()].sort()
  return {
    v: 1,
    slugs: docs.map((d) => d.slug),
    names: docs.map((d) => [fold(d.name.pt), fold(d.name.en)]),
    popularity: docs.map((d) => d.popularity),
    terms,
    postings: terms.map((t) => [...postings.get(t)!.entries()].flat()),
    lexicon: lexicon.map((group) => group.map((entry) => tokenize(entry)).filter((tokens) => tokens.length > 0)),
  }
}

export interface SearchHit {
  /** Position of the icon in the index (same order as the manifest). */
  index: number
  slug: string
  score: number
}

export interface SearchResult {
  hits: SearchHit[]
  /** True when no icon matched every word and the hits match only some of them. */
  partial: boolean
  /** Query words that matched nothing at all. */
  unmatched: string[]
}

interface Alternative {
  tokens: string[]
  factor: number
}

const EXACT = 1
const PREFIX_BASE = 0.55
const LEXICON_FACTOR = 0.6
const FUZZY_FACTOR = 0.45

export function createSearcher(index: SearchIndex) {
  const { terms, postings } = index
  // token → lexicon groups that contain it as a one-word entry
  const groupsByToken = new Map<string, number[]>()
  index.lexicon.forEach((group, g) => {
    for (const entry of group) {
      if (entry.length === 1) groupsByToken.set(entry[0], [...(groupsByToken.get(entry[0]) ?? []), g])
    }
  })
  const termsByInitial = new Map<string, number[]>()
  terms.forEach((t, i) => termsByInitial.set(t[0], [...(termsByInitial.get(t[0]) ?? []), i]))

  const lowerBound = (prefix: string) => {
    let lo = 0
    let hi = terms.length
    while (lo < hi) {
      const mid = (lo + hi) >>> 1
      if (terms[mid] < prefix) lo = mid + 1
      else hi = mid
    }
    return lo
  }

  /** Scores of one token (with prefix and fuzzy matching) per icon. */
  function matchToken(token: string, factor: number, allowPrefix: boolean, out: Map<number, number>) {
    let found = false
    const apply = (termIndex: number, f: number) => {
      const list = postings[termIndex]
      for (let k = 0; k < list.length; k += 2) {
        const score = list[k + 1] * f
        if ((out.get(list[k]) ?? 0) < score) out.set(list[k], score)
      }
      found = true
    }
    let i = lowerBound(token)
    if (terms[i] === token) {
      apply(i, factor * EXACT)
      i++
    }
    if (allowPrefix && token.length >= 2) {
      for (; i < terms.length && terms[i].startsWith(token); i++) apply(i, factor * (PREFIX_BASE + 0.35 * (token.length / terms[i].length)))
    }
    if (!found && token.length >= 4) {
      const max = token.length >= 8 ? 2 : 1
      for (const t of termsByInitial.get(token[0]) ?? []) {
        if (editDistance(token, terms[t], max) <= max) apply(t, factor * FUZZY_FACTOR)
      }
    }
    return found
  }

  function scoreAlternatives(alternatives: Alternative[], allowPrefix: boolean): { scores: Map<number, number>; found: boolean } {
    const scores = new Map<number, number>()
    let found = false
    for (const alt of alternatives) {
      if (alt.tokens.length === 1) {
        if (matchToken(alt.tokens[0], alt.factor, allowPrefix, scores)) found = true
        continue
      }
      // A multi-word alternative matches icons that have every word of it.
      let combined: Map<number, number> | null = null
      for (const t of alt.tokens) {
        const m = new Map<number, number>()
        matchToken(t, alt.factor, false, m)
        if (!combined) combined = m
        else {
          const next = new Map<number, number>()
          for (const [icon, s] of combined) if (m.has(icon)) next.set(icon, s + m.get(icon)!)
          combined = next
        }
      }
      for (const [icon, s] of combined ?? []) {
        const v = s / alt.tokens.length
        if ((scores.get(icon) ?? 0) < v) scores.set(icon, v)
        found = true
      }
    }
    return { scores, found }
  }

  /** Splits the query into slots: lexicon phrases first, then single words with their equivalents. */
  function slotsOf(tokens: string[]): Array<{ label: string; alternatives: Alternative[]; last: boolean }> {
    const slots: Array<{ label: string; alternatives: Alternative[]; last: boolean }> = []
    let i = 0
    while (i < tokens.length) {
      let matched = false
      for (let g = 0; g < index.lexicon.length && !matched; g++) {
        for (const entry of index.lexicon[g]) {
          if (entry.length < 2 || entry.length > tokens.length - i) continue
          if (entry.every((t, k) => tokens[i + k] === t)) {
            const alternatives: Alternative[] = [{ tokens: entry, factor: EXACT }]
            for (const other of index.lexicon[g]) if (other !== entry) alternatives.push({ tokens: other, factor: LEXICON_FACTOR })
            slots.push({ label: entry.join(' '), alternatives, last: i + entry.length === tokens.length })
            i += entry.length
            matched = true
            break
          }
        }
      }
      if (matched) continue
      const token = tokens[i]
      const alternatives: Alternative[] = [{ tokens: [token], factor: EXACT }]
      for (const g of groupsByToken.get(token) ?? []) {
        for (const other of index.lexicon[g]) if (!(other.length === 1 && other[0] === token)) alternatives.push({ tokens: other, factor: LEXICON_FACTOR })
      }
      slots.push({ label: token, alternatives, last: i === tokens.length - 1 })
      i++
    }
    return slots
  }

  function search(query: string, { limit = Infinity }: { limit?: number } = {}): SearchResult {
    const tokens = tokenize(query)
    if (!tokens.length) return { hits: [], partial: false, unmatched: [] }
    const slots = slotsOf(tokens)
    const perSlot = slots.map((slot) => {
      // The word being typed (the last one) also matches as a prefix; earlier words too, but only from 2 letters.
      const primary = scoreAlternatives(slot.alternatives.slice(0, 1), true)
      const equivalents = scoreAlternatives(slot.alternatives.slice(1), false)
      for (const [icon, s] of equivalents.scores) if ((primary.scores.get(icon) ?? 0) < s) primary.scores.set(icon, s)
      return { slot, scores: primary.scores, found: primary.found || equivalents.found }
    })
    const unmatched = perSlot.filter((s) => !s.found).map((s) => s.slot.label)

    const total = new Map<number, { score: number; slots: number }>()
    for (const { scores } of perSlot) {
      for (const [icon, s] of scores) {
        const t = total.get(icon) ?? { score: 0, slots: 0 }
        t.score += s
        t.slots += 1
        total.set(icon, t)
      }
    }
    let entries = [...total.entries()].filter(([, t]) => t.slots === slots.length)
    let partial = false
    if (!entries.length && slots.length > 1) {
      partial = true
      entries = [...total.entries()]
    }
    const folded = fold(query)
    const hits: SearchHit[] = entries.map(([icon, t]) => {
      let score = t.score + (partial ? t.slots * 5 : 0)
      const [pt, en] = index.names[icon]
      // Whole-name and whole-word-prefix bonuses only: "cart" must not favour "Cartão".
      if (pt === folded || en === folded) score += 15
      else if (pt.startsWith(folded + ' ') || en.startsWith(folded + ' ')) score += 6
      score += index.popularity[icon] * 0.4
      return { index: icon, slug: index.slugs[icon], score }
    })
    hits.sort((a, b) => b.score - a.score || a.slug.localeCompare(b.slug))
    return { hits: Number.isFinite(limit) ? hits.slice(0, limit) : hits, partial, unmatched }
  }

  return { search }
}

export type Searcher = ReturnType<typeof createSearcher>
