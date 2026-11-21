import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { derivableStyles, pack, renderIcon, toSvgString } from '../../src/catalog/styles/index.ts'
import { parseIconSvg } from '../../src/catalog/svg/parse.ts'
import { cleanDoc } from '../../src/data/stores/creations.ts'
import type { CreationDoc, DrawableShape, EllipseShape, RectShape } from '../../src/data/types.ts'
import { combine } from '../../src/features/editor/model/boolean.ts'
import { defaultStyle, deleteShapes, duplicateShapes, emptyDoc, groupShapes, reorder, ungroupShapes } from '../../src/features/editor/model/doc.ts'
import { bakeRotation, boundsOfShapes, flattenShape, scaleShape, shapeBounds, toPath } from '../../src/features/editor/model/geometry.ts'
import { commit, jumpTo, redo, startHistory, undo } from '../../src/features/editor/model/history.ts'
import { docToNodes, dToSubPaths, nodesToShapes } from '../../src/features/editor/model/serialize.ts'
import { DEFAULT_MATCH, matchStyle } from '../../src/features/editor/model/style-match.ts'
import { toSvg } from '../../src/features/export/formats.ts'

const rect = (id: string, x: number, y: number, w: number, h: number, extra: Partial<RectShape> = {}): RectShape => ({
  id,
  name: id,
  kind: 'rect',
  x,
  y,
  w,
  h,
  r: 0,
  part: 'line',
  rotation: 0,
  style: defaultStyle(),
  ...extra,
})
const circle = (id: string, cx: number, cy: number, r: number): EllipseShape => ({ id, name: id, kind: 'ellipse', cx, cy, rx: r, ry: r, part: 'line', rotation: 0, style: defaultStyle() })
const doc = (...shapes: DrawableShape[]): CreationDoc => ({ ...emptyDoc(), shapes })

const ROOT = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">'

describe('editor: documento → SVG', () => {
  it('formas viram nós do catálogo e o SVG passa pelo leitor restrito', () => {
    const nodes = docToNodes(doc(rect('a', 4, 4, 16, 16, { r: 3, part: 'body' }), circle('b', 12, 12, 3)))
    assert.equal(nodes.length, 2)
    assert.equal(nodes[0].tag, 'rect')
    assert.equal(nodes[0].attrs.rx, '3')
    assert.equal(nodes[1].tag, 'circle')
    const svg = toSvgString(renderIcon(nodes, { style: 'outline' }))
    const body = svg.slice(svg.indexOf('>') + 1, svg.lastIndexOf('</svg>')).replace(/<(\w+)([^>]*)\/>/g, (_m, t, a) => `<${t}${a}${t === 'rect' ? ' data-part="body"' : ''}/>`)
    const parsed = parseIconSvg(`${ROOT}${body}</svg>`)
    assert.equal(parsed.issues.filter((i) => i.level === 'error').length, 0, JSON.stringify(parsed.issues))
  })
  it('formas ocultas ficam fora; traço diferente de 1,5 é escrito no nó', () => {
    const s = rect('a', 2, 2, 4, 4, { style: { ...defaultStyle(), strokeWidth: 2 } })
    const nodes = docToNodes(doc(s, rect('h', 1, 1, 1, 1, { hidden: true })))
    assert.equal(nodes.length, 1)
    assert.equal(nodes[0].attrs['stroke-width'], '2')
  })
  it('um corpo deriva Sólido e Duotone, e a exportação SVG é válida', () => {
    const nodes = docToNodes(doc(rect('a', 3, 3, 18, 18, { part: 'body' })))
    assert.deepEqual(derivableStyles(nodes), ['outline', 'solid', 'duotone'])
    const svg = toSvg({ slug: 'meu-icone', nodes: pack(nodes), styles: derivableStyles(nodes), box: 24 }, { style: 'solid', strokeWidth: 1.5, color: 'currentColor', size: 48, opacity: 1 })
    assert.match(svg, /^<svg xmlns="http:\/\/www.w3.org\/2000\/svg" width="48" height="48" viewBox="0 0 24 24"/)
    assert.match(svg, /fill="currentColor"/)
  })
  it('prancheta de outro tamanho muda o viewBox', () => {
    const d = { ...doc(rect('a', 2, 2, 28, 28)), box: 32 }
    const svg = toSvg({ slug: 'x', nodes: pack(docToNodes(d)), styles: ['outline'], box: 32 }, { style: 'outline', strokeWidth: 1.5, color: 'currentColor', size: 32, opacity: 1 })
    assert.match(svg, /viewBox="0 0 32 32"/)
  })
})

