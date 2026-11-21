/**
 * The canvas: draws the document (state.ts) and turns pointer gestures into
 * edits. Shapes are SVG built from the same nodes the export uses
 * (shapeToNode), so what is on the artboard is what gets exported. Overlays
 * (selection, handles, guides) are drawn above with non-scaling strokes.
 */
import { createElement, memo, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import type { Anchor, CreationDoc, DrawableShape, PathShape, Point, Shape } from '~/data/types'
import { cn } from '~/lib/utils'
import { enterNodeEditing } from './actions'
import { camera, fitArtboard, panBy, setCamera, useCamera, zoomAt } from './camera'
import { addShape, defaultStyle, drawables, findShape, isLocked, livePadding, newShapeId, nextName, topLevelOf, updateShapes } from './model/doc'
import {
  boundsOfShapes,
  boxCenter,
  isClosedShape,
  nearestOnPath,
  normalizeAngle,
  pathD,
  regularPolygon,
  rotatePoint,
  round3,
  scaleShape,
  segmentsOf,
  shapeBounds,
  simplify,
  smoothAnchors,
  splitSegment,
  translateShape,
  type Box,
} from './model/geometry'
import { shapeToNode } from './model/serialize'
import { commitPreview, currentDoc, editor, finishPen, preview, select, setNode, setPen, setTool, useEditor, type NodeRef } from './state'

const PROP: Record<string, string> = {
  'stroke-width': 'strokeWidth',
  'stroke-linecap': 'strokeLinecap',
  'stroke-linejoin': 'strokeLinejoin',
  'fill-opacity': 'fillOpacity',
}

function nodeProps(attrs: Record<string, string>) {
  const props: Record<string, string> = {}
  for (const [k, v] of Object.entries(attrs)) props[PROP[k] ?? k] = v
  return props
}

/* ---------------------------------------------------------------- shapes */

const ShapeView = memo(function ShapeView({ shape, box }: { shape: Shape; box: number }) {
  if (shape.hidden) return null
  if (shape.kind === 'group') {
    return (
      <g>
        {shape.children.map((c) => (
          <ShapeView key={c.id} shape={c} box={box} />
        ))}
      </g>
    )
  }
  const node = shapeToNode(shape, box)
  if (!node) return null
  return createElement(node.tag, nodeProps(node.attrs))
})

/** Invisible, wider copies of the shapes that receive the pointer. */
const HitView = memo(function HitView({ shape, box, width }: { shape: Shape; box: number; width: number }) {
  if (shape.hidden) return null
  if (shape.kind === 'group') {
    return (
      <>
        {shape.children.map((c) => (
          <HitView key={c.id} shape={c} box={box} width={width} />
        ))}
      </>
    )
  }
  const node = shapeToNode(shape, box)
  if (!node) return null
  const closed = isClosedShape(shape)
  const { transform, ...geo } = nodeProps(node.attrs)
  const keep = ['x', 'y', 'width', 'height', 'rx', 'cx', 'cy', 'r', 'ry', 'x1', 'y1', 'x2', 'y2', 'points', 'd']
  const props: Record<string, string | number> = {}
  for (const k of keep) if (geo[k] !== undefined) props[k] = geo[k]
  return createElement(node.tag, {
    ...props,
    transform,
    'data-sid': shape.id,
    fill: closed ? 'transparent' : 'none',
    stroke: 'transparent',
    strokeWidth: Math.max(width, shape.style.strokeWidth),
    style: { pointerEvents: closed ? 'all' : 'stroke', cursor: 'pointer' },
  })
})

/* ---------------------------------------------------------------- gestures */

type Handle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w'
const HANDLES: Handle[] = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w']
const CURSOR: Record<Handle, string> = { nw: 'nwse-resize', se: 'nwse-resize', ne: 'nesw-resize', sw: 'nesw-resize', n: 'ns-resize', s: 'ns-resize', e: 'ew-resize', w: 'ew-resize' }

function handlePoint(b: Box, h: Handle): Point {
  const x = h.includes('w') ? b.x : h.includes('e') ? b.x + b.w : b.x + b.w / 2
  const y = h.includes('n') ? b.y : h.includes('s') ? b.y + b.h : b.y + b.h / 2
  return { x, y }
}

type Gesture =
  | { type: 'pan'; sx: number; sy: number }
  | { type: 'move'; start: Point; base: CreationDoc; ids: string[]; box0: Box; moved: boolean }
  | { type: 'marquee'; start: Point; additive: boolean; before: string[] }
  | { type: 'resize'; handle: Handle; base: CreationDoc; ids: string[]; box0: Box }
  | { type: 'rotate'; base: CreationDoc; ids: string[]; center: Point; a0: number }
  | { type: 'create'; kind: 'rect' | 'ellipse' | 'line' | 'polygon'; start: Point; id: string; base: CreationDoc }
  | { type: 'pencil'; points: Point[]; id: string; base: CreationDoc }
  | { type: 'pen'; id: string; sub: number; idx: number; anchor: Point }
  | { type: 'node'; target: 'anchor' | 'in' | 'out'; id: string; sub: number; idx: number; base: CreationDoc; start: Point; smooth: boolean }

interface Guide {
  axis: 'x' | 'y'
  at: number
}

const angleOf = (c: Point, p: Point) => (Math.atan2(p.y - c.y, p.x - c.x) * 180) / Math.PI

function pathOf(doc: CreationDoc, id: string): PathShape | undefined {
  const s = findShape(doc.shapes, id)
  return s?.kind === 'path' ? s : undefined
}

function updateAnchor(path: PathShape, sub: number, idx: number, fn: (a: Anchor) => Anchor): PathShape {
  return {
    ...path,
    paths: path.paths.map((sp, si) => (si !== sub ? sp : { ...sp, anchors: sp.anchors.map((a, ai) => (ai === idx ? fn(a) : a)) })),
  }
}

/* ---------------------------------------------------------------- canvas */

export function Canvas({ className }: { className?: string }) {
  const ref = useRef<SVGSVGElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const doc = useEditor(currentDoc)
  const selection = useEditor((s) => s.selection)
  const tool = useEditor((s) => s.tool)
  const view = useEditor((s) => s.view)
  const node = useEditor((s) => s.node)
  const pen = useEditor((s) => s.pen)
  const epoch = useEditor((s) => s.epoch)
  const cam = useCamera()
  const gesture = useRef<Gesture | null>(null)
  const [marquee, setMarquee] = useState<Box | null>(null)
  const [guides, setGuides] = useState<Guide[]>([])
  const [hover, setHover] = useState<Point | null>(null)
  const [spaceDown, setSpaceDown] = useState(false)
  const [panning, setPanning] = useState(false)
  const sized = useRef(false)
  const lastWidth = useRef(0)

  // Viewport size, and a fit on the first size and on each loaded project.
  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      setCamera({ w: Math.max(1, width), h: Math.max(1, height) })
      if (!sized.current && width > 0) {
        sized.current = true
        lastWidth.current = width
        fitArtboard(currentDoc().box)
      } else if (width > 0 && Math.abs(width - lastWidth.current) > lastWidth.current * 0.15) {
        // A real layout change (phone rotated, window resized, panel toggled): fit again.
        lastWidth.current = width
        fitArtboard(currentDoc().box)
      }
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  useEffect(() => {
    if (sized.current) fitArtboard(currentDoc().box)
  }, [epoch])

  // Wheel: pan, or zoom with Ctrl/⌘ (also the trackpad pinch). Not passive, to stop the page zoom.
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const r = el.getBoundingClientRect()
      if (e.ctrlKey || e.metaKey) zoomAt(Math.exp(-e.deltaY * 0.0025), e.clientX - r.left, e.clientY - r.top)
      else panBy(-e.deltaX, -e.deltaY)
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  // Space held = hand tool.
  useEffect(() => {
    const typing = (t: EventTarget | null) => !!(t as HTMLElement | null)?.closest?.('input, textarea, select, [contenteditable="true"]')
    const down = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !typing(e.target)) {
        if (!e.repeat) setSpaceDown(true)
        e.preventDefault()
      }
    }
    const up = (e: KeyboardEvent) => e.code === 'Space' && setSpaceDown(false)
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    }
  }, [])

  const px = 1 / cam.zoom
  const snapOn = view.snap
  const step = view.gridStep
  const snap = (p: Point): Point => (snapOn ? { x: round3(Math.round(p.x / step) * step), y: round3(Math.round(p.y / step) * step) } : { x: round3(p.x), y: round3(p.y) })

  const toDoc = (e: { clientX: number; clientY: number }): Point => {
    const r = ref.current!.getBoundingClientRect()
    const c = camera.get()
    return { x: c.x + (e.clientX - r.left) / c.zoom, y: c.y + (e.clientY - r.top) / c.zoom }
  }

  const selectedShapes = useMemo(() => selection.map((id) => findShape(doc.shapes, id)).filter((s): s is Shape => !!s && !s.hidden), [selection, doc])
  const selBox = selectedShapes.length ? boundsOfShapes(selectedShapes) : null
  const editingPath = tool === 'node' && selection.length === 1 ? pathOf(doc, selection[0]) : undefined

  /** Smart guides: snaps the moving box to the artboard centre, the live area and other shapes. */
  function guideSnap(box: Box, ids: string[], d: CreationDoc): { dx: number; dy: number; guides: Guide[] } {
    const tol = 6 / camera.get().zoom
    const pad = livePadding(d.box)
    const xs = [0, pad, d.box / 2, d.box - pad, d.box]
    const ys = [...xs]
    const others = d.shapes.filter((s) => !ids.includes(s.id) && !s.hidden && !ids.some((id) => findShape([s], id)))
    for (const o of others) {
      const b = shapeBounds(o)
      xs.push(b.x, b.x + b.w / 2, b.x + b.w)
      ys.push(b.y, b.y + b.h / 2, b.y + b.h)
    }
    const best = (vals: number[], targets: number[]) => {
      let hit: { d: number; at: number } | null = null
      for (const v of vals) for (const t of targets) if (Math.abs(t - v) <= tol && (!hit || Math.abs(t - v) < Math.abs(hit.d))) hit = { d: t - v, at: t }
      return hit
    }
    const gx = best([box.x, box.x + box.w / 2, box.x + box.w], xs)
    const gy = best([box.y, box.y + box.h / 2, box.y + box.h], ys)
    const out: Guide[] = []
    let dx = 0
    let dy = 0
    if (gx) {
      dx = gx.d
      out.push({ axis: 'x', at: gx.at })
    } else if (snapOn) dx = round3(Math.round(box.x / step) * step) - box.x
    if (gy) {
      dy = gy.d
      out.push({ axis: 'y', at: gy.at })
    } else if (snapOn) dy = round3(Math.round(box.y / step) * step) - box.y
    return { dx, dy, guides: out }
  }

  function hitId(e: ReactPointerEvent): string | null {
    const el = (e.target as Element).closest?.('[data-sid]')
    return el?.getAttribute('data-sid') ?? null
  }

  function startCreate(kind: 'rect' | 'ellipse' | 'line' | 'polygon', p: Point) {
    const base = editor.get().history.present.doc
    gesture.current = { type: 'create', kind, start: snap(p), id: newShapeId(), base }
  }

  function onPointerDown(e: ReactPointerEvent<SVGSVGElement>) {
    if (e.button === 2) return
    const svg = ref.current!
    svg.setPointerCapture(e.pointerId)
    const p = toDoc(e)
    const s = editor.get()
    const d = s.history.present.doc
    if (e.button === 1 || spaceDown || tool === 'hand') {
      gesture.current = { type: 'pan', sx: e.clientX, sy: e.clientY }
      setPanning(true)
      return
    }
    const target = e.target as Element
    const handle = target.getAttribute?.('data-handle')

    if (tool === 'select') {
      if (handle && selBox) {
        const ids = s.selection.filter((id) => !isLocked(d, id))
        if (!ids.length) return
        if (handle === 'rotate') {
          const center = boxCenter(selBox)
          gesture.current = { type: 'rotate', base: d, ids, center, a0: angleOf(center, p) }
        } else gesture.current = { type: 'resize', handle: handle as Handle, base: d, ids, box0: selBox }
        return
      }
      const hit = hitId(e)
      if (hit) {
        const deep = e.ctrlKey || e.metaKey
        const top = topLevelOf(d.shapes, hit)
        // A shape already selected inside a group stays the target; otherwise the top level is picked.
        const id = deep || s.selection.includes(hit) ? hit : (top?.id ?? hit)
        let ids = s.selection
        if (e.shiftKey) ids = ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]
        else if (!ids.includes(id)) ids = [id]
        select(ids)
        const movable = ids.filter((x) => !isLocked(d, x))
        const shapes = movable.map((x) => findShape(d.shapes, x)).filter((x): x is Shape => !!x)
        if (shapes.length && !e.shiftKey) gesture.current = { type: 'move', start: p, base: d, ids: movable, box0: boundsOfShapes(shapes), moved: false }
        return
      }
      gesture.current = { type: 'marquee', start: p, additive: e.shiftKey, before: e.shiftKey ? s.selection : [] }
      if (!e.shiftKey) select([])
      return
    }

    if (tool === 'node') {
      const path = editingPath
      const ref2 = target.getAttribute?.('data-anchor')
      if (path && ref2) {
        const [sub, idx, kind] = ref2.split(':')
        const si = Number(sub)
        const ai = Number(idx)
        const a = path.paths[si].anchors[ai]
        const smooth = !!(a.in && a.out && Math.abs(angleOf(a, a.in) - angleOf(a, a.out) + 180) % 360 < 2)
        setNode({ sub: si, idx: ai })
        gesture.current = { type: 'node', target: (kind as 'anchor' | 'in' | 'out') ?? 'anchor', id: path.id, sub: si, idx: ai, base: d, start: p, smooth }
        return
      }
      const hit = hitId(e)
      if (hit && hit !== path?.id) {
        enterNodeEditing(hit)
        return
      }
      if (!hit) {
        setNode(null)
        if (!path) select([])
      }
      return
    }

    if (tool === 'rect' || tool === 'ellipse' || tool === 'line' || tool === 'polygon') {
      startCreate(tool, p)
      return
    }

    if (tool === 'pencil') {
      gesture.current = { type: 'pencil', points: [p], id: newShapeId(), base: d }
      return
    }

    if (tool === 'pen') {
      const q = snap(p)
      const cur = s.pen ? pathOf(currentDoc(), s.pen) : undefined
      if (cur) {
        const sp = cur.paths[0]
        const first = sp.anchors[0]
        if (sp.anchors.length > 2 && Math.hypot(first.x - p.x, first.y - p.y) < 8 / cam.zoom) {
          preview(updateShapes(currentDoc(), [cur.id], (x) => (x.kind === 'path' ? { ...x, paths: [{ ...x.paths[0], closed: true }] } : x)))
          finishPen()
          return
        }
        const next: PathShape = { ...cur, paths: [{ ...sp, anchors: [...sp.anchors, { x: q.x, y: q.y }] }] }
        preview(updateShapes(currentDoc(), [cur.id], () => next))
        gesture.current = { type: 'pen', id: cur.id, sub: 0, idx: sp.anchors.length, anchor: q }
      } else {
        const id = newShapeId()
        const shape: PathShape = { id, name: nextName(d, 'path'), kind: 'path', part: 'line', rotation: 0, style: defaultStyle(d.box), paths: [{ closed: false, anchors: [{ x: q.x, y: q.y }] }] }
        preview(addShape(d, shape))
        setPen(id)
        select([id])
        gesture.current = { type: 'pen', id, sub: 0, idx: 0, anchor: q }
      }
    }
  }

  function onPointerMove(e: ReactPointerEvent<SVGSVGElement>) {
    const p = toDoc(e)
    if (tool === 'pen') setHover(snap(p))
    const g = gesture.current
    if (!g) return
    switch (g.type) {
      case 'pan': {
        panBy(e.clientX - g.sx, e.clientY - g.sy)
        g.sx = e.clientX
        g.sy = e.clientY
        return
      }
      case 'move': {
        let dx = p.x - g.start.x
        let dy = p.y - g.start.y
        if (!g.moved && Math.hypot(dx, dy) * cam.zoom < 3) return
        g.moved = true
        if (e.shiftKey) Math.abs(dx) > Math.abs(dy) ? (dy = 0) : (dx = 0)
        const moved = { ...g.box0, x: g.box0.x + dx, y: g.box0.y + dy }
        const sn = e.altKey ? { dx: 0, dy: 0, guides: [] } : guideSnap(moved, g.ids, g.base)
        setGuides(sn.guides)
        dx = round3(dx + sn.dx)
        dy = round3(dy + sn.dy)
        preview(updateShapes(g.base, g.ids, (s) => translateShape(s, dx, dy)))
        return
      }
      case 'marquee': {
        const b: Box = { x: Math.min(g.start.x, p.x), y: Math.min(g.start.y, p.y), w: Math.abs(p.x - g.start.x), h: Math.abs(p.y - g.start.y) }
        setMarquee(b)
        const d = editor.get().history.present.doc
        const hits = d.shapes
          .filter((s) => !s.hidden && !s.locked)
          .filter((s) => {
            const sb = shapeBounds(s)
            return sb.x < b.x + b.w && sb.x + sb.w > b.x && sb.y < b.y + b.h && sb.y + sb.h > b.y
          })
          .map((s) => s.id)
        select([...new Set([...g.before, ...hits])])
        return
      }
      case 'resize': {
        const b = g.box0
        const h = g.handle
        const q = e.altKey ? p : snap(p)
        let x0 = b.x
        let y0 = b.y
        let x1 = b.x + b.w
        let y1 = b.y + b.h
        if (h.includes('w')) x0 = q.x
        if (h.includes('e')) x1 = q.x
        if (h.includes('n')) y0 = q.y
        if (h.includes('s')) y1 = q.y
        let sx = b.w > 1e-6 ? (x1 - x0) / b.w : 1
        let sy = b.h > 1e-6 ? (y1 - y0) / b.h : 1
        if (h === 'n' || h === 's') sx = 1
        if (h === 'e' || h === 'w') sy = 1
        if (e.shiftKey) {
          const k = h === 'n' || h === 's' ? sy : h === 'e' || h === 'w' ? sx : Math.abs(sx) > Math.abs(sy) ? sx : sy
          sx = Math.sign(sx || 1) * Math.abs(k)
          sy = Math.sign(sy || 1) * Math.abs(k)
        }
        if (Math.abs(sx) < 1e-3) sx = 1e-3
        if (Math.abs(sy) < 1e-3) sy = 1e-3
        const origin = { x: h.includes('w') ? b.x + b.w : h.includes('e') ? b.x : b.x + b.w / 2, y: h.includes('n') ? b.y + b.h : h.includes('s') ? b.y : b.y + b.h / 2 }
        preview(updateShapes(g.base, g.ids, (s) => scaleShape(s, sx, sy, origin)))
        return
      }
      case 'rotate': {
        let a = angleOf(g.center, p) - g.a0
        if (e.shiftKey) a = Math.round(a / 15) * 15
        a = normalizeAngle(a)
        const rotate = (s: Shape): Shape => {
          if (s.kind === 'group') return { ...s, children: s.children.map(rotate) }
          const c = boxCenter(shapeBounds({ ...s, rotation: 0 } as DrawableShape))
          const nc = rotatePoint(c, g.center, a)
          return { ...translateShape(s, nc.x - c.x, nc.y - c.y), rotation: normalizeAngle(s.rotation + a) } as Shape
        }
        preview(updateShapes(g.base, g.ids, rotate))
        return
      }
      case 'create': {
        let q = e.altKey ? p : snap(p)
        const s0 = g.start
        let dx = q.x - s0.x
        let dy = q.y - s0.y
        if (e.shiftKey) {
          if (g.kind === 'line') {
            const ang = Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) * (Math.PI / 4)
            const len = Math.hypot(dx, dy)
            dx = round3(Math.cos(ang) * len)
            dy = round3(Math.sin(ang) * len)
          } else {
            const m = Math.max(Math.abs(dx), Math.abs(dy))
            dx = Math.sign(dx || 1) * m
            dy = Math.sign(dy || 1) * m
          }
          q = { x: s0.x + dx, y: s0.y + dy }
        }
        const d = g.base
        const box: Box = { x: Math.min(s0.x, q.x), y: Math.min(s0.y, q.y), w: Math.abs(dx), h: Math.abs(dy) }
        const base = { id: g.id, name: nextName(d, g.kind), part: g.kind === 'line' ? ('line' as const) : ('body' as const), rotation: 0, style: defaultStyle(d.box) }
        let shape: DrawableShape
        if (g.kind === 'rect') shape = { ...base, kind: 'rect', ...box, r: 0 }
        else if (g.kind === 'ellipse') shape = { ...base, kind: 'ellipse', cx: box.x + box.w / 2, cy: box.y + box.h / 2, rx: box.w / 2, ry: box.h / 2 }
        else if (g.kind === 'line') shape = { ...base, kind: 'line', x1: s0.x, y1: s0.y, x2: q.x, y2: q.y }
        else shape = { ...base, kind: 'polygon', closed: true, points: regularPolygon(box, editor.get().view.polygonSides) }
        preview(addShape(d, shape))
        return
      }
      case 'pencil': {
        const last = g.points[g.points.length - 1]
        if (Math.hypot(p.x - last.x, p.y - last.y) * cam.zoom < 2) return
        g.points.push(p)
        const d = g.base
        const shape: PathShape = {
          id: g.id,
          name: nextName(d, 'path'),
          kind: 'path',
          part: 'line',
          rotation: 0,
          style: defaultStyle(d.box),
          paths: [{ closed: false, anchors: g.points.map((pt) => ({ x: round3(pt.x), y: round3(pt.y) })) }],
        }
        preview(addShape(d, shape))
        return
      }
      case 'pen': {
        // Dragging after a click pulls the handles of the new point (symmetric).
        const q = p
        const dx = q.x - g.anchor.x
        const dy = q.y - g.anchor.y
        if (Math.hypot(dx, dy) * cam.zoom < 3) return
        const cur = pathOf(currentDoc(), g.id)
        if (!cur) return
        const next = updateAnchor(cur, g.sub, g.idx, (a) => ({ x: a.x, y: a.y, out: { x: round3(a.x + dx), y: round3(a.y + dy) }, in: { x: round3(a.x - dx), y: round3(a.y - dy) } }))
        preview(updateShapes(currentDoc(), [g.id], () => next))
        return
      }
      case 'node': {
        const path = pathOf(g.base, g.id)
        if (!path) return
        const q = g.target === 'anchor' ? snap(p) : e.shiftKey ? p : snap(p)
        const orig = path.paths[g.sub].anchors[g.idx]
        const next = updateAnchor(path, g.sub, g.idx, (a) => {
          if (g.target === 'anchor') {
            const dx = q.x - orig.x
            const dy = q.y - orig.y
            const mv = (h?: Point) => (h ? { x: round3(h.x + dx), y: round3(h.y + dy) } : undefined)
            return { x: q.x, y: q.y, ...(a.in ? { in: mv(a.in) } : {}), ...(a.out ? { out: mv(a.out) } : {}) }
          }
          const other = g.target === 'in' ? 'out' : 'in'
          const out: Anchor = { ...a, [g.target]: q }
          // A smooth point keeps its handles in line (Alt breaks it).
          if (g.smooth && !e.altKey && a[other]) {
            const len = Math.hypot(a[other]!.x - a.x, a[other]!.y - a.y)
            const ang = Math.atan2(a.y - q.y, a.x - q.x)
            out[other] = { x: round3(a.x + Math.cos(ang) * len), y: round3(a.y + Math.sin(ang) * len) }
          }
          return out
        })
        preview(updateShapes(g.base, [g.id], () => next))
        return
      }
    }
  }

  function onPointerUp(e: ReactPointerEvent<SVGSVGElement>) {
    const g = gesture.current
    gesture.current = null
    ref.current?.releasePointerCapture?.(e.pointerId)
    setGuides([])
    setMarquee(null)
    setPanning(false)
    if (!g) return
    switch (g.type) {
      case 'move':
        if (g.moved) commitPreview(g.ids.length > 1 ? 'Mover formas' : 'Mover')
        return
      case 'resize':
        return commitPreview('Redimensionar')
      case 'rotate':
        return commitPreview('Girar')
      case 'create': {
        const s = findShape(currentDoc().shapes, g.id)
        const b = s ? shapeBounds(s) : null
        if (!s || !b || (b.w < 0.25 && b.h < 0.25)) {
          preview(null)
          return
        }
        commitPreview(`Desenhar ${s.name.replace(/ \d+$/, '').toLowerCase()}`, [g.id])
        return
      }
      case 'pencil': {
        if (g.points.length < 3) {
          preview(null)
          return
        }
        const pts = simplify(g.points, Math.max(0.08, 1.5 / cam.zoom))
        const first = pts[0]
        const last = pts[pts.length - 1]
        const closed = pts.length > 3 && Math.hypot(first.x - last.x, first.y - last.y) < 1
        const ring = closed ? pts.slice(0, -1) : pts
        const d = g.base
        const shape: PathShape = {
          id: g.id,
          name: nextName(d, 'path'),
          kind: 'path',
          part: closed ? 'body' : 'line',
          rotation: 0,
          style: defaultStyle(d.box),
          paths: [{ closed, anchors: smoothAnchors(ring, closed) }],
        }
        preview(addShape(d, shape))
        commitPreview('Desenho livre', [g.id])
        return
      }
      case 'node':
        return commitPreview('Editar pontos')
      case 'pen':
      case 'pan':
      case 'marquee':
        return
    }
  }

  function onDoubleClick(e: React.MouseEvent<SVGSVGElement>) {
    const target = e.target as Element
    if (tool === 'pen') {
      // The double click's first click added a point on top of the last one: drop it.
      const id = editor.get().pen
      const cur = id ? pathOf(currentDoc(), id) : undefined
      if (cur && cur.paths[0].anchors.length > 2) {
        const anchors = cur.paths[0].anchors
        const [a, b] = anchors.slice(-2)
        if (Math.hypot(a.x - b.x, a.y - b.y) < 0.01) preview(updateShapes(currentDoc(), [cur.id], () => ({ ...cur, paths: [{ ...cur.paths[0], anchors: anchors.slice(0, -1) }] })))
      }
      finishPen()
      return
    }
    if (tool === 'select') {
      const id = target.closest?.('[data-sid]')?.getAttribute('data-sid')
      if (id && enterNodeEditing(id)) setTool('node')
      return
    }
    if (tool === 'node' && editingPath) {
      const ref2 = target.getAttribute?.('data-anchor')
      if (ref2) {
        // Double click on a point: corner ⇄ smooth.
        const [sub, idx] = ref2.split(':').map(Number)
        const sp = editingPath.paths[sub]
        const a = sp.anchors[idx]
        const n = sp.anchors.length
        let next: Anchor
        if (a.in || a.out) next = { x: a.x, y: a.y }
        else {
          const prev = sp.anchors[(idx - 1 + n) % n]
          const nxt = sp.anchors[(idx + 1) % n]
          next = smoothAnchors([prev, a, nxt], false)[1]
        }
        preview(updateShapes(editor.get().history.present.doc, [editingPath.id], () => updateAnchor(editingPath, sub, idx, () => next)))
        commitPreview(a.in || a.out ? 'Ponto de canto' : 'Ponto suave')
        return
      }
      // Double click on the outline: insert a point there.
      const p = toDoc(e)
      const near = nearestOnPath(editingPath, p)
      if (near && near.dist * cam.zoom < 10) {
        const sp = editingPath.paths[near.sub]
        const segs = segmentsOf(sp)
        const [a, b] = segs[near.seg]
        const parts = splitSegment(a, b, Math.min(0.99, Math.max(0.01, near.t)))
        const anchors = [...sp.anchors]
        const ia = near.seg
        const ib = (near.seg + 1) % anchors.length
        anchors[ia] = parts.a
        anchors[ib] = parts.b
        anchors.splice(near.seg + 1, 0, { ...parts.mid, x: round3(parts.mid.x), y: round3(parts.mid.y) })
        const next: PathShape = { ...editingPath, paths: editingPath.paths.map((x, i) => (i === near.sub ? { ...x, anchors } : x)) }
        preview(updateShapes(editor.get().history.present.doc, [editingPath.id], () => next))
        commitPreview('Inserir ponto')
        setNode({ sub: near.sub, idx: near.seg + 1 })
      }
    }
  }

  /* ------------------------------------------------------------- drawing */

  const box = doc.box
  const viewBox = `${cam.x} ${cam.y} ${cam.w / cam.zoom} ${cam.h / cam.zoom}`
  const minor = step * cam.zoom >= 6 ? step : 1
  const gridLines = useMemo(() => {
    if (!view.grid || cam.zoom < 4) return null
    const lines: Array<{ k: string; x1: number; y1: number; x2: number; y2: number; major: boolean }> = []
    for (let v = 0; v <= box + 1e-6; v += minor) {
      const major = Math.abs(v - Math.round(v)) < 1e-6 && Math.round(v) % 4 === 0
      lines.push({ k: `x${v}`, x1: v, y1: 0, x2: v, y2: box, major })
      lines.push({ k: `y${v}`, x1: 0, y1: v, x2: box, y2: v, major })
    }
    return lines
  }, [view.grid, cam.zoom, box, minor])

  const pad = livePadding(box)
  const cursor = panning ? 'grabbing' : spaceDown || tool === 'hand' ? 'grab' : tool === 'select' || tool === 'node' ? 'default' : 'crosshair'
  const showHandles = tool === 'select' && selBox && !pen && selectedShapes.every((s) => !isLocked(doc, s.id))
  const hs = 8 * px
  const visibleDrawables = drawables(doc.shapes, { visibleOnly: true })

  return (
    <div ref={wrapRef} className={cn('relative min-h-0 overflow-hidden bg-background-subtle', className)}>
      <svg
        ref={ref}
        role="application"
        aria-label={`Prancheta de ${box} por ${box} unidades, ${visibleDrawables.length} ${visibleDrawables.length === 1 ? 'forma' : 'formas'}`}
        className="absolute inset-0 block size-full touch-none select-none"
        viewBox={viewBox}
        preserveAspectRatio="xMinYMin meet"
        style={{ cursor }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onPointerLeave={() => setHover(null)}
        onDoubleClick={onDoubleClick}
        onContextMenu={(e) => e.preventDefault()}
      >
        <defs>
          <pattern id="glyphos-checker" width={box / 6} height={box / 6} patternUnits="userSpaceOnUse">
            <rect width={box / 6} height={box / 6} className="fill-surface" />
            <rect width={box / 12} height={box / 12} className="fill-background-subtle" />
            <rect x={box / 12} y={box / 12} width={box / 12} height={box / 12} className="fill-background-subtle" />
          </pattern>
        </defs>
        {/* Artboard */}
        <rect x={0} y={0} width={box} height={box} fill={doc.background ?? 'url(#glyphos-checker)'} className="stroke-border-strong" strokeWidth={px} />
        {gridLines && (
          <g className="stroke-border-strong" strokeWidth={px} pointerEvents="none">
            {gridLines.map((l) => (
              <line key={l.k} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} strokeOpacity={l.major ? 0.75 : 0.3} />
            ))}
          </g>
        )}
        {view.keylines && (
          <g className="stroke-accent" fill="none" strokeWidth={px} strokeOpacity={0.55} strokeDasharray={`${4 * px} ${3 * px}`} pointerEvents="none">
            <rect x={pad} y={pad} width={box - pad * 2} height={box - pad * 2} />
            <circle cx={box / 2} cy={box / 2} r={box / 2 - pad} />
            <rect x={box / 8} y={box / 8} width={(box * 3) / 4} height={(box * 3) / 4} rx={box / 24} />
          </g>
        )}
        {/* Drawing */}
        <g className="text-fg" fill="none" stroke="currentColor" strokeWidth={(1.5 * box) / 24} strokeLinecap="round" strokeLinejoin="round" pointerEvents="none" style={{ color: 'var(--color-fg)' }}>
          {doc.shapes.map((s) => (
            <ShapeView key={s.id} shape={s} box={box} />
          ))}
        </g>
        {/* Hit targets */}
        {tool !== 'hand' && !spaceDown && (
          <g>
            {doc.shapes.map((s) => (
              <HitView key={s.id} shape={s} box={box} width={10 * px} />
            ))}
          </g>
        )}
        {/* Selection */}
        <g pointerEvents="none" className="stroke-primary" fill="none">
          {selectedShapes.length > 1 &&
            selectedShapes.map((s) => {
              const b = shapeBounds(s)
              return <rect key={s.id} x={b.x} y={b.y} width={b.w} height={b.h} strokeWidth={px} strokeOpacity={0.5} />
            })}
          {selBox && tool === 'select' && <rect x={selBox.x} y={selBox.y} width={selBox.w} height={selBox.h} strokeWidth={1.25 * px} />}
          {tool !== 'select' && selectedShapes.map((s) => s.kind !== 'group' && <SelectedOutline key={s.id} shape={s} box={box} px={px} />)}
        </g>
        {showHandles && selBox && (
          <g>
            <line x1={selBox.x + selBox.w / 2} y1={selBox.y} x2={selBox.x + selBox.w / 2} y2={selBox.y - 22 * px} className="stroke-primary" strokeWidth={px} pointerEvents="none" />
            <circle data-handle="rotate" cx={selBox.x + selBox.w / 2} cy={selBox.y - 22 * px} r={4.5 * px} className="fill-surface stroke-primary" strokeWidth={1.25 * px} style={{ cursor: 'grab' }}>
              <title>Girar (Shift: de 15 em 15°)</title>
            </circle>
            {HANDLES.map((h) => {
              const pt = handlePoint(selBox, h)
              return <rect key={h} data-handle={h} x={pt.x - hs / 2} y={pt.y - hs / 2} width={hs} height={hs} className="fill-surface stroke-primary" strokeWidth={1.25 * px} style={{ cursor: CURSOR[h] }} />
            })}
          </g>
        )}
        {editingPath && <NodeOverlay path={editingPath} px={px} active={node} />}
        {tool === 'pen' && pen && hover && <PenRubber doc={doc} id={pen} hover={hover} px={px} />}
        {marquee && <rect x={marquee.x} y={marquee.y} width={marquee.w} height={marquee.h} className="fill-primary/10 stroke-primary" strokeWidth={px} strokeDasharray={`${3 * px} ${2 * px}`} pointerEvents="none" />}
        {guides.map((g, i) =>
          g.axis === 'x' ? (
            <line key={i} x1={g.at} y1={cam.y} x2={g.at} y2={cam.y + cam.h / cam.zoom} className="stroke-accent" strokeWidth={px} pointerEvents="none" />
          ) : (
            <line key={i} x1={cam.x} y1={g.at} x2={cam.x + cam.w / cam.zoom} y2={g.at} className="stroke-accent" strokeWidth={px} pointerEvents="none" />
          ),
        )}
      </svg>
      {!visibleDrawables.length && !pen && <EmptyHint />}
    </div>
  )
}

