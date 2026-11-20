/**
 * Draws a catalogue icon from its nodes, in any style, as React elements.
 * The SVG is built from whitelisted shapes (see catalog/svg/parse.ts) and
 * never injected as HTML, so nothing in a drawing can run as code.
 */
import { createElement, memo, useId, useMemo, type CSSProperties, type ReactElement } from 'react'
import { renderIcon, unpack, type SvgElement } from '~/catalog/styles'
import type { PackedNode, StyleId } from '~/catalog/types'

/** SVG attribute names → React prop names. */
const PROP: Record<string, string> = {
  'stroke-width': 'strokeWidth',
  'stroke-linecap': 'strokeLinecap',
  'stroke-linejoin': 'strokeLinejoin',
  'fill-opacity': 'fillOpacity',
  maskUnits: 'maskUnits',
  viewBox: 'viewBox',
}

function toReact(el: SvgElement, key?: number): ReactElement {
  const props: Record<string, unknown> = { key }
  for (const [k, v] of Object.entries(el.attrs)) {
    if (k === 'xmlns') continue
    props[PROP[k] ?? k] = v
  }
  return createElement(el.tag, props, ...(el.children ?? []).map((c, i) => toReact(c, i)))
}

export interface GlyphProps {
  nodes: PackedNode[]
  style?: StyleId
  override?: PackedNode[]
  size?: number | string
  strokeWidth?: number
  color?: string
  opacity?: number
  className?: string
  cssStyle?: CSSProperties
  /** Accessible name. Without it the icon is decorative (aria-hidden). */
  label?: string
}

export const Glyph = memo(function Glyph({ nodes, style = 'outline', override, size = 24, strokeWidth, color, opacity, className, cssStyle, label }: GlyphProps) {
  const rawId = useId()
  const uid = rawId.replace(/[^a-zA-Z0-9]/g, '')
  const tree = useMemo(
    () => renderIcon(unpack(nodes), { style, size, strokeWidth, color, opacity, uid, override: override ? unpack(override) : undefined }),
    [nodes, style, size, strokeWidth, color, opacity, uid, override],
  )
  const props: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(tree.attrs)) if (k !== 'xmlns') props[PROP[k] ?? k] = v
  const a11y = label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true, focusable: 'false' }
  return createElement('svg', { ...props, ...a11y, className, style: cssStyle, 'data-glyph': '' }, ...(tree.children ?? []).map((c, i) => toReact(c, i)))
})
