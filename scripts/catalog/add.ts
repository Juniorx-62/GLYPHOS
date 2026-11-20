/**
 * Adds or updates several icons at once from a plain-text batch file, the
 * fastest way to draw a series by hand:
 *
 *   npm run catalog:add -- caminho/do/lote.txt
 *
 * Format (blocks separated by a blank line; lines starting with # are comments):
 *
 *   category: animals
 *
 *   @ cat | pets | 3                       slug | subcategory | popularity (1–5)
 *   pt: Gato | felino, bichano | pet, miau   name | synonyms | tags (comma separated)
 *   en: Cat | kitty, feline | pet, animal
 *   family: cat                            optional
 *   variant-of: cat                        optional
 *   <path d="…" data-part="body"/>         the shapes, any number of lines
 *   <circle cx="9" cy="11" r="1"/>
 *
 * Existing icons keep their id and date (and get `updated`); new ones get a
 * new id and today's date. Drawings are written in the canonical format and
 * the batch is validated at the end.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { CATEGORIES, categoryById } from '../../src/catalog/categories/index.ts'
import { DEFAULT_AUTHOR, DEFAULT_LICENSE, DEFAULT_SOURCE } from '../../src/catalog/licenses.ts'
import { ROOT_ATTRS, parseIconSvg, serializeIconSvg } from '../../src/catalog/svg/parse.ts'
import type { IconMeta, Popularity } from '../../src/catalog/types.ts'
import { ICONS_DIR, METADATA_DIR, checkDrawing, newId, parseArgs, readMetadataFile, rel } from '../lib/catalog.ts'
import { formatMetadata } from '../lib/format-meta.ts'

const { positional, flags } = parseArgs()
if (!positional.length) {
  console.error('Uso: npm run catalog:add -- <lote.txt> [outro-lote.txt …]')
  process.exit(1)
}

const today = new Date().toLocaleDateString('sv-SE') // local yyyy-mm-dd
const splitList = (s: string | undefined) =>
  (s ?? '')
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean)

interface Draft {
  category: string
  slug: string
  subcategory?: string
  popularity: Popularity
  pt?: [string, string[], string[]]
  en?: [string, string[], string[]]
  family?: string
  variantOf?: string
  shapes: string[]
  line: number
}

const drafts: Draft[] = []
const errors: string[] = []
for (const path of positional) {
  const lines = readFileSync(path, 'utf8').replace(/\r\n/g, '\n').split('\n')
  let category = ''
  let current: Draft | null = null
  lines.forEach((raw, index) => {
    const line = raw.trim()
    const where = `${path}:${index + 1}`
    if (!line || line.startsWith('#')) return
    const header = /^category:\s*(\S+)$/.exec(line)
    if (header) {
      category = header[1]
      if (!categoryById(category)) errors.push(`${where}: categoria "${category}" não existe (${CATEGORIES.map((c) => c.id).join(', ')}).`)
      return
    }
    if (line.startsWith('@')) {
      const [slug, sub, pop] = line.slice(1).split('|').map((s) => s.trim())
      if (!category) errors.push(`${where}: declare "category: <id>" antes dos ícones.`)
      current = { category, slug, subcategory: sub || undefined, popularity: (Number(pop) || 3) as Popularity, shapes: [], line: index + 1 }
      drafts.push(current)
      return
    }
    if (!current) {
      errors.push(`${where}: linha fora de um ícone (comece cada ícone com "@ slug | subcategoria | popularidade").`)
      return
    }
    const d: Draft = current
    const lang = /^(pt|en):\s*(.*)$/.exec(line)
    if (lang) {
      const [name, syn, tags] = lang[2].split('|').map((s) => s.trim())
      d[lang[1] as 'pt' | 'en'] = [name, splitList(syn), splitList(tags)]
      return
    }
    const fam = /^family:\s*(\S+)$/.exec(line)
    if (fam) {
      d.family = fam[1]
      return
    }
    const variant = /^variant-of:\s*(\S+)$/.exec(line)
    if (variant) {
      d.variantOf = variant[1]
      return
    }
    if (line.startsWith('<')) {
      d.shapes.push(line)
      return
    }
    errors.push(`${where}: linha não reconhecida "${line.slice(0, 50)}".`)
  })
}
if (errors.length) {
  console.error(errors.join('\n'))
  process.exit(1)
}

const taken = new Set<string>()
const metaByCategory = new Map<string, IconMeta[]>()
for (const c of CATEGORIES) {
  const { entries } = readMetadataFile(c.id)
  metaByCategory.set(c.id, entries)
  for (const e of entries) taken.add(e.id)
}

const rootOpen = `<svg ${ROOT_ATTRS.map(([n, v]) => `${n}="${v}"`).join(' ')}>`
let written = 0
let problems = 0
// Only the metadata files this batch touches are rewritten: other people (or agents) may be editing the rest.
const touched = new Set<string>()
for (const d of drafts) {
  const label = `${d.category}/${d.slug}`
  if (!d.pt || !d.en) {
    console.log(`✗ ${label}: faltam as linhas "pt:" e "en:".`)
    problems++
    continue
  }
  const parsed = parseIconSvg(`${rootOpen}\n${d.shapes.join('\n')}\n</svg>\n`)
  const fatal = parsed.issues.filter((i) => i.level === 'error')
  if (fatal.length) {
    console.log(`✗ ${label}: ${fatal.map((i) => i.message).join(' · ')}`)
    problems++
    continue
  }
  const notes: string[] = []
  checkDrawing(parsed.nodes, (level, _code, message) => notes.push(`${level === 'error' ? '✗' : '!'} ${message}`))

  // A slug that already exists in another category is refused, unless the batch says --move
  // (then the icon moves there and keeps its id). Prevents two people claiming the same slug.
  const owner = [...metaByCategory].find(([cat, entries]) => cat !== d.category && entries.some((e) => e.slug === d.slug))?.[0]
  if (owner && !flags.has('move')) {
    console.log(`✗ ${label}: o slug "${d.slug}" já existe em ${owner}. Escolha outro slug, ou rode com --move para mover o ícone para ${d.category}.`)
    problems++
    continue
  }
  let previous: IconMeta | undefined
  for (const [cat, entries] of metaByCategory) {
    const i = entries.findIndex((e) => e.slug === d.slug)
    if (i >= 0) {
      previous = entries[i]
      entries.splice(i, 1)
      touched.add(cat)
      if (cat !== d.category) notes.push(`! movido de ${cat}`)
    }
  }
  const meta: IconMeta = {
    id: previous?.id || newId(taken),
    slug: d.slug,
    name: { pt: d.pt[0], en: d.en[0] },
    subcategory: d.subcategory,
    family: d.family,
    variantOf: d.variantOf,
    aliases: previous?.aliases,
    synonyms: { pt: d.pt[1], en: d.en[1] },
    tags: { pt: d.pt[2], en: d.en[2] },
    popularity: d.popularity,
    added: previous?.added ?? today,
    updated: previous ? today : undefined,
    author: previous?.author ?? DEFAULT_AUTHOR,
    source: previous?.source ?? DEFAULT_SOURCE,
    license: previous?.license ?? DEFAULT_LICENSE,
  }
  if (previous && previous.added === today) delete meta.updated
  metaByCategory.get(d.category)!.push(meta)
  touched.add(d.category)
  const dir = join(ICONS_DIR, d.category)
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, `${d.slug}.svg`), serializeIconSvg(parsed.nodes))
  written++
  if (notes.length) {
    problems += notes.filter((n) => n.startsWith('✗')).length
    console.log(`${label}\n  ${notes.join('\n  ')}`)
  }
}

for (const cat of touched) {
  const entries = metaByCategory.get(cat)!
  mkdirSync(METADATA_DIR, { recursive: true })
  writeFileSync(join(METADATA_DIR, `${cat}.json`), formatMetadata(entries))
}
console.log(`\n${written} ícone(s) gravado(s) em ${rel(ICONS_DIR)}${problems ? `, ${problems} com erro` : ''}.`)
console.log('Confira com npm run catalog:validate e npm run catalog:sheet.')
process.exitCode = problems ? 1 : 0
