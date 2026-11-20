/** Joins class names, skipping falsy values. */
export function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(' ')
}

/** "shopping-cart" → "ShoppingCart". */
export function pascalCase(slug: string) {
  return slug
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((w) => (/^\d/.test(w) ? w : w[0].toUpperCase() + w.slice(1)))
    .join('')
}

/** Valid JS identifier for a component name ("4k-badge" → "Icon4kBadge"). */
export function componentName(slug: string) {
  const base = pascalCase(slug)
  return /^\d/.test(base) ? `Icon${base}` : `${base}Icon`
}

/** Formats a count in Brazilian Portuguese ("2.431"). */
export const formatNumber = (n: number) => n.toLocaleString('pt-BR')

/** "2026-11-19" → "19 de nov. de 2026". */
export function formatDate(iso: string) {
  const d = new Date(`${iso}T12:00:00Z`)
  return d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
}

/** Plural helper: plural(3, 'ícone', 'ícones') → "3 ícones". */
export const plural = (n: number, one: string, many: string) => `${formatNumber(n)} ${n === 1 ? one : many}`

/** Copies text to the clipboard, with a fallback for browsers without the async API. */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    try {
      const area = document.createElement('textarea')
      area.value = text
      area.setAttribute('readonly', '')
      area.style.position = 'fixed'
      area.style.opacity = '0'
      document.body.appendChild(area)
      area.select()
      const ok = document.execCommand('copy')
      area.remove()
      return ok
    } catch {
      return false
    }
  }
}

/** Starts a file download in the browser. */
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
