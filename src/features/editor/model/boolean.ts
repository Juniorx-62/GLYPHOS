/**
 * Boolean operations between closed shapes (union, subtract, intersect,
 * exclude), through polygon-clipping: a small, tested clipper with no
 * dependencies. Curves are flattened first, so the result is a path of
 * straight segments that follows the curves closely (the UI says so).
 */
import * as clippingNs from 'polygon-clipping'
import type { MultiPolygon, Polygon } from 'polygon-clipping'
import type { DrawableShape, PathShape, SubPath } from '~/data/types'
import { flattenShape, isClosedShape, round3, simplify } from './geometry'

type Clipping = typeof clippingNs
// The package ships CommonJS with a default export; Vite and Node expose it as `default`.
const clipping: Clipping = (clippingNs as unknown as { default?: Clipping }).default ?? clippingNs

export type BooleanOp = 'union' | 'subtract' | 'intersect' | 'exclude'

export const BOOLEAN_LABEL: Record<BooleanOp, string> = {
  union: 'União',
  subtract: 'Subtrair',
  intersect: 'Interseção',
  exclude: 'Excluir sobreposição',
}

/** Closed shapes only: an open line has no inside to combine. */
export const canCombine = (shapes: DrawableShape[]) => shapes.length >= 2 && shapes.every(isClosedShape)

function toPolygon(s: DrawableShape): Polygon {
  return flattenShape(s)
    .filter((r) => r.closed && r.points.length >= 3)
    .map((r) => {
      const ring = r.points.map((p) => [p.x, p.y] as [number, number])
      ring.push(ring[0])
      return ring
    })
}

function ringToSubPath(ring: Array<[number, number]>): SubPath {
  const pts = ring.slice(0, -1).map(([x, y]) => ({ x, y }))
  // Drop points that add nothing visible (flattened curves have many).
  const closedLoop = [...pts, pts[0]]
  const simple = simplify(closedLoop, 0.01).slice(0, -1)
  return { closed: true, anchors: (simple.length >= 3 ? simple : pts).map((p) => ({ x: round3(p.x), y: round3(p.y) })) }
}

/**
 * Combines shapes, bottom to top: subtract removes every upper shape from the
 * lowest one. The result takes the lowest shape's style, role and name. Null
 * when the result is empty.
 */
export function combine(shapes: DrawableShape[], op: BooleanOp, id: string): PathShape | null {
  if (!canCombine(shapes)) return null
  const [first, ...rest] = shapes.map(toPolygon)
  let result: MultiPolygon
  switch (op) {
    case 'union':
      result = clipping.union(first, ...rest)
      break
    case 'subtract':
      result = clipping.difference(first, ...rest)
      break
    case 'intersect':
      result = clipping.intersection(first, ...rest)
      break
    case 'exclude':
      result = clipping.xor(first, ...rest)
      break
  }
  const paths = result.flatMap((poly) => poly.map(ringToSubPath)).filter((p) => p.anchors.length >= 3)
  if (!paths.length) return null
  const base = shapes[0]
  return { id, name: base.name, part: base.part, style: base.style, rotation: 0, kind: 'path', paths }
}
