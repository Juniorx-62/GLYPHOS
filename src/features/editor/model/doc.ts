/**
 * The editor document: creation, tree operations over shapes (find, update,
 * group, order) and the defaults of new shapes. Every function returns a new
 * document; the input is never mutated, so the history can keep snapshots.
 */
import type { CreationDoc, DrawableShape, GroupShape, Shape, ShapeStyle } from '~/data/types'
import { boundsOfShapes, boxCenter, translateShape } from './geometry'

export const GLYPHOS_BOX = 24
export const GLYPHOS_STROKE = 1.5
/** Live area of the GLYPHOS grid: 2 units of padding on a 24 artboard. */
export const livePadding = (box: number) => (box * 2) / GLYPHOS_BOX

export const ARTBOARD_SIZES = [16, 20, 24, 32, 48, 64] as const

export const emptyDoc = (box = GLYPHOS_BOX): CreationDoc => ({ box, background: null, shapes: [] })

export const defaultStyle = (box = GLYPHOS_BOX): ShapeStyle => ({
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: (GLYPHOS_STROKE * box) / GLYPHOS_BOX,
  opacity: 1,
  linecap: 'round',
  linejoin: 'round',
})

let counter = 0
export const newShapeId = () => `${Date.now().toString(36).slice(-5)}${(counter++ % 1296).toString(36).padStart(2, '0')}${Math.random().toString(36).slice(2, 5)}`.slice(0, 16)

export const KIND_LABEL: Record<Shape['kind'], string> = {
  rect: 'Retângulo',
  ellipse: 'Elipse',
  line: 'Linha',
  polygon: 'Polígono',
  path: 'Caminho',
  group: 'Grupo',
}

/** "Retângulo 3": the next free number for that kind in the document. */
export function nextName(doc: CreationDoc, kind: Shape['kind']): string {
  const base = KIND_LABEL[kind]
  let max = 0
  walk(doc.shapes, (s) => {
    const m = new RegExp(`^${base} (\\d+)$`).exec(s.name)
    if (m) max = Math.max(max, Number(m[1]))
  })
  return `${base} ${max + 1}`
}

/* ------------------------------------------------------------- tree */

export function walk(shapes: Shape[], fn: (s: Shape, parent: GroupShape | null) => void, parent: GroupShape | null = null) {
  for (const s of shapes) {
    fn(s, parent)
    if (s.kind === 'group') walk(s.children, fn, s)
  }
}

export function findShape(shapes: Shape[], id: string): Shape | undefined {
  for (const s of shapes) {
    if (s.id === id) return s
    if (s.kind === 'group') {
      const hit = findShape(s.children, id)
      if (hit) return hit
    }
  }
  return undefined
}

/** The top-level shape that contains id (itself when top-level). */
export function topLevelOf(shapes: Shape[], id: string): Shape | undefined {
  return shapes.find((s) => s.id === id || (s.kind === 'group' && !!findShape(s.children, id)))
}

/** Parent list of a shape: the document or a group's children. */
export function siblingsOf(shapes: Shape[], id: string): Shape[] | undefined {
  if (shapes.some((s) => s.id === id)) return shapes
  for (const s of shapes) if (s.kind === 'group') {
    const hit = siblingsOf(s.children, id)
    if (hit) return hit
  }
  return undefined
}

export function mapShapes(shapes: Shape[], fn: (s: Shape) => Shape): Shape[] {
  let changed = false
  const out = shapes.map((s) => {
    let next = fn(s)
    if (next === s && s.kind === 'group') {
      const children = mapShapes(s.children, fn)
      if (children !== s.children) next = { ...s, children }
    }
    if (next !== s) changed = true
    return next
  })
  return changed ? out : shapes
}

export function updateShapes(doc: CreationDoc, ids: Iterable<string>, fn: (s: Shape) => Shape): CreationDoc {
  const set = new Set(ids)
  const shapes = mapShapes(doc.shapes, (s) => (set.has(s.id) ? fn(s) : s))
  return shapes === doc.shapes ? doc : { ...doc, shapes }
}

export function removeShapes(shapes: Shape[], ids: Set<string>): Shape[] {
  const out: Shape[] = []
  for (const s of shapes) {
    if (ids.has(s.id)) continue
    if (s.kind === 'group') {
      const children = removeShapes(s.children, ids)
      if (!children.length) continue
      out.push(children === s.children ? s : { ...s, children })
    } else out.push(s)
  }
  return out.length === shapes.length && out.every((s, i) => s === shapes[i]) ? shapes : out
}

export const deleteShapes = (doc: CreationDoc, ids: string[]): CreationDoc => ({ ...doc, shapes: removeShapes(doc.shapes, new Set(ids)) })

export const addShape = (doc: CreationDoc, shape: Shape): CreationDoc => ({ ...doc, shapes: [...doc.shapes, shape] })

/** Every drawable shape, in paint order, groups opened. */
export function drawables(shapes: Shape[], { visibleOnly = false } = {}): DrawableShape[] {
  const out: DrawableShape[] = []
  for (const s of shapes) {
    if (visibleOnly && s.hidden) continue
    if (s.kind === 'group') out.push(...drawables(s.children, { visibleOnly }))
    else out.push(s)
  }
  return out
}

