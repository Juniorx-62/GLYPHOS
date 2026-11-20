/**
 * Geometry of a drawing, for the quality checks: points along each shape,
 * bounds, whether a shape is closed, point-in-shape tests and a coarse raster
 * used to find visually duplicated icons. Used by scripts and tests only; the
 * app never ships this file.
 */
import type { IconNode } from '../types'
import { toSegments, type Segment } from './path'

export interface Point {
  x: number
  y: number
}

/** A sampled outline: one or more polylines (subpaths), each maybe closed. */
export interface Sampled {
  polylines: Array<{ points: Point[]; closed: boolean }>
}

const num = (v: string | undefined, fallback = 0) => (v === undefined ? fallback : Number(v))

function arcPoints(seg: Extract<Segment, { kind: 'A' }>, steps: number): Point[] {
  // Endpoint → center parameterisation (SVG 1.1, appendix F.6).
  const { x0, y0, x, y, large, sweep } = seg
  let { rx, ry } = seg
  if (rx === 0 || ry === 0) return [{ x, y }]
  rx = Math.abs(rx)
  ry = Math.abs(ry)
  const phi = (seg.rot * Math.PI) / 180
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
  const sign = large !== sweep ? 1 : -1
  const numer = rx * rx * ry * ry - rx * rx * y1p * y1p - ry * ry * x1p * x1p
  const denom = rx * rx * y1p * y1p + ry * ry * x1p * x1p
  const coef = sign * Math.sqrt(Math.max(0, numer / denom))
  const cxp = (coef * rx * y1p) / ry
  const cyp = (-coef * ry * x1p) / rx
  const cx = cos * cxp - sin * cyp + (x0 + x) / 2
  const cy = sin * cxp + cos * cyp + (y0 + y) / 2
  const angle = (ux: number, uy: number, vx: number, vy: number) => {
    const a = Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy)
    return a
  }
  const theta1 = angle(1, 0, (x1p - cxp) / rx, (y1p - cyp) / ry)
  let dtheta = angle((x1p - cxp) / rx, (y1p - cyp) / ry, (-x1p - cxp) / rx, (-y1p - cyp) / ry)
  if (!sweep && dtheta > 0) dtheta -= 2 * Math.PI
  if (sweep && dtheta < 0) dtheta += 2 * Math.PI
  const pts: Point[] = []
  const n = Math.max(2, Math.ceil((Math.abs(dtheta) / (Math.PI * 2)) * steps))
  for (let i = 1; i <= n; i++) {
    const t = theta1 + (dtheta * i) / n
    const ex = rx * Math.cos(t)
    const ey = ry * Math.sin(t)
    pts.push({ x: cos * ex - sin * ey + cx, y: sin * ex + cos * ey + cy })
  }
  return pts
}

function samplePath(d: string): Sampled {
  const polylines: Sampled['polylines'] = []
  let current: Point[] = []
  const flush = (closed: boolean) => {
    if (current.length) polylines.push({ points: current, closed })
    current = []
  }
  for (const seg of toSegments(d)) {
    switch (seg.kind) {
      case 'M':
        flush(false)
        current = [{ x: seg.x, y: seg.y }]
        break
      case 'L': {
        if (!current.length) current.push({ x: seg.x0, y: seg.y0 })
        const len = Math.hypot(seg.x - seg.x0, seg.y - seg.y0)
        const n = Math.max(1, Math.ceil(len / 0.5))
        for (let i = 1; i <= n; i++) current.push({ x: seg.x0 + ((seg.x - seg.x0) * i) / n, y: seg.y0 + ((seg.y - seg.y0) * i) / n })
        break
      }
      case 'C': {
        if (!current.length) current.push({ x: seg.x0, y: seg.y0 })
        for (let i = 1; i <= 24; i++) {
          const t = i / 24
          const mt = 1 - t
          current.push({
            x: mt * mt * mt * seg.x0 + 3 * mt * mt * t * seg.x1 + 3 * mt * t * t * seg.x2 + t * t * t * seg.x,
            y: mt * mt * mt * seg.y0 + 3 * mt * mt * t * seg.y1 + 3 * mt * t * t * seg.y2 + t * t * t * seg.y,
          })
        }
        break
      }
      case 'Q': {
        if (!current.length) current.push({ x: seg.x0, y: seg.y0 })
        for (let i = 1; i <= 16; i++) {
          const t = i / 16
          const mt = 1 - t
          current.push({ x: mt * mt * seg.x0 + 2 * mt * t * seg.x1 + t * t * seg.x, y: mt * mt * seg.y0 + 2 * mt * t * seg.y1 + t * t * seg.y })
        }
        break
      }
      case 'A':
        if (!current.length) current.push({ x: seg.x0, y: seg.y0 })
        current.push(...arcPoints(seg, 64))
        break
      case 'Z':
        if (current.length) current.push({ x: seg.x, y: seg.y })
        flush(true)
        break
    }
  }
  flush(false)
  return { polylines }
}

