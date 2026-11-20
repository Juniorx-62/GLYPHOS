import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { boundsOf, containsPoint, isClosed, raster, similarity } from '../../src/catalog/svg/geometry.ts'
import { formatPath, toSegments, tokenizePath } from '../../src/catalog/svg/path.ts'
import { parseIconSvg, serializeIconSvg } from '../../src/catalog/svg/parse.ts'

const ROOT = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">'
const svg = (body: string, root = ROOT) => `${root}\n${body}\n</svg>\n`
const errors = (text: string) => parseIconSvg(text).issues.filter((i) => i.level === 'error')

describe('parseIconSvg (lista do que é permitido)', () => {
  it('lê um arquivo válido, com papéis', () => {
    const r = parseIconSvg(svg('  <rect x="3" y="4" width="18" height="16" rx="2" data-part="body"/>\n  <path d="M7 9h10" data-part="cut"/>'))
    assert.deepEqual(r.issues, [])
    assert.equal(r.nodes.length, 2)
    assert.equal(r.nodes[0].part, 'body')
    assert.equal(r.nodes[1].part, 'cut')
  })

  for (const [name, body] of [
    ['script', '<script>alert(1)</script>'],
    ['foreignObject', '<foreignObject width="10" height="10"/>'],
    ['image', '<image href="https://x.test/a.png"/>'],
    ['use', '<use href="#a"/>'],
    ['g', '<g><path d="M1 1h2"/></g>'],
    ['style', '<style>path{fill:red}</style>'],
    ['a', '<a href="https://x.test"><path d="M1 1h2"/></a>'],
  ]) {
    it(`recusa <${name}>`, () => assert.ok(errors(svg(body)).length > 0))
  }

  it('recusa atributos de evento, href, style, class e transform', () => {
    for (const attr of ['onclick="x()"', 'href="#a"', 'style="fill:red"', 'class="x"', 'transform="rotate(4)"', 'id="a"']) {
      assert.ok(errors(svg(`<path d="M4 4h16" ${attr}/>`)).length > 0, attr)
    }
  })

  it('recusa raiz diferente da do catálogo', () => {
    assert.ok(errors(svg('<path d="M4 4h16"/>', ROOT.replace('0 0 24 24', '0 0 32 32'))).length > 0)
    assert.ok(errors(svg('<path d="M4 4h16"/>', ROOT.replace('1.5', '2'))).length > 0)
  })

  it('recusa comentários, DOCTYPE e entidades', () => {
    assert.ok(errors(`<!-- x -->${svg('<path d="M4 4h16"/>')}`).length > 0)
    assert.ok(errors(`<!DOCTYPE svg [<!ENTITY a "b">]>${svg('<path d="M4 4h16"/>')}`).length > 0)
  })

  it('recusa valores com unidades e caminhos inválidos', () => {
    assert.ok(errors(svg('<circle cx="12px" cy="12" r="4"/>')).length > 0)
    assert.ok(errors(svg('<path d="M4 4 X 3"/>')).length > 0)
  })

  it('stroke="none" exige fill="currentColor"', () => {
    assert.ok(errors(svg('<circle cx="12" cy="12" r="1" stroke="none"/>')).length > 0)
    assert.equal(errors(svg('<circle cx="12" cy="12" r="1" fill="currentColor" stroke="none"/>')).length, 0)
  })

  it('serializa no formato canônico (ida e volta estável)', () => {
    const text = svg('<path  d="M 4,4 L 20.50 4"   data-part="cut"/><rect width="18" x="3" height="16" y="4" rx="2.0" data-part="body"/>')
    const once = serializeIconSvg(parseIconSvg(text).nodes)
    assert.match(once, /<path d="M4 4L20.5 4" data-part="cut"\/>/)
    assert.match(once, /<rect x="3" y="4" width="18" height="16" rx="2" data-part="body"\/>/)
    assert.equal(serializeIconSvg(parseIconSvg(once).nodes), once)
  })
})

describe('caminhos', () => {
  it('lê flags de arco compactas', () => {
    assert.deepEqual(
      tokenizePath('a1 1 0 012 2').filter((t) => t.type === 'num').map((t) => t.value),
      [1, 1, 0, 0, 1, 2, 2],
    )
  })
  it('formata números e comandos', () => assert.equal(formatPath('M 3.000 , 12 h 18.250'), 'M3 12h18.25'))
  it('converte relativos em absolutos', () => {
    const segs = toSegments('M2 2h4v4z')
    assert.deepEqual(segs.map((s) => [s.kind, s.x, s.y]), [
      ['M', 2, 2],
      ['L', 6, 2],
      ['L', 6, 6],
      ['Z', 2, 2],
    ])
  })
})

describe('geometria', () => {
  const nodes = parseIconSvg(svg('<rect x="3" y="3" width="18" height="18" rx="3" data-part="body"/>\n<path d="M8 12h8"/>')).nodes
  it('calcula os limites', () => {
    const b = boundsOf(nodes)
    assert.ok(Math.abs(b.minX - 3) < 0.01 && Math.abs(b.maxX - 21) < 0.01)
  })
  it('sabe quando uma forma é fechada', () => {
    assert.equal(isClosed(nodes[0]), true)
    assert.equal(isClosed(nodes[1]), false)
    const open = parseIconSvg(svg('<path d="M4 4h10v10"/>')).nodes[0]
    assert.equal(isClosed(open), false)
  })
  it('sabe se um ponto está dentro de um corpo', () => {
    assert.equal(containsPoint(nodes[0], { x: 12, y: 12 }), true)
    assert.equal(containsPoint(nodes[0], { x: 1, y: 1 }), false)
  })
  it('desenhos iguais têm semelhança 1; diferentes, menor', () => {
    const other = parseIconSvg(svg('<circle cx="12" cy="12" r="9"/>')).nodes
    assert.equal(similarity(raster(nodes), raster(nodes)), 1)
    assert.ok(similarity(raster(nodes), raster(other)) < 0.6)
  })
})