export const isLocked = (doc: CreationDoc, id: string) => !!topLevelOf(doc.shapes, id)?.locked || !!findShape(doc.shapes, id)?.locked

/** A copy of a shape with new ids all the way down. */
export function cloneShape<S extends Shape>(s: S): S {
  const copy = structuredClone(s)
  const renew = (x: Shape) => {
    x.id = newShapeId()
    if (x.kind === 'group') x.children.forEach(renew)
  }
  renew(copy)
  return copy
}

/** Duplicates the shapes in place (each copy right above its original), offset. Returns the copies' ids. */
export function duplicateShapes(doc: CreationDoc, ids: string[], offset = 0): { doc: CreationDoc; ids: string[] } {
  const set = new Set(ids)
  const copies: string[] = []
  const dup = (list: Shape[]): Shape[] =>
    list.flatMap((s) => {
      if (set.has(s.id)) {
        const c = translateShape(cloneShape(s), offset, offset)
        c.name = `${s.name} cópia`
        copies.push(c.id)
        return [s, c]
      }
      return s.kind === 'group' ? [{ ...s, children: dup(s.children) }] : [s]
    })
  return { doc: { ...doc, shapes: dup(doc.shapes) }, ids: copies }
}

/** Groups top-level shapes; the group takes the place of the topmost one. */
export function groupShapes(doc: CreationDoc, ids: string[]): { doc: CreationDoc; id: string } | null {
  const set = new Set(ids)
  const picked = doc.shapes.filter((s) => set.has(s.id))
  if (picked.length < 2) return null
  const id = newShapeId()
  const group: GroupShape = { id, kind: 'group', name: nextName(doc, 'group'), children: picked }
  const lastIndex = Math.max(...picked.map((s) => doc.shapes.indexOf(s)))
  const shapes: Shape[] = []
  doc.shapes.forEach((s, i) => {
    if (i === lastIndex) shapes.push(group)
    else if (!set.has(s.id)) shapes.push(s)
  })
  return { doc: { ...doc, shapes }, id }
}

export function ungroupShapes(doc: CreationDoc, ids: string[]): { doc: CreationDoc; ids: string[] } {
  const set = new Set(ids)
  const freed: string[] = []
  const open = (list: Shape[]): Shape[] =>
    list.flatMap((s) => {
      if (s.kind !== 'group') return [s]
      if (set.has(s.id)) {
        freed.push(...s.children.map((c) => c.id))
        return s.children
      }
      return [{ ...s, children: open(s.children) }]
    })
  return { doc: { ...doc, shapes: open(doc.shapes) }, ids: freed }
}

export type OrderMove = 'front' | 'back' | 'forward' | 'backward'

/** Moves shapes within their own list (document or group). */
export function reorder(doc: CreationDoc, ids: string[], move: OrderMove): CreationDoc {
  const set = new Set(ids)
  const apply = (list: Shape[]): Shape[] => {
    let next = list.map((s) => (s.kind === 'group' ? { ...s, children: apply(s.children) } : s))
    if (!next.some((s) => set.has(s.id))) return next
    const picked = next.filter((s) => set.has(s.id))
    const rest = next.filter((s) => !set.has(s.id))
    if (move === 'front') return [...rest, ...picked]
    if (move === 'back') return [...picked, ...rest]
    next = [...next]
    if (move === 'forward') {
      for (let i = next.length - 2; i >= 0; i--) if (set.has(next[i].id) && !set.has(next[i + 1].id)) [next[i], next[i + 1]] = [next[i + 1], next[i]]
    } else {
      for (let i = 1; i < next.length; i++) if (set.has(next[i].id) && !set.has(next[i - 1].id)) [next[i], next[i - 1]] = [next[i - 1], next[i]]
    }
    return next
  }
  return { ...doc, shapes: apply(doc.shapes) }
}

/** Moves one shape to an index of a list (layers panel drag). */
export function moveToIndex(doc: CreationDoc, id: string, index: number): CreationDoc {
  const list = siblingsOf(doc.shapes, id)
  if (!list) return doc
  const shape = list.find((s) => s.id === id)!
  const without = list.filter((s) => s.id !== id)
  const next = [...without.slice(0, index), shape, ...without.slice(index)]
  if (list === doc.shapes) return { ...doc, shapes: next }
  return { ...doc, shapes: mapShapes(doc.shapes, (s) => (s.kind === 'group' && s.children === list ? { ...s, children: next } : s)) }
}

/** Moves the whole drawing so its bounds are centred on the artboard. */
export function centerDrawing(doc: CreationDoc): CreationDoc {
  const visible = doc.shapes.filter((s) => !s.hidden)
  if (!visible.length) return doc
  const c = boxCenter(boundsOfShapes(visible))
  const dx = doc.box / 2 - c.x
  const dy = doc.box / 2 - c.y
  return { ...doc, shapes: doc.shapes.map((s) => translateShape(s, dx, dy)) }
}
