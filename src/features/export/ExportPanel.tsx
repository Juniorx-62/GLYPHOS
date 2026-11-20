/**
 * The export area of an icon: quick actions (copy SVG/JSX, download SVG/PNG)
 * and the code tabs (SVG, JSX, TSX, CSS, data URI) with copy and download.
 */
import { useId, useState } from 'react'
import type { ShardIcon } from '~/catalog/types'
import { CodeBlock } from '~/components/code/CodeBlock'
import { Button, Segmented, Select } from '~/components/ui/primitives'
import type { ExportFormat } from './formats'
import { useIconExport } from './use-export'

type ExportableIcon = Pick<ShardIcon, 'slug' | 'nodes' | 'styles' | 'overrides' | 'name' | 'id'>

export function QuickExportActions({ icon, compact = false }: { icon: ExportableIcon; compact?: boolean }) {
  const ex = useIconExport(icon)
  return (
    <div className={compact ? 'grid grid-cols-2 gap-2' : 'flex flex-wrap gap-2'}>
      <Button variant="primary" icon="copy" onClick={() => ex.copy('svg')}>
        Copiar SVG
      </Button>
      <Button icon="code" onClick={() => ex.copy('jsx')}>
        Copiar JSX
      </Button>
      <Button icon="download" onClick={() => ex.download('svg')}>
        Baixar SVG
      </Button>
      <Button icon="image" onClick={() => ex.downloadPng()}>
        Baixar PNG
      </Button>
    </div>
  )
}

const FORMATS: Array<{ value: ExportFormat; label: string; hint: string }> = [
  { value: 'svg', label: 'SVG', hint: 'Cole direto no HTML, ou salve como arquivo .svg.' },
  { value: 'jsx', label: 'JSX', hint: 'Componente React em JavaScript. Tamanho, cor e traço continuam ajustáveis pelas props.' },
  { value: 'tsx', label: 'TSX', hint: 'O mesmo componente em TypeScript, com o tipo das props.' },
  { value: 'css', label: 'CSS', hint: 'Uma classe que pinta o ícone com máscara CSS: ele assume a cor do texto (color).' },
  { value: 'dataUri', label: 'Data URI', hint: 'O SVG como endereço, para <img src="…"> ou background-image.' },
]

export function CodePanel({ icon }: { icon: ExportableIcon }) {
  const [format, setFormat] = useState<ExportFormat>('svg')
  const ex = useIconExport(icon)
  const code = ex.text(format)
  const current = FORMATS.find((f) => f.value === format)!
  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Segmented label="Formato do código" value={format} onChange={setFormat} options={FORMATS.map((f) => ({ value: f.value, label: f.label }))} />
        <div className="flex gap-2">
          <Button size="sm" icon="copy" onClick={() => ex.copy(format)}>
            Copiar
          </Button>
          <Button size="sm" icon="download" onClick={() => ex.download(format)}>
            Baixar
          </Button>
        </div>
      </div>
      <p className="text-xs text-fg-muted">{current.hint}</p>
      <CodeBlock code={code} label={`Código ${current.label} do ícone ${icon.name.pt}`} wrap={format === 'dataUri' || format === 'css'} />
    </div>
  )
}

const PNG_SIZES = [16, 24, 32, 48, 64, 96, 128, 256, 512, 1024]

export function PngExport({ icon }: { icon: ExportableIcon }) {
  const id = useId()
  const ex = useIconExport(icon)
  const [size, setSize] = useState(128)
  const [bg, setBg] = useState<'transparent' | 'white' | 'black'>('transparent')
  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="grid gap-1.5">
        <label htmlFor={`${id}-size`} className="text-xs font-medium text-fg-muted">
          Tamanho do PNG
        </label>
        <Select id={`${id}-size`} value={size} onChange={(e) => setSize(Number(e.target.value))} className="w-32">
          {PNG_SIZES.map((s) => (
            <option key={s} value={s}>
              {s} × {s} px
            </option>
          ))}
        </Select>
      </div>
      <div className="grid gap-1.5">
        <span className="text-xs font-medium text-fg-muted">Fundo</span>
        <Segmented
          label="Fundo do PNG"
          value={bg}
          onChange={setBg}
          options={[
            { value: 'transparent', label: 'Transparente' },
            { value: 'white', label: 'Branco' },
            { value: 'black', label: 'Preto' },
          ]}
        />
      </div>
      <Button icon="download" onClick={() => ex.downloadPng(size, bg === 'transparent' ? undefined : bg === 'white' ? '#FFFFFF' : '#000000')}>
        Baixar PNG
      </Button>
    </div>
  )
}