function ellipsePoints(cx: number, cy: number, rx: number, ry: number): Point[] {
  const pts: Point[] = []
  const n = Math.max(24, Math.ceil(Math.max(rx, ry) * 8))
  for (let i = 0; i <= n; i++) {
    const t = (i / n) * Math.PI * 2
    pts.push({ x: cx + rx * Math.cos(t), y: cy + ry * Math.sin(t) })
  }
  return pts
}

function rectPoints(x: number, y: number, w: number, h: number, rxIn: number, ryIn: number): Point[] {
  const rx = Math.min(rxIn, w / 2)
  const ry = Math.min(ryIn, h / 2)
  const pts: Point[] = []
  const corner = (cx: number, cy: number, start: number) => {
    for (let i = 0; i <= 8; i++) {
      const t = start + (i / 8) * (Math.PI / 2)
      pts.push({ x: cx + rx * Math.cos(t), y: cy + ry * Math.sin(t) })
    }
  }
  if (rx > 0 && ry > 0) {
    corner(x + w - rx, y + ry, -Math.PI / 2)
    corner(x + w - rx, y + h - ry, 0)
    corner(x + rx, y + h - ry, Math.PI / 2)
    corner(x + rx, y + ry, Math.PI)
    pts.push(pts[0])
  } else {
    pts.push({ x, y }, { x: x + w, y }, { x: x + w, y: y + h }, { x, y: y + h }, { x, y })
  }
  // Densify straight edges so rasters see them.
  const dense: Point[] = [pts[0]]
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1]
    const b = pts[i]
    const n = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 0.5))
    for (let k = 1; k <= n; k++) dense.push({ x: a.x + ((b.x - a.x) * k) / n, y: a.y + ((b.y - a.y) * k) / n })
  }
  return dense
}

function pointsAttr(v: string): Point[] {
  const nums = v.trim().split(/[\s,]+/).map(Number)
  const pts: Point[] = []
  for (let i = 0; i + 1 < nums.length; i += 2) pts.push({ x: nums[i], y: nums[i + 1] })
  return pts
}

function densify(points: Point[]): Point[] {
  if (points.length < 2) return points
  const out: Point[] = [points[0]]
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1]
    const b = points[i]
    const n = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 0.5))
    for (let k = 1; k <= n; k++) out.push({ x: a.x + ((b.x - a.x) * k) / n, y: a.y + ((b.y - a.y) * k) / n })
  }
  return out
}

/** Points along a shape's centre line. */
export function sampleNode(node: IconNode): Sampled {
  const a = node.attrs
  switch (node.tag) {
    case 'path':
      return samplePath(a.d)
    case 'circle':
      return { polylines: [{ points: ellipsePoints(num(a.cx), num(a.cy), num(a.r), num(a.r)), closed: true }] }
    case 'ellipse':
      return { polylines: [{ points: ellipsePoints(num(a.cx), num(a.cy), num(a.rx), num(a.ry)), closed: true }] }
    case 'rect': {
      const rx = a.rx !== undefined ? num(a.rx) : num(a.ry)
      const ry = a.ry !== undefined ? num(a.ry) : rx
      return { polylines: [{ points: rectPoints(num(a.x), num(a.y), num(a.width), num(a.height), rx, ry), closed: true }] }
    }
    case 'line':
      return { polylines: [{ points: densify([{ x: num(a.x1), y: num(a.y1) }, { x: num(a.x2), y: num(a.y2) }]), closed: false }] }
    case 'polyline':
      return { polylines: [{ points: densify(pointsAttr(a.points)), closed: false }] }
    case 'polygon': {
      const pts = pointsAttr(a.points)
      return { polylines: [{ points: densify([...pts, pts[0]]), closed: true }] }
    }
  }
}

