/**
 * Text normalisation shared by the index builder and the query: lower case,
 * no accents, punctuation as spaces, stop words out, and a light stemmer for
 * Portuguese and English plurals ("carrinhos" → "carrinho", "botões" → "botao",
 * "boxes" → "box"). The same function runs on both sides, so whatever a
 * person types meets the indexed form.
 */

const STOP_WORDS = new Set([
  // pt
  'a', 'as', 'o', 'os', 'um', 'uma', 'uns', 'umas', 'de', 'da', 'do', 'das', 'dos', 'e', 'em', 'no', 'na', 'nos', 'nas', 'para', 'pra', 'por', 'com', 'sem', 'ao', 'aos', 'que', 'se',
  // en
  'the', 'an', 'of', 'and', 'or', 'for', 'with', 'to', 'in', 'on', 'at', 'by', 'is',
])

/** Lower case, accents removed, anything that is not a letter or digit becomes a space. */
export function fold(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

/** Reduces common plural forms to the singular. Deliberately conservative. */
export function stem(word: string): string {
  if (word.length <= 3 || /^\d+$/.test(word)) return word
  if (word.endsWith('oes') || word.endsWith('aes')) return word.slice(0, -3) + 'ao' // botões, pães
  if (word.endsWith('ais')) return word.slice(0, -3) + 'al' // animais
  if (word.endsWith('eis') && word.length > 5) return word.slice(0, -3) + 'el' // papéis
  if (word.endsWith('ns')) return word.slice(0, -2) + 'm' // imagens
  if (word.endsWith('ies') && word.length > 4) return word.slice(0, -3) + 'y' // batteries
  if (/(ch|sh|x|ss)es$/.test(word)) return word.slice(0, -2) // boxes, watches
  if (word.endsWith('res') || word.endsWith('zes')) return word.slice(0, -2) // flores, luzes
  if (word.endsWith('s') && !word.endsWith('ss') && !word.endsWith('us') && !word.endsWith('is')) return word.slice(0, -1)
  return word
}

/** Search tokens of a text: folded, split, stop words out, stemmed. */
export function tokenize(text: string): string[] {
  const out: string[] = []
  for (const word of fold(text).split(' ')) {
    if (!word || STOP_WORDS.has(word)) continue
    out.push(stem(word))
  }
  return out
}

/** Damerau–Levenshtein distance, stopping early above `max`. */
export function editDistance(a: string, b: string, max = 2): number {
  if (Math.abs(a.length - b.length) > max) return max + 1
  const rows = a.length + 1
  const cols = b.length + 1
  const d: number[][] = Array.from({ length: rows }, (_, i) => {
    const row = new Array<number>(cols).fill(0)
    row[0] = i
    return row
  })
  for (let j = 0; j < cols; j++) d[0][j] = j
  for (let i = 1; i < rows; i++) {
    let best = Infinity
    for (let j = 1; j < cols; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost)
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1)
      if (d[i][j] < best) best = d[i][j]
    }
    if (best > max) return max + 1
  }
  return d[a.length][b.length]
}
