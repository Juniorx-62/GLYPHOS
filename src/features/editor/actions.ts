/**
 * Commands of the editor, shared by the panels, the toolbar and the keyboard
 * shortcuts. Each one is a single labelled step of the history.
 */
import type { CreationDoc, DrawableShape, Shape, ShapePart, ShapeStyle } from '~/data/types'
import { combine, canCombine, BOOLEAN_LABEL, type BooleanOp } from './model/boolean'
import {
  addShape,
  centerDrawing,
  cloneShape,
  deleteShapes,
  drawables,
  duplicateShapes,
  findShape,
  groupShapes,
  isLocked,
  mapShapes,
  newShapeId,
  reorder,
  topLevelOf,
  ungroupShapes,
  updateShapes,
  walk,
  type OrderMove,
} from './model/doc'
import { bakeRotation, boundsOfShapes, boxCenter, normalizeAngle, rotateShape, scaleShape, shapeBounds, toPath, translateShape, type Box } from './model/geometry'
import { matchStyle, type MatchOptions } from './model/style-match'
import { apply, currentDoc, editor, select, setNode, setPrevious } from './state'

const doc = () => editor.get().history.present.doc
const sel = () => editor.get().selection

/** Selected shapes that exist and are not locked. */
export function selectedShapes(d: CreationDoc = currentDoc(), ids: string[] = sel()): Shape[] {
  return ids.map((id) => findShape(d.shapes, id)).filter((s): s is Shape => !!s)
}
export const editableIds = (d: CreationDoc = doc(), ids: string[] = sel()) => ids.filter((id) => findShape(d.shapes, id) && !isLocked(d, id))

export function deleteSelection() {
  const ids = editableIds()
  if (!ids.length) return
  apply(ids.length === 1 ? 'Excluir forma' : 'Excluir formas', (d) => deleteShapes(d, ids), [])
}

export function duplicateSelection(offset = 1) {
  const ids = editableIds()
  if (!ids.length) return
  let copies: string[] = []
  apply('Duplicar', (d) => {
    const r = duplicateShapes(d, ids, offset)
    copies = r.ids
    return r.doc
  })
  select(copies)
}

export function groupSelection() {
  const top = [...new Set(editableIds().map((id) => topLevelOf(doc().shapes, id)?.id).filter((x): x is string => !!x))]
  const r = groupShapes(doc(), top)
  if (r) apply('Agrupar', () => r.doc, [r.id])
}

export function ungroupSelection() {
  const groups = editableIds().filter((id) => findShape(doc().shapes, id)?.kind === 'group')
  if (!groups.length) return
  const r = ungroupShapes(doc(), groups)
  apply('Desagrupar', () => r.doc, r.ids)
}

const ORDER_LABEL: Record<OrderMove, string> = { front: 'Trazer para a frente', back: 'Enviar para trás', forward: 'Avançar uma camada', backward: 'Recuar uma camada' }
export function orderSelection(move: OrderMove) {
  const ids = editableIds()
  if (ids.length) apply(ORDER_LABEL[move], (d) => reorder(d, ids, move))
}

export function translateSelection(dx: number, dy: number, label = 'Mover') {
  const ids = editableIds()
  if (!ids.length || (!dx && !dy)) return
  apply(label, (d) => updateShapes(d, ids, (s) => translateShape(s, dx, dy)))
}

export type Align = 'left' | 'hcenter' | 'right' | 'top' | 'vcenter' | 'bottom'
export const ALIGN_LABEL: Record<Align, string> = {
  left: 'Alinhar à esquerda',
  hcenter: 'Centralizar na horizontal',
  right: 'Alinhar à direita',
  top: 'Alinhar ao topo',
  vcenter: 'Centralizar na vertical',
  bottom: 'Alinhar à base',
}

