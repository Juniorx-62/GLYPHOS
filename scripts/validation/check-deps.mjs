/**
 * Regras de dependência entre as pastas de src/ e ciclos de import
 * (docs/ARCHITECTURE.md, "Regras de importação"). Adaptado do THOTH.
 *
 *   npm run check:deps
 *
 * 1. lib/ e hooks/ não importam nada de src/ fora de lib/ e hooks/.
 * 2. catalog/ importa só catalog/ (é lido também pelos scripts em Node, sem React).
 * 3. data/ importa só data/, lib/, hooks/, catalog/ e brand/.
 * 4. components/ui, icons e code não importam features/, routes/ nem data/.
 *    components/layout, a casca do app, pode compor features/ e ler data/.
 * 5. features/ não importa routes/.
 * 6. Nada importa routes/, exceto o routeTree.gen.ts gerado.
 * 7. Nenhum ciclo de import (o par routeTree.gen.ts ↔ router.tsx é só de tipos e é ignorado).
 * Termina com código 1 se alguma regra falhar.
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')
const SRC = join(ROOT, 'src')
const BRAND = join(ROOT, 'brand')

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) walk(path, out)
    else if (/\.(ts|tsx)$/.test(name) && !/\.test\.tsx?$/.test(name)) out.push(path)
  }
  return out
}

/** The source with comments and template-literal text blanked out: code samples inside strings are not imports. */
function codeOnly(src) {
  let out = ''
  let i = 0
  const depth = [] // brace depth inside each open ${…}
  const blank = (s) => s.replace(/[^\n]/g, ' ')
  while (i < src.length) {
    const c = src[i]
    const next = src[i + 1]
    if (c === '/' && next === '/') {
      const end = src.indexOf('\n', i)
      const stop = end < 0 ? src.length : end
      out += blank(src.slice(i, stop))
      i = stop
    } else if (c === '/' && next === '*') {
      const end = src.indexOf('*/', i + 2)
      const stop = end < 0 ? src.length : end + 2
      out += blank(src.slice(i, stop))
      i = stop
    } else if (c === "'" || c === '"') {
      let j = i + 1
      while (j < src.length && src[j] !== c && src[j] !== '\n') j += src[j] === '\\' ? 2 : 1
      out += src.slice(i, j + 1)
      i = j + 1
    } else if (c === '`' || (c === '}' && depth.length && depth[depth.length - 1] === 0)) {
      // Template text until the closing backtick or the next ${.
      if (c === '}') depth.pop()
      let j = i + 1
      while (j < src.length && src[j] !== '`' && !(src[j] === '$' && src[j + 1] === '{')) j += src[j] === '\\' ? 2 : 1
      out += c + blank(src.slice(i + 1, j))
      if (src[j] === '$') {
        depth.push(0)
        out += '${'
        i = j + 2
      } else {
        out += '`'
        i = j + 1
      }
    } else {
      if (depth.length && c === '{') depth[depth.length - 1]++
      if (depth.length && c === '}') depth[depth.length - 1]--
      out += c
      i++
    }
  }
  return out
}

const IMPORT_RE = /(?:^|[\n;])\s*(?:import|export)\s+(?:type\s+)?(?:[\w*{}\s,$]+?\s+from\s+)?['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)/g
const typeOnly = (statement) => /^\s*(import|export)\s+type\s/.test(statement.replace(/^[\n;]/, ''))

function resolveImport(from, spec) {
  let base
  if (spec.startsWith('~/')) base = join(SRC, spec.slice(2))
  else if (spec.startsWith('@brand/')) base = join(BRAND, spec.slice(7))
  else if (spec.startsWith('.')) base = resolve(dirname(from), spec)
  else return { pkg: spec }
  const clean = base.replace(/\?.*$/, '')
  if (/\?/.test(spec)) return { asset: true }
  for (const ext of ['', '.ts', '.tsx', '/index.ts', '/index.tsx']) {
    const path = resolve(clean + ext)
    if (existsSync(path) && statSync(path).isFile()) return { file: path }
  }
  return { missing: true }
}

const rel = (p) => relative(ROOT, p).split(sep).join('/')
const area = (r) => {
  const parts = r.split('/')
  if (parts[0] === 'brand') return 'brand'
  if (parts.length === 2) return 'root'
  if (parts[1] === 'components') return `components/${parts[2]}`
  return parts[1]
}
const files = walk(SRC)
const graph = new Map()
const errors = []

for (const file of files) {
  const r = rel(file)
  const from = area(r)
  const edges = new Set()
  for (const m of codeOnly(readFileSync(file, 'utf8')).matchAll(IMPORT_RE)) {
    const spec = m[1] ?? m[2]
    const target = resolveImport(file, spec)
    if (target.asset || target.missing) continue
    if (target.pkg) {
      if (from === 'catalog' && /^(react|react-dom)(\/|$)/.test(spec)) errors.push(`${r}: catalog/ importa o pacote "${spec}" (o catálogo roda também em Node, sem React)`)
      continue
    }
    const tr = rel(target.file)
    const to = area(tr)
    if (!typeOnly(m[0])) edges.add(target.file)
    if ((from === 'lib' || from === 'hooks') && !['lib', 'hooks'].includes(to)) errors.push(`${r}: ${from}/ importa ${tr}`)
    if (from === 'catalog' && to !== 'catalog') errors.push(`${r}: catalog/ importa ${tr}`)
    if (from === 'data' && !['data', 'lib', 'hooks', 'catalog', 'brand'].includes(to)) errors.push(`${r}: data/ importa ${tr}`)
    if (/^components\/(ui|icons|code)$/.test(from) && (to === 'features' || to === 'routes' || to === 'data')) errors.push(`${r}: ${from} importa ${tr} (só a casca, components/layout, compõe features/ e lê data/)`)
    if (from === 'features' && to === 'routes') errors.push(`${r}: features/ importa ${tr}`)
    if (to === 'routes' && from !== 'routes' && r !== 'src/routeTree.gen.ts') errors.push(`${r}: importa a rota ${tr}`)
  }
  graph.set(file, edges)
}

// Cycles: Tarjan's strongly connected components over runtime imports.
let index = 0
const idx = new Map()
const low = new Map()
const stack = []
const onStack = new Set()
function strong(v) {
  idx.set(v, index)
  low.set(v, index++)
  stack.push(v)
  onStack.add(v)
  for (const w of graph.get(v) ?? []) {
    if (!idx.has(w)) {
      strong(w)
      low.set(v, Math.min(low.get(v), low.get(w)))
    } else if (onStack.has(w)) low.set(v, Math.min(low.get(v), idx.get(w)))
  }
  if (low.get(v) === idx.get(v)) {
    const comp = []
    let w
    do {
      w = stack.pop()
      onStack.delete(w)
      comp.push(rel(w))
    } while (w !== v)
    const generated = comp.length === 2 && comp.includes('src/routeTree.gen.ts') && comp.includes('src/router.tsx')
    if (comp.length > 1 && !generated) errors.push(`ciclo de import: ${comp.join(' → ')}`)
  }
}
for (const f of files) if (!idx.has(f)) strong(f)

if (errors.length) {
  console.error(`Dependências: ${errors.length} problema(s):\n  ${[...new Set(errors)].join('\n  ')}`)
  process.exit(1)
}
console.log(`Dependências: ${files.length} arquivos, regras respeitadas e nenhum ciclo.`)
