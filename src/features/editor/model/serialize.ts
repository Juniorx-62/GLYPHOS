/**
 * Between the editor document and the catalogue's drawing format.
 *
 *   docToNodes   CreationDoc → IconNode[]   rendered by renderIcon, so a creation
 *                                           gets Outline/Solid/Duotone and every
 *                                           export format exactly as a library icon
 *   nodesToShapes IconNode[] → Shape[]      opens a catalogue icon in the editor
 *                                           (a copy: the catalogue never changes)
 */
import type { IconNode, NodePart } from '~/catalog/types'
import { toSegments } from '~/catalog/svg/path'
import type { Anchor, CreationDoc, DrawableShape, Point, Shape, SubPath } from '~/data/types'
import { defaultStyle, drawables, GLYPHOS_STROKE, KIND_LABEL, newShapeId } from './doc'
import { bakeRotation, pathD, pivotOf, round3 } from './geometry'

const f = (v: number) => String(round3(v))

/** The catalogue node of one shape, or null when it draws nothing. */
export function shapeToNode(s: DrawableShape, box: number): IconNode | null {
  // Points and paths carry their rotation in the coordinates; rect and ellipse keep a transform.
  const shape = s.rotation && s.kind !== 'rect' && s.kind !== 'ellipse' ? bakeRotation(s) : s
  const attrs: Record<string, string> = {}
  let tag: IconNode['tag']
  switch (shape.kind) {
    case 'rect':
      if (shape.w <= 0 || shape.h <= 0) return null
      tag = 'rect'
      Object.assign(attrs, { x: f(shape.x), y: f(shape.y), width: f(shape.w), height: f(shape.h) })
      if (shape.r > 0) attrs.rx = f(Math.min(shape.r, shape.w / 2, shape.h / 2))
      break
    case 'ellipse':
      if (shape.rx <= 0 || shape.ry <= 0) return null
      if (Math.abs(shape.rx - shape.ry) < 1e-3) {
        tag = 'circle'
        Object.assign(attrs, { cx: f(shape.cx), cy: f(shape.cy), r: f(shape.rx) })
      } else {
        tag = 'ellipse'
        Object.assign(attrs, { cx: f(shape.cx), cy: f(shape.cy), rx: f(shape.rx), ry: f(shape.ry) })
      }
      break
    case 'line':
      tag = 'line'
      Object.assign(attrs, { x1: f(shape.x1), y1: f(shape.y1), x2: f(shape.x2), y2: f(shape.y2) })
      break
    case 'polygon':
      if (shape.points.length < 2) return null
      tag = shape.closed ? 'polygon' : 'polyline'
      attrs.points = shape.points.map((p) => `${f(p.x)} ${f(p.y)}`).join(' ')
      break
    case 'path': {
      const d = pathD(shape.paths.filter((p) => p.anchors.length > 1))
      if (!d) return null
      tag = 'path'
      attrs.d = d
      break
    }
  }
  const st = s.style
  if (st.fill !== 'none') attrs.fill = st.fill
  if (st.stroke === 'none') attrs.stroke = 'none'
  else if (st.stroke !== 'currentColor') attrs.stroke = st.stroke
  const base = (GLYPHOS_STROKE * box) / 24
  if (st.stroke !== 'none' && Math.abs(st.strokeWidth - base) > 1e-3) attrs['stroke-width'] = f(st.strokeWidth)
  if (st.linecap !== 'round') attrs['stroke-linecap'] = st.linecap
  if (st.linejoin !== 'round') attrs['stroke-linejoin'] = st.linejoin
  if (st.opacity < 1) attrs.opacity = f(st.opacity)
  if (s.rotation && (s.kind === 'rect' || s.kind === 'ellipse')) {
    const c = pivotOf(s)
    attrs.transform = `rotate(${f(s.rotation)} ${f(c.x)} ${f(c.y)})`
  }
  return { tag, attrs, part: s.part }
}

/** The visible drawing as catalogue nodes (groups opened, hidden shapes left out). */
export function docToNodes(doc: CreationDoc): IconNode[] {
  return drawables(doc.shapes, { visibleOnly: true })
    .map((s) => shapeToNode(s, doc.box))
    .filter((n): n is IconNode => !!n)
}

