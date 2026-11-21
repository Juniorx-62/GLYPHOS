/**
 * The editable project as a file (.glyphos.json): the structured drawing
 * with layers, groups and roles, to continue editing in another browser. Not
 * the final icon: that is the SVG/PNG/JSX export.
 */
import { cleanDoc } from '~/data/stores/creations'
import type { Creation, CreationDoc } from '~/data/types'
import { isRecord, isSlug } from '~/data/validate'

export const PROJECT_FILE_KIND = 'glyphos-icon-project'
export const PROJECT_FILE_VERSION = 1

export interface ProjectFile {
  kind: typeof PROJECT_FILE_KIND
  version: number
  name: string
  origin?: Creation['origin']
  doc: CreationDoc
  exportedAt: string
}

export function creationFile(p: { name: string; doc: CreationDoc; origin?: Creation['origin'] }): ProjectFile {
  return { kind: PROJECT_FILE_KIND, version: PROJECT_FILE_VERSION, name: p.name, ...(p.origin ? { origin: p.origin } : {}), doc: p.doc, exportedAt: new Date().toISOString() }
}

/** Reads a project file; the reason when it is not one. */
export function readCreationFile(data: unknown): { ok: true; name: string; doc: CreationDoc; origin?: Creation['origin'] } | { ok: false; reason: string } {
  if (!isRecord(data) || data.kind !== PROJECT_FILE_KIND) return { ok: false, reason: 'O arquivo não é um projeto de ícone do GLYPHOS (.glyphos.json).' }
  if (typeof data.version !== 'number' || data.version > PROJECT_FILE_VERSION) return { ok: false, reason: 'O projeto foi salvo por uma versão mais nova do GLYPHOS.' }
  const doc = cleanDoc(data.doc)
  if (!doc) return { ok: false, reason: 'O desenho do projeto está danificado.' }
  const origin = isRecord(data.origin) && isSlug(data.origin.slug) ? { slug: data.origin.slug, name: typeof data.origin.name === 'string' ? data.origin.name.slice(0, 80) : data.origin.slug } : undefined
  const name = typeof data.name === 'string' && data.name.trim() ? data.name.trim().slice(0, 80) : 'Ícone importado'
  return { ok: true, name, doc, ...(origin ? { origin } : {}) }
}

/** "Meu Ícone Ótimo!" → "meu-icone-otimo": file names and component names of exports. */
export function slugify(name: string): string {
  const s = name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/, '')
  return /^[a-z]/.test(s) ? s : `icone${s ? `-${s}` : ''}`
}
