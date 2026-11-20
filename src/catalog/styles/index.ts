/**
 * Style registry and the derivation of each style from the master drawing.
 *
 * One drawing per concept (Outline, the master). Solid and Duotone are derived
 * from it through the role of each shape (`data-part`): no second copy of the
 * geometry exists, so a fix in the master reaches every style. A hand-drawn
 * `<slug>.<style>.svg` replaces the derived version where it exists, and is the
 * only way a `manual` style (Sharp, Rounded, Filled) gets icons.
 */
import type { IconNode, PackedNode, StyleDef, StyleId } from '../types'

export const STYLES: StyleDef[] = [
  {
    id: 'outline',
    name: { pt: 'Contorno', en: 'Outline' },
    description: 'Traço de 1,5 px com pontas e cantos arredondados. É o desenho-mestre: todo ícone existe neste estilo.',
    derivation: 'master',
    stroked: true,
  },
  {
    id: 'solid',
    name: { pt: 'Sólido', en: 'Solid' },
    description: 'A silhueta preenchida, com os detalhes internos vazados. Bom para estados ativos e seleção.',
    derivation: 'auto',
    stroked: true,
  },
  {
    id: 'duotone',
    name: { pt: 'Duotone', en: 'Duotone' },
    description: 'O contorno sobre a silhueta em 20% da mesma cor. Dá peso sem perder os detalhes.',
    derivation: 'auto',
    stroked: true,
  },
  {
    id: 'sharp',
    name: { pt: 'Reto', en: 'Sharp' },
    description: 'Cantos e pontas retos. Só existe onde há um desenho próprio (<slug>.sharp.svg).',
    derivation: 'manual',
    stroked: true,
  },
  {
    id: 'rounded',
    name: { pt: 'Arredondado', en: 'Rounded' },
    description: 'Formas mais macias e traço mais grosso. Só existe onde há um desenho próprio (<slug>.rounded.svg).',
    derivation: 'manual',
    stroked: true,
  },
  {
    id: 'filled',
    name: { pt: 'Preenchido', en: 'Filled' },
    description: 'Formas cheias, sem traço. Só existe onde há um desenho próprio (<slug>.filled.svg).',
    derivation: 'manual',
    stroked: false,
  },
]

export const STYLE_IDS = STYLES.map((s) => s.id)
export const styleById = (id: string) => STYLES.find((s) => s.id === id)

export const DEFAULT_STROKE = 1.5
export const STROKE_RANGE = { min: 0.75, max: 2.5, step: 0.25 } as const

/* ------------------------------------------------------- packing */

const PART_CODE = { line: 0, body: 1, cut: 2, slash: 3 } as const
const PART_NAME = ['line', 'body', 'cut', 'slash'] as const

export const pack = (nodes: IconNode[]): PackedNode[] => nodes.map((n) => [n.tag, n.attrs, PART_CODE[n.part]])
export const unpack = (nodes: PackedNode[]): IconNode[] => nodes.map(([tag, attrs, part]) => ({ tag, attrs, part: PART_NAME[part] }))

/** Styles a drawing can be shown in, before hand-drawn overrides are added. */
export function derivableStyles(nodes: IconNode[]): StyleId[] {
  return nodes.some((n) => n.part === 'body') ? ['outline', 'solid', 'duotone'] : ['outline']
}

/* ------------------------------------------------------- rendering */

/** A generic SVG element tree, rendered by React (components/icons) or to text (export). */
export interface SvgElement {
  tag: string
  attrs: Record<string, string>
  children?: SvgElement[]
}

export interface RenderOptions {
  style: StyleId
  /** Stroke width in the 24-unit grid. */
  strokeWidth?: number
  /** Width and height attributes. Omitted → 24. */
  size?: number | string
  /** Stroke/fill colour. Omitted → currentColor (inherits the text colour). */
  color?: string
  opacity?: number
  /** Unique suffix for the Solid mask id when several icons share a document. */
  uid?: string
  /** Hand-drawn replacement for this style, if any. */
  override?: IconNode[]
}

const shape = (n: IconNode, extra: Record<string, string> = {}): SvgElement => ({ tag: n.tag, attrs: { ...n.attrs, ...extra } })

