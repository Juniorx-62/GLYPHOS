/**
 * Builds everything the site reads from the catalogue, from the real files:
 *
 *   src/catalog/registry/generated/manifest.json       light list (lists, filters, sorting)
 *   src/catalog/registry/generated/shards/<cat>.json    full records + drawings, one file per category
 *   src/catalog/registry/generated/search-index.json    inverted index for the search
 *   src/catalog/registry/generated/ui-icons.json        drawings the interface itself uses
 *   src/catalog/registry/generated/catalog-meta.json    totals and the build date
 *   public/svg/<style>/<slug>.svg                       static files (download, hotlink, crawlers)
 *
 *   npm run catalog:index             icons with errors are left out (and listed)
 *   npm run catalog:index -- --strict any error stops the build
 *
 * `npm run dev` and `npm run build` run this first. The generated folders are
 * not versioned: the catalogue files are the source of truth.
 */
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { CATEGORIES } from '../../src/catalog/categories/index.ts'
import { COLLECTIONS } from '../../src/catalog/collections.ts'
import { LEXICON } from '../../src/catalog/search/lexicon.ts'
import { buildSearchIndex, type SearchDocument } from '../../src/catalog/search/engine.ts'
import { pack, renderIcon, toSvgString } from '../../src/catalog/styles/index.ts'
import type { ManifestEntry, Shard, StyleId } from '../../src/catalog/types.ts'
import { UI_ICON_NAMES } from '../../src/components/icons/ui-icon-names.ts'
import { GENERATED_DIR, ROOT, loadCatalog, parseArgs, printProblems, rel } from '../lib/catalog.ts'

const { flags } = parseArgs()
const t0 = Date.now()
const { icons, problems } = loadCatalog()
const errors = problems.filter((p) => p.level === 'error')
const broken = new Set(errors.map((p) => p.subject))

if (errors.length) {
  printProblems(errors, { warnings: false })
  if (flags.has('strict')) {
    console.error(`\n${errors.length} erro(s) no catálogo. Corrija antes de gerar (npm run catalog:validate).`)
    process.exit(1)
  }
}

const order = new Map(CATEGORIES.map((c, i) => [c.id, i]))
const ok = icons
  .filter((i) => i.nodes.length && !broken.has(i.meta.slug) && /^g[0-9a-z]{7}$/.test(i.meta.id ?? ''))
  .sort((a, b) => order.get(a.category)! - order.get(b.category)! || a.meta.slug.localeCompare(b.meta.slug))

// Global problems (duplicate slugs) would make two shards claim the same slug: never publish those.
const seen = new Set<string>()
const published = ok.filter((i) => (seen.has(i.meta.slug) ? false : (seen.add(i.meta.slug), true)))

rmSync(GENERATED_DIR, { recursive: true, force: true })
mkdirSync(join(GENERATED_DIR, 'shards'), { recursive: true })

const manifest: ManifestEntry[] = published.map((i) => ({
  id: i.meta.id,
  slug: i.meta.slug,
  name: i.meta.name,
  category: i.category,
  ...(i.meta.subcategory ? { subcategory: i.meta.subcategory } : {}),
  styles: i.styles,
  popularity: i.meta.popularity,
  added: i.meta.added,
  ...(i.meta.family ? { family: i.meta.family } : {}),
}))
writeFileSync(join(GENERATED_DIR, 'manifest.json'), JSON.stringify(manifest))

for (const category of CATEGORIES) {
  const shard: Shard = {}
  for (const icon of published.filter((i) => i.category === category.id)) {
    const overrides = Object.fromEntries(Object.entries(icon.overrides).map(([style, nodes]) => [style, pack(nodes!)]))
    shard[icon.meta.slug] = {
      ...icon.meta,
      category: icon.category,
      styles: icon.styles,
      nodes: pack(icon.nodes),
      ...(Object.keys(overrides).length ? { overrides } : {}),
    }
  }
  writeFileSync(join(GENERATED_DIR, 'shards', `${category.id}.json`), JSON.stringify(shard))
}

const docs: SearchDocument[] = published.map((i) => {
  const cat = CATEGORIES.find((c) => c.id === i.category)!
  const sub = cat.subcategories.find((s) => s.id === i.meta.subcategory)
  return {
    slug: i.meta.slug,
    name: i.meta.name,
    synonyms: i.meta.synonyms,
    tags: i.meta.tags,
    aliases: i.meta.aliases,
    family: i.meta.family,
    category: { ...cat.name, id: cat.id },
    subcategory: sub ? { ...sub.name, id: sub.id } : undefined,
    popularity: i.meta.popularity,
  }
})
writeFileSync(join(GENERATED_DIR, 'search-index.json'), JSON.stringify(buildSearchIndex(docs, LEXICON)))

const missingUi: string[] = []
const uiIcons: Record<string, ReturnType<typeof pack>> = {}
for (const name of UI_ICON_NAMES) {
  const icon = published.find((i) => i.meta.slug === name)
  if (icon) uiIcons[name] = pack(icon.nodes)
  else missingUi.push(name)
}
writeFileSync(join(GENERATED_DIR, 'ui-icons.json'), JSON.stringify(uiIcons))

// Aliases → current slug, for redirects of renamed icons.
const aliases: Record<string, string> = {}
for (const i of published) for (const a of i.meta.aliases ?? []) aliases[a] = i.meta.slug
writeFileSync(join(GENERATED_DIR, 'aliases.json'), JSON.stringify(aliases))

const styleCount: Partial<Record<StyleId, number>> = {}
for (const i of published) for (const s of i.styles) styleCount[s] = (styleCount[s] ?? 0) + 1
const perCategory: Record<string, number> = {}
for (const i of published) perCategory[i.category] = (perCategory[i.category] ?? 0) + 1
const latest = published.reduce((max, i) => (i.meta.added > max ? i.meta.added : max), '')
writeFileSync(
  join(GENERATED_DIR, 'catalog-meta.json'),
  JSON.stringify({ icons: published.length, styles: styleCount, categories: perCategory, latestAdded: latest, generatedAt: new Date().toISOString() }),
)

// Static files.
const svgDir = join(ROOT, 'public/svg')
rmSync(svgDir, { recursive: true, force: true })
let files = 0
for (const icon of published) {
  for (const style of icon.styles) {
    const dir = join(svgDir, style)
    mkdirSync(dir, { recursive: true })
    const svg = toSvgString(renderIcon(icon.nodes, { style, override: icon.overrides[style] }))
    writeFileSync(join(dir, `${icon.meta.slug}.svg`), svg + '\n')
    files++
  }
}

const brokenCollections: string[] = []
for (const c of COLLECTIONS) for (const slug of c.icons) if (!seen.has(slug)) brokenCollections.push(`${c.id} → ${slug}`)

const left = icons.length - published.length
console.log(
  `✓ ${published.length} ícones indexados em ${((Date.now() - t0) / 1000).toFixed(1)} s` +
    (left ? ` (${left} deixado(s) de fora por erro)` : '') +
    ` · ${files} arquivos em ${rel(svgDir)}`,
)
if (missingUi.length) console.log(`! Ícones da interface ausentes no catálogo: ${missingUi.join(', ')}`)
if (brokenCollections.length) console.log(`! Coleções com ícones inexistentes: ${brokenCollections.join(', ')}`)
if (flags.has('strict') && (missingUi.length || brokenCollections.length)) process.exit(1)