/** One shape aligns to the artboard; several align to their common bounds. */
export function alignSelection(how: Align) {
  const d = doc()
  const ids = editableIds()
  if (!ids.length) return
  const shapes = selectedShapes(d, ids)
  const ref: Box = shapes.length === 1 ? { x: 0, y: 0, w: d.box, h: d.box } : boundsOfShapes(shapes)
  apply(ALIGN_LABEL[how], (cur) =>
    updateShapes(cur, ids, (s) => {
      const b = shapeBounds(s)
      const dx = how === 'left' ? ref.x - b.x : how === 'right' ? ref.x + ref.w - (b.x + b.w) : how === 'hcenter' ? ref.x + ref.w / 2 - (b.x + b.w / 2) : 0
      const dy = how === 'top' ? ref.y - b.y : how === 'bottom' ? ref.y + ref.h - (b.y + b.h) : how === 'vcenter' ? ref.y + ref.h / 2 - (b.y + b.h / 2) : 0
      return translateShape(s, dx, dy)
    }),
  )
}

export function flipSelection(axis: 'h' | 'v') {
  const ids = editableIds()
  if (!ids.length) return
  const c = boxCenter(boundsOfShapes(selectedShapes(doc(), ids)))
  apply(axis === 'h' ? 'Espelhar na horizontal' : 'Espelhar na vertical', (d) => updateShapes(d, ids, (s) => scaleShape(s, axis === 'h' ? -1 : 1, axis === 'v' ? -1 : 1, c)))
}

export function rotateSelection(deg: number) {
  const ids = editableIds()
  if (!ids.length) return
  const c = boxCenter(boundsOfShapes(selectedShapes(doc(), ids)))
  apply('Girar', (d) => updateShapes(d, ids, (s) => rotateShape(s, deg, c)))
}

/** Sets the selection's bounds (position and size fields of the panel). */
export function setSelectionBounds(next: Partial<Box>) {
  const ids = editableIds()
  if (!ids.length) return
  const b = boundsOfShapes(selectedShapes(doc(), ids))
  const target = { ...b, ...next }
  const sx = b.w > 1e-6 && target.w > 0 ? target.w / b.w : 1
  const sy = b.h > 1e-6 && target.h > 0 ? target.h / b.h : 1
  const label = next.w !== undefined || next.h !== undefined ? 'Redimensionar' : 'Mover'
  apply(label, (d) =>
    updateShapes(d, ids, (s) => translateShape(scaleShape(s, sx, sy, { x: b.x, y: b.y }), target.x - b.x, target.y - b.y)),
  )
}

/** Sets the angle of each selected shape (around its own centre). */
export function setRotation(deg: number) {
  const ids = editableIds()
  apply('Girar', (d) =>
    updateShapes(d, ids, (s) => {
      if (s.kind === 'group') return s
      return { ...s, rotation: normalizeAngle(deg) }
    }),
  )
}

export function setStyle(patch: Partial<ShapeStyle>, label = 'Estilo') {
  const ids = editableIds()
  if (!ids.length) return
  apply(label, (d) => {
    const targets = new Set<string>()
    for (const id of ids) {
      const s = findShape(d.shapes, id)
      if (s) walk([s], (x) => x.kind !== 'group' && targets.add(x.id))
    }
    return updateShapes(d, targets, (s) => (s.kind === 'group' ? s : { ...s, style: { ...s.style, ...patch } }))
  })
}

export function setPart(part: ShapePart) {
  const ids = editableIds()
  apply('Papel no estilo', (d) => {
    const targets = new Set<string>()
    for (const id of ids) {
      const s = findShape(d.shapes, id)
      if (s) walk([s], (x) => x.kind !== 'group' && targets.add(x.id))
    }
    return updateShapes(d, targets, (s) => (s.kind === 'group' ? s : { ...s, part }))
  })
}

export function updateShape(id: string, fn: (s: Shape) => Shape, label: string) {
  if (isLocked(doc(), id)) return
  apply(label, (d) => updateShapes(d, [id], fn))
}

export function convertSelectionToPath() {
  const ids = editableIds().filter((id) => {
    const s = findShape(doc().shapes, id)
    return s && s.kind !== 'group' && s.kind !== 'path'
  })
  if (!ids.length) return
  apply('Converter em caminho', (d) => updateShapes(d, ids, (s) => (s.kind === 'group' ? s : toPath(s))))
}

/** Prepares a shape for node editing: a path with its rotation written into the points. */
export function enterNodeEditing(id: string): boolean {
  const s = findShape(doc().shapes, id)
  if (!s || s.kind === 'group' || isLocked(doc(), id)) return false
  if (s.kind !== 'path' || s.rotation) apply('Converter em caminho', (d) => updateShapes(d, [id], (x) => (x.kind === 'group' ? x : toPath(bakeRotation(x)))), [id])
  else select([id])
  setNode(null)
  return true
}

