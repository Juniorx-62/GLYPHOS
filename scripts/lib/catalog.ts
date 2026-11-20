/**
 * Reads the catalogue from disk and checks it. Shared by every catalogue
 * script (index, validate, stats, format, sheet) so they all agree on what an
 * icon is and what is wrong with it.
 */
import { randomBytes } from 'node:crypto'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { CATEGORIES, categoryById } from '../../src/catalog/categories/index.ts'
import { LICENSES, SOURCES } from '../../src/catalog/licenses.ts'
import { derivableStyles, styleById } from '../../src/catalog/styles/index.ts'
import { allPoints, boundsOf, containsPoint, isClosed, raster } from '../../src/catalog/svg/geometry.ts'
import { parseIconSvg, serializeIconSvg, type Issue } from '../../src/catalog/svg/parse.ts'
import type { IconMeta, IconNode, StyleId } from '../../src/catalog/types.ts'

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')
export const CATALOG_DIR = join(ROOT, 'src/catalog')
export const ICONS_DIR = join(CATALOG_DIR, 'icons')
export const METADATA_DIR = join(CATALOG_DIR, 'metadata')
export const GENERATED_DIR = join(CATALOG_DIR, 'registry/generated')

export const rel = (path: string) => relative(ROOT, path).replace(/\\/g, '/')

export interface LoadedIcon {
  meta: IconMeta
  category: string
  file: string
  /** Raw text of the master file (undefined when the file is missing). */
  text?: string
  nodes: IconNode[]
  overrides: Partial<Record<StyleId, IconNode[]>>
  styles: StyleId[]
}

export interface Problem extends Issue {
  /** Icon slug, category id or file the problem is about. */
  subject: string
  category?: string
}

export interface Catalog {
  icons: LoadedIcon[]
  problems: Problem[]
}

export const ID_ALPHABET = '0123456789abcdefghjkmnpqrstvwxyz'
/** A new random id that is not in `taken` (and is added to it). */
export function newId(taken: Set<string>): string {
  for (;;) {
    const bytes = randomBytes(7)
    const id = 'g' + [...bytes].map((b) => ID_ALPHABET[b % 32]).join('')
    if (!taken.has(id)) {
      taken.add(id)
      return id
    }
  }
}

const ID_RE = new RegExp(`^g[${ID_ALPHABET}]{7}$`)
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export function readMetadataFile(category: string): { entries: IconMeta[]; error?: string } {
  const file = join(METADATA_DIR, `${category}.json`)
  if (!existsSync(file)) return { entries: [] }
  try {
    const data = JSON.parse(readFileSync(file, 'utf8')) as unknown
    if (!Array.isArray(data)) return { entries: [], error: 'O arquivo precisa conter uma lista (array) de ícones.' }
    return { entries: data as IconMeta[] }
  } catch (e) {
    return { entries: [], error: `JSON inválido: ${(e as Error).message}` }
  }
}

const isStringList = (v: unknown): v is string[] => Array.isArray(v) && v.every((s) => typeof s === 'string' && s.trim() !== '')

