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
  return (
    <fieldset className="grid gap-2">
      <legend className="mb-1.5 text-xs font-medium text-fg-muted">Cor</legend>
      <div className="flex flex-wrap items-center gap-1.5">
        {SWATCHES.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => updateSettings({ appearance: { color: c } })}
            aria-label={c === 'currentColor' ? 'Cor do texto (currentColor)' : `Cor ${c}`}
            aria-pressed={color === c}
            title={c === 'currentColor' ? 'currentColor: segue a cor do texto' : c}
            className={cn('grid size-7 place-items-center rounded-full border transition-shadow', color === c ? 'border-fg ring-2 ring-fg/20' : 'border-border hover:border-border-strong')}
          >
            {c === 'currentColor' ? (
              <span className="size-4 rounded-full bg-[conic-gradient(var(--color-fg)_0_50%,var(--color-surface)_0)] ring-1 ring-border" />
            ) : (
              <span className="size-4 rounded-full" style={{ background: c }} />
            )}
          </button>
        ))}
        <label className="relative grid size-7 cursor-pointer place-items-center overflow-hidden rounded-full border border-border hover:border-border-strong" title="Escolher outra cor">
          <span className="sr-only">Escolher outra cor</span>
          <span className="size-4 rounded-full bg-[conic-gradient(#D9401F,#8F5600,#1E7A4C,#2D6BAE,#7A4FB5,#D9401F)]" />
          <input
            id={id}
            type="color"
            value={color.startsWith('#') ? color : '#151514'}
            onChange={(e) => updateSettings({ appearance: { color: e.target.value } })}
            className="absolute inset-0 cursor-pointer opacity-0"
          />
        </label>
        <span className="inscription ml-1 text-fg-subtle">{color === 'currentColor' ? 'currentColor' : color.toUpperCase()}</span>
      </div>
    </fieldset>
  )
}

export function AppearanceControls({ available, showSize = true, idPrefix = 'ap' }: { available?: StyleId[]; showSize?: boolean; idPrefix?: string }) {
  const a = useAppearance()
  return (
    <div className="grid gap-5">
      <div className="grid gap-1.5">
        <span className="text-xs font-medium text-fg-muted">Estilo</span>
        <StylePicker available={available} className="w-full" />
      </div>
      <Slider
        id={`${idPrefix}-stroke`}
        label="Traço"
        value={a.strokeWidth}
        min={STROKE_RANGE.min}
        max={STROKE_RANGE.max}
        step={STROKE_RANGE.step}
        format={(v) => `${v.toLocaleString('pt-BR')} px`}
        onChange={(strokeWidth) => updateSettings({ appearance: { strokeWidth } })}
      />
      {showSize && (
        <Slider id={`${idPrefix}-size`} label="Tamanho da exportação" value={a.size} min={12} max={256} step={4} format={(v) => `${v} px`} onChange={(size) => updateSettings({ appearance: { size } })} />
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
