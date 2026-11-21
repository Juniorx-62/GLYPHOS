/**
 * Geometry of the editor's shapes. Pure functions over the structured
 * document (src/data/types.ts): bounds, flattening, transforms and the
 * conversion of any shape into an editable path. No DOM, tested in Node.
 */
import type { Anchor, DrawableShape, PathShape, Point, Shape, SubPath } from '~/data/types'

export interface Box {
  x: number
  y: number
  w: number
  h: number
}

export const EMPTY_BOX: Box = { x: 0, y: 0, w: 0, h: 0 }

const KAPPA = 0.5522847498

export const round3 = (v: number) => {
  const r = Math.round(v * 1000) / 1000
  return Object.is(r, -0) ? 0 : r
}

export function boxOfPoints(points: Point[]): Box {
  if (!points.length) return EMPTY_BOX
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const p of points) {
    if (p.x < minX) minX = p.x
    if (p.y < minY) minY = p.y
    if (p.x > maxX) maxX = p.x
    if (p.y > maxY) maxY = p.y
  }
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY }
}

export function unionBoxes(boxes: Box[]): Box {
  const pts = boxes.flatMap((b) => [
    { x: b.x, y: b.y },
    { x: b.x + b.w, y: b.y + b.h },
  ])
  return boxOfPoints(pts)
}

export const boxCenter = (b: Box): Point => ({ x: b.x + b.w / 2, y: b.y + b.h / 2 })

export function rotatePoint(p: Point, c: Point, deg: number): Point {
  if (!deg) return p
  const a = (deg * Math.PI) / 180
  const cos = Math.cos(a)
  const sin = Math.sin(a)
  const dx = p.x - c.x
  const dy = p.y - c.y
  return { x: c.x + dx * cos - dy * sin, y: c.y + dx * sin + dy * cos }
}

/* ------------------------------------------------------------- beziers */

function cubicAt(p0: Point, p1: Point, p2: Point, p3: Point, t: number): Point {
  const u = 1 - t
  const a = u * u * u
  const b = 3 * u * u * t
  const c = 3 * u * t * t
  const d = t * t * t
  return { x: a * p0.x + b * p1.x + c * p2.x + d * p3.x, y: a * p0.y + b * p1.y + c * p2.y + d * p3.y }
}

/** Each segment of a subpath as [from, to] anchors (closing segment included). */
export function segmentsOf(sp: SubPath): Array<[Anchor, Anchor]> {
  const out: Array<[Anchor, Anchor]> = []
  for (let i = 1; i < sp.anchors.length; i++) out.push([sp.anchors[i - 1], sp.anchors[i]])
  if (sp.closed && sp.anchors.length > 1) out.push([sp.anchors[sp.anchors.length - 1], sp.anchors[0]])
  return out
}

export const isCurve = (a: Anchor, b: Anchor) => !!(a.out || b.in)

/** Points along a segment, excluding its start. */
export function flattenSegment(a: Anchor, b: Anchor, steps = 16): Point[] {
  if (!isCurve(a, b)) return [{ x: b.x, y: b.y }]
  const c1 = a.out ?? a
  const c2 = b.in ?? b
  const pts: Point[] = []
  for (let i = 1; i <= steps; i++) pts.push(cubicAt(a, c1, c2, b, i / steps))
  return pts
}

/** Splits the segment a→b at t (de Casteljau): the anchors to put in their place. */
export function splitSegment(a: Anchor, b: Anchor, t: number): { a: Anchor; mid: Anchor; b: Anchor } {
  const lerp = (p: Point, q: Point, k: number): Point => ({ x: p.x + (q.x - p.x) * k, y: p.y + (q.y - p.y) * k })
  if (!isCurve(a, b)) return { a, mid: lerp(a, b, t), b }
  const c1 = a.out ?? a
  const c2 = b.in ?? b
  const p01 = lerp(a, c1, t)
  const p12 = lerp(c1, c2, t)
  const p23 = lerp(c2, b, t)
  const p012 = lerp(p01, p12, t)
  const p123 = lerp(p12, p23, t)
  const mid = lerp(p012, p123, t)
  return { a: { ...a, out: p01 }, mid: { x: mid.x, y: mid.y, in: p012, out: p123 }, b: { ...b, in: p23 } }
}