function checkMeta(meta: IconMeta, category: string, push: (level: Issue['level'], code: string, message: string) => void) {
  const m = meta as unknown as Record<string, unknown>
  if (typeof meta.slug !== 'string' || !SLUG_RE.test(meta.slug)) push('error', 'meta', `slug "${String(meta.slug)}" precisa ser kebab-case em inglês (a-z, 0-9 e hífens).`)
  if (typeof meta.id !== 'string' || !ID_RE.test(meta.id)) push('error', 'meta', `id ausente ou inválido (${String(meta.id)}). Rode npm run catalog:ids.`)
  if (!meta.name || typeof meta.name.pt !== 'string' || !meta.name.pt.trim() || typeof meta.name.en !== 'string' || !meta.name.en.trim()) {
    push('error', 'meta', 'name precisa ter pt e en.')
  }
  for (const field of ['synonyms', 'tags'] as const) {
    const v = meta[field]
    if (!v || !isStringList(v.pt) || !isStringList(v.en)) push('error', 'meta', `${field} precisa ter as listas pt e en (podem ser vazias).`)
  }
  if (meta.tags && meta.synonyms && isStringList(meta.tags.pt) && isStringList(meta.synonyms.pt)) {
    const pt = meta.tags.pt.length + meta.synonyms.pt.length
    const en = (meta.tags.en?.length ?? 0) + (meta.synonyms.en?.length ?? 0)
    if (pt < 2 || en < 2) push('warning', 'keywords', `Poucas palavras-chave (pt: ${pt}, en: ${en}). Use ao menos 2 por idioma entre sinônimos e tags.`)
    for (const lang of ['pt', 'en'] as const) {
      const all = [meta.name[lang], ...(meta.tags[lang] ?? []), ...(meta.synonyms[lang] ?? [])].map((s) => String(s).toLowerCase())
      if (new Set(all).size !== all.length) push('warning', 'keywords', `Palavras-chave repetidas (${lang}) entre nome, sinônimos e tags.`)
    }
  }
  if (meta.subcategory !== undefined) {
    const cat = categoryById(category)
    if (!cat?.subcategories.some((s) => s.id === meta.subcategory)) push('error', 'meta', `subcategoria "${meta.subcategory}" não existe em ${category}.`)
  }
  if (![1, 2, 3, 4, 5].includes(meta.popularity)) push('error', 'meta', 'popularity precisa ser 1, 2, 3, 4 ou 5.')
  if (typeof meta.added !== 'string' || !DATE_RE.test(meta.added) || Number.isNaN(Date.parse(meta.added))) push('error', 'meta', 'added precisa ser uma data yyyy-mm-dd.')
  else if (Date.parse(meta.added) > Date.now() + 86400000) push('error', 'meta', 'added está no futuro.')
  if (meta.updated !== undefined && (typeof meta.updated !== 'string' || !DATE_RE.test(meta.updated))) push('error', 'meta', 'updated precisa ser uma data yyyy-mm-dd.')
  if (typeof meta.author !== 'string' || !meta.author.trim()) push('error', 'license', 'author é obrigatório.')
  const source = SOURCES[meta.source]
  if (!source) push('error', 'license', `source "${String(meta.source)}" não está registrado em src/catalog/licenses.ts.`)
  if (!LICENSES[meta.license]) push('error', 'license', `license "${String(meta.license)}" não está registrada em src/catalog/licenses.ts.`)
  else if (source && !source.licenses.includes(meta.license)) push('error', 'license', `A fonte ${source.id} não oferece a licença ${meta.license}.`)
  if (meta.aliases !== undefined && (!isStringList(meta.aliases) || meta.aliases.some((a) => !SLUG_RE.test(a)))) push('error', 'meta', 'aliases precisa ser uma lista de slugs.')
  if (meta.family !== undefined && (typeof meta.family !== 'string' || !SLUG_RE.test(meta.family))) push('error', 'meta', 'family precisa ser um slug.')
  const known = new Set(['id', 'slug', 'name', 'subcategory', 'synonyms', 'tags', 'family', 'variantOf', 'aliases', 'popularity', 'added', 'updated', 'author', 'source', 'license'])
  for (const key of Object.keys(m)) if (!known.has(key)) push('error', 'meta', `Campo desconhecido "${key}".`)
}

