/**
 * The visitor's own icons (projects of the editor) and the unsaved draft.
 * Everything read back is sanitised: it is user data, possibly from a backup
 * file, and it is drawn on screen.
 */
import { createPersistentStore, useStoreSelector } from '../store'
import type { Anchor, Creation, CreationDoc, EditorDraft, Point, Shape, ShapePart, ShapeStyle, SubPath } from '../types'
import { isIso, isRecord, isSlug } from '../validate'

export const CREATION_ID = /^c[a-z0-9]{8}$/
const MAX_CREATIONS = 500
const MAX_SHAPES = 2000
const MAX_POINTS = 5000
const MAX_DEPTH = 8

const num = (v: unknown, min = -1e4, max = 1e4): number | undefined => (typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max ? v : undefined)
const COLOR = /^(none|currentColor|#[0-9a-fA-F]{3}|#[0-9a-fA-F]{6})$/
const color = (v: unknown, fallback: string) => (typeof v === 'string' && COLOR.test(v) ? v : fallback)
const PARTS: ShapePart[] = ['line', 'body', 'cut', 'slash']
const SHAPE_ID = /^[a-z0-9]{1,16}$/

function cleanPoint(v: unknown): Point | undefined {
  if (!isRecord(v)) return undefined
  const x = num(v.x)
  const y = num(v.y)
  return x === undefined || y === undefined ? undefined : { x, y }
}

function cleanStyle(v: unknown): ShapeStyle {
  const s = isRecord(v) ? v : {}
  return {
    fill: color(s.fill, 'none'),
    stroke: color(s.stroke, 'currentColor'),
    strokeWidth: num(s.strokeWidth, 0, 100) ?? 1.5,
    opacity: num(s.opacity, 0, 1) ?? 1,
    linecap: s.linecap === 'butt' || s.linecap === 'square' ? s.linecap : 'round',
    linejoin: s.linejoin === 'miter' || s.linejoin === 'bevel' ? s.linejoin : 'round',
  }
}

function cleanShape(v: unknown, depth: number, budget: { shapes: number; points: number }): Shape | undefined {
  if (!isRecord(v) || typeof v.id !== 'string' || !SHAPE_ID.test(v.id)) return undefined
  if (--budget.shapes < 0) return undefined
  const common = {
    id: v.id,
    name: typeof v.name === 'string' && v.name.trim() ? v.name.trim().slice(0, 60) : 'Forma',
    ...(v.hidden === true ? { hidden: true } : {}),
    ...(v.locked === true ? { locked: true } : {}),
  }
  if (v.kind === 'group') {
    if (depth >= MAX_DEPTH || !Array.isArray(v.children)) return undefined
    const children = v.children.map((c) => cleanShape(c, depth + 1, budget)).filter((c): c is Shape => !!c)
    return children.length ? { ...common, kind: 'group', children } : undefined
  }
  const drawable = {
    ...common,
    part: PARTS.includes(v.part as ShapePart) ? (v.part as ShapePart) : 'line',
    style: cleanStyle(v.style),
    rotation: num(v.rotation, -360, 360) ?? 0,
  }
  switch (v.kind) {
    case 'rect': {
      const [x, y, w, h] = [num(v.x), num(v.y), num(v.w, 0), num(v.h, 0)]
      if (x === undefined || y === undefined || w === undefined || h === undefined) return undefined
      return { ...drawable, kind: 'rect', x, y, w, h, r: num(v.r, 0) ?? 0 }
    }
    case 'ellipse': {
      const [cx, cy, rx, ry] = [num(v.cx), num(v.cy), num(v.rx, 0), num(v.ry, 0)]
      if (cx === undefined || cy === undefined || rx === undefined || ry === undefined) return undefined
      return { ...drawable, kind: 'ellipse', cx, cy, rx, ry }
    }
    case 'line': {
      const [x1, y1, x2, y2] = [num(v.x1), num(v.y1), num(v.x2), num(v.y2)]
      if (x1 === undefined || y1 === undefined || x2 === undefined || y2 === undefined) return undefined
      return { ...drawable, kind: 'line', x1, y1, x2, y2 }
    }
    case 'polygon': {
      if (!Array.isArray(v.points)) return undefined
      const points = v.points.map(cleanPoint).filter((p): p is Point => !!p)
      budget.points -= points.length
      if (points.length < 2 || budget.points < 0) return undefined
      return { ...drawable, kind: 'polygon', points, closed: v.closed !== false }
    }
    case 'path': {
      if (!Array.isArray(v.paths)) return undefined
      const paths: SubPath[] = []
      for (const sp of v.paths) {
        if (!isRecord(sp) || !Array.isArray(sp.anchors)) continue
        const anchors: Anchor[] = []
        for (const a of sp.anchors) {
          const p = cleanPoint(a)
          if (!p || !isRecord(a)) continue
          const ai = cleanPoint(a.in)
          const ao = cleanPoint(a.out)
          anchors.push({ ...p, ...(ai ? { in: ai } : {}), ...(ao ? { out: ao } : {}) })
        }
        budget.points -= anchors.length
        if (anchors.length) paths.push({ closed: sp.closed === true, anchors })
      }
      if (!paths.length || budget.points < 0) return undefined
      return { ...drawable, kind: 'path', paths }
    }
  }
  return undefined
}

export function cleanDoc(v: unknown): CreationDoc | undefined {
  if (!isRecord(v) || !Array.isArray(v.shapes)) return undefined
  const budget = { shapes: MAX_SHAPES, points: MAX_POINTS }
  return {
    box: num(v.box, 8, 512) ?? 24,
    background: typeof v.background === 'string' && /^#[0-9a-fA-F]{6}$/.test(v.background) ? v.background : null,
    shapes: v.shapes.map((s) => cleanShape(s, 0, budget)).filter((s): s is Shape => !!s),
  }
}

const cleanName = (v: unknown, fallback = 'Ícone sem nome') => (typeof v === 'string' && v.trim() ? v.trim().slice(0, 80) : fallback)

function cleanOrigin(v: unknown): Creation['origin'] {
  if (!isRecord(v) || !isSlug(v.slug)) return undefined
  return { slug: v.slug, name: cleanName(v.name, v.slug) }
}

function cleanCreations(data: unknown): Creation[] | undefined {
  if (!Array.isArray(data)) return undefined
  const out: Creation[] = []
  const seen = new Set<string>()
  for (const c of data) {
    if (!isRecord(c) || typeof c.id !== 'string' || !CREATION_ID.test(c.id) || seen.has(c.id)) continue
    const doc = cleanDoc(c.doc)
    if (!doc) continue
    seen.add(c.id)
    const now = new Date().toISOString()
    const origin = cleanOrigin(c.origin)
    const previous = c.previous === undefined ? undefined : cleanDoc(c.previous)
    out.push({
      id: c.id,
      name: cleanName(c.name),
      doc,
      ...(origin ? { origin } : {}),
      ...(previous ? { previous } : {}),
      createdAt: isIso(c.createdAt) ? c.createdAt : now,
      updatedAt: isIso(c.updatedAt) ? c.updatedAt : now,
    })
    if (out.length >= MAX_CREATIONS) break
  }
  return out
}

export const creationsStore = createPersistentStore<Creation[]>({
  key: 'creations',
  version: 1,
  initial: () => [],
  migrate: (data) => cleanCreations(data),
})

export const newCreationId = () => {
  let id = ''
  while (id.length < 8) id += Math.random().toString(36).slice(2)
  return `c${id.slice(0, 8)}`
}

/** Saves (creates or replaces) a creation; newest first. Returns its id. */
export function saveCreation(input: { id?: string; name: string; doc: CreationDoc; origin?: Creation['origin']; previous?: CreationDoc | null }): string {
  const id = input.id ?? newCreationId()
  const now = new Date().toISOString()
  creationsStore.set((list) => {
    const old = list.find((c) => c.id === id)
    const previous = input.previous === null ? undefined : (input.previous ?? old?.previous)
    const origin = input.origin ?? old?.origin
    const next: Creation = {
      id,
      name: cleanName(input.name),
      doc: input.doc,
      ...(origin ? { origin } : {}),
      ...(previous ? { previous } : {}),
      createdAt: old?.createdAt ?? now,
      updatedAt: now,
    }
    return [next, ...list.filter((c) => c.id !== id)].slice(0, MAX_CREATIONS)
  })
  return id
}

export function renameCreation(id: string, name: string) {
  const title = name.trim().slice(0, 80)
  if (!title) return
  creationsStore.set((list) => list.map((c) => (c.id === id ? { ...c, name: title, updatedAt: new Date().toISOString() } : c)))
}

export function duplicateCreation(id: string): string | undefined {
  const src = creationsStore.getSnapshot().data.find((c) => c.id === id)
  if (!src) return undefined
  return saveCreation({ name: `${src.name} (cópia)`, doc: structuredClone(src.doc), origin: src.origin })
}

export function deleteCreation(id: string) {
  creationsStore.set((list) => list.filter((c) => c.id !== id))
}

export const useCreations = () => useStoreSelector(creationsStore, (list) => list)
export const getCreation = (id: string) => creationsStore.getSnapshot().data.find((c) => c.id === id)

/* ----------------------------------------------------------------- draft */

function cleanDraft(data: unknown): EditorDraft | null | undefined {
  if (data === null) return null
  if (!isRecord(data)) return undefined
  const doc = cleanDoc(data.doc)
  if (!doc) return null
  const origin = cleanOrigin(data.origin)
  return {
    name: cleanName(data.name),
    doc,
    ...(origin ? { origin } : {}),
    ...(typeof data.creationId === 'string' && CREATION_ID.test(data.creationId) ? { creationId: data.creationId } : {}),
    updatedAt: isIso(data.updatedAt) ? data.updatedAt : new Date().toISOString(),
  }
}

/** The editor's unsaved work, so a reload or a closed tab loses nothing. Not part of the backup. */
export const draftStore = createPersistentStore<EditorDraft | null>({
  key: 'editor-draft',
  version: 1,
  initial: () => null,
  migrate: (data) => cleanDraft(data),
})
