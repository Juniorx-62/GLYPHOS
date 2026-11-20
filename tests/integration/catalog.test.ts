/**
 * The real catalogue, end to end: files, metadata, styles, search and the
 * references the site depends on (interface icons, category symbols,
 * collections). Runs against src/catalog as it is on disk.
 */
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, it } from 'node:test'
import { CATEGORIES } from '../../src/catalog/categories/index.ts'
import { COLLECTIONS } from '../../src/catalog/collections.ts'
import { LEXICON } from '../../src/catalog/search/lexicon.ts'
import { buildSearchIndex, createSearcher } from '../../src/catalog/search/engine.ts'
import { renderIcon, toSvgString } from '../../src/catalog/styles/index.ts'
import { UI_ICON_NAMES } from '../../src/components/icons/ui-icon-names.ts'
import { GENERATED_DIR, loadCatalog } from '../../scripts/lib/catalog.ts'

const { icons, problems } = loadCatalog()
const slugs = new Set(icons.map((i) => i.meta.slug))

describe('catálogo', () => {
  it('não tem erros de validação', () => {
    const errors = problems.filter((p) => p.level === 'error')
    assert.deepEqual(errors.map((e) => `${e.category}/${e.subject}: ${e.message}`), [])
  })

  it('tem ícones em todas as categorias', () => {
    for (const c of CATEGORIES) assert.ok(icons.some((i) => i.category === c.id), `categoria vazia: ${c.id}`)
  })

  it('cada categoria tem o ícone que a representa', () => {
    for (const c of CATEGORIES) assert.ok(slugs.has(c.symbol), `${c.id}: símbolo "${c.symbol}" não existe`)
  })

  it('a interface só usa ícones que existem', () => {
    for (const name of UI_ICON_NAMES) assert.ok(slugs.has(name), `ícone da interface ausente: ${name}`)
  })

  it('as coleções só citam ícones que existem, sem repetir', () => {
    for (const c of COLLECTIONS) {
      for (const s of c.icons) assert.ok(slugs.has(s), `${c.id}: ${s} não existe`)
      assert.equal(new Set(c.icons).size, c.icons.length, `${c.id}: ícone repetido`)
    }
  })

  it('todo desenho com corpo gera Sólido e Duotone sem perder formas', () => {
    for (const icon of icons.filter((i) => i.styles.includes('solid'))) {
      const solid = toSvgString(renderIcon(icon.nodes, { style: 'solid', uid: 't' }))
      const duo = toSvgString(renderIcon(icon.nodes, { style: 'duotone' }))
      assert.match(solid, /fill="currentColor"/, icon.meta.slug)
      assert.match(duo, /fill-opacity="0.2"/, icon.meta.slug)
    }
  })

  it('todo ícone é encontrado pelo próprio nome, em português e em inglês', () => {
    const searcher = createSearcher(
      buildSearchIndex(
        icons.map((i) => {
          const cat = CATEGORIES.find((c) => c.id === i.category)!
          const sub = cat.subcategories.find((s) => s.id === i.meta.subcategory)
          return { ...i.meta, category: { ...cat.name, id: cat.id }, subcategory: sub ? { ...sub.name, id: sub.id } : undefined }
        }),
        LEXICON,
      ),
    )
    const misses: string[] = []
    for (const icon of icons) {
      for (const lang of ['pt', 'en'] as const) {
        const hits = searcher.search(icon.meta.name[lang], { limit: 12 }).hits.map((h) => h.slug)
        if (!hits.includes(icon.meta.slug)) misses.push(`${icon.meta.slug} por "${icon.meta.name[lang]}"`)
      }
    }
    assert.deepEqual(misses, [])
  })

  it('o índice gerado corresponde aos arquivos (rode catalog:index antes)', () => {
    const manifestFile = join(GENERATED_DIR, 'manifest.json')
    if (!existsSync(manifestFile)) return
    const manifest = JSON.parse(readFileSync(manifestFile, 'utf8')) as Array<{ slug: string }>
    const valid = icons.filter((i) => i.nodes.length)
    assert.equal(manifest.length, valid.length)
  })
})
