/** Shapes of the visitor's own data, kept in the browser (see docs/ARCHITECTURE.md#persistência-local). */
import type { StyleId } from '~/catalog/types'

export interface SlugEntry {
  slug: string
  /** ISO timestamp. */
  at: string
}

export interface PersonalCollection {
  id: string
  name: string
  icons: string[]
  /** Ids of the visitor's own creations in this collection. */
  creations: string[]
  createdAt: string
  updatedAt: string
}

export type ThemePreference = 'light' | 'dark'

/** How icons are drawn in the grid and exported: the live customisation. */
export interface IconAppearance {
  style: StyleId
  /** Stroke width on the 24-unit grid. */
  strokeWidth: number
  /** CSS colour (#hex) or 'currentColor'. */
  color: string
  /** Export size in px. */
  size: number
  opacity: number
}

export interface Settings {
  theme: ThemePreference
  appearance: IconAppearance
  /** Background of the large preview: 'surface' follows the theme. */
  previewBackground: string
  showNames: boolean
  gridDensity: 'comfortable' | 'compact'
}

/* ------------------------------------------------------------ creations */

/**
 * The visitor's own icons, drawn in the editor (/create). The project keeps
 * every shape, layer and property, so editing can go on later; the exported
 * SVG is rendered from it and is never the source.
 */
export interface Point {
  x: number
  y: number
}

/** A path vertex. Handles are absolute, in drawing units; no handle = corner. */
export interface Anchor extends Point {
  in?: Point
  out?: Point
}

export interface SubPath {
  closed: boolean
  anchors: Anchor[]
}

/** Role in the derived styles, as in the catalogue (`data-part`). */
export type ShapePart = 'line' | 'body' | 'cut' | 'slash'

export interface ShapeStyle {
  /** 'none', 'currentColor' or #hex. */
  fill: string
  /** 'none', 'currentColor' or #hex. */
  stroke: string
  strokeWidth: number
  opacity: number
  linecap: 'round' | 'butt' | 'square'
  linejoin: 'round' | 'miter' | 'bevel'
}

interface ShapeCommon {
  id: string
  name: string
  hidden?: boolean
  locked?: boolean
}

interface Drawable extends ShapeCommon {
  part: ShapePart
  style: ShapeStyle
  /** Degrees, around the centre of the shape's own (unrotated) bounds. */
  rotation: number
}

export interface RectShape extends Drawable {
  kind: 'rect'
  x: number
  y: number
  w: number
  h: number
  /** Corner radius. */
  r: number
}

export interface EllipseShape extends Drawable {
  kind: 'ellipse'
  cx: number
  cy: number
  rx: number
  ry: number
}

export interface LineShape extends Drawable {
  kind: 'line'
  x1: number
  y1: number
  x2: number
  y2: number
}

export interface PolygonShape extends Drawable {
  kind: 'polygon'
  points: Point[]
  closed: boolean
}

export interface PathShape extends Drawable {
  kind: 'path'
  paths: SubPath[]
}

export interface GroupShape extends ShapeCommon {
  kind: 'group'
  children: Shape[]
}

export type DrawableShape = RectShape | EllipseShape | LineShape | PolygonShape | PathShape
export type Shape = DrawableShape | GroupShape

export interface CreationDoc {
  /** Side of the square artboard in units (viewBox). 24 is the GLYPHOS grid. */
  box: number
  /** Artboard background in the editor and PNG: null = transparent. */
  background: string | null
  /** Bottom to top. */
  shapes: Shape[]
}

export interface Creation {
  id: string
  name: string
  doc: CreationDoc
  /** The catalogue icon it started from, when it did. */
  origin?: { slug: string; name: string }
  /** The drawing as it was before the last Style Matching, to go back to. */
  previous?: CreationDoc
  createdAt: string
  updatedAt: string
}

/** Work in the editor that was never saved as a creation. */
export interface EditorDraft {
  name: string
  doc: CreationDoc
  origin?: { slug: string; name: string }
  /** The creation being edited, when the draft continues one. */
  creationId?: string
  updatedAt: string
}
