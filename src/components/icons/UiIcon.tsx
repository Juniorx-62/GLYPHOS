/**
 * The interface's own icons, drawn from the catalogue (see ui-icon-names.ts).
 * Bundled with the app, so they render on the server and in the first paint.
 */
import uiIcons from '~/catalog/registry/generated/ui-icons.json'
import type { PackedNode, StyleId } from '~/catalog/types'
import { Glyph } from './Glyph'
import type { UiIconName } from './ui-icon-names'

const ICONS = uiIcons as unknown as Partial<Record<UiIconName, PackedNode[]>>

export function UiIcon({ name, size = 18, className, style = 'outline', strokeWidth, label }: {
  name: UiIconName
  size?: number
  className?: string
  style?: StyleId
  strokeWidth?: number
  label?: string
}) {
  const nodes = ICONS[name]
  if (!nodes) return <span aria-hidden style={{ width: size, height: size, display: 'inline-block' }} />
  return <Glyph nodes={nodes} size={size} className={className} style={style} strokeWidth={strokeWidth} label={label} />
}