/** Geometry and role checks of one drawing. */
export function checkDrawing(nodes: IconNode[], push: (level: Issue['level'], code: string, message: string) => void) {
  if (!nodes.length) return
  let b
  try {
    b = boundsOf(nodes)
  } catch (e) {
    push('error', 'geometry', `Não foi possível ler a geometria: ${(e as Error).message}`)
    return
  }
  if (b.minX < 0.75 || b.minY < 0.75 || b.maxX > 23.25 || b.maxY > 23.25) {
    push('error', 'bounds', `O desenho sai da área do ícone (de ${b.minX.toFixed(2)},${b.minY.toFixed(2)} a ${b.maxX.toFixed(2)},${b.maxY.toFixed(2)}). O traço fica cortado: mantenha entre 1 e 23.`)
  } else if (b.minX < 1.5 || b.minY < 1.5 || b.maxX > 22.5 || b.maxY > 22.5) {
    push('warning', 'bounds', `O desenho encosta na borda (de ${b.minX.toFixed(2)},${b.minY.toFixed(2)} a ${b.maxX.toFixed(2)},${b.maxY.toFixed(2)}). A área viva é de 2 a 22.`)
  }
  const w = b.maxX - b.minX
  const h = b.maxY - b.minY
  if (Math.max(w, h) < 10) push('warning', 'proportion', `O desenho é pequeno demais (${w.toFixed(1)} × ${h.toFixed(1)}). Ocupe a área viva: o lado maior deve ter de 16 a 20 unidades.`)
  if (nodes.length > 18) push('warning', 'complexity', `${nodes.length} formas: simplifique (até 12 é o ideal).`)
  const chars = nodes.reduce((s, n) => s + Object.values(n.attrs).join(' ').length, 0)
  if (chars > 1400) push('warning', 'complexity', `Geometria muito longa (${chars} caracteres): simplifique os caminhos.`)

  const bodies = nodes.filter((n) => n.part === 'body')
  const seen = new Set<string>()
  for (const node of nodes) {
    const key = `${node.tag}|${JSON.stringify(node.attrs)}`
    if (seen.has(key)) push('warning', 'duplicate-shape', `Forma repetida: <${node.tag}> desenhada duas vezes.`)
    seen.add(key)
    if (node.part === 'body' && !isClosed(node)) push('error', 'role', `Uma forma body (<${node.tag}>) precisa ser fechada (termine o caminho com Z).`)
    if ((node.part === 'cut' || node.part === 'slash') && !bodies.length) push('error', 'role', `Há formas ${node.part}, mas nenhuma body para recortar.`)
    if (node.part === 'body') continue
    const pts = allPoints(node)
    if (!pts.length || !bodies.length) continue
    const inside = pts.filter((p) => bodies.some((body) => body !== node && containsPoint(body, p))).length / pts.length
    if (node.part === 'cut' && inside < 0.6) push('warning', 'role', `Uma forma cut (<${node.tag}>) está quase toda fora das formas body: no Sólido ela some.`)
    if (node.part === 'line' && inside > 0.92 && node.attrs.fill !== 'currentColor') {
      push('warning', 'role', `Uma forma line (<${node.tag}>) está dentro de uma forma body: no Sólido ela fica invisível. Marque com data-part="cut".`)
    }
  }
}

