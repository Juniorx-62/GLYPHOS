/**
 * Export formats, all built from the same drawing and the person's current
 * customisation (style, stroke, colour, size, opacity). The authored file is
 * never changed: each export is a fresh rendering.
 *
 *   svg      standalone SVG file / code
 *   jsx      React component (JavaScript)
 *   tsx      React component (TypeScript)
 *   css      a class that paints the icon with CSS mask (colour = currentColor)
 *   dataUri  the SVG as a data: URL, for <img src> or CSS
 *   png      raster image (browser only, via canvas)
 *
 * Pure functions except `svgToPng`, so the formats are unit-tested in Node.
 */
import { renderIcon, toSvgString, unpack, type SvgElement } from '~/catalog/styles'
import type { PackedNode, StyleId } from '~/catalog/types'
import { componentName } from '~/lib/utils'

export interface ExportIcon {
  slug: string
  nodes: PackedNode[]
  styles: StyleId[]
  overrides?: Partial<Record<StyleId, PackedNode[]>>
  /** Drawing area in units (editor artboards); omitted → 24. */
  box?: number
}

export interface ExportOptions {
  style: StyleId
  strokeWidth: number
  color: string
  size: number
  opacity: number
}

export type ExportFormat = 'svg' | 'jsx' | 'tsx' | 'css' | 'dataUri'

/** The style actually used: the requested one when the icon has it, else Outline. */
export const effectiveStyle = (icon: ExportIcon, style: StyleId): StyleId => (icon.styles.includes(style) ? style : 'outline')

export function renderTree(icon: ExportIcon, o: ExportOptions, { uid, size }: { uid?: string; size?: number | string } = {}): SvgElement {
  const style = effectiveStyle(icon, o.style)
  const override = icon.overrides?.[style]
  return renderIcon(unpack(icon.nodes), {
    style,
    strokeWidth: o.strokeWidth,
    color: o.color,
    size: size ?? o.size,
    opacity: o.opacity,
    uid: uid ?? icon.slug,
    override: override ? unpack(override) : undefined,
    box: icon.box,
  })
}

export function toSvg(icon: ExportIcon, o: ExportOptions): string {
  return `${toSvgString(renderTree(icon, o))}\n`
}

/* --------------------------------------------------------------- React */

const PROP: Record<string, string> = {
  'stroke-width': 'strokeWidth',
  'stroke-linecap': 'strokeLinecap',
  'stroke-linejoin': 'strokeLinejoin',
  'fill-opacity': 'fillOpacity',
}

function jsxAttrs(el: SvgElement, ctx: { inMask: boolean; root: boolean }): string {
  const parts: string[] = []
  for (const [k, v] of Object.entries(el.attrs)) {
    // Root size, colour and stroke become props.
    if (ctx.root && (k === 'width' || k === 'height' || k === 'stroke' || k === 'stroke-width' || k === 'xmlns')) continue
    const name = PROP[k] ?? k
    if (k === 'id' && el.tag === 'mask') parts.push('id={maskId}')
    else if (k === 'mask') parts.push('mask={`url(#${maskId})`}')
    else if (ctx.inMask && k === 'stroke-width') parts.push('strokeWidth={strokeWidth * 3}')
    else if (!ctx.inMask && v === 'currentColor') parts.push(`${name}={color}`)
    else parts.push(`${name}="${v.replace(/"/g, '&quot;')}"`)
  }
  return parts.length ? ' ' + parts.join(' ') : ''
}

function jsxElement(el: SvgElement, depth: number, inMask: boolean): string {
  const pad = '  '.repeat(depth)
  const attrs = jsxAttrs(el, { inMask, root: false })
  if (!el.children?.length) return `${pad}<${el.tag}${attrs} />`
  const childInMask = inMask || el.tag === 'mask'
  const inner = el.children.map((c) => jsxElement(c, depth + 1, childInMask)).join('\n')
  return `${pad}<${el.tag}${attrs}>\n${inner}\n${pad}</${el.tag}>`
}