/* ---------------------------------------------------------- import */

const num = (attrs: Record<string, string>, k: string, d = 0) => {
  const v = Number(attrs[k])
  return Number.isFinite(v) ? v : d
}

function parsePoints(v: string | undefined): Point[] {
  const nums = (v ?? '').trim().split(/[\s,]+/).map(Number).filter(Number.isFinite)
  const pts: Point[] = []
  for (let i = 0; i + 1 < nums.length; i += 2) pts.push({ x: nums[i], y: nums[i + 1] })
  return pts
}

/** An SVG elliptical arc as cubic segments (each ≤ 90°), endpoint parametrisation (SVG 1.1 F.6). */
export function arcToCubics(x0: number, y0: number, rx: number, ry: number, rotDeg: number, large: number, sweep: number, x: number, y: number): Array<[Point, Point, Point]> {
  if (!rx || !ry || (x0 === x && y0 === y)) return [[{ x: x0, y: y0 }, { x, y }, { x, y }]]
  rx = Math.abs(rx)
  ry = Math.abs(ry)
  const phi = (rotDeg * Math.PI) / 180
  const cos = Math.cos(phi)
  const sin = Math.sin(phi)
  const dx = (x0 - x) / 2
  const dy = (y0 - y) / 2
  const x1p = cos * dx + sin * dy
  const y1p = -sin * dx + cos * dy
  const lambda = (x1p * x1p) / (rx * rx) + (y1p * y1p) / (ry * ry)
  if (lambda > 1) {
    rx *= Math.sqrt(lambda)
    ry *= Math.sqrt(lambda)
  }
  const num2 = rx * rx * ry * ry - rx * rx * y1p * y1p - ry * ry * x1p * x1p
  const den = rx * rx * y1p * y1p + ry * ry * x1p * x1p
  let coef = Math.sqrt(Math.max(0, num2 / den))
  if (large === sweep) coef = -coef
  const cxp = (coef * rx * y1p) / ry
  const cyp = (-coef * ry * x1p) / rx
  const cx = cos * cxp - sin * cyp + (x0 + x) / 2
  const cy = sin * cxp + cos * cyp + (y0 + y) / 2
  const angle = (ux: number, uy: number, vx: number, vy: number) => {
    const a = Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy)
    return a
  }
  const t1 = angle(1, 0, (x1p - cxp) / rx, (y1p - cyp) / ry)
  let dt = angle((x1p - cxp) / rx, (y1p - cyp) / ry, (-x1p - cxp) / rx, (-y1p - cyp) / ry)
  if (!sweep && dt > 0) dt -= 2 * Math.PI
  if (sweep && dt < 0) dt += 2 * Math.PI
  const parts = Math.ceil(Math.abs(dt) / (Math.PI / 2) - 1e-9)
  const step = dt / parts
  const k = (4 / 3) * Math.tan(step / 4)
  const out: Array<[Point, Point, Point]> = []
  const pt = (t: number) => ({ x: cx + rx * Math.cos(t) * cos - ry * Math.sin(t) * sin, y: cy + rx * Math.cos(t) * sin + ry * Math.sin(t) * cos })
  const der = (t: number) => ({ x: -rx * Math.sin(t) * cos - ry * Math.cos(t) * sin, y: -rx * Math.sin(t) * sin + ry * Math.cos(t) * cos })
  let ta = t1
  for (let i = 0; i < parts; i++) {
    const tb = ta + step
    const pa = pt(ta)
    const pb = i === parts - 1 ? { x, y } : pt(tb)
    const da = der(ta)
    const db = der(tb)
    out.push([
      { x: pa.x + k * da.x, y: pa.y + k * da.y },
      { x: pb.x - k * db.x, y: pb.y - k * db.y },
      pb,
    ])
    ta = tb
  }
  return out
}

const rp = (p: Point): Point => ({ x: round3(p.x), y: round3(p.y) })