/** Loads every category: metadata, master drawings and hand-drawn styles. */
export function loadCatalog({ only }: { only?: string[] } = {}): Catalog {
  const icons: LoadedIcon[] = []
  const problems: Problem[] = []
  const categories = CATEGORIES.filter((c) => !only || only.includes(c.id))

  if (existsSync(METADATA_DIR)) {
    for (const file of readdirSync(METADATA_DIR)) {
      const id = file.replace(/\.json$/, '')
      if (!file.endsWith('.json') || !categoryById(id)) {
        problems.push({ level: 'error', code: 'orphan', subject: `src/catalog/metadata/${file}`, message: 'Arquivo de metadados sem categoria registrada em src/catalog/categories/index.ts.' })
      }
    }
  }

  for (const category of categories) {
    const { entries, error } = readMetadataFile(category.id)
    if (error) problems.push({ level: 'error', code: 'meta', subject: `metadata/${category.id}.json`, category: category.id, message: error })
    const dir = join(ICONS_DIR, category.id)
    const files = existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith('.svg')) : []
    const bySlug = new Map(entries.map((e) => [e.slug, e]))

    for (const meta of entries) {
      const subject = String(meta.slug)
      const push = (level: Issue['level'], code: string, message: string) => problems.push({ level, code, subject, category: category.id, message })
      checkMeta(meta, category.id, push)
      const file = join(dir, `${meta.slug}.svg`)
      const icon: LoadedIcon = { meta, category: category.id, file, nodes: [], overrides: {}, styles: [] }
      if (!existsSync(file)) push('error', 'missing-file', `Falta o desenho ${rel(file)}.`)
      else {
        icon.text = readFileSync(file, 'utf8')
        const parsed = parseIconSvg(icon.text)
        for (const issue of parsed.issues) push(issue.level, issue.code, issue.message)
        if (!parsed.issues.some((i) => i.level === 'error')) {
          icon.nodes = parsed.nodes
          if (serializeIconSvg(parsed.nodes) !== icon.text.replace(/\r\n/g, '\n')) push('error', 'format', 'O arquivo não está no formato canônico. Rode npm run catalog:format.')
          checkDrawing(parsed.nodes, push)
        }
      }
      icon.styles = derivableStyles(icon.nodes)
      icons.push(icon)
    }

    for (const f of files) {
      const [slug, style, ...rest] = f.replace(/\.svg$/, '').split('.')
      if (rest.length) {
        problems.push({ level: 'error', code: 'orphan', subject: f, category: category.id, message: 'Nome de arquivo inválido: use <slug>.svg ou <slug>.<estilo>.svg.' })
        continue
      }
      if (!bySlug.has(slug)) {
        problems.push({ level: 'error', code: 'orphan', subject: f, category: category.id, message: `Desenho sem metadados: acrescente "${slug}" em src/catalog/metadata/${category.id}.json.` })
        continue
      }
      if (!style) continue
      const def = styleById(style)
      const icon = icons.find((i) => i.category === category.id && i.meta.slug === slug)
      if (!def || def.id === 'outline' || !icon) {
        problems.push({ level: 'error', code: 'orphan', subject: f, category: category.id, message: `Estilo "${style}" desconhecido (veja src/catalog/styles/index.ts).` })
        continue
      }
      const text = readFileSync(join(dir, f), 'utf8')
      const parsed = parseIconSvg(text)
      const push = (level: Issue['level'], code: string, message: string) => problems.push({ level, code, subject: f, category: category.id, message })
      for (const issue of parsed.issues) {
        // Filled drawings legitimately differ from the stroked root; everything else applies.
        if (def.id === 'filled' && issue.code === 'root') continue
        push(issue.level, issue.code, issue.message)
      }
      if (!parsed.issues.some((i) => i.level === 'error' && !(def.id === 'filled' && i.code === 'root'))) {
        icon.overrides[def.id] = parsed.nodes
        checkDrawing(parsed.nodes, push)
        if (!icon.styles.includes(def.id)) icon.styles.push(def.id)
      }
    }
  }

  // Global uniqueness: ids, slugs, aliases; and references between icons.
  const slugs = new Map<string, LoadedIcon[]>()
  const ids = new Map<string, LoadedIcon[]>()
  for (const icon of icons) {
    slugs.set(icon.meta.slug, [...(slugs.get(icon.meta.slug) ?? []), icon])
    if (icon.meta.id) ids.set(icon.meta.id, [...(ids.get(icon.meta.id) ?? []), icon])
  }
  for (const [slug, list] of slugs) {
    if (list.length > 1) problems.push({ level: 'error', code: 'duplicate-slug', subject: slug, message: `slug repetido em: ${list.map((i) => i.category).join(', ')}.` })
  }
  for (const [id, list] of ids) {
    if (list.length > 1) problems.push({ level: 'error', code: 'duplicate-id', subject: id, message: `id repetido em: ${list.map((i) => `${i.category}/${i.meta.slug}`).join(', ')}.` })
  }
  // Two icons with the same Portuguese name confuse whoever searches: warn.
  const names = new Map<string, LoadedIcon[]>()
  for (const icon of icons) {
    const key = String(icon.meta.name?.pt ?? '').toLowerCase()
    if (key) names.set(key, [...(names.get(key) ?? []), icon])
  }
  for (const [name, list] of names) {
    if (list.length > 1) {
      problems.push({ level: 'warning', code: 'duplicate-name', subject: list[0].meta.slug, category: list[0].category, message: `O nome "${name}" também é de ${list.slice(1).map((i) => `${i.category}/${i.meta.slug}`).join(', ')}. Especifique um dos nomes.` })
    }
  }

  // References may point to categories outside `only`: check them against every metadata file.
  const allSlugs = new Set(only ? CATEGORIES.flatMap((c) => readMetadataFile(c.id).entries.map((e) => e.slug)) : slugs.keys())
  const aliasOwner = new Map<string, string>()
  for (const icon of icons) {
    for (const alias of icon.meta.aliases ?? []) {
      if (slugs.has(alias)) problems.push({ level: 'error', code: 'alias', subject: icon.meta.slug, category: icon.category, message: `O alias "${alias}" é o slug de outro ícone.` })
      if (aliasOwner.has(alias)) problems.push({ level: 'error', code: 'alias', subject: icon.meta.slug, category: icon.category, message: `O alias "${alias}" também é de ${aliasOwner.get(alias)}.` })
      aliasOwner.set(alias, icon.meta.slug)
    }
    if (icon.meta.variantOf !== undefined && !slugs.has(icon.meta.variantOf) && !allSlugs.has(icon.meta.variantOf)) {
      problems.push({ level: 'error', code: 'reference', subject: icon.meta.slug, category: icon.category, message: `variantOf "${icon.meta.variantOf}" não existe.` })
    }
    if (icon.meta.variantOf === icon.meta.slug) problems.push({ level: 'error', code: 'reference', subject: icon.meta.slug, category: icon.category, message: 'variantOf aponta para o próprio ícone.' })
  }
  return { icons, problems }
}