/* ------------------------------------------------------------- shapes */

/** Bounds of the unrotated geometry. */
export function localBounds(s: DrawableShape): Box {
  switch (s.kind) {
    case 'rect':
      return { x: s.x, y: s.y, w: s.w, h: s.h }
    case 'ellipse':
      return { x: s.cx - s.rx, y: s.cy - s.ry, w: s.rx * 2, h: s.ry * 2 }
    case 'line':
      return boxOfPoints([
        { x: s.x1, y: s.y1 },
        { x: s.x2, y: s.y2 },
      ])
    case 'polygon':
      return boxOfPoints(s.points)
    case 'path':
      return boxOfPoints(s.paths.flatMap((sp) => [sp.anchors[0], ...segmentsOf(sp).flatMap(([a, b]) => flattenSegment(a, b, 12))]).filter(Boolean))
  }
}

export const pivotOf = (s: DrawableShape) => boxCenter(localBounds(s))

/** Outline as polylines in drawing coordinates (rotation applied). */
export function flattenShape(s: DrawableShape): Array<{ points: Point[]; closed: boolean }> {
  let rings: Array<{ points: Point[]; closed: boolean }>
  switch (s.kind) {
    case 'rect':
    case 'ellipse':
      rings = toPath(s).paths.map((sp) => ({ points: flattenSubPath(sp), closed: true }))
      break
    case 'line':
      rings = [
        {
          points: [
            { x: s.x1, y: s.y1 },
            { x: s.x2, y: s.y2 },
          ],
          closed: false,
        },
      ]
      break
    case 'polygon':
      rings = [{ points: s.points, closed: s.closed }]
      break
    case 'path':
      rings = s.paths.map((sp) => ({ points: flattenSubPath(sp), closed: sp.closed }))
      break
  }
  if (!s.rotation) return rings
  const c = pivotOf(s)
  return rings.map((r) => ({ closed: r.closed, points: r.points.map((p) => rotatePoint(p, c, s.rotation)) }))
}

export function flattenSubPath(sp: SubPath, steps = 16): Point[] {
  if (!sp.anchors.length) return []
  const pts: Point[] = [{ x: sp.anchors[0].x, y: sp.anchors[0].y }]
  for (const [a, b] of segmentsOf(sp)) pts.push(...flattenSegment(a, b, steps))
  if (sp.closed && pts.length > 1) pts.pop() // last point repeats the first
  return pts
}

/** Bounds as drawn (rotation applied), for selection and alignment. */
export function shapeBounds(s: Shape): Box {
  if (s.kind === 'group') return unionBoxes(s.children.filter((c) => !c.hidden).map(shapeBounds))
  if (!s.rotation) return localBounds(s)
  return boxOfPoints(flattenShape(s).flatMap((r) => r.points))
}

export const boundsOfShapes = (shapes: Shape[]): Box => unionBoxes(shapes.map(shapeBounds))

export const isClosedShape = (s: DrawableShape) =>
  s.kind === 'rect' || s.kind === 'ellipse' || (s.kind === 'polygon' && s.closed) || (s.kind === 'path' && s.paths.every((p) => p.closed))

/* --------------------------------------------------------- transforms */

type PointMap = (p: Point) => Point

function mapAnchor(a: Anchor, f: PointMap): Anchor {
  const p = f(a)
  return { x: p.x, y: p.y, ...(a.in ? { in: f(a.in) } : {}), ...(a.out ? { out: f(a.out) } : {}) }
}

