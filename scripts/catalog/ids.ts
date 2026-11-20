/**
 * Gives every icon without an id a new stable one ("g" + 7 base-32 chars,
 * random, checked against every id in the catalogue). Ids never change after
 * that, not even when the icon is renamed or moves to another category.
 *
 *   npm run catalog:ids
 *   npm run catalog:ids -- --category=animals
 */
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { CATEGORIES } from '../../src/catalog/categories/index.ts'
import { METADATA_DIR, newId, parseArgs, readMetadataFile } from '../lib/catalog.ts'
import { formatMetadata } from '../lib/format-meta.ts'

const { list } = parseArgs()
const only = list('category')
const taken = new Set<string>()
for (const c of CATEGORIES) for (const e of readMetadataFile(c.id).entries) if (e.id) taken.add(e.id)

let assigned = 0
for (const c of CATEGORIES.filter((c) => !only || only.includes(c.id))) {
  const { entries, error } = readMetadataFile(c.id)
  if (error || !entries.length) continue
  let changed = false
  for (const e of entries) {
    if (!e.id || !/^g[0-9a-hjkmnp-tv-z]{7}$/.test(e.id)) {
      e.id = newId(taken)
      changed = true
      assigned++
    }
  }
  if (changed) writeFileSync(join(METADATA_DIR, `${c.id}.json`), formatMetadata(entries))
}
console.log(`${assigned} id(s) novo(s).`)