export interface Bounds {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

/** Bounds of the centre lines of all shapes. */
export function boundsOf(nodes: IconNode[]): Bounds {
  const b: Bounds = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity }
  for (const node of nodes) {
    for (const pl of sampleNode(node).polylines) {
      for (const p of pl.points) {
        if (p.x < b.minX) b.minX = p.x
        if (p.y < b.minY) b.minY = p.y
        if (p.x > b.maxX) b.maxX = p.x
        if (p.y > b.maxY) b.maxY = p.y
      }
    }
  }
  return b
}

/** A shape is closed when every subpath ends where it starts (or with Z). */
export function isClosed(node: IconNode): boolean {
  if (node.tag === 'line' || node.tag === 'polyline') return false
  if (node.tag !== 'path') return true
  const { polylines } = sampleNode(node)
  return polylines.length > 0 && polylines.every((pl) => pl.closed || dist(pl.points[0], pl.points[pl.points.length - 1]) < 0.05)
}

const dist = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y)

/** Even-odd point-in-shape test over all closed subpaths of a body shape. */
export function containsPoint(node: IconNode, p: Point): boolean {
  let inside = false
  for (const pl of sampleNode(node).polylines) {
    const pts = pl.points
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const a = pts[i]
      const b = pts[j]
      if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) inside = !inside
    }
  }
  return inside
}

/** Every sampled point of a shape. */
export function allPoints(node: IconNode): Point[] {
  return sampleNode(node).polylines.flatMap((pl) => pl.points)
}

/** Shortest distance between the centre lines of two shapes (sampled). */
export function minDistance(a: IconNode, b: IconNode): number {
  const pa = allPoints(a)
  const pb = allPoints(b)
  let best = Infinity
  for (const p of pa) for (const q of pb) {
    const d = (p.x - q.x) ** 2 + (p.y - q.y) ** 2
    if (d < best) best = d
  }
  return Math.sqrt(best)
}

/**
 * Coarse picture of the drawing: a 24 × 24 grid of cells touched by a stroke
 * (1 unit cells, stroke radius 0.9). Two icons whose rasters overlap almost
 * completely look the same to a person at normal sizes.
 */
export function raster(nodes: IconNode[], size = 24): Uint8Array {
  const grid = new Uint8Array(size * size)
  const scale = size / 24
  const r = 0.9 * scale
  for (const node of nodes) {
    const filled = node.attrs.fill === 'currentColor'
    for (const p of allPoints(node)) {
      const minX = Math.max(0, Math.floor(p.x * scale - r))
      const maxX = Math.min(size - 1, Math.floor(p.x * scale + r))
      const minY = Math.max(0, Math.floor(p.y * scale - r))
      const maxY = Math.min(size - 1, Math.floor(p.y * scale + r))
      for (let y = minY; y <= maxY; y++) for (let x = minX; x <= maxX; x++) {
        if ((x + 0.5 - p.x * scale) ** 2 + (y + 0.5 - p.y * scale) ** 2 <= r * r + 0.5) grid[y * size + x] = 1
      }
    }
    if (filled) {
      for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
        if (containsPoint(node, { x: (x + 0.5) / scale, y: (y + 0.5) / scale })) grid[y * size + x] = 1
      }
    }
  }
  return grid
}

/** Jaccard similarity of two rasters (1 = identical). */
export function similarity(a: Uint8Array, b: Uint8Array): number {
  let inter = 0
  let union = 0
  for (let i = 0; i < a.length; i++) {
    if (a[i] || b[i]) union++
    if (a[i] && b[i]) inter++
  }
  return union ? inter / union : 1
}
