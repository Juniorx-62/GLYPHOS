import { useAppearance } from '~/data/stores/settings'
import type { ShardIcon } from '~/catalog/types'
import { copyText, downloadBlob } from '~/lib/utils'
import { toast } from '~/components/ui/toast'
import { FILE_EXTENSION, effectiveStyle, exportText, renderTree, svgToPng, type ExportFormat, type ExportOptions } from './formats'
import { toSvgString } from '~/catalog/styles'

const LABEL: Record<ExportFormat, string> = { svg: 'SVG', jsx: 'Componente JSX', tsx: 'Componente TSX', css: 'CSS', dataUri: 'Data URI' }

/** The text colour of the page, for exports that cannot use currentColor (PNG). */
function resolvedTextColor() {
  if (typeof document === 'undefined') return '#151514'
  return getComputedStyle(document.documentElement).getPropertyValue('--color-fg').trim() || '#151514'
}

/** Export actions for one icon with the person's current customisation. */
export function useIconExport(icon: Pick<ShardIcon, 'slug' | 'nodes' | 'styles' | 'overrides' | 'name' | 'id'> | undefined, overrides: Partial<ExportOptions> = {}) {
  const appearance = useAppearance()
  const options: ExportOptions = { ...appearance, ...overrides }
  const style = icon ? effectiveStyle(icon, options.style) : options.style

  const text = (format: ExportFormat) => (icon ? exportText(format, icon, options) : '')

  async function copy(format: ExportFormat) {
    if (!icon) return
    const ok = await copyText(text(format))
    toast(ok ? `${LABEL[format]} de "${icon.name.pt}" copiado` : 'Não foi possível copiar. Selecione o código e copie manualmente.', ok ? 'success' : 'error')
  }

  async function copyIdentifier(kind: 'slug' | 'id') {
    if (!icon) return
    const ok = await copyText(kind === 'slug' ? icon.slug : icon.id)
    toast(ok ? `${kind === 'slug' ? 'Nome técnico' : 'Identificador'} copiado: ${kind === 'slug' ? icon.slug : icon.id}` : 'Não foi possível copiar.', ok ? 'success' : 'error')
  }

  function download(format: ExportFormat) {
    if (!icon) return
    const type = format === 'svg' ? 'image/svg+xml' : 'text/plain'
    const name = format === 'jsx' || format === 'tsx' ? `${icon.slug}.${FILE_EXTENSION[format]}` : `${icon.slug}${style !== 'outline' ? `-${style}` : ''}.${FILE_EXTENSION[format]}`
    downloadBlob(new Blob([text(format)], { type }), name)
    toast(`${name} baixado`)
  }

  async function downloadPng(size = Math.max(options.size, 24), background?: string) {
    if (!icon) return
    try {
      const color = options.color === 'currentColor' ? resolvedTextColor() : options.color
      const svg = toSvgString(renderTree(icon, { ...options, color }, { size }))
      const blob = await svgToPng(svg, size, background)
      const name = `${icon.slug}${style !== 'outline' ? `-${style}` : ''}-${size}.png`
      downloadBlob(blob, name)
      toast(`${name} baixado`)
    } catch {
      toast('Não foi possível gerar o PNG neste navegador.', 'error')
    }
  }

  return { options, style, text, copy, copyIdentifier, download, downloadPng }
}
