/**
 * Strict reader for the catalogue's SVG files. It accepts only the subset the
 * catalogue allows (a 24 × 24 root with stroke attributes and flat basic
 * shapes) and rejects everything else, so no script, link, style, image,
 * reference or unknown attribute can ever reach the site or an export.
 *
 * It is a whitelist, not a sanitiser: a file with anything outside the subset
 * is refused with a reason, never "cleaned" silently.
 */
import { SVG_TAGS, type IconNode, type NodePart, type SvgTag } from '../types'
import { fmt, formatPath, tokenizePath } from './path'

export interface Issue {
  level: 'error' | 'warning'
  code: string
  message: string
}

export interface ParsedSvg {
  root: Record<string, string>
  nodes: IconNode[]
  issues: Issue[]
}

/** The root every catalogue file carries, in canonical order. */
export const ROOT_ATTRS: ReadonlyArray<[string, string]> = [
  ['xmlns', 'http://www.w3.org/2000/svg'],
  ['width', '24'],
  ['height', '24'],
  ['viewBox', '0 0 24 24'],
  ['fill', 'none'],
  ['stroke', 'currentColor'],
  ['stroke-width', '1.5'],
  ['stroke-linecap', 'round'],
  ['stroke-linejoin', 'round'],
]

/** Geometry attributes allowed per shape, in canonical order. */
export const GEOMETRY: Record<SvgTag, string[]> = {
  path: ['d'],
  circle: ['cx', 'cy', 'r'],
  ellipse: ['cx', 'cy', 'rx', 'ry'],
  rect: ['x', 'y', 'width', 'height', 'rx', 'ry'],
  line: ['x1', 'y1', 'x2', 'y2'],
  polyline: ['points'],
  polygon: ['points'],
}

const REQUIRED: Record<SvgTag, string[]> = {
  path: ['d'],
  circle: ['cx', 'cy', 'r'],
  ellipse: ['cx', 'cy', 'rx', 'ry'],
  rect: ['width', 'height'],
  line: ['x1', 'y1', 'x2', 'y2'],
  polyline: ['points'],
  polygon: ['points'],
}

/** Presentation attributes a shape may carry, with the only values allowed. */
const PRESENTATION: Record<string, string[]> = {
  fill: ['currentColor'],
  stroke: ['none'],
  'data-part': ['body', 'cut', 'slash'],
}

const NUMBER = /^[+-]?(?:\d+\.?\d*|\.\d+)$/

function parseAttrs(source: string, where: string, issues: Issue[]): Record<string, string> {
  const attrs: Record<string, string> = {}
  const re = /\s+([A-Za-z_:][-A-Za-z0-9_:.]*)\s*=\s*(?:"([^"]*)"|'([^']*)')/y
  let index = 0
  while (index < source.length) {
    re.lastIndex = index
    const m = re.exec(source)
    if (!m) {
      if (source.slice(index).trim() === '' || source.slice(index).trim() === '/') break
      issues.push({ level: 'error', code: 'syntax', message: `Atributo mal formado em <${where}>: "${source.slice(index).trim().slice(0, 40)}"` })
      break
    }
    const name = m[1]
    if (name in attrs) issues.push({ level: 'error', code: 'syntax', message: `Atributo repetido "${name}" em <${where}>` })
    attrs[name] = m[2] ?? m[3] ?? ''
    index = re.lastIndex
  }
  return attrs
}