export function booleanSelection(op: BooleanOp): boolean {
  const d = doc()
  const ids = editableIds()
  // Paint order (bottom first), so "subtract" removes the upper shapes from the lowest.
  const order = drawables(d.shapes).map((s) => s.id)
  const shapes = ids
    .map((id) => findShape(d.shapes, id))
    .filter((s): s is DrawableShape => !!s && s.kind !== 'group')
    .sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id))
  if (!canCombine(shapes)) return false
  const result = combine(shapes, op, newShapeId())
  const lowest = shapes[0]
  apply(
    BOOLEAN_LABEL[op],
    (cur) => {
      const rest = deleteShapes(cur, shapes.slice(1).map((s) => s.id))
      if (!result) return deleteShapes(cur, shapes.map((s) => s.id))
      return { ...rest, shapes: mapShapes(rest.shapes, (s) => (s.id === lowest.id ? result : s)) }
    },
    result ? [result.id] : [],
  )
  return true
}

export function setVisibility(id: string, hidden: boolean) {
  apply(hidden ? 'Ocultar' : 'Mostrar', (d) => updateShapes(d, [id], (s) => ({ ...s, hidden: hidden || undefined })))
  if (hidden) select(sel().filter((x) => x !== id))
}

export function setLocked(id: string, locked: boolean) {
  apply(locked ? 'Bloquear' : 'Desbloquear', (d) => updateShapes(d, [id], (s) => ({ ...s, locked: locked || undefined })))
  if (locked) select(sel().filter((x) => x !== id))
}

export function renameShape(id: string, name: string) {
  const title = name.trim().slice(0, 60)
  if (title) apply('Renomear camada', (d) => updateShapes(d, [id], (s) => ({ ...s, name: title })))
}

export function selectAll() {
  const d = doc()
  select(d.shapes.filter((s) => !s.hidden && !s.locked).map((s) => s.id))
}

/* ------------------------------------------------------------ document */

export function setArtboard(box: number) {
  const d = doc()
  if (box === d.box) return
  const k = box / d.box
  apply(`Prancheta ${box} × ${box}`, (cur) => ({
    ...cur,
    box,
    shapes: cur.shapes.map((s) => {
      const scaled = scaleShape(s, k, k, { x: 0, y: 0 })
      // The stroke scales with the drawing, so it looks the same.
      return mapShapes([scaled], (x) => (x.kind === 'group' ? x : { ...x, style: { ...x.style, strokeWidth: Math.round(x.style.strokeWidth * k * 1000) / 1000 } }))[0]
    }),
  }))
}

export const setBackground = (background: string | null) => apply('Fundo da prancheta', (d) => ({ ...d, background }))
export const centerAll = () => apply('Centralizar desenho', centerDrawing)

/** Style Matching: one step, and the drawing before it kept in the project to go back to. */
export function applyStyleMatch(o: MatchOptions) {
  const before = doc()
  const r = matchStyle(before, o)
  if (r.doc === before) return r
  setPrevious(before)
  apply('Style Matching', () => r.doc)
  return r
}

export function restorePrevious() {
  const prev = editor.get().project.previous
  if (!prev) return
  apply('Voltar ao desenho anterior ao ajuste', () => prev, [])
  setPrevious(undefined)
}

/* ----------------------------------------------------------- clipboard */

let clipboard: Shape[] = []

export function copySelection() {
  clipboard = selectedShapes(doc()).map((s) => structuredClone(s))
  return clipboard.length
}

export function cutSelection() {
  if (copySelection()) deleteSelection()
}

export function paste() {
  if (!clipboard.length) return
  const copies = clipboard.map((s) => translateShape(cloneShape(s), 1, 1))
  clipboard = copies.map((s) => structuredClone(s))
  apply('Colar', (d) => copies.reduce(addShape, d), copies.map((s) => s.id))
}

/** Places catalogue shapes (an icon used as a starting point) in the current drawing. */
export function insertShapes(shapes: Shape[], label: string) {
  apply(label, (d) => shapes.reduce(addShape, d), shapes.map((s) => s.id))
}