/** Applies a point map to the geometry (not to rotation). Rect/ellipse need an axis-aligned map. */
function mapGeometry<S extends DrawableShape>(s: S, f: PointMap): S {
  switch (s.kind) {
    case 'rect': {
      const a = f({ x: s.x, y: s.y })
      const b = f({ x: s.x + s.w, y: s.y + s.h })
      return { ...s, x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), w: Math.abs(b.x - a.x), h: Math.abs(b.y - a.y) }
    }
    case 'ellipse': {
      const c = f({ x: s.cx, y: s.cy })
      const e = f({ x: s.cx + s.rx, y: s.cy + s.ry })
      return { ...s, cx: c.x, cy: c.y, rx: Math.abs(e.x - c.x), ry: Math.abs(e.y - c.y) }
    }
    case 'line': {
      const a = f({ x: s.x1, y: s.y1 })
      const b = f({ x: s.x2, y: s.y2 })
      return { ...s, x1: a.x, y1: a.y, x2: b.x, y2: b.y }
    }
    case 'polygon':
      return { ...s, points: s.points.map(f) }
    case 'path':
      return { ...s, paths: s.paths.map((sp) => ({ closed: sp.closed, anchors: sp.anchors.map((a) => mapAnchor(a, f)) })) }
  }
  return s
}

export function translateShape<S extends Shape>(s: S, dx: number, dy: number): S {
  if (!dx && !dy) return s
  if (s.kind === 'group') return { ...s, children: s.children.map((c) => translateShape(c, dx, dy)) }
  return mapGeometry(s as DrawableShape, (p) => ({ x: p.x + dx, y: p.y + dy })) as S
}

/**
 * Scales around an origin in drawing coordinates. The shape's centre moves
 * like a point; its own geometry scales in its local frame, so a rotated
 * shape keeps its angle. Negative factors mirror (and flip the angle).
 */
export function scaleShape<S extends Shape>(s: S, sx: number, sy: number, origin: Point): S {
  if (s.kind === 'group') return { ...s, children: s.children.map((c) => scaleShape(c, sx, sy, origin)) }
  const d = s as DrawableShape
  const c = pivotOf(d)
  const nc = { x: origin.x + (c.x - origin.x) * sx, y: origin.y + (c.y - origin.y) * sy }
  const local = mapGeometry(d, (p) => ({ x: nc.x + (p.x - c.x) * sx, y: nc.y + (p.y - c.y) * sy }))
  const mirrored = sx * sy < 0
  return { ...local, rotation: mirrored ? normalizeAngle(-d.rotation) : d.rotation } as S
}

export const normalizeAngle = (deg: number) => {
  let a = deg % 360
  if (a > 180) a -= 360
  if (a <= -180) a += 360
  return round3(a)
}

/** Rotates around a point: the centre orbits and the shape's own angle grows. */
export function rotateShape<S extends Shape>(s: S, deg: number, origin: Point): S {
  if (!deg) return s
  if (s.kind === 'group') return { ...s, children: s.children.map((c) => rotateShape(c, deg, origin)) }
  const d = s as DrawableShape
  const c = pivotOf(d)
  const nc = rotatePoint(c, origin, deg)
  const moved = translateShape(d, nc.x - c.x, nc.y - c.y)
  return { ...moved, rotation: normalizeAngle(d.rotation + deg) } as S
}

/** Writes the rotation into the points (exact for points and paths; rect/ellipse become paths). */
export function bakeRotation(s: DrawableShape): DrawableShape {
  if (!s.rotation) return s
  const c = pivotOf(s)
  const target = s.kind === 'rect' || s.kind === 'ellipse' ? toPath(s) : s
  return { ...mapGeometry(target, (p) => rotatePoint(p, c, s.rotation)), rotation: 0 }
}

/* ------------------------------------------------------- to path */