/** Reads one catalogue SVG file. Never throws: problems come back as issues. */
export function parseIconSvg(text: string): ParsedSvg {
  const issues: Issue[] = []
  const nodes: IconNode[] = []
  let src = text.replace(/^﻿/, '')

  for (const [re, what] of [
    [/<!DOCTYPE/i, 'DOCTYPE'],
    [/<!ENTITY/i, 'ENTITY'],
    [/<!\[CDATA\[/i, 'CDATA'],
    [/<\?/, 'declaração XML ou instrução de processamento'],
    [/<!--/, 'comentário'],
  ] as const) {
    if (re.test(src)) issues.push({ level: 'error', code: 'forbidden', message: `O arquivo contém ${what}. Remova (rode npm run catalog:format para arquivos importados).` })
  }
  src = src.replace(/<!--[\s\S]*?-->/g, '').replace(/<\?[\s\S]*?\?>/g, '')

  const rootMatch = /^\s*<svg((?:\s+[^>]*?)?)\s*>([\s\S]*)<\/svg>\s*$/.exec(src)
  if (!rootMatch) {
    issues.push({ level: 'error', code: 'syntax', message: 'O arquivo precisa ter um único elemento <svg>…</svg>.' })
    return { root: {}, nodes, issues }
  }
  const root = parseAttrs(rootMatch[1], 'svg', issues)
  let body = rootMatch[2]

  // Children: only flat, self-closing (or empty) basic shapes.
  const childRe = /\s*<([A-Za-z][A-Za-z0-9:-]*)((?:\s+[^<>]*?)?)\s*(?:\/>|>\s*<\/\1>)/y
  let pos = 0
  while (pos < body.length) {
    if (body.slice(pos).trim() === '') break
    childRe.lastIndex = pos
    const m = childRe.exec(body)
    if (!m) {
      const rest = body.slice(pos).trim()
      const tag = /^<\s*([A-Za-z][\w:-]*)/.exec(rest)?.[1]
      issues.push({
        level: 'error',
        code: tag ? 'forbidden' : 'syntax',
        message: tag ? `Elemento <${tag}> não permitido ou aninhado. Só formas simples, sem grupos: ${SVG_TAGS.join(', ')}.` : `Conteúdo inesperado: "${rest.slice(0, 40)}"`,
      })
      break
    }
    pos = childRe.lastIndex
    const tag = m[1] as SvgTag
    if (!SVG_TAGS.includes(tag)) {
      issues.push({ level: 'error', code: 'forbidden', message: `Elemento <${m[1]}> não permitido. Use só ${SVG_TAGS.join(', ')}.` })
      continue
    }
    const raw = parseAttrs(m[2], tag, issues)
    const attrs: Record<string, string> = {}
    let part: NodePart = 'line'
    for (const [name, value] of Object.entries(raw)) {
      if (GEOMETRY[tag].includes(name)) attrs[name] = value
      else if (name in PRESENTATION) {
        if (!PRESENTATION[name].includes(value)) {
          issues.push({ level: 'error', code: 'attribute', message: `<${tag}> ${name}="${value}" não é permitido (aceito: ${PRESENTATION[name].join(', ')}).` })
        } else if (name === 'data-part') part = value as NodePart
        else attrs[name] = value
      } else {
        issues.push({ level: 'error', code: 'attribute', message: `Atributo "${name}" não é permitido em <${tag}>.` })
      }
    }
    for (const req of REQUIRED[tag]) {
      if (!(req in attrs)) issues.push({ level: 'error', code: 'attribute', message: `<${tag}> precisa de "${req}".` })
    }
    for (const name of GEOMETRY[tag]) {
      const value = attrs[name]
      if (value === undefined) continue
      if (name === 'd') {
        try {
          tokenizePath(value)
        } catch (e) {
          issues.push({ level: 'error', code: 'geometry', message: `Caminho inválido: ${(e as Error).message}` })
        }
      } else if (name === 'points') {
        const nums = value.trim().split(/[\s,]+/)
        if (nums.length < 4 || nums.length % 2 || nums.some((v) => !NUMBER.test(v))) {
          issues.push({ level: 'error', code: 'geometry', message: `points inválido em <${tag}>: "${value}"` })
        }
      } else if (!NUMBER.test(value.trim())) {
        issues.push({ level: 'error', code: 'geometry', message: `<${tag}> ${name}="${value}" precisa ser um número (sem unidades).` })
      }
    }
    if (attrs.stroke === 'none' && attrs.fill !== 'currentColor') {
      issues.push({ level: 'error', code: 'attribute', message: `<${tag}> com stroke="none" precisa de fill="currentColor", senão fica invisível.` })
    }
    nodes.push({ tag, attrs, part })
  }

  // Root attributes: exactly the catalogue's.
  for (const [name, expected] of ROOT_ATTRS) {
    if (root[name] === undefined) {
      issues.push({ level: 'error', code: 'root', message: `<svg> precisa de ${name}="${expected}".` })
    } else if (root[name] !== expected) {
      issues.push({ level: 'error', code: 'root', message: `<svg> ${name}="${root[name]}" deveria ser "${expected}".` })
    }
  }
  for (const name of Object.keys(root)) {
    if (!ROOT_ATTRS.some(([n]) => n === name)) issues.push({ level: 'error', code: 'root', message: `Atributo "${name}" não é permitido em <svg>.` })
  }
  if (!nodes.length && !issues.some((i) => i.level === 'error')) {
    issues.push({ level: 'error', code: 'empty', message: 'O desenho não tem nenhuma forma.' })
  }
  return { root, nodes, issues }
}

/** Canonical value of an attribute: numbers and paths formatted the same way everywhere. */
export function canonicalValue(name: string, value: string): string {
  if (name === 'd') {
    try {
      return formatPath(value)
    } catch {
      return value
    }
  }
  if (name === 'points') {
    const nums = value.trim().split(/[\s,]+/).map(Number)
    const pairs: string[] = []
    for (let i = 0; i + 1 < nums.length; i += 2) pairs.push(`${fmt(nums[i])} ${fmt(nums[i + 1])}`)
    return pairs.join(' ')
  }
  if (NUMBER.test(value.trim())) return fmt(Number(value))
  return value
}

/** The canonical text of a catalogue file: fixed root, attribute order and number format. */
export function serializeIconSvg(nodes: IconNode[]): string {
  const rootAttrs = ROOT_ATTRS.map(([n, v]) => `${n}="${v}"`).join(' ')
  const lines = nodes.map((node) => {
    const parts: string[] = []
    for (const name of GEOMETRY[node.tag]) {
      if (node.attrs[name] !== undefined) parts.push(`${name}="${canonicalValue(name, node.attrs[name])}"`)
    }
    if (node.attrs.fill) parts.push(`fill="${node.attrs.fill}"`)
    if (node.attrs.stroke) parts.push(`stroke="${node.attrs.stroke}"`)
    if (node.part !== 'line') parts.push(`data-part="${node.part}"`)
    return `  <${node.tag} ${parts.join(' ')}/>`
  })
  return `<svg ${rootAttrs}>\n${lines.join('\n')}\n</svg>\n`
}
