/**
 * SVG path data: tokenizer, canonical formatting and conversion to absolute
 * segments (used for geometry checks). Pure functions, no DOM.
 */

export type PathToken = { type: 'cmd'; value: string } | { type: 'num'; value: number }

const COMMANDS = 'MmLlHhVvCcSsQqTtAaZz'
const ARITY: Record<string, number> = { m: 2, l: 2, h: 1, v: 1, c: 6, s: 4, q: 4, t: 2, a: 7, z: 0 }

/** Splits path data into commands and numbers. Throws on anything else. */
export function tokenizePath(d: string): PathToken[] {
  const tokens: PathToken[] = []
  let i = 0
  let cmd = ''
  let argIndex = 0
  const n = d.length
  while (i < n) {
    const ch = d[i]
    if (ch === ' ' || ch === ',' || ch === '\n' || ch === '\t' || ch === '\r') {
      i++
      continue
    }
    if (COMMANDS.includes(ch)) {
      tokens.push({ type: 'cmd', value: ch })
      cmd = ch.toLowerCase()
      argIndex = 0
      i++
      continue
    }
    if (!cmd) throw new Error(`O caminho precisa começar com um comando (encontrado "${ch}")`)
    // Arc flags (4th and 5th arguments) are single digits and may be written without separators.
    if (cmd === 'a' && (argIndex % 7 === 3 || argIndex % 7 === 4)) {
      if (ch !== '0' && ch !== '1') throw new Error(`Flag de arco inválida "${ch}"`)
      tokens.push({ type: 'num', value: Number(ch) })
      argIndex++
      i++
      continue
    }
    const m = /^[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/.exec(d.slice(i, i + 32))
    if (!m) throw new Error(`Caractere inesperado no caminho: "${ch}"`)
    tokens.push({ type: 'num', value: Number(m[0]) })
    argIndex++
    i += m[0].length
  }
  return tokens
}

/** Formats a number with at most 3 decimals and no trailing zeros (0.50 → "0.5"). */
export function fmt(value: number): string {
  const rounded = Math.round(value * 1000) / 1000
  return String(Object.is(rounded, -0) ? 0 : rounded)
}

/** Canonical path data: command letter glued to its first number, numbers separated by one space. */
export function formatPath(d: string): string {
  let out = ''
  let prevNum = false
  for (const token of tokenizePath(d)) {
    if (token.type === 'cmd') {
      out += token.value
      prevNum = false
    } else {
      out += (prevNum ? ' ' : '') + fmt(token.value)
      prevNum = true
    }
  }
  return out
}

/** Absolute segment of a path, the only shapes the geometry code handles. */
export type Segment =
  | { kind: 'M'; x: number; y: number }
  | { kind: 'L'; x0: number; y0: number; x: number; y: number }
  | { kind: 'C'; x0: number; y0: number; x1: number; y1: number; x2: number; y2: number; x: number; y: number }
  | { kind: 'Q'; x0: number; y0: number; x1: number; y1: number; x: number; y: number }
  | { kind: 'A'; x0: number; y0: number; rx: number; ry: number; rot: number; large: number; sweep: number; x: number; y: number }
  | { kind: 'Z'; x0: number; y0: number; x: number; y: number }

/** Converts path data into absolute segments (H/V become L, S/T become C/Q). */
export function toSegments(d: string): Segment[] {
  const tokens = tokenizePath(d)
  const segs: Segment[] = []
  let x = 0
  let y = 0
  let sx = 0
  let sy = 0
  let lastCtrl: { x: number; y: number; kind: 'C' | 'Q' } | null = null
  let i = 0
  let cmd = ''
  const next = () => {
    const t = tokens[i++]
    if (!t || t.type !== 'num') throw new Error(`Faltam números depois do comando ${cmd}`)
    return t.value
  }
  while (i < tokens.length) {
    const t = tokens[i]
    if (t.type === 'cmd') {
      cmd = t.value
      i++
      if (cmd === 'Z' || cmd === 'z') {
        segs.push({ kind: 'Z', x0: x, y0: y, x: sx, y: sy })
        x = sx
        y = sy
        lastCtrl = null
        continue
      }
    } else if (!cmd || cmd === 'Z' || cmd === 'z') throw new Error('Números sem comando no caminho')
    const rel = cmd === cmd.toLowerCase()
    const c = cmd.toLowerCase()
    if (ARITY[c] === undefined) throw new Error(`Comando desconhecido ${cmd}`)
    const ox = rel ? x : 0
    const oy = rel ? y : 0
    switch (c) {
      case 'm': {
        x = ox + next()
        y = oy + next()
        sx = x
        sy = y
        segs.push({ kind: 'M', x, y })
        // Further coordinate pairs after a moveto are implicit linetos.
        cmd = rel ? 'l' : 'L'
        lastCtrl = null
        break
      }
      case 'l': {
        const nx = ox + next()
        const ny = oy + next()
        segs.push({ kind: 'L', x0: x, y0: y, x: nx, y: ny })
        x = nx
        y = ny
        lastCtrl = null
        break
      }
      case 'h': {
        const nx = (rel ? x : 0) + next()
        segs.push({ kind: 'L', x0: x, y0: y, x: nx, y })
        x = nx
        lastCtrl = null
        break
      }
      case 'v': {
        const ny = (rel ? y : 0) + next()
        segs.push({ kind: 'L', x0: x, y0: y, x, y: ny })
        y = ny
        lastCtrl = null
        break
      }
      case 'c': {
        const x1 = ox + next()
        const y1 = oy + next()
        const x2 = ox + next()
        const y2 = oy + next()
        const nx = ox + next()
        const ny = oy + next()
        segs.push({ kind: 'C', x0: x, y0: y, x1, y1, x2, y2, x: nx, y: ny })
        lastCtrl = { x: x2, y: y2, kind: 'C' }
        x = nx
        y = ny
        break
      }
      case 's': {
        const x1: number = lastCtrl?.kind === 'C' ? 2 * x - lastCtrl.x : x
        const y1: number = lastCtrl?.kind === 'C' ? 2 * y - lastCtrl.y : y
        const x2 = ox + next()
        const y2 = oy + next()
        const nx = ox + next()
        const ny = oy + next()
        segs.push({ kind: 'C', x0: x, y0: y, x1, y1, x2, y2, x: nx, y: ny })
        lastCtrl = { x: x2, y: y2, kind: 'C' }
        x = nx
        y = ny
        break
      }
      case 'q': {
        const x1 = ox + next()
        const y1 = oy + next()
        const nx = ox + next()
        const ny = oy + next()
        segs.push({ kind: 'Q', x0: x, y0: y, x1, y1, x: nx, y: ny })
        lastCtrl = { x: x1, y: y1, kind: 'Q' }
        x = nx
        y = ny
        break
      }
      case 't': {
        const x1: number = lastCtrl?.kind === 'Q' ? 2 * x - lastCtrl.x : x
        const y1: number = lastCtrl?.kind === 'Q' ? 2 * y - lastCtrl.y : y
        const nx = ox + next()
        const ny = oy + next()
        segs.push({ kind: 'Q', x0: x, y0: y, x1, y1, x: nx, y: ny })
        lastCtrl = { x: x1, y: y1, kind: 'Q' }
        x = nx
        y = ny
        break
      }
      case 'a': {
        const rx = next()
        const ry = next()
        const rot = next()
        const large = next()
        const sweep = next()
        const nx = ox + next()
        const ny = oy + next()
        segs.push({ kind: 'A', x0: x, y0: y, rx, ry, rot, large, sweep, x: nx, y: ny })
        x = nx
        y = ny
        lastCtrl = null
        break
      }
    }
  }
  return segs
}
