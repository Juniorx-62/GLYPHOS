/**
 * Live customisation: style, stroke, colour, size and opacity. The values are
 * the person's preference (saved in the browser) and apply to the grid, the
 * previews and every export. The catalogue files never change.
 */
import { STYLES, STROKE_RANGE } from '~/catalog'
import type { StyleId } from '~/catalog/types'
import { resetAppearance, updateSettings, useAppearance } from '~/data/stores/settings'
import { Button, Segmented, Slider } from '~/components/ui/primitives'
import { cn } from '~/lib/utils'

const SWATCHES = ['currentColor', '#151514', '#D9401F', '#2D6BAE', '#1E7A4C', '#8F5600', '#7A4FB5', '#C42640']

export function StylePicker({ available, className, size = 'md' }: { available?: StyleId[]; className?: string; size?: 'sm' | 'md' }) {
  const appearance = useAppearance()
  const options = STYLES.filter((s) => s.derivation !== 'manual' || available?.includes(s.id)).map((s) => ({
    value: s.id,
    label: s.name.pt,
    disabled: available ? !available.includes(s.id) : false,
  }))
  return <Segmented label="Estilo" value={appearance.style} onChange={(style) => updateSettings({ appearance: { style } })} options={options} className={className} size={size} />
}

export function ColorControl({ id = 'icon-color' }: { id?: string }) {
  const { color } = useAppearance()
  const ring = (on: boolean) => (on ? 'shadow-[inset_0_0_0_1.5px_var(--color-fg)]' : 'hover:shadow-[inset_0_0_0_1px_var(--color-border-strong)]')
  return (
    <fieldset className="grid grid-cols-[minmax(4.5rem,auto)_1fr] items-center gap-x-3">
      <legend className="sr-only">Cor</legend>
      <span aria-hidden className="text-sm text-fg-muted">
        Cor
      </span>
      <div className="flex flex-wrap items-center gap-0.5">
        {SWATCHES.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => updateSettings({ appearance: { color: c } })}
            aria-label={c === 'currentColor' ? 'Cor do texto (currentColor)' : `Cor ${c}`}
            aria-pressed={color === c}
            title={c === 'currentColor' ? 'currentColor: segue a cor do texto' : c}
            className={cn('grid size-7 place-items-center rounded-sm transition-shadow duration-fast', ring(color === c))}
          >
            {c === 'currentColor' ? (
              <span className="size-4 rounded-xs bg-[linear-gradient(135deg,var(--color-fg)_0_50%,var(--color-surface)_0)] ring-1 ring-border" />
            ) : (
              <span className="size-4 rounded-xs" style={{ background: c }} />
            )}
          </button>
        ))}
        <label className={cn('relative grid size-7 cursor-pointer place-items-center overflow-hidden rounded-sm', ring(false))} title="Escolher outra cor">
          <span className="sr-only">Escolher outra cor</span>
          <span className="size-4 rounded-xs bg-[conic-gradient(#D9401F,#8F5600,#1E7A4C,#2D6BAE,#7A4FB5,#D9401F)]" />
          <input
            id={id}
            type="color"
            value={color.startsWith('#') ? color : '#151514'}
            onChange={(e) => updateSettings({ appearance: { color: e.target.value } })}
            className="absolute inset-0 cursor-pointer opacity-0"
          />
        </label>
        <span className="inscription ml-2 text-fg-subtle">{color === 'currentColor' ? 'currentColor' : color.toUpperCase()}</span>
      </div>
    </fieldset>
  )
}

export function AppearanceControls({ available, showSize = true, idPrefix = 'ap' }: { available?: StyleId[]; showSize?: boolean; idPrefix?: string }) {
  const a = useAppearance()
  return (
    <div className="grid gap-4">
      <StylePicker available={available} className="w-full" />
      <Slider
        id={`${idPrefix}-stroke`}
        label="Traço"
        value={a.strokeWidth}
        min={STROKE_RANGE.min}
        max={STROKE_RANGE.max}
        step={STROKE_RANGE.step}
        format={(v) => v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
        onChange={(strokeWidth) => updateSettings({ appearance: { strokeWidth } })}
      />
      {showSize && (
        <Slider id={`${idPrefix}-size`} label="Tamanho" value={a.size} min={12} max={256} step={4} format={(v) => `${v} px`} onChange={(size) => updateSettings({ appearance: { size } })} />
      )}
      <Slider
        id={`${idPrefix}-opacity`}
        label="Opacidade"
        value={a.opacity}
        min={0.1}
        max={1}
        step={0.05}
        format={(v) => `${Math.round(v * 100)}%`}
        onChange={(opacity) => updateSettings({ appearance: { opacity } })}
      />
      <ColorControl id={`${idPrefix}-color`} />
      <Button variant="ghost" size="sm" icon="rotate-cw" onClick={resetAppearance} className="justify-self-start">
        Voltar ao padrão
      </Button>
    </div>
  )
}