function SelectedOutline({ shape, box, px }: { shape: DrawableShape; box: number; px: number }) {
  const n = shapeToNode(shape, box)
  if (!n) return null
  const props = nodeProps(n.attrs)
  return createElement(n.tag, { ...props, fill: 'none', stroke: undefined, strokeWidth: px, strokeOpacity: 0.6, opacity: undefined })
}

function NodeOverlay({ path, px, active }: { path: PathShape; px: number; active: NodeRef | null }) {
  const s = 7 * px
  return (
    <g>
      <path d={pathD(path.paths)} fill="none" className="stroke-primary" strokeWidth={px} pointerEvents="none" />
      {path.paths.map((sp, si) =>
        sp.anchors.map((a, ai) => {
          const on = active?.sub === si && active.idx === ai
          const n = sp.anchors.length
          const near = active?.sub === si && (on || Math.abs(active.idx - ai) === 1 || (sp.closed && Math.abs(active.idx - ai) === n - 1))
          return (
            <g key={`${si}:${ai}`}>
              {near &&
                (['in', 'out'] as const).map(
                  (k) =>
                    a[k] && (
                      <g key={k}>
                        <line x1={a.x} y1={a.y} x2={a[k]!.x} y2={a[k]!.y} className="stroke-primary" strokeWidth={px} strokeOpacity={0.7} pointerEvents="none" />
                        <circle data-anchor={`${si}:${ai}:${k}`} cx={a[k]!.x} cy={a[k]!.y} r={3.5 * px} className="fill-surface stroke-primary" strokeWidth={1.25 * px} style={{ cursor: 'move' }} />
                      </g>
                    ),
                )}
              <rect
                data-anchor={`${si}:${ai}:anchor`}
                x={a.x - s / 2}
                y={a.y - s / 2}
                width={s}
                height={s}
                className={on ? 'fill-primary stroke-primary' : 'fill-surface stroke-primary'}
                strokeWidth={1.25 * px}
                style={{ cursor: 'move' }}
              >
                <title>{a.in || a.out ? 'Ponto suave' : 'Ponto de canto'}: arraste para mover, clique duplo para alternar</title>
              </rect>
            </g>
          )
        }),
      )}
    </g>
  )
}