const round = (v: number) => String(Math.round(v * 1000) / 1000)

/** Builds the SVG of an icon in a style. Never mutates the nodes. */
export function renderIcon(nodes: IconNode[], options: RenderOptions): SvgElement {
  const { style, strokeWidth = DEFAULT_STROKE, size = 24, color = 'currentColor', opacity, uid } = options
  const def = styleById(style)
  const root: Record<string, string> = {
    xmlns: 'http://www.w3.org/2000/svg',
    width: String(size),
    height: String(size),
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: color,
    'stroke-width': round(strokeWidth),
    'stroke-linecap': 'round',
    'stroke-linejoin': 'round',
  }
  if (opacity !== undefined && opacity < 1) root.opacity = round(opacity)

  const paint = (n: IconNode): SvgElement =>
    shape(n, n.attrs.fill === 'currentColor' ? { fill: color } : {})

  if (options.override) {
    if (def && !def.stroked) {
      delete root.stroke
      delete root['stroke-width']
      delete root['stroke-linecap']
      delete root['stroke-linejoin']
      root.fill = color
    }
    return { tag: 'svg', attrs: root, children: options.override.map(paint) }
  }

  const bodies = nodes.filter((n) => n.part === 'body')
  if (style === 'duotone' && bodies.length) {
    return {
      tag: 'svg',
      attrs: root,
      children: nodes.map((n) => (n.part === 'body' ? shape(n, { fill: color, 'fill-opacity': '0.2' }) : paint(n))),
    }
  }

  if (style === 'solid' && bodies.length) {
    const cuts = nodes.filter((n) => n.part === 'cut')
    const slashes = nodes.filter((n) => n.part === 'slash')
    const lines = nodes.filter((n) => n.part === 'line' || n.part === 'slash')
    const filledBodies = bodies.map((n) => shape(n, { fill: color }))
    const children: SvgElement[] = []
    if (cuts.length || slashes.length) {
      const id = `glyphos-cut${uid ? `-${uid}` : ''}`
      children.push({
        tag: 'defs',
        attrs: {},
        children: [
          {
            tag: 'mask',
            attrs: { id, maskUnits: 'userSpaceOnUse', x: '0', y: '0', width: '24', height: '24' },
            children: [
              { tag: 'rect', attrs: { width: '24', height: '24', fill: '#fff', stroke: 'none' } },
              ...cuts.map((n) =>
                shape(n, n.attrs.fill === 'currentColor' ? { fill: '#000', stroke: n.attrs.stroke === 'none' ? 'none' : '#000' } : { stroke: '#000' }),
              ),
              // A slash opens a gap about three strokes wide; the slash itself is drawn in it below.
              ...slashes.map((n) => shape(n, { stroke: '#000', 'stroke-width': round(strokeWidth * 3) })),
            ],
          },
        ],
      })
      children.push({ tag: 'g', attrs: { mask: `url(#${id})` }, children: filledBodies })
    } else children.push(...filledBodies)
    children.push(...lines.map(paint))
    return { tag: 'svg', attrs: root, children }
  }

  // Outline (and any style a drawing cannot derive): the master as drawn.
  return { tag: 'svg', attrs: root, children: nodes.map(paint) }
}

const escapeAttr = (v: string) => v.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')

/** Serialises an element tree to SVG text. `pretty` puts each shape on its own line. */
export function toSvgString(el: SvgElement, { pretty = true, depth = 0 }: { pretty?: boolean; depth?: number } = {}): string {
  const attrs = Object.entries(el.attrs)
    .map(([k, v]) => ` ${k}="${escapeAttr(v)}"`)
    .join('')
  if (!el.children?.length) return `<${el.tag}${attrs}/>`
  const nl = pretty ? '\n' : ''
  const pad = pretty ? '  '.repeat(depth + 1) : ''
  const close = pretty ? '  '.repeat(depth) : ''
  const inner = el.children.map((c) => pad + toSvgString(c, { pretty, depth: depth + 1 })).join(nl)
  return `<${el.tag}${attrs}>${nl}${inner}${nl}${close}</${el.tag}>`
}
