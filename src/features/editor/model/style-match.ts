/**
 * Style Matching: brings a drawing to the GLYPHOS drawing system (24 grid,
 * live area 2–22, 1.5 stroke, round caps and joins, currentColor, shape roles
 * for Solid and Duotone). Each step is optional and reported. What would need
 * the paths to be redrawn (a filled shape becoming an outline) is not done,
 * only reported.
 */
import type { CreationDoc, DrawableShape, Shape } from '~/data/types'
import { drawables, GLYPHOS_BOX, GLYPHOS_STROKE, livePadding, mapShapes } from './doc'
import { boundsOfShapes, boxCenter, isClosedShape, localBounds, round3, scaleShape, translateShape } from './geometry'

export interface MatchOptions {
  /** Artboard to 24 units, everything scaled with it. */
  grid: boolean
  /** Scale the drawing to fill the live area (2–22) and centre it. */
  fit: boolean
  /** Centre only (when fit is off). */
  center: boolean
  stroke: boolean
  caps: boolean
  color: boolean
  /** Snap anchor points to this step (0 = off). */
  snap: number
  /** Closed outlines become bodies, shapes inside a body become cuts. */
  roles: boolean
}

export const DEFAULT_MATCH: MatchOptions = { grid: true, fit: true, center: true, stroke: true, caps: true, color: true, snap: 0.25, roles: true }

export interface MatchReport {
  doc: CreationDoc
  changes: string[]
  warnings: string[]
}

const snapV = (v: number, step: number) => round3(Math.round(v / step) * step)

function snapShape(s: Shape, step: number): Shape {
  if (s.kind === 'group') return { ...s, children: s.children.map((c) => snapShape(c, step)) }
  const q = (v: number) => snapV(v, step)
  switch (s.kind) {
    case 'rect':
      return { ...s, x: q(s.x), y: q(s.y), w: q(s.w), h: q(s.h), r: q(s.r) }
    case 'ellipse':
      return { ...s, cx: q(s.cx), cy: q(s.cy), rx: q(s.rx), ry: q(s.ry) }
    case 'line':
      return { ...s, x1: q(s.x1), y1: q(s.y1), x2: q(s.x2), y2: q(s.y2) }
    case 'polygon':
      return { ...s, points: s.points.map((p) => ({ x: q(p.x), y: q(p.y) })) }
    case 'path':
      return {
        ...s,
        paths: s.paths.map((sp) => ({
          closed: sp.closed,
          anchors: sp.anchors.map((a) => {
            // The anchor snaps; its handles move with it, keeping the curve's shape.
            const dx = q(a.x) - a.x
            const dy = q(a.y) - a.y
            return {
              x: q(a.x),
              y: q(a.y),
              ...(a.in ? { in: { x: round3(a.in.x + dx), y: round3(a.in.y + dy) } } : {}),
              ...(a.out ? { out: { x: round3(a.out.x + dx), y: round3(a.out.y + dy) } } : {}),
            }
          }),
        })),
      }
  }
}

const inside = (a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }) =>
  a.x >= b.x && a.y >= b.y && a.x + a.w <= b.x + b.w && a.y + a.h <= b.y + b.h && a.w * a.h < b.w * b.h