function PenRubber({ doc, id, hover, px }: { doc: CreationDoc; id: string; hover: Point; px: number }) {
  const path = pathOf(doc, id)
  if (!path) return null
  const anchors = path.paths[0].anchors
  const last = anchors[anchors.length - 1]
  const first = anchors[0]
  const d = last.out ? `M${last.x} ${last.y}C${last.out.x} ${last.out.y} ${hover.x} ${hover.y} ${hover.x} ${hover.y}` : `M${last.x} ${last.y}L${hover.x} ${hover.y}`
  return (
    <g pointerEvents="none">
      <path d={d} fill="none" className="stroke-primary" strokeWidth={px} strokeDasharray={`${3 * px} ${2 * px}`} />
      {anchors.map((a, i) => (
        <rect key={i} x={a.x - 3 * px} y={a.y - 3 * px} width={6 * px} height={6 * px} className={i === 0 && anchors.length > 2 ? 'fill-primary stroke-primary' : 'fill-surface stroke-primary'} strokeWidth={px} />
      ))}
      {anchors.length > 2 && Math.hypot(first.x - hover.x, first.y - hover.y) < 8 * px && <circle cx={first.x} cy={first.y} r={6 * px} fill="none" className="stroke-primary" strokeWidth={px} />}
    </g>
  )
}

function EmptyHint() {
  const tool = useEditor((s) => s.tool)
  const text: Partial<Record<string, string>> = {
    select: 'Escolha uma ferramenta para começar. No teclado: R retângulo, O elipse, L linha, P polígono, B caneta.',
    rect: 'Arraste na prancheta para desenhar. Shift faz um quadrado; Alt ignora o grid.',
    ellipse: 'Arraste na prancheta para desenhar. Shift faz um círculo.',
    line: 'Arraste para desenhar a linha. Shift prende em ângulos de 45°.',
    polygon: 'Arraste para desenhar um polígono regular. O número de lados fica no painel de propriedades.',
    pencil: 'Desenhe à mão livre: o traço é suavizado em curvas quando você solta.',
    pen: 'Clique para pôr pontos retos; clique e arraste para curvas. Enter termina, clicar no primeiro ponto fecha.',
  }
  const msg = text[tool] ?? text.select
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-6 flex justify-center px-4">
      <p className="max-w-md rounded-lg border border-border bg-surface-overlay px-4 py-2.5 text-center text-sm text-fg-muted shadow-md">{msg}</p>
    </div>
  )
}