describe('editor: ícone do catálogo → formas editáveis', () => {
  it('arcos, curvas e retas viram âncoras; o desenho mantém os limites', () => {
    const nodes = parseIconSvg(`${ROOT}<path d="M4 12a8 8 0 0 1 16 0" /><path d="M3 3h6v6z" /><circle cx="12" cy="12" r="2" /></svg>`).nodes
    const shapes = nodesToShapes(nodes)
    assert.equal(shapes.length, 3)
    const arc = shapes[0] as DrawableShape
    const b = shapeBounds(arc)
    assert.ok(Math.abs(b.x - 4) < 0.01 && Math.abs(b.w - 16) < 0.01 && Math.abs(b.y - 4) < 0.05, JSON.stringify(b))
    const tri = dToSubPaths('M3 3h6v6z')
    assert.equal(tri.length, 1)
    assert.equal(tri[0].closed, true)
    assert.equal(tri[0].anchors.length, 3)
  })
})

describe('editor: geometria', () => {
  it('converter em caminho mantém o contorno', () => {
    const r = rect('a', 4, 4, 16, 10, { r: 2 })
    const b1 = shapeBounds(r)
    const b2 = shapeBounds(toPath(r))
    assert.ok(Math.abs(b1.w - b2.w) < 0.01 && Math.abs(b1.h - b2.h) < 0.01)
  })
  it('girar e gravar a rotação dá os mesmos limites', () => {
    const r = toPath(rect('a', 4, 4, 16, 8, { rotation: 30 }))
    const before = boundsOfShapes([r])
    const baked = bakeRotation(r)
    assert.equal(baked.rotation, 0)
    const after = boundsOfShapes([baked])
    assert.ok(Math.abs(before.w - after.w) < 0.05, `${before.w} ${after.w}`)
  })
  it('espelhar com escala negativa', () => {
    const r = rect('a', 2, 2, 4, 4)
    const m = scaleShape(r, -1, 1, { x: 12, y: 12 })
    assert.deepEqual([m.x, m.w], [18, 4])
  })
  it('elipse achatada tem 4 âncoras com alças', () => {
    const p = toPath(circle('c', 12, 12, 6))
    assert.equal(p.paths[0].anchors.length, 4)
    assert.ok(flattenShape(p)[0].points.length > 20)
  })
})

describe('editor: operações vetoriais', () => {
  it('união de dois quadrados sobrepostos', () => {
    const out = combine([rect('a', 2, 2, 10, 10), rect('b', 6, 6, 10, 10)], 'union', 'u')
    assert.ok(out)
    assert.equal(out.paths.length, 1)
    assert.equal(out.paths[0].anchors.length, 8)
    const b = shapeBounds(out)
    assert.deepEqual([b.x, b.y, b.w, b.h], [2, 2, 14, 14])
  })
  it('subtração abre um furo', () => {
    const out = combine([rect('a', 2, 2, 20, 20), rect('b', 8, 8, 8, 8)], 'subtract', 's')
    assert.ok(out)
    assert.equal(out.paths.length, 2)
  })
  it('interseção vazia é nula; linhas abertas não combinam', () => {
    assert.equal(combine([rect('a', 0, 0, 2, 2), rect('b', 10, 10, 2, 2)], 'intersect', 'i'), null)
    const line: DrawableShape = { id: 'l', name: 'l', kind: 'line', x1: 0, y1: 0, x2: 5, y2: 5, part: 'line', rotation: 0, style: defaultStyle() }
    assert.equal(combine([rect('a', 0, 0, 2, 2), line], 'union', 'u'), null)
  })
})

