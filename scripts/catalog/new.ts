/**
 * Starts a new icon: an empty drawing on the grid and its metadata entry,
 * with a new id and today's date, ready to be filled in.
 *
 *   npm run catalog:new -- <category> <slug> "<nome em português>" "<English name>"
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { CATEGORIES, categoryById } from '../../src/catalog/categories/index.ts'
import { DEFAULT_AUTHOR, DEFAULT_LICENSE, DEFAULT_SOURCE } from '../../src/catalog/licenses.ts'
import type { IconMeta } from '../../src/catalog/types.ts'
import { ICONS_DIR, METADATA_DIR, newId, parseArgs, readMetadataFile, rel } from '../lib/catalog.ts'
import { formatMetadata } from '../lib/format-meta.ts'

const { positional } = parseArgs()
const [category, slug, pt, en] = positional
if (!category || !slug || !categoryById(category)) {
  console.error('Uso: npm run catalog:new -- <categoria> <slug> "<nome pt>" "<nome en>"')
  console.error(`Categorias: ${CATEGORIES.map((c) => c.id).join(', ')}`)
  process.exit(1)
}
if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
  console.error('O slug precisa ser kebab-case em inglês: a-z, 0-9 e hífens.')
  process.exit(1)
}
const taken = new Set<string>()
for (const c of CATEGORIES) {
  for (const e of readMetadataFile(c.id).entries) {
    taken.add(e.id)
    if (e.slug === slug || e.aliases?.includes(slug)) {
      console.error(`O slug "${slug}" já existe em ${c.id}.`)
      process.exit(1)
    }
  }
}
const dir = join(ICONS_DIR, category)
mkdirSync(dir, { recursive: true })
const file = join(dir, `${slug}.svg`)
if (!existsSync(file)) {
  writeFileSync(
    file,
    '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">\n  <rect x="3" y="3" width="18" height="18" rx="2"/>\n</svg>\n',
  )
}
const { entries } = readMetadataFile(category)
const meta: IconMeta = {
  id: newId(taken),
  slug,
  name: { pt: pt ?? slug, en: en ?? slug.replace(/-/g, ' ') },
  synonyms: { pt: [], en: [] },
  tags: { pt: [], en: [] },
  popularity: 3,
  added: new Date().toLocaleDateString('sv-SE'),
  author: DEFAULT_AUTHOR,
  source: DEFAULT_SOURCE,
  license: DEFAULT_LICENSE,
}
entries.push(meta)
writeFileSync(join(METADATA_DIR, `${category}.json`), formatMetadata(entries))
console.log(`Criados ${rel(file)} (um quadrado de exemplo: desenhe o ícone) e a entrada em metadata/${category}.json.`)
console.log('Preencha sinônimos e tags, depois rode npm run catalog:format e npm run catalog:validate.')