/** A self-contained React component. Size, colour and stroke stay adjustable through props. */
export function toReact(icon: ExportIcon, o: ExportOptions, { typescript = false }: { typescript?: boolean } = {}): string {
  // Render with the export colour as currentColor, so every painted attribute becomes the `color` prop.
  const tree = renderTree(icon, { ...o, color: 'currentColor' })
  const name = componentName(icon.slug)
  const usesMask = JSON.stringify(tree).includes('"mask"')
  const rootAttrs = jsxAttrs(tree, { inMask: false, root: true })
  const body = (tree.children ?? []).map((c) => jsxElement(c, 3, false)).join('\n')
  const color = o.color === 'currentColor' ? 'currentColor' : o.color
  const props = typescript
    ? `{ size = ${o.size}, color = '${color}', strokeWidth = ${o.strokeWidth}, ...props }: ${name}Props`
    : `{ size = ${o.size}, color = '${color}', strokeWidth = ${o.strokeWidth}, ...props }`
  const imports = [usesMask ? 'useId' : null, typescript ? 'type SVGProps' : null].filter(Boolean)
  const lines = [
    imports.length ? `import { ${imports.join(', ')} } from 'react'\n` : null,
    typescript ? `export interface ${name}Props extends SVGProps<SVGSVGElement> {\n  size?: number | string\n  color?: string\n  strokeWidth?: number\n}\n` : null,
    `/** GLYPHOS · ${icon.slug} · MIT License */`,
    `export function ${name}(${props}) {`,
    usesMask ? `  const maskId = \`glyphos-${icon.slug}-\${useId().replace(/:/g, '')}\`` : null,
    '  return (',
    `    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} stroke={color} strokeWidth={strokeWidth}${rootAttrs} aria-hidden="true" {...props}>`,
    body,
    '    </svg>',
    '  )',
    '}',
    '',
  ]
  return lines.filter((l) => l !== null).join('\n')
}

/* --------------------------------------------------------------- CSS & data URI */

/** SVG text as a compact, safe data: URL (quotes swapped, reserved characters escaped). */
export function toDataUri(svg: string): string {
  const compact = svg.replace(/\s*\n\s*/g, '').replace(/"/g, "'")
  return `data:image/svg+xml,${compact.replace(/[%#<>{}|\\^`]/g, (c) => encodeURIComponent(c))}`
}

/** A CSS class that paints the icon with a mask: it takes the text colour (currentColor). */
export function toCss(icon: ExportIcon, o: ExportOptions): string {
  const svg = toSvgString(renderTree(icon, { ...o, color: '#000', opacity: 1 }), { pretty: false })
  const uri = toDataUri(svg)
  return [
    `/* GLYPHOS · ${icon.slug} · MIT License */`,
    `.icon-${icon.slug} {`,
    '  display: inline-block;',
    `  width: ${o.size}px;`,
    `  height: ${o.size}px;`,
    '  background-color: currentColor;',
    o.opacity < 1 ? `  opacity: ${o.opacity};` : null,
    `  -webkit-mask: url("${uri}") no-repeat center / contain;`,
    `  mask: url("${uri}") no-repeat center / contain;`,
    '}',
    '',
  ]
    .filter((l) => l !== null)
    .join('\n')
}

export function exportText(format: ExportFormat, icon: ExportIcon, o: ExportOptions): string {
  switch (format) {
    case 'svg':
      return toSvg(icon, o)
    case 'jsx':
      return toReact(icon, o)
    case 'tsx':
      return toReact(icon, o, { typescript: true })
    case 'css':
      return toCss(icon, o)
    case 'dataUri':
      return toDataUri(toSvgString(renderTree(icon, o), { pretty: false }))
  }
}

export const FILE_EXTENSION: Record<ExportFormat, string> = { svg: 'svg', jsx: 'jsx', tsx: 'tsx', css: 'css', dataUri: 'txt' }

/* --------------------------------------------------------------- PNG (browser) */

/** Rasterises an SVG (with a resolved colour, never currentColor) into a PNG blob. */
export async function svgToPng(svg: string, size: number, background?: string): Promise<Blob> {
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }))
  try {
    const img = new Image()
    img.decoding = 'async'
    img.src = url
    await img.decode()
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas indisponível')
    if (background) {
      ctx.fillStyle = background
      ctx.fillRect(0, 0, size, size)
    }
    ctx.drawImage(img, 0, 0, size, size)
    return await new Promise<Blob>((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Falha ao gerar o PNG'))), 'image/png'))
  } finally {
    URL.revokeObjectURL(url)
  }
}