function rectAnchors(x: number, y: number, w: number, h: number, r: number): Anchor[] {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2))
  if (!rr) {
    return [
      { x, y },
      { x: x + w, y },
      { x: x + w, y: y + h },
      { x, y: y + h },
    ]
  }
  const k = rr * KAPPA
  return [
    { x: x + rr, y, in: { x: x + rr - k, y } },
    { x: x + w - rr, y, out: { x: x + w - rr + k, y } },
    { x: x + w, y: y + rr, in: { x: x + w, y: y + rr - k } },
    { x: x + w, y: y + h - rr, out: { x: x + w, y: y + h - rr + k } },
    { x: x + w - rr, y: y + h, in: { x: x + w - rr + k, y: y + h } },
    { x: x + rr, y: y + h, out: { x: x + rr - k, y: y + h } },
    { x, y: y + h - rr, in: { x, y: y + h - rr + k } },
    { x, y: y + rr, out: { x, y: y + rr - k } },
  ].map((a) => ({ ...a }))
}

function ellipseAnchors(cx: number, cy: number, rx: number, ry: number): Anchor[] {
  const kx = rx * KAPPA
  const ky = ry * KAPPA
  return [
    { x: cx, y: cy - ry, in: { x: cx - kx, y: cy - ry }, out: { x: cx + kx, y: cy - ry } },
    { x: cx + rx, y: cy, in: { x: cx + rx, y: cy - ky }, out: { x: cx + rx, y: cy + ky } },
    { x: cx, y: cy + ry, in: { x: cx + kx, y: cy + ry }, out: { x: cx - kx, y: cy + ry } },
    { x: cx - rx, y: cy, in: { x: cx - rx, y: cy + ky }, out: { x: cx - rx, y: cy - ky } },
  ]
}

/** Any drawable shape as an editable path, same look (rotation kept). */
export function toPath(s: DrawableShape): PathShape {
  const base = { id: s.id, name: s.name, hidden: s.hidden, locked: s.locked, part: s.part, style: s.style, rotation: s.rotation }
  const clean = <T extends object>(o: T) => {
    const out = { ...o } as Record<string, unknown>
    for (const k of Object.keys(out)) if (out[k] === undefined) delete out[k]
    return out as T
  }
  switch (s.kind) {
    case 'path':
      return s
    case 'rect': {
      // With rounded corners the anchors carry handles (a closed path of curves).
      const anchors = rectAnchors(s.x, s.y, s.w, s.h, s.r)
      return clean({ ...base, kind: 'path', paths: [{ closed: true, anchors }] })
    }
    case 'ellipse':
      return clean({ ...base, kind: 'path', paths: [{ closed: true, anchors: ellipseAnchors(s.cx, s.cy, s.rx, s.ry) }] })
    case 'line':
      return clean({
        ...base,
        kind: 'path',
        paths: [
          {
            closed: false,
            anchors: [
              { x: s.x1, y: s.y1 },
              { x: s.x2, y: s.y2 },
            ],
          },
        ],
      })
    case 'polygon':
      return clean({ ...base, kind: 'path', paths: [{ closed: s.closed, anchors: s.points.map((p) => ({ x: p.x, y: p.y })) }] })
  }
}

/** Points of a regular polygon (or star when inner > 0) inscribed in a box. */
export function regularPolygon(box: Box, sides: number, inner = 0): Point[] {
  const n = Math.max(3, Math.min(24, Math.round(sides)))
  const c = boxCenter(box)
  const rx = box.w / 2
  const ry = box.h / 2
  const pts: Point[] = []
  const count = inner > 0 ? n * 2 : n
  for (let i = 0; i < count; i++) {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / count
    const k = inner > 0 && i % 2 ? inner : 1
    pts.push({ x: round3(c.x + Math.cos(a) * rx * k), y: round3(c.y + Math.sin(a) * ry * k) })
  }
  return pts
}

/* ------------------------------------------------------- path data */

