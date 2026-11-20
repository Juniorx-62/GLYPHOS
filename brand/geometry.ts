/**
 * The GLYPHOS mark, drawn with the same pen as the icons: a monoline G on the
 * 24-unit grid whose crossbar ends in a small square of rubric — the unit of
 * the grid, and the red mark scribes put on what mattered.
 *
 * The wordmark is written with the same strokes (cap height 16, stroke 2.5,
 * round caps), and its G is the symbol itself. `npm run brand` builds every
 * logo file from these numbers; nothing in brand/logo is drawn by hand.
 */

export const STROKE = 2.5
/** Cap height of the wordmark and diameter of the symbol's circle (centre line). */
export const CAP = 16

const r = 8
const angle = (-40 * Math.PI) / 180
const f = (n: number) => String(Math.round(n * 100) / 100)

/** The G: an open circle (gap at the upper right) and a crossbar into the centre. */
export function gPath(ox: number, oy = 0) {
  const cx = ox + r
  const cy = oy + 12
  return `M${f(cx + r * Math.cos(angle))} ${f(cy + r * Math.sin(angle))}A${r} ${r} 0 1 0 ${f(cx + r)} ${f(cy)}H${f(cx + 2.5)}`
}

/** The rubric square at the centre of the G. */
export function gSquare(ox: number, oy = 0) {
  const s = 3.75
  return { x: ox + r - s / 2, y: oy + 12 - s / 2, size: s, rx: 0.6 }
}

/** Monoline capitals, cap from y=4 to y=20. Each returns its path and advance width. */
const LETTERS: Record<string, (ox: number) => { d: string; width: number }> = {
  G: (ox) => ({ d: gPath(ox), width: 16 }),
  L: (ox) => ({ d: `M${f(ox)} 4V20H${f(ox + 9.5)}`, width: 9.5 }),
  Y: (ox) => ({ d: `M${f(ox)} 4L${f(ox + 6.5)} 12L${f(ox + 13)} 4M${f(ox + 6.5)} 12V20`, width: 13 }),
  P: (ox) => ({ d: `M${f(ox)} 20V4H${f(ox + 6.5)}A4.5 4.5 0 0 1 ${f(ox + 6.5)} 13H${f(ox)}`, width: 11 }),
  H: (ox) => ({ d: `M${f(ox)} 4V20M${f(ox + 12)} 4V20M${f(ox)} 12H${f(ox + 12)}`, width: 12 }),
  O: (ox) => ({ d: `M${f(ox + 8)} 4A8 8 0 1 1 ${f(ox + 7.99)} 4Z`, width: 16 }),
  S: (ox) => {
    const cx = ox + 4.25
    const a = (deg: number) => (deg * Math.PI) / 180
    const sx = cx + 4 * Math.cos(a(-35))
    const sy = 8 + 4 * Math.sin(a(-35))
    const ex = cx + 4 * Math.cos(a(145))
    const ey = 16 + 4 * Math.sin(a(145))
    return { d: `M${f(sx)} ${f(sy)}A4 4 0 1 0 ${f(cx)} 12A4 4 0 1 1 ${f(ex)} ${f(ey)}`, width: 8.5 }
  },
}

/** Space after each letter (optical kerning). */
const KERN: Record<string, number> = { G: 4.75, L: 2.25, Y: 4.5, P: 4.75, H: 4.75, O: 4.75, S: 0 }

export const WORD = 'GLYPHOS'

export function wordmark(ox = 0) {
  const parts: string[] = []
  let x = ox
  for (const ch of WORD) {
    const { d, width } = LETTERS[ch](x)
    parts.push(d)
    x += width + KERN[ch]
  }
  return { d: parts.join(''), width: x - ox, square: gSquare(ox) }
}