/** Path data as editable subpaths: lines, cubics; quadratics and arcs become cubics. */
export function dToSubPaths(d: string): SubPath[] {
  const subs: SubPath[] = []
  let cur: SubPath | null = null
  for (const seg of toSegments(d)) {
    if (seg.kind === 'M') {
      cur = { closed: false, anchors: [{ x: seg.x, y: seg.y }] }
      subs.push(cur)
      continue
    }
    if (!cur) {
      cur = { closed: false, anchors: [{ x: seg.x0, y: seg.y0 }] }
      subs.push(cur)
    }
    const last = cur.anchors[cur.anchors.length - 1]
    const push = (a: Anchor) => cur!.anchors.push(a)
    switch (seg.kind) {
      case 'L':
        push({ x: seg.x, y: seg.y })
        break
      case 'C':
        last.out = rp({ x: seg.x1, y: seg.y1 })
        push({ x: seg.x, y: seg.y, in: rp({ x: seg.x2, y: seg.y2 }) })
        break
      case 'Q':
        last.out = rp({ x: seg.x0 + ((seg.x1 - seg.x0) * 2) / 3, y: seg.y0 + ((seg.y1 - seg.y0) * 2) / 3 })
        push({ x: seg.x, y: seg.y, in: rp({ x: seg.x + ((seg.x1 - seg.x) * 2) / 3, y: seg.y + ((seg.y1 - seg.y) * 2) / 3 }) })
        break
      case 'A':
        for (const [c1, c2, p] of arcToCubics(seg.x0, seg.y0, seg.rx, seg.ry, seg.rot, seg.large, seg.sweep, seg.x, seg.y)) {
          cur.anchors[cur.anchors.length - 1].out = rp(c1)
          push({ ...rp(p), in: rp(c2) })
        }
        break
      case 'Z': {
        cur.closed = true
        const first = cur.anchors[0]
        const end = cur.anchors[cur.anchors.length - 1]
        // A last anchor on top of the first one is the same point: merge them.
        if (cur.anchors.length > 1 && Math.abs(end.x - first.x) < 1e-6 && Math.abs(end.y - first.y) < 1e-6) {
          if (end.in) first.in = end.in
          cur.anchors.pop()
        }
        const next: SubPath = { closed: false, anchors: [{ x: first.x, y: first.y }] }
        cur = next
        subs.push(next)
        break
      }
    }
  }
  return subs.filter((s) => s.anchors.length > 1 || s.closed)
}

/** Catalogue drawing → editor shapes, one shape per node, roles kept. */
export function nodesToShapes(nodes: IconNode[], box = 24): Shape[] {
  const counts: Partial<Record<Shape['kind'], number>> = {}
  const name = (k: Shape['kind']) => `${KIND_LABEL[k]} ${(counts[k] = (counts[k] ?? 0) + 1)}`
  const out: Shape[] = []
  for (const n of nodes) {
    const a = n.attrs
    const style = defaultStyle(box)
    if (a.fill === 'currentColor') style.fill = 'currentColor'
    if (a.stroke === 'none') style.stroke = 'none'
    const part: NodePart = n.part
    const base = { id: newShapeId(), part, style, rotation: 0 }
    switch (n.tag) {
      case 'rect':
        out.push({ ...base, name: name('rect'), kind: 'rect', x: num(a, 'x'), y: num(a, 'y'), w: num(a, 'width'), h: num(a, 'height'), r: num(a, 'rx', num(a, 'ry')) })
        break
      case 'circle':
        out.push({ ...base, name: name('ellipse'), kind: 'ellipse', cx: num(a, 'cx'), cy: num(a, 'cy'), rx: num(a, 'r'), ry: num(a, 'r') })
        break
      case 'ellipse':
        out.push({ ...base, name: name('ellipse'), kind: 'ellipse', cx: num(a, 'cx'), cy: num(a, 'cy'), rx: num(a, 'rx'), ry: num(a, 'ry') })
        break
      case 'line':
        out.push({ ...base, name: name('line'), kind: 'line', x1: num(a, 'x1'), y1: num(a, 'y1'), x2: num(a, 'x2'), y2: num(a, 'y2') })
        break
      case 'polyline':
      case 'polygon':
        out.push({ ...base, name: name('polygon'), kind: 'polygon', points: parsePoints(a.points), closed: n.tag === 'polygon' })
        break
      case 'path': {
        const paths = dToSubPaths(a.d ?? '')
        if (paths.length) out.push({ ...base, name: name('path'), kind: 'path', paths })
        break
      }
    }
  }
  return out
}