const f = (v: number) => String(round3(v))

export function subPathD(sp: SubPath): string {
  if (!sp.anchors.length) return ''
  const a0 = sp.anchors[0]
  let d = `M${f(a0.x)} ${f(a0.y)}`
  for (const [a, b] of segmentsOf(sp)) {
    if (isCurve(a, b)) {
      const c1 = a.out ?? a
      const c2 = b.in ?? b
      d += `C${f(c1.x)} ${f(c1.y)} ${f(c2.x)} ${f(c2.y)} ${f(b.x)} ${f(b.y)}`
    } else if (sp.closed && b === a0) {
      // The closing straight segment is drawn by Z.
    } else d += `L${f(b.x)} ${f(b.y)}`
  }
  if (sp.closed) d += 'Z'
  return d
}

export const pathD = (paths: SubPath[]) => paths.map(subPathD).join('')

/* ------------------------------------------------------- simplification */

/** Ramer–Douglas–Peucker on an open polyline. */
export function simplify(points: Point[], epsilon: number): Point[] {
  if (points.length < 3) return points
  const [a, b] = [points[0], points[points.length - 1]]
  let maxD = 0
  let idx = 0
  const dx = b.x - a.x
  const dy = b.y - a.y
  const len = Math.hypot(dx, dy) || 1
  for (let i = 1; i < points.length - 1; i++) {
    const p = points[i]
    const d = Math.abs(dy * p.x - dx * p.y + b.x * a.y - b.y * a.x) / len
    if (d > maxD) {
      maxD = d
      idx = i
    }
  }
  if (maxD <= epsilon) return [a, b]
  const left = simplify(points.slice(0, idx + 1), epsilon)
  const right = simplify(points.slice(idx), epsilon)
  return [...left.slice(0, -1), ...right]
}

/** Smooth anchors through points (Catmull-Rom converted to cubic handles). */
export function smoothAnchors(points: Point[], closed: boolean, tension = 1 / 6): Anchor[] {
  const n = points.length
  if (n < 3) return points.map((p) => ({ x: round3(p.x), y: round3(p.y) }))
  const at = (i: number) => (closed ? points[(i + n) % n] : points[Math.max(0, Math.min(n - 1, i))])
  return points.map((p, i) => {
    const prev = at(i - 1)
    const next = at(i + 1)
    const tx = (next.x - prev.x) * tension
    const ty = (next.y - prev.y) * tension
    const isEnd = !closed && (i === 0 || i === n - 1)
    const a: Anchor = { x: round3(p.x), y: round3(p.y) }
    if (!isEnd || i === n - 1) a.in = { x: round3(p.x - tx), y: round3(p.y - ty) }
    if (!isEnd || i === 0) a.out = { x: round3(p.x + tx), y: round3(p.y + ty) }
    if (!closed && i === 0) delete a.in
    if (!closed && i === n - 1) delete a.out
    return a
  })
}

/** Distance from p to the segment ab. */
export function distToSegment(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const l2 = dx * dx + dy * dy
  const t = l2 ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2)) : 0
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy))
}

/** The segment of a path nearest to p, with the parameter t there. */
export function nearestOnPath(shape: PathShape, p: Point): { sub: number; seg: number; t: number; dist: number } | null {
  let best: { sub: number; seg: number; t: number; dist: number } | null = null
  shape.paths.forEach((sp, si) => {
    segmentsOf(sp).forEach(([a, b], gi) => {
      const steps = 24
      let prev: Point = a
      for (let k = 1; k <= steps; k++) {
        const t = k / steps
        const cur = isCurve(a, b) ? cubicAt(a, a.out ?? a, b.in ?? b, b, t) : { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }
        const d = distToSegment(p, prev, cur)
        if (!best || d < best.dist) best = { sub: si, seg: gi, t: t - 0.5 / steps, dist: d }
        prev = cur
      }
    })
  })
  return best
}