describe('editor: camadas e histórico', () => {
  it('agrupar, reordenar, duplicar, desagrupar e apagar', () => {
    let d = doc(rect('a', 0, 0, 1, 1), rect('b', 2, 2, 1, 1), rect('c', 4, 4, 1, 1))
    const g = groupShapes(d, ['a', 'b'])!
    d = g.doc
    assert.deepEqual(d.shapes.map((s) => s.id), [g.id, 'c'])
    d = reorder(d, ['c'], 'back')
    assert.deepEqual(d.shapes.map((s) => s.id), ['c', g.id])
    const dup = duplicateShapes(d, ['c'], 1)
    assert.equal(dup.doc.shapes.length, 3)
    d = ungroupShapes(dup.doc, [g.id]).doc
    assert.equal(d.shapes.length, 4)
    d = deleteShapes(d, ['a'])
    assert.equal(d.shapes.length, 3)
  })
  it('desfazer, refazer e pular para um passo', () => {
    const d0 = emptyDoc()
    const d1 = doc(rect('a', 0, 0, 1, 1))
    const d2 = doc(rect('a', 0, 0, 1, 1), rect('b', 0, 0, 1, 1))
    let h = commit(commit(startHistory(d0), d1, 'Retângulo'), d2, 'Retângulo')
    h = undo(h)
    assert.equal(h.present.doc, d1)
    h = redo(h)
    assert.equal(h.present.doc, d2)
    h = jumpTo(h, 0)
    assert.equal(h.present.doc, d0)
    assert.equal(h.future.length, 2)
    h = commit(h, d1, 'outro')
    assert.equal(h.future.length, 0)
  })
})

describe('editor: Style Matching', () => {
  it('leva ao grid de 24, área viva, traço 1,5 e papéis', () => {
    const big: CreationDoc = {
      box: 48,
      background: null,
      shapes: [rect('a', 4, 4, 30, 30, { style: { ...defaultStyle(48), stroke: '#ff0000', strokeWidth: 4, linejoin: 'miter' } }), circle('b', 19, 19, 5)],
    }
    const { doc: out, changes } = matchStyle(big, DEFAULT_MATCH)
    assert.equal(out.box, 24)
    const b = boundsOfShapes(out.shapes)
    assert.ok(Math.abs(b.x - 2) < 0.26 && Math.abs(b.w - 20) < 0.26, JSON.stringify(b))
    const a = out.shapes[0] as RectShape
    assert.equal(a.style.strokeWidth, 1.5)
    assert.equal(a.style.stroke, 'currentColor')
    assert.equal(a.style.linejoin, 'round')
    assert.equal(a.part, 'body')
    assert.equal((out.shapes[1] as DrawableShape).part, 'cut')
    assert.ok(changes.length >= 4)
    assert.equal(big.box, 48, 'o original não muda')
  })
  it('forma só preenchida não é convertida, e o relatório diz', () => {
    const solid = rect('a', 4, 4, 16, 16, { style: { ...defaultStyle(), fill: 'currentColor', stroke: 'none' } })
    const { doc: out, warnings } = matchStyle(doc(solid), DEFAULT_MATCH)
    assert.equal((out.shapes[0] as RectShape).style.fill, 'currentColor')
    assert.ok(warnings.some((w) => w.includes('redesenhar')))
  })
})

describe('editor: projeto salvo', () => {
  it('ida e volta pelo saneador mantém tudo', () => {
    const d = groupShapes(doc(rect('a', 1, 2, 3, 4, { r: 1, rotation: 15, part: 'body' }), toPath(circle('b', 5, 5, 2))), ['a', 'b'])!.doc
    const back = cleanDoc(JSON.parse(JSON.stringify(d)))
    assert.deepEqual(back, d)
  })
  it('recusa lixo e cores inválidas', () => {
    assert.equal(cleanDoc({ shapes: 'x' }), undefined)
    const back = cleanDoc({ box: 24, shapes: [{ ...rect('a', 0, 0, 1, 1), style: { fill: 'url(#x)', stroke: 'javascript:1' } }, { id: '<b>', kind: 'rect' }] })!
    assert.equal(back.shapes.length, 1)
    assert.equal((back.shapes[0] as RectShape).style.fill, 'none')
    assert.equal((back.shapes[0] as RectShape).style.stroke, 'currentColor')
  })
})
