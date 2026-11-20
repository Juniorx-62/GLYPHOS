/**
 * Removes icons: the drawing, its hand-drawn styles and the metadata entry.
 * Refuses when something still points to the icon (variantOf, a collection, a
 * category symbol, the interface), unless --force.
 *
 *   npm run catalog:remove -- <slug> [<slug> …] [--force]
 */
import { existsSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { CATEGORIES } from '../../src/catalog/categories/index.ts'
import { COLLECTIONS } from '../../src/catalog/collections.ts'
import { UI_ICON_NAMES } from '../../src/components/icons/ui-icon-names.ts'
import { ICONS_DIR, METADATA_DIR, parseArgs, readMetadataFile, rel } from '../lib/catalog.ts'
import { formatMetadata } from '../lib/format-meta.ts'

const { positional, flags } = parseArgs()
if (!positional.length) {
  console.error('Uso: npm run catalog:remove -- <slug> [<slug> …] [--force]')
  process.exit(1)
}
const targets = new Set(positional)
const all = CATEGORIES.flatMap((c) => readMetadataFile(c.id).entries.map((e) => ({ ...e, category: c.id })))

const references: string[] = []
for (const slug of targets) {
  for (const e of all) if (e.variantOf === slug && !targets.has(e.slug)) references.push(`${e.category}/${e.slug} tem variantOf: ${slug}`)
  for (const c of COLLECTIONS) if (c.icons.includes(slug)) references.push(`coleção ${c.id}`)
  for (const c of CATEGORIES) if (c.symbol === slug) references.push(`símbolo da categoria ${c.id}`)
  if ((UI_ICON_NAMES as readonly string[]).includes(slug)) references.push('ícones da interface (ui-icon-names.ts)')
}
if (references.length && !flags.has('force')) {
  console.error(`Não removido: ainda há referências.\n  ${references.join('\n  ')}\nAtualize-as ou rode com --force.`)
  process.exit(1)
}

let removed = 0
for (const c of CATEGORIES) {
  const { entries } = readMetadataFile(c.id)
  const keep = entries.filter((e) => !targets.has(e.slug))
  if (keep.length !== entries.length) writeFileSync(join(METADATA_DIR, `${c.id}.json`), formatMetadata(keep))
  const dir = join(ICONS_DIR, c.id)
  if (!existsSync(dir)) continue
  for (const f of readdirSync(dir)) {
    if (targets.has(f.replace(/\.svg$/, '').split('.')[0])) {
      rmSync(join(dir, f))
      console.log(`removido ${rel(join(dir, f))}`)
      removed++
    }
  }
}
console.log(`${removed} arquivo(s) removido(s). Rode npm run catalog:index.`)