/* ------------------------------------------------- visual duplicates */

function popcount(n: number) {
  n = n - ((n >>> 1) & 0x55555555)
  n = (n & 0x33333333) + ((n >>> 2) & 0x33333333)
  return (((n + (n >>> 4)) & 0x0f0f0f0f) * 0x01010101) >>> 24
}

function bitset(grid: Uint8Array): { bits: Uint32Array; count: number } {
  const bits = new Uint32Array(Math.ceil(grid.length / 32))
  let count = 0
  grid.forEach((v, i) => {
    if (v) {
      bits[i >>> 5] |= 1 << (i & 31)
      count++
    }
  })
  return { bits, count }
}

export interface SimilarPair {
  a: LoadedIcon
  b: LoadedIcon
  score: number
}

/**
 * Pairs of icons whose pictures overlap almost completely. Icons of the same
 * family, or one a variant of the other, are expected to look alike and are
 * skipped.
 */
export function findSimilar(icons: LoadedIcon[], threshold = 0.9): SimilarPair[] {
  const drawn = icons.filter((i) => i.nodes.length)
  const sets = drawn.map((i) => bitset(raster(i.nodes)))
  const pairs: SimilarPair[] = []
  for (let x = 0; x < drawn.length; x++) {
    for (let y = x + 1; y < drawn.length; y++) {
      const A = sets[x]
      const B = sets[y]
      // Jaccard can't reach the threshold when the sizes differ too much.
      if (Math.min(A.count, B.count) / Math.max(A.count, B.count) < threshold) continue
      let inter = 0
      for (let k = 0; k < A.bits.length; k++) inter += popcount(A.bits[k] & B.bits[k])
      const score = inter / (A.count + B.count - inter)
      if (score < threshold) continue
      const a = drawn[x].meta
      const b = drawn[y].meta
      const related = (a.family && a.family === b.family) || a.variantOf === b.slug || b.variantOf === a.slug || (a.variantOf && a.variantOf === b.variantOf)
      if (!related) pairs.push({ a: drawn[x], b: drawn[y], score })
    }
  }
  return pairs.sort((p, q) => q.score - p.score)
}

/** Groups problems for printing. */
export function printProblems(problems: Problem[], { warnings = true } = {}) {
  const shown = problems.filter((p) => warnings || p.level === 'error')
  const byCategory = new Map<string, Problem[]>()
  for (const p of shown) byCategory.set(p.category ?? '(global)', [...(byCategory.get(p.category ?? '(global)') ?? []), p])
  for (const [category, list] of byCategory) {
    console.log(`\n${category}`)
    for (const p of list) console.log(`  ${p.level === 'error' ? '✗' : '!'} ${p.subject}: ${p.message}`)
  }
}

export function parseArgs(argv = process.argv.slice(2)) {
  const flags = new Map<string, string | true>()
  const positional: string[] = []
  for (const arg of argv) {
    if (arg.startsWith('--')) {
      const [k, v] = arg.slice(2).split('=')
      flags.set(k, v ?? true)
    } else positional.push(arg)
  }
  const list = (name: string) => {
    const v = flags.get(name)
    return typeof v === 'string' ? v.split(',').filter(Boolean) : undefined
  }
  return { flags, positional, list }
}
