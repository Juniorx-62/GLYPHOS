import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { derivableStyles, pack, renderIcon, toSvgString } from '../../src/catalog/styles/index.ts'
import { parseIconSvg } from '../../src/catalog/svg/parse.ts'
import { exportText, toCss, toDataUri, toReact, toSvg, type ExportIcon, type ExportOptions } from '../../src/features/export/formats.ts'

const ROOT = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">'
const nodesOf = (body: string) => parseIconSvg(`${ROOT}${body}</svg>`).nodes

const mail = nodesOf('<rect x="2.5" y="5" width="19" height="14" rx="2.5" data-part="body"/><path d="M3 7.5l9 6 9-6" data-part="cut"/>')
const eyeOff = nodesOf('<circle cx="12" cy="12" r="8" data-part="body"/><path d="M4 4l16 16" data-part="slash"/>')
const arrow = nodesOf('<path d="M4 12h16M14 6l6 6-6 6"/>')

describe('estilos derivados', () => {
  it('só desenhos com corpo têm Sólido e Duotone', () => {
    assert.deepEqual(derivableStyles(mail), ['outline', 'solid', 'duotone'])
    assert.deepEqual(derivableStyles(arrow), ['outline'])
  })
  it('Contorno é o desenho como está', () => {
    const out = toSvgString(renderIcon(mail, { style: 'outline' }))
    assert.doesNotMatch(out, /mask|fill="currentColor"/)
  })
  it('Sólido preenche os corpos e vaza os recortes por máscara', () => {
    const out = toSvgString(renderIcon(mail, { style: 'solid', uid: 't1' }))
    assert.match(out, /<mask id="glyphos-cut-t1"/)
    assert.match(out, /<g mask="url\(#glyphos-cut-t1\)">\s*<rect[^>]*fill="currentColor"/)
  })
  it('Barra abre uma fenda de três traços e é desenhada dentro dela', () => {
    const out = toSvgString(renderIcon(eyeOff, { style: 'solid', strokeWidth: 2, uid: 'x' }))
    assert.match(out, /stroke-width="6"/)
    assert.match(out, /<path d="M4 4l16 16"\/>\s*<\/svg>$/)
  })
  it('Duotone tinge os corpos a 20%', () => {
    assert.match(toSvgString(renderIcon(mail, { style: 'duotone' })), /fill-opacity="0.2"/)
  })
  it('a personalização nunca altera os nós originais', () => {
    const before = JSON.stringify(mail)
    renderIcon(mail, { style: 'solid', strokeWidth: 2.5, color: '#ff0000', size: 64, opacity: 0.5 })
    assert.equal(JSON.stringify(mail), before)
  })
})

describe('exportação', () => {
  const icon: ExportIcon = { slug: 'mail', nodes: pack(mail), styles: ['outline', 'solid', 'duotone'] }
  const o: ExportOptions = { style: 'outline', strokeWidth: 1.5, color: 'currentColor', size: 24, opacity: 1 }

  it('SVG respeita tamanho, cor, traço e opacidade', () => {
    const out = toSvg(icon, { ...o, size: 48, color: '#D9401F', strokeWidth: 2, opacity: 0.5 })
    assert.match(out, /width="48" height="48"/)
    assert.match(out, /stroke="#D9401F"/)
    assert.match(out, /stroke-width="2"/)
    assert.match(out, /opacity="0.5"/)
  })
  it('estilo indisponível cai para Contorno', () => {
    const plain: ExportIcon = { slug: 'arrow-right', nodes: pack(arrow), styles: ['outline'] }
    assert.doesNotMatch(toSvg(plain, { ...o, style: 'solid' }), /mask/)
  })
  it('JSX gera um componente com props de tamanho, cor e traço', () => {
    const jsx = toReact(icon, { ...o, style: 'solid' })
    assert.match(jsx, /export function MailIcon\(\{ size = 24, color = 'currentColor', strokeWidth = 1.5, \.\.\.props \}\)/)
    assert.match(jsx, /import \{ useId \} from 'react'/)
    assert.match(jsx, /mask=\{`url\(#\$\{maskId\}\)`\}/)
    assert.match(jsx, /strokeLinecap="round"/)
    assert.doesNotMatch(jsx, /stroke-width|stroke-linecap/)
  })
  it('TSX traz o tipo das props', () => {
    const tsx = exportText('tsx', icon, o)
    assert.match(tsx, /export interface MailIconProps extends SVGProps<SVGSVGElement>/)
  })
  it('nomes de componente válidos mesmo começando por número', () => {
    assert.match(toReact({ ...icon, slug: '4k-badge' }, o), /export function Icon4kBadgeIcon|export function Icon4KBadge|export function Icon4kBadge/)
  })
  it('CSS usa máscara e a cor do texto', () => {
    const css = toCss(icon, o)
    assert.match(css, /\.icon-mail \{/)
    assert.match(css, /background-color: currentColor/)
    assert.match(css, /mask: url\("data:image\/svg\+xml,/)
  })
  it('data URI não deixa caracteres reservados', () => {
    const uri = toDataUri(toSvg(icon, o))
    assert.ok(uri.startsWith('data:image/svg+xml,'))
    assert.doesNotMatch(uri.slice(19), /[<>#"]/)
  })
})
