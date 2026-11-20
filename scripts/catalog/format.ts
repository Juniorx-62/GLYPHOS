/**
 * Rewrites drawings and metadata in the canonical format: fixed root
 * attributes, attribute order and number format in the SVGs; metadata sorted
 * by slug with keys in a fixed order. Only formatting changes: a drawing the
 * strict reader refuses is left untouched and reported.
 *
 *   npm run catalog:format
 *   npm run catalog:format -- --category=animals
 */
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { CATEGORIES } from '../../src/catalog/categories/index.ts'
import { parseIconSvg, serializeIconSvg } from '../../src/catalog/svg/parse.ts'
import { ICONS_DIR, METADATA_DIR, parseArgs, readMetadataFile, rel } from '../lib/catalog.ts'
import { formatMetadata } from '../lib/format-meta.ts'

const { list } = parseArgs()
const only = list('category')
let changed = 0
let refused = 0
for (const category of CATEGORIES.filter((c) => !only || only.includes(c.id))) {
  const dir = join(ICONS_DIR, category.id)
  if (existsSync(dir)) {
    for (const f of readdirSync(dir).filter((f) => f.endsWith('.svg'))) {
      const file = join(dir, f)
      const text = readFileSync(file, 'utf8')
      const parsed = parseIconSvg(text)
      const fatal = parsed.issues.filter((i) => i.level === 'error' && i.code !== 'root' && i.code !== 'forbidden')
      if (fatal.length || !parsed.nodes.length) {
        refused++
        console.log(`✗ ${rel(file)}: ${fatal[0]?.message ?? 'sem formas'}`)
        continue
      }
      // Comments/declarations (forbidden) and a non-canonical root are what formatting fixes.
      const out = serializeIconSvg(parsed.nodes)
      if (out !== text) {
        writeFileSync(file, out)
        changed++
      }
    }
  }
  const metaFile = join(METADATA_DIR, `${category.id}.json`)
  if (existsSync(metaFile)) {
    const { entries, error } = readMetadataFile(category.id)
    if (error) {
      refused++
      console.log(`✗ ${rel(metaFile)}: ${error}`)
      continue
    }
    const out = formatMetadata(entries)
    if (out !== readFileSync(metaFile, 'utf8')) {
      writeFileSync(metaFile, out)
      changed++
    }
  }
}
console.log(`${changed} arquivo(s) formatado(s)${refused ? `, ${refused} recusado(s)` : ''}.`)
process.exitCode = refused ? 1 : 0
