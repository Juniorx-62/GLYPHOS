/**
 * Brings an SVG made in a design tool (Figma, Illustrator, Inkscape) into the
 * catalogue: SVGO cleans it (metadata, editor attributes, groups and
 * transforms folded into the shapes, styles turned into attributes), fixed
 * colours become currentColor, and the result is converted to the catalogue's
 * strict format. Anything that cannot be converted safely (gradients, masks,
 * images, text, filters, scripts, links) is refused with the reason.
 *
 *   npm run catalog:import -- arquivo.svg --category=maps --slug=compass --pt="Bússola" --en="Compass"
 *
 * The drawing must be 24 × 24 with an unexpanded 1.5 stroke. Roles
 * (data-part) and keywords are added afterwards (docs/ADDING_ICONS.md).
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { optimize } from 'svgo'
import { CATEGORIES, categoryById } from '../../src/catalog/categories/index.ts'
import { DEFAULT_AUTHOR, DEFAULT_LICENSE, DEFAULT_SOURCE } from '../../src/catalog/licenses.ts'
import { ROOT_ATTRS, parseIconSvg, serializeIconSvg } from '../../src/catalog/svg/parse.ts'
import { ICONS_DIR, METADATA_DIR, checkDrawing, newId, parseArgs, readMetadataFile, rel } from '../lib/catalog.ts'
import { formatMetadata } from '../lib/format-meta.ts'

const { positional, flags } = parseArgs()
const file = positional[0]
const category = flags.get('category')
const slug = flags.get('slug')
if (!file || typeof category !== 'string' || typeof slug !== 'string' || !categoryById(category)) {
  console.error('Uso: npm run catalog:import -- <arquivo.svg> --category=<id> --slug=<slug> [--pt="Nome"] [--en="Name"]')
  console.error(`Categorias: ${CATEGORIES.map((c) => c.id).join(', ')}`)
  process.exit(1)
}
if (!existsSync(resolve(file))) {
  console.error(`Arquivo não encontrado: ${file}`)
  process.exit(1)
}

const raw = readFileSync(resolve(file), 'utf8')
const forbidden = /<(script|foreignObject|image|use|text|tspan|linearGradient|radialGradient|pattern|filter|mask|clipPath|style|a)\b/i.exec(raw)
if (forbidden) {
  console.error(`Recusado: o arquivo usa <${forbidden[1]}>, que o catálogo não aceita. Converta em formas simples no editor (contornos, sem efeitos) e exporte de novo.`)
  process.exit(1)
}
const viewBox = /viewBox="([^"]+)"/.exec(raw)?.[1]?.trim().split(/[\s,]+/).map(Number)
if (!viewBox || viewBox[2] !== 24 || viewBox[3] !== 24) {
  console.error(`Recusado: a prancheta precisa ser 24 × 24 (viewBox encontrado: ${viewBox?.join(' ') ?? 'nenhum'}).`)
  process.exit(1)
}

const { data } = optimize(raw, {
  multipass: true,
  floatPrecision: 3,
  plugins: [
    { name: 'preset-default', params: { overrides: { removeViewBox: false, convertShapeToPath: false, mergePaths: false } } },
    'convertStyleToAttrs',
    'removeDimensions',
    { name: 'removeAttrs', params: { attrs: ['class', 'id', 'data-name', 'xml:space', 'opacity'] } },
  ],
})

// Strip the root and keep only the shapes; colours become currentColor, root stroke attributes are re-applied.
const body = /<svg[^>]*>([\s\S]*)<\/svg>/.exec(data)?.[1] ?? ''
// A transform SVGO could not fold into the geometry would be lost when groups are removed: refuse instead.
if (/\stransform="/.test(body)) {
  console.error('Recusado: o desenho tem transformações (mover, girar, escalar) que não puderam ser aplicadas às formas. No editor, achate as transformações (Figma: "Flatten"; Illustrator: "Expandir aparência"; Inkscape: "Objeto para caminho") sem expandir o traço, e exporte de novo.')
  process.exit(1)
}
const shapes = body
  .replace(/<\/?g[^>]*>/g, '')
  .replace(/\s(stroke-width|stroke-linecap|stroke-linejoin|stroke-miterlimit)="[^"]*"/g, '')
  .replace(/\sfill="none"/g, '')
  .replace(/\sstroke="(?!none)[^"]*"/g, '')
  .replace(/\sfill="(?!none)[^"]*"/g, ' fill="currentColor"')
const rootOpen = `<svg ${ROOT_ATTRS.map(([n, v]) => `${n}="${v}"`).join(' ')}>`
const parsed = parseIconSvg(`${rootOpen}${shapes}</svg>`)
const fatal = parsed.issues.filter((i) => i.level === 'error')
if (fatal.length || !parsed.nodes.length) {
  console.error(`Recusado depois da limpeza:\n  ${(fatal.length ? fatal.map((i) => i.message) : ['nenhuma forma sobrou']).join('\n  ')}`)
  process.exit(1)
}
const notes: string[] = []
checkDrawing(parsed.nodes, (level, _c, message) => notes.push(`${level === 'error' ? '✗' : '!'} ${message}`))

const dir = join(ICONS_DIR, category)
mkdirSync(dir, { recursive: true })
const out = join(dir, `${slug}.svg`)
writeFileSync(out, serializeIconSvg(parsed.nodes))

const taken = new Set<string>()
for (const c of CATEGORIES) for (const e of readMetadataFile(c.id).entries) taken.add(e.id)
const { entries } = readMetadataFile(category)
if (!entries.some((e) => e.slug === slug)) {
  entries.push({
    id: newId(taken),
    slug,
    name: { pt: String(flags.get('pt') ?? slug), en: String(flags.get('en') ?? slug.replace(/-/g, ' ')) },
    synonyms: { pt: [], en: [] },
    tags: { pt: [], en: [] },
    popularity: 3,
    added: new Date().toLocaleDateString('sv-SE'),
    author: DEFAULT_AUTHOR,
    source: DEFAULT_SOURCE,
    license: DEFAULT_LICENSE,
  })
  mkdirSync(METADATA_DIR, { recursive: true })
  writeFileSync(join(METADATA_DIR, `${category}.json`), formatMetadata(entries))
}
console.log(`Importado em ${rel(out)} (${parsed.nodes.length} formas).`)
if (notes.length) console.log(notes.join('\n'))
console.log('Agora: marque os papéis (data-part), preencha sinônimos e tags, e rode catalog:validate e catalog:sheet.')