export function matchStyle(input: CreationDoc, o: MatchOptions): MatchReport {
  const changes: string[] = []
  const warnings: string[] = []
  let doc = input
  if (!drawables(doc.shapes).length) return { doc, changes, warnings: ['Não há formas para ajustar.'] }

  if (o.grid && doc.box !== GLYPHOS_BOX) {
    const k = GLYPHOS_BOX / doc.box
    doc = {
      ...doc,
      box: GLYPHOS_BOX,
      shapes: doc.shapes.map((s) => scaleShape(s, k, k, { x: 0, y: 0 })),
    }
    changes.push(`Prancheta de ${input.box} para 24 unidades, o grid do GLYPHOS.`)
  }

  const visible = doc.shapes.filter((s) => !s.hidden)
  if (o.fit && visible.length) {
    const b = boundsOfShapes(visible)
    const pad = livePadding(doc.box)
    const live = doc.box - pad * 2
    const side = Math.max(b.w, b.h)
    if (side > 0) {
      const k = live / side
      const c = boxCenter(b)
      doc = { ...doc, shapes: doc.shapes.map((s) => translateShape(scaleShape(s, k, k, c), doc.box / 2 - c.x, doc.box / 2 - c.y)) }
      if (Math.abs(k - 1) > 1e-3) changes.push(`Desenho redimensionado em ${Math.round(k * 100)}% para ocupar a área viva (2 a 22).`)
      changes.push('Desenho centralizado na prancheta.')
    }
  } else if (o.center && visible.length) {
    const c = boxCenter(boundsOfShapes(visible))
    const dx = doc.box / 2 - c.x
    const dy = doc.box / 2 - c.y
    if (Math.abs(dx) > 1e-3 || Math.abs(dy) > 1e-3) {
      doc = { ...doc, shapes: doc.shapes.map((s) => translateShape(s, dx, dy)) }
      changes.push('Desenho centralizado na prancheta.')
    }
  }

  if (o.snap > 0) {
    doc = { ...doc, shapes: doc.shapes.map((s) => snapShape(s, o.snap)) }
    changes.push(`Pontos alinhados à grade de ${String(o.snap).replace('.', ',')} unidade.`)
  }

  const stroke = (GLYPHOS_STROKE * doc.box) / GLYPHOS_BOX
  let strokes = 0
  let caps = 0
  let colors = 0
  let roles = 0
  let solidOnly = 0
  const bodies = o.roles ? drawables(doc.shapes).filter((s) => isClosedShape(s) && s.part !== 'cut' && s.part !== 'slash') : []
  doc = {
    ...doc,
    shapes: mapShapes(doc.shapes, (s) => {
      if (s.kind === 'group') return s
      let next: DrawableShape = s
      const st = { ...s.style }
      if (o.stroke && st.stroke !== 'none' && Math.abs(st.strokeWidth - stroke) > 1e-3) {
        st.strokeWidth = stroke
        strokes++
      }
      if (o.caps && (st.linecap !== 'round' || st.linejoin !== 'round')) {
        st.linecap = 'round'
        st.linejoin = 'round'
        caps++
      }
      if (o.color && ((st.stroke !== 'none' && st.stroke !== 'currentColor') || (st.fill !== 'none' && st.fill !== 'currentColor'))) {
        if (st.stroke !== 'none') st.stroke = 'currentColor'
        if (st.fill !== 'none') st.fill = 'currentColor'
        colors++
      }
      if (o.roles) {
        const closed = isClosedShape(s)
        if (closed && st.fill !== 'none' && st.stroke === 'none') solidOnly++
        else if (closed && st.fill !== 'none') {
          // A filled outline: the fill comes back from Solid and Duotone, the master is the outline.
          st.fill = 'none'
          next = { ...next, part: 'body' }
          roles++
        } else if (closed && s.part === 'line') {
          const b = localBounds(s)
          const host = bodies.find((h) => h.id !== s.id && inside(b, localBounds(h)))
          next = { ...next, part: host ? 'cut' : 'body' }
          roles++
        } else if (!closed && s.part === 'body') {
          next = { ...next, part: 'line' }
          roles++
        }
      }
      const changed = JSON.stringify(st) !== JSON.stringify(s.style)
      return changed || next !== s ? { ...next, style: st } : s
    }),
  }
  if (strokes) changes.push(`Traço de ${String(stroke).replace('.', ',')} em ${strokes === 1 ? '1 forma' : `${strokes} formas`}.`)
  if (caps) changes.push(`Pontas e cantos arredondados em ${caps === 1 ? '1 forma' : `${caps} formas`}.`)
  if (colors) changes.push(`Cores trocadas por currentColor (a cor do texto) em ${colors === 1 ? '1 forma' : `${colors} formas`}.`)
  if (roles) changes.push(`Papéis definidos em ${roles === 1 ? '1 forma' : `${roles} formas`}: contornos fechados viram corpo (preenchido no Sólido), formas dentro de um corpo viram recorte.`)
  if (solidOnly)
    warnings.push(
      `${solidOnly === 1 ? '1 forma preenchida sem traço continua' : `${solidOnly} formas preenchidas sem traço continuam`} assim: virar contorno exige redesenhar o caminho, o ajuste não inventa essa geometria.`,
    )
  if (drawables(doc.shapes).some((s) => s.rotation && (s.kind === 'rect' || s.kind === 'ellipse')))
    warnings.push('Retângulos e elipses girados ficam fora do grid em ângulos diferentes de 90°; converta em caminho se precisar alinhar os pontos.')
  return { doc, changes, warnings }
}
