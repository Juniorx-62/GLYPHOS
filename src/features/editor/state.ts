/**
 * State of the editor, apart from the canvas that draws it: the history (and
 * so the document), selection, tool, view settings and the project being
 * edited. A small external store read with useSyncExternalStore; the canvas
 * and the panels only read it and call the actions below.
 *
 * Gestures (drag, resize, pen) write a transient `preview` document; the
 * history gets one step when the gesture ends.
 */
import { useSyncExternalStore } from 'react'
import { draftStore, getCreation, saveCreation } from '~/data/stores/creations'
import type { Creation, CreationDoc } from '~/data/types'
import { emptyDoc, findShape } from './model/doc'
import { commit, jumpTo, redo, startHistory, undo, type History } from './model/history'

export type Tool = 'select' | 'node' | 'rect' | 'ellipse' | 'line' | 'polygon' | 'pencil' | 'pen' | 'hand'

export interface NodeRef {
  sub: number
  idx: number
}

export interface ViewSettings {
  snap: boolean
  grid: boolean
  keylines: boolean
  gridStep: number
  polygonSides: number
}

export interface Project {
  id?: string
  name: string
  origin?: Creation['origin']
  /** Drawing before the last Style Matching. */
  previous?: CreationDoc
  /** Last saved document (dirty = present doc differs). */
  savedDoc?: CreationDoc
  savedAt?: string
}

export interface EditorState {
  history: History
  preview: CreationDoc | null
  selection: string[]
  /** Selected anchor of the path in node editing. */
  node: NodeRef | null
  tool: Tool
  /** Path being drawn with the pen, until Enter, Esc or closing it. */
  pen: string | null
  view: ViewSettings
  project: Project
  /** Bumps when a project is loaded, so the canvas refits. */
  epoch: number
}

const initial = (): EditorState => ({
  history: startHistory(emptyDoc()),
  preview: null,
  selection: [],
  node: null,
  tool: 'select',
  pen: null,
  view: { snap: true, grid: true, keylines: true, gridStep: 0.5, polygonSides: 6 },
  project: { name: 'Ícone sem nome' },
  epoch: 0,
})

let state = initial()
const listeners = new Set<() => void>()

function set(next: Partial<EditorState>) {
  state = { ...state, ...next }
  listeners.forEach((l) => l())
}

export const editor = {
  get: () => state,
  subscribe(l: () => void) {
    listeners.add(l)
    return () => listeners.delete(l)
  },
}

export const currentDoc = (s: EditorState = state) => s.preview ?? s.history.present.doc

const serverState = initial()
export function useEditor<T>(select: (s: EditorState) => T): T {
  return useSyncExternalStore(
    editor.subscribe,
    () => select(state),
    () => select(serverState),
  )
}

/* -------------------------------------------------------------- actions */

/** A step in the history. `selection` replaces the selection when given. */
export function apply(label: string, fn: (doc: CreationDoc) => CreationDoc, selection?: string[]) {
  const doc = fn(state.history.present.doc)
  const history = commit(state.history, doc, label)
  set({ history, preview: null, ...(selection ? { selection } : {}) })
}

export function preview(doc: CreationDoc | null) {
  set({ preview: doc })
}

/** Ends a gesture: the preview becomes one history step. */
export function commitPreview(label: string, selection?: string[]) {
  if (!state.preview) return
  const history = commit(state.history, state.preview, label)
  set({ history, preview: null, ...(selection ? { selection } : {}) })
}

export const undoStep = () => set({ history: undo(state.history), preview: null, node: null })
export const redoStep = () => set({ history: redo(state.history), preview: null, node: null })
export const jumpToStep = (i: number) => set({ history: jumpTo(state.history, i), preview: null, node: null })

export const select = (ids: string[]) => set({ selection: ids, node: null })
export const setNode = (node: NodeRef | null) => set({ node })
export function setTool(tool: Tool) {
  if (state.preview) commitPreview(state.pen ? 'Caminho com a caneta' : 'Desenho')
  set({ tool, node: null, pen: null })
}

export const setPen = (pen: string | null) => set({ pen })

/** Ends the path of the pen (Enter, Esc, double click, closing it). */
export function finishPen() {
  const id = state.pen
  if (!id) return
  const shape = state.preview && findShape(state.preview.shapes, id)
  const usable = shape && shape.kind === 'path' && shape.paths[0].anchors.length > 1
  if (usable) commitPreview('Caminho com a caneta', [id])
  set({ pen: null, preview: null })
}
export const setView = (view: Partial<ViewSettings>) => set({ view: { ...state.view, ...view } })
export const setProjectName = (name: string) => set({ project: { ...state.project, name: name.slice(0, 80) } })
export const setPrevious = (previous: CreationDoc | undefined) => set({ project: { ...state.project, previous } })

/** Starts the editor on a document (new, from a catalogue icon, a creation or the draft). */
export function load(doc: CreationDoc, project: Project, label = 'Início') {
  state = { ...initial(), view: state.view, history: startHistory(doc, label), project, epoch: state.epoch + 1 }
  listeners.forEach((l) => l())
}

export function loadCreation(id: string): boolean {
  const c = getCreation(id)
  if (!c) return false
  load(c.doc, { id: c.id, name: c.name, origin: c.origin, previous: c.previous, savedDoc: c.doc, savedAt: c.updatedAt }, 'Projeto aberto')
  return true
}

export const isDirty = (s: EditorState = state) => s.history.present.doc !== s.project.savedDoc

/** Saves the project as a creation (the first save creates it). Returns its id. */
export function saveProject(): string {
  const doc = state.history.present.doc
  const p = state.project
  const id = saveCreation({ id: p.id, name: p.name, doc, origin: p.origin, previous: p.previous ?? null })
  set({ project: { ...p, id, savedDoc: doc, savedAt: new Date().toISOString() } })
  draftStore.set(null)
  return id
}

/* ------------------------------------------------------ autosave / draft */

let timer: ReturnType<typeof setTimeout> | null = null
let lastSeen: CreationDoc | null = null
let lastName = ''

function persistNow() {
  if (timer) clearTimeout(timer)
  timer = null
  if (state.project.id) {
    if (isDirty() || getCreation(state.project.id)?.name !== state.project.name) saveProject()
  } else if (state.history.present.doc.shapes.length || state.project.origin) {
    draftStore.set({ name: state.project.name, doc: state.history.present.doc, origin: state.project.origin, updatedAt: new Date().toISOString() })
  }
}

/**
 * Saved projects save themselves shortly after each change; unsaved work
 * goes to the draft, so a reload never loses it. Returns the unsubscribe.
 */
export function startAutosave(): () => void {
  lastSeen = state.history.present.doc
  lastName = state.project.name
  const unsub = editor.subscribe(() => {
    const doc = state.history.present.doc
    if (doc === lastSeen && state.project.name === lastName) return
    lastSeen = doc
    lastName = state.project.name
    if (timer) clearTimeout(timer)
    timer = setTimeout(persistNow, 700)
  })
  return () => {
    unsub()
    // Leaving the editor saves what was still waiting.
    if (timer) persistNow()
  }
}
