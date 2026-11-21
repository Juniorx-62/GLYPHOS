/**
 * Undo history of the editor: immutable snapshots of the document with a
 * label for each step. Documents share untouched shapes between snapshots, so
 * a step costs only what changed.
 */
import type { CreationDoc } from '~/data/types'

export interface HistoryEntry {
  doc: CreationDoc
  label: string
}

export interface History {
  past: HistoryEntry[]
  /** The current document and the label of the step that produced it. */
  present: HistoryEntry
  future: HistoryEntry[]
}

export const HISTORY_LIMIT = 150

export const startHistory = (doc: CreationDoc, label = 'Início'): History => ({ past: [], present: { doc, label }, future: [] })

/** Records a step. Nothing changes when the document is the same object. */
export function commit(h: History, doc: CreationDoc, label: string): History {
  if (doc === h.present.doc) return h
  return { past: [...h.past, h.present].slice(-HISTORY_LIMIT), present: { doc, label }, future: [] }
}

export function undo(h: History): History {
  const prev = h.past[h.past.length - 1]
  if (!prev) return h
  return { past: h.past.slice(0, -1), present: prev, future: [h.present, ...h.future] }
}

export function redo(h: History): History {
  const next = h.future[0]
  if (!next) return h
  return { past: [...h.past, h.present], present: next, future: h.future.slice(1) }
}

/** Jumps to a step of the list (past…present…future) without losing the others. */
export function jumpTo(h: History, index: number): History {
  const all = [...h.past, h.present, ...h.future]
  if (index < 0 || index >= all.length) return h
  return { past: all.slice(0, index), present: all[index], future: all.slice(index + 1) }
}

export const historyIndex = (h: History) => h.past.length
