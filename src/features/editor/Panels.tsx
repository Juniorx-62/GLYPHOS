/** Side panels of the editor: properties, layers, history and the preview by size and style. */
import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react'
import { derivableStyles, pack } from '~/catalog/styles'
import type { StyleId } from '~/catalog/types'
import type { CreationDoc, DrawableShape, Shape, ShapePart } from '~/data/types'
import { Glyph } from '~/components/icons/Glyph'
import { UiIcon } from '~/components/icons/UiIcon'
import type { UiIconName } from '~/components/icons/ui-icon-names'
import { ColorButton, IconButton, Segmented, Select, Switch } from '~/components/ui/primitives'
import { cn } from '~/lib/utils'
import {
  alignSelection,
  ALIGN_LABEL,
  booleanSelection,
  convertSelectionToPath,
  duplicateSelection,
  deleteSelection,
  flipSelection,
  groupSelection,
  orderSelection,
  renameShape,
  selectedShapes,
  setArtboard,
  setBackground,
  setLocked,
  setPart,
  setRotation,
  setSelectionBounds,
  setStyle,
  setVisibility,
  ungroupSelection,
  updateShape,
  type Align,
} from './actions'
import { BOOLEAN_LABEL, canCombine, type BooleanOp } from './model/boolean'
import { ARTBOARD_SIZES, drawables, isLocked, moveToIndex, siblingsOf } from './model/doc'
import { boundsOfShapes, round3 } from './model/geometry'
import { historyIndex } from './model/history'
import { docToNodes } from './model/serialize'
import { apply, currentDoc, editor, jumpToStep, select, setView, useEditor } from './state'

/* ------------------------------------------------------------- fields */

function Section({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <section className="border-b border-border px-3 py-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="text-xs font-semibold tracking-wide text-fg-subtle uppercase">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  )
}

/** A number that commits on Enter or blur; arrows step (Shift ×10). */
function NumberField({ label, value, onCommit, step = 0.5, min, max, suffix, disabled }: { label: string; value: number | null; onCommit: (v: number) => void; step?: number; min?: number; max?: number; suffix?: string; disabled?: boolean }) {
  const id = useId()
  const shown = value === null ? '' : String(round3(value)).replace('.', ',')
  const [draft, setDraft] = useState(shown)
  useEffect(() => setDraft(shown), [shown])
  const commit = (text: string) => {
    const v = Number(text.replace(',', '.'))
    if (text.trim() === '' || !Number.isFinite(v)) return setDraft(shown)
    const clamped = Math.min(max ?? Infinity, Math.max(min ?? -Infinity, v))
    if (value === null || Math.abs(clamped - value) > 1e-6) onCommit(clamped)
    else setDraft(shown)
  }
  return (
    <label htmlFor={id} className="flex h-control-sm items-center gap-1.5 rounded-md border border-border bg-surface px-2 focus-within:border-ring">
      <span className="w-4 shrink-0 text-xs text-fg-subtle" aria-hidden>
        {label}
      </span>
      <input
        id={id}
        aria-label={label}
        inputMode="decimal"
        disabled={disabled}
        className="w-full min-w-0 bg-transparent text-xs text-fg tabular-nums outline-none disabled:opacity-50"
        value={draft}
        placeholder={value === null ? 'misto' : undefined}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={(e) => commit(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit((e.target as HTMLInputElement).value)
          if (e.key === 'Escape') setDraft(shown)
          if ((e.key === 'ArrowUp' || e.key === 'ArrowDown') && value !== null) {
            e.preventDefault()
            const k = (e.shiftKey ? 10 : 1) * step * (e.key === 'ArrowUp' ? 1 : -1)
            onCommit(Math.min(max ?? Infinity, Math.max(min ?? -Infinity, round3(value + k))))
          }
        }}
      />
      {suffix && <span className="text-xs text-fg-subtle">{suffix}</span>}
    </label>
  )
}

const PALETTE = ['currentColor', '#151514', '#ffffff', '#e5484d', '#f76b15', '#ffc53d', '#30a46c', '#0090ff', '#8e4ec6']

/** none / currentColor / a colour. */
function PaintField({ label, value, onChange }: { label: string; value: string | null; onChange: (v: string) => void }) {
  const hex = value && value.startsWith('#') ? value : '#151514'
  return (
    <div className="grid gap-1.5">
      <span className="text-xs text-fg-muted">{label}</span>
      <div className="flex flex-wrap items-center gap-1" role="group" aria-label={label}>
        <button type="button" onClick={() => onChange('none')} aria-pressed={value === 'none'} title="Sem" className={cn('grid size-6 place-items-center rounded-sm border text-fg-subtle', value === 'none' ? 'border-ring ring-2 ring-ring/40' : 'border-border')}>
          <span className="block h-px w-4 rotate-45 bg-error" aria-hidden />
          <span className="sr-only">Sem {label.toLowerCase()}</span>
        </button>
        {PALETTE.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => onChange(c)}
            aria-pressed={value === c}
            title={c === 'currentColor' ? 'Cor do texto (currentColor): acompanha o tema e o CSS de quem usar' : c}
            className={cn('size-6 rounded-sm border', value === c ? 'border-ring ring-2 ring-ring/40' : 'border-border', c === 'currentColor' && 'bg-fg')}
            style={c === 'currentColor' ? undefined : { background: c }}
          >
            <span className="sr-only">{c === 'currentColor' ? 'Cor do texto' : c}</span>
          </button>
        ))}
        <ColorButton value={hex} onChange={onChange} label={`${label}: outra cor`} className={cn('relative size-6 overflow-hidden rounded-sm border', value?.startsWith('#') && !PALETTE.includes(value) ? 'border-ring ring-2 ring-ring/40' : 'border-border')}>
          <span className="absolute inset-0" style={{ background: value?.startsWith('#') && !PALETTE.includes(value) ? value : 'conic-gradient(#e5484d, #ffc53d, #30a46c, #0090ff, #8e4ec6, #e5484d)' }} aria-hidden />
        </ColorButton>
      </div>
    </div>
  )
}

const same = <T,>(values: T[]): T | null => (values.length && values.every((v) => v === values[0]) ? values[0] : null)

/* ----------------------------------------------------------- properties */

export function PropertiesPanel() {
  const doc = useEditor(currentDoc)
  const selection = useEditor((s) => s.selection)
  const shapes = useMemo(() => selectedShapes(doc, selection), [doc, selection])
  if (!shapes.length) return <DocumentProperties doc={doc} />
  return <SelectionProperties doc={doc} shapes={shapes} />
}

function DocumentProperties({ doc }: { doc: CreationDoc }) {
  const view = useEditor((s) => s.view)
  const id = useId()
  return (
    <div>
      <Section title="Prancheta">
        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <label htmlFor={`${id}-box`} className="text-xs text-fg-muted">
              Tamanho (unidades do viewBox)
            </label>
            <Select id={`${id}-box`} value={doc.box} onChange={(e) => setArtboard(Number(e.target.value))} className="h-control-sm text-xs">
              {ARTBOARD_SIZES.map((s) => (
                <option key={s} value={s}>
                  {s} × {s}
                  {s === 24 ? ' · grid do GLYPHOS' : ''}
                </option>
              ))}
            </Select>
            <p className="text-xs text-fg-subtle">Mudar o tamanho redimensiona o desenho junto.</p>
          </div>
          <div className="grid gap-1.5">
            <span className="text-xs text-fg-muted">Fundo</span>
            <Segmented
              size="sm"
              label="Fundo da prancheta"
              value={doc.background === null ? 'none' : doc.background === '#ffffff' ? 'white' : doc.background === '#151514' ? 'dark' : 'custom'}
              onChange={(v) => setBackground(v === 'none' ? null : v === 'white' ? '#ffffff' : v === 'dark' ? '#151514' : (doc.background ?? '#f2f2f0'))}
              options={[
                { value: 'none', label: 'Transparente' },
                { value: 'white', label: 'Claro' },
                { value: 'dark', label: 'Escuro' },
              ]}
            />
            <p className="text-xs text-fg-subtle">O fundo é só da prancheta e do PNG; o SVG exportado é sempre transparente.</p>
          </div>
        </div>
      </Section>
      <Section title="Grade e guias">
        <div className="grid gap-2 text-sm">
          <Toggle label="Mostrar grade" checked={view.grid} onChange={(grid) => setView({ grid })} />
          <Toggle label="Linhas-guia do GLYPHOS (área viva, círculo, quadrado)" checked={view.keylines} onChange={(keylines) => setView({ keylines })} />
          <Toggle label="Encaixar na grade (Alt ignora)" checked={view.snap} onChange={(snap) => setView({ snap })} />
          <div className="mt-1 grid gap-1.5">
            <label htmlFor={`${id}-step`} className="text-xs text-fg-muted">
              Passo da grade
            </label>
            <Select id={`${id}-step`} value={view.gridStep} onChange={(e) => setView({ gridStep: Number(e.target.value) })} className="h-control-sm text-xs">
              {[0.125, 0.25, 0.5, 1, 2].map((s) => (
                <option key={s} value={s}>
                  {String(s).replace('.', ',')} unidade
                </option>
              ))}
            </Select>
          </div>
          <div className="grid gap-1.5">
            <label htmlFor={`${id}-sides`} className="text-xs text-fg-muted">
              Lados da ferramenta Polígono
            </label>
            <Select id={`${id}-sides`} value={view.polygonSides} onChange={(e) => setView({ polygonSides: Number(e.target.value) })} className="h-control-sm text-xs">
              {[3, 4, 5, 6, 7, 8, 10, 12].map((n) => (
                <option key={n} value={n}>
                  {n} lados
                </option>
              ))}
            </Select>
          </div>
        </div>
      </Section>
      <Section title="Desenho">
        <p className="text-sm text-fg-muted">{drawables(doc.shapes).length ? `${drawables(doc.shapes).length} formas. Selecione uma no canvas ou nas camadas para editar.` : 'Prancheta vazia.'}</p>
      </Section>
    </div>
  )
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <Switch checked={checked} onChange={onChange} className="justify-between [&>span:last-child]:order-first">
      {label}
    </Switch>
  )
}

const PART_INFO: Record<ShapePart, string> = {
  line: 'Linha: traço em todos os estilos.',
  body: 'Corpo: silhueta fechada. Preenchida no Sólido, em 20% no Duotone.',
  cut: 'Recorte: detalhe dentro de um corpo. Vazado no Sólido.',
  slash: 'Barra: risco que atravessa um corpo (como em "olho cortado").',
}

function SelectionProperties({ doc, shapes }: { doc: CreationDoc; shapes: Shape[] }) {
  const id = useId()
  const leaves: DrawableShape[] = drawables(shapes)
  const locked = shapes.some((s) => isLocked(doc, s.id))
  const b = boundsOfShapes(shapes)
  const style = (k: keyof DrawableShape['style']) => same(leaves.map((s) => s.style[k] as never))
  const single = shapes.length === 1 ? shapes[0] : null
  const rotation = same(leaves.map((s) => s.rotation))
  const part = same(leaves.map((s) => s.part))
  const hasGroup = shapes.some((s) => s.kind === 'group')
  const combinable = canCombine(shapes.filter((s): s is DrawableShape => s.kind !== 'group'))
  const strokeW = style('strokeWidth') as number | null
  const stroke = style('stroke') as string | null
  const opacity = style('opacity') as number | null
  return (
    <div className={cn(locked && 'pointer-events-none opacity-60')}>
      {locked && <p className="border-b border-border bg-muted px-3 py-2 text-xs text-fg-muted">Camada bloqueada. Desbloqueie no painel de camadas para editar.</p>}
      <Section title={single ? single.name : `${shapes.length} formas`}>
        <div className="grid grid-cols-2 gap-1.5">
          <NumberField label="X" value={b.x} onCommit={(x) => setSelectionBounds({ x })} />
          <NumberField label="Y" value={b.y} onCommit={(y) => setSelectionBounds({ y })} />
          <NumberField label="L" value={b.w} min={0.01} onCommit={(w) => setSelectionBounds({ w })} />
          <NumberField label="A" value={b.h} min={0.01} onCommit={(h) => setSelectionBounds({ h })} />
          {!hasGroup && <NumberField label="°" value={rotation} step={15} min={-360} max={360} onCommit={(r) => setRotation(r)} />}
          {single?.kind === 'rect' && <NumberField label="R" value={single.r} min={0} step={0.25} onCommit={(r) => updateShape(single.id, (s) => ({ ...s, r }), 'Raio dos cantos')} />}
        </div>
        <div className="mt-2 flex flex-wrap gap-0.5">
          {(['left', 'hcenter', 'right', 'top', 'vcenter', 'bottom'] as Align[]).map((a) => (
            <IconButton key={a} size="sm" icon={ALIGN_ICON[a]} label={`${ALIGN_LABEL[a]}${shapes.length === 1 ? ' da prancheta' : ''}`} onClick={() => alignSelection(a)} />
          ))}
          <IconButton size="sm" icon="flip-horizontal" label="Espelhar na horizontal" onClick={() => flipSelection('h')} />
          <IconButton size="sm" icon="flip-vertical" label="Espelhar na vertical" onClick={() => flipSelection('v')} />
        </div>
      </Section>
      <Section title="Aparência">
        <div className="grid gap-3">
          <PaintField label="Traço" value={stroke} onChange={(v) => setStyle({ stroke: v }, 'Cor do traço')} />
          {stroke !== 'none' && (
            <div className="grid grid-cols-[1fr_88px] items-center gap-2">
              <input
                type="range"
                aria-label="Espessura do traço"
                min={0.25}
                max={(doc.box / 24) * 4}
                step={0.25}
                value={strokeW ?? 1.5}
                onChange={(e) => setStyle({ strokeWidth: Number(e.target.value) }, 'Espessura do traço')}
                className="glyphos-range h-6 w-full min-w-0 cursor-pointer appearance-none bg-transparent"
                style={{ ['--p' as string]: `${(((strokeW ?? 1.5) - 0.25) / ((doc.box / 24) * 4 - 0.25)) * 100}%` }}
              />
              <NumberField label="T" value={strokeW} min={0} max={50} step={0.25} onCommit={(v) => setStyle({ strokeWidth: v }, 'Espessura do traço')} />
            </div>
          )}
          <PaintField label="Preenchimento" value={style('fill') as string | null} onChange={(v) => setStyle({ fill: v }, 'Preenchimento')} />
          <div className="grid grid-cols-[1fr_88px] items-center gap-2">
            <input type="range" aria-label="Opacidade" min={0} max={1} step={0.05} value={opacity ?? 1} onChange={(e) => setStyle({ opacity: Number(e.target.value) }, 'Opacidade')} className="glyphos-range h-6 w-full min-w-0 cursor-pointer appearance-none bg-transparent" style={{ ['--p' as string]: `${(opacity ?? 1) * 100}%` }} />
            <NumberField label="%" value={opacity === null ? null : Math.round(opacity * 100)} min={0} max={100} step={5} onCommit={(v) => setStyle({ opacity: v / 100 }, 'Opacidade')} />
          </div>
          {stroke !== 'none' && (
            <>
              <div className="grid gap-1.5">
                <span className="text-xs text-fg-muted">Terminações</span>
                <Segmented
                  size="sm"
                  label="Terminações do traço"
                  value={(style('linecap') as string | null) ?? 'round'}
                  onChange={(v) => setStyle({ linecap: v as 'round' }, 'Terminações')}
                  options={[
                    { value: 'round', label: 'Redonda' },
                    { value: 'butt', label: 'Reta' },
                    { value: 'square', label: 'Quadrada' },
                  ]}
                />
              </div>
              <div className="grid gap-1.5">
                <span className="text-xs text-fg-muted">Junções</span>
                <Segmented
                  size="sm"
                  label="Junções do traço"
                  value={(style('linejoin') as string | null) ?? 'round'}
                  onChange={(v) => setStyle({ linejoin: v as 'round' }, 'Junções')}
                  options={[
                    { value: 'round', label: 'Redonda' },
                    { value: 'miter', label: 'Viva' },
                    { value: 'bevel', label: 'Chanfro' },
                  ]}
                />
              </div>
            </>
          )}
        </div>
      </Section>
      <Section title="Papel nos estilos">
        <Select id={`${id}-part`} aria-label="Papel da forma nos estilos Sólido e Duotone" value={part ?? ''} onChange={(e) => setPart(e.target.value as ShapePart)} className="h-control-sm text-xs">
          {part === null && <option value="">Misto</option>}
          <option value="line">Linha</option>
          <option value="body">Corpo</option>
          <option value="cut">Recorte</option>
          <option value="slash">Barra</option>
        </Select>
        <p className="mt-1.5 text-xs text-fg-subtle">{part ? PART_INFO[part] : 'As formas selecionadas têm papéis diferentes.'}</p>
      </Section>
      <Section title="Organizar">
        <div className="flex flex-wrap gap-0.5">
          <IconButton size="sm" icon="bring-to-front" label="Trazer para a frente (Ctrl Shift ])" onClick={() => orderSelection('front')} />
          <IconButton size="sm" icon="bring-forward" label="Avançar uma camada (Ctrl ])" onClick={() => orderSelection('forward')} />
          <IconButton size="sm" icon="send-backward" label="Recuar uma camada (Ctrl [)" onClick={() => orderSelection('backward')} />
          <IconButton size="sm" icon="send-to-back" label="Enviar para trás (Ctrl Shift [)" onClick={() => orderSelection('back')} />
          <IconButton size="sm" icon="copy" label="Duplicar (Ctrl D)" onClick={() => duplicateSelection()} />
          {shapes.length > 1 && <IconButton size="sm" icon="group" label="Agrupar (Ctrl G)" onClick={groupSelection} />}
          {hasGroup && <IconButton size="sm" icon="ungroup" label="Desagrupar (Ctrl Shift G)" onClick={ungroupSelection} />}
          {shapes.some((s) => s.kind !== 'group' && s.kind !== 'path') && <IconButton size="sm" icon="bezier-curve" label="Converter em caminho (editar pontos)" onClick={convertSelectionToPath} />}
          <IconButton size="sm" icon="trash" label="Excluir (Delete)" onClick={deleteSelection} />
        </div>
      </Section>
      {shapes.length > 1 && (
        <Section title="Operações vetoriais">
          <div className="grid grid-cols-2 gap-1">
            {(['union', 'subtract', 'intersect', 'exclude'] as BooleanOp[]).map((op) => (
              <button
                key={op}
                type="button"
                disabled={!combinable}
                onClick={() => booleanSelection(op)}
                className="flex h-control-sm items-center gap-1.5 rounded-md border border-border bg-surface px-2 text-xs text-fg hover:bg-surface-elevated disabled:opacity-50"
              >
                <UiIcon name={BOOL_ICON[op]} size={14} />
                {BOOLEAN_LABEL[op]}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-fg-subtle">
            {combinable
              ? 'Subtrair tira as formas de cima da de baixo. O resultado é um caminho de segmentos retos que acompanha as curvas de perto.'
              : 'Só formas fechadas (retângulos, elipses, polígonos e caminhos fechados) se combinam.'}
          </p>
        </Section>
      )}
    </div>
  )
}

const ALIGN_ICON: Record<Align, UiIconName> = {
  left: 'align-left-edge',
  hcenter: 'align-center-horizontal',
  right: 'align-right-edge',
  top: 'align-top',
  vcenter: 'align-middle',
  bottom: 'align-bottom',
}
const BOOL_ICON: Record<BooleanOp, UiIconName> = { union: 'union', subtract: 'subtract-shape', intersect: 'intersect', exclude: 'exclude-shape' }

/* ---------------------------------------------------------------- layers */

const KIND_ICON: Record<Shape['kind'], UiIconName> = { rect: 'square', ellipse: 'circle', line: 'line-segment', polygon: 'pentagon', path: 'bezier-curve', group: 'folder' }

export function LayersPanel() {
  const doc = useEditor(currentDoc)
  const count = drawables(doc.shapes).length
  if (!doc.shapes.length) {
    return <p className="p-4 text-sm text-fg-muted">Nenhuma camada. Cada forma desenhada vira uma camada aqui, de cima (frente) para baixo.</p>
  }
  return (
    <div>
      <p className="border-b border-border px-3 py-2 text-xs text-fg-subtle">
        {count} {count === 1 ? 'forma' : 'formas'} · arraste para reordenar · Shift seleciona várias
      </p>
      <ul role="tree" aria-label="Camadas" className="py-1">
        {[...doc.shapes].reverse().map((s) => (
          <LayerRow key={s.id} shape={s} depth={0} />
        ))}
      </ul>
    </div>
  )
}

function LayerRow({ shape, depth }: { shape: Shape; depth: number }) {
  const selected = useEditor((s) => s.selection.includes(shape.id))
  const [open, setOpen] = useState(true)
  const [editing, setEditing] = useState(false)
  const [over, setOver] = useState<'above' | 'below' | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (editing) inputRef.current?.select()
  }, [editing])
  const onClick = (e: React.MouseEvent) => {
    const cur = editor.get().selection
    if (e.shiftKey || e.metaKey || e.ctrlKey) select(cur.includes(shape.id) ? cur.filter((x) => x !== shape.id) : [...cur, shape.id])
    else select([shape.id])
  }
  return (
    <li role="treeitem" aria-selected={selected} aria-expanded={shape.kind === 'group' ? open : undefined}>
      <div
        draggable={!editing}
        onDragStart={(e) => {
          e.dataTransfer.setData('text/x-glyphos-layer', shape.id)
          e.dataTransfer.effectAllowed = 'move'
        }}
        onDragOver={(e) => {
          if (!e.dataTransfer.types.includes('text/x-glyphos-layer')) return
          e.preventDefault()
          const r = e.currentTarget.getBoundingClientRect()
          setOver(e.clientY < r.top + r.height / 2 ? 'above' : 'below')
        }}
        onDragLeave={() => setOver(null)}
        onDrop={(e) => {
          e.preventDefault()
          const dragged = e.dataTransfer.getData('text/x-glyphos-layer')
          const where = over
          setOver(null)
          if (!dragged || dragged === shape.id) return
          const d = editor.get().history.present.doc
          const list = siblingsOf(d.shapes, shape.id)
          // Only within the same list (document or group): moving between groups is grouping.
          if (!list || !list.some((s) => s.id === dragged)) return
          const without = list.filter((s) => s.id !== dragged)
          const at = without.findIndex((s) => s.id === shape.id)
          // The panel lists top (front) first: "above" means a higher index.
          apply('Reordenar camadas', (cur) => moveToIndex(cur, dragged, where === 'above' ? at + 1 : at))
        }}
        className={cn(
          'group flex h-8 items-center gap-1 pr-1 text-sm',
          selected ? 'bg-primary/10 text-fg' : 'text-fg-muted hover:bg-muted hover:text-fg',
          over === 'above' && 'shadow-[inset_0_2px_0_var(--color-primary)]',
          over === 'below' && 'shadow-[inset_0_-2px_0_var(--color-primary)]',
          shape.hidden && 'opacity-50',
        )}
        style={{ paddingLeft: 8 + depth * 14 }}
      >
        {shape.kind === 'group' ? (
          <button type="button" className="grid size-5 place-items-center rounded-sm hover:bg-border" aria-label={open ? 'Recolher grupo' : 'Expandir grupo'} onClick={() => setOpen((v) => !v)}>
            <UiIcon name={open ? 'chevron-down' : 'chevron-right'} size={12} />
          </button>
        ) : (
          <span className="size-5" />
        )}
        <UiIcon name={KIND_ICON[shape.kind]} size={14} className="shrink-0 text-fg-subtle" />
        {editing ? (
          <input
            ref={inputRef}
            defaultValue={shape.name}
            aria-label="Nome da camada"
            className="h-6 min-w-0 flex-1 rounded-sm border border-ring bg-surface px-1 text-sm text-fg outline-none"
            onBlur={(e) => {
              renameShape(shape.id, e.target.value)
              setEditing(false)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
              if (e.key === 'Escape') setEditing(false)
              e.stopPropagation()
            }}
          />
        ) : (
          <button type="button" className="min-w-0 flex-1 truncate text-left" onClick={onClick} onDoubleClick={() => setEditing(true)} title="Clique para selecionar, clique duplo para renomear">
            {shape.name}
            {shape.kind !== 'group' && shape.part !== 'line' && <span className="ml-1.5 text-xs text-fg-subtle">{shape.part === 'body' ? 'corpo' : shape.part === 'cut' ? 'recorte' : 'barra'}</span>}
          </button>
        )}
        <button
          type="button"
          className={cn('grid size-6 place-items-center rounded-sm hover:bg-border', !shape.hidden && 'opacity-0 group-hover:opacity-100 focus-visible:opacity-100')}
          aria-label={shape.hidden ? `Mostrar ${shape.name}` : `Ocultar ${shape.name}`}
          title={shape.hidden ? 'Mostrar' : 'Ocultar'}
          onClick={() => setVisibility(shape.id, !shape.hidden)}
        >
          <UiIcon name={shape.hidden ? 'eye-off' : 'eye'} size={14} />
        </button>
        <button
          type="button"
          className={cn('grid size-6 place-items-center rounded-sm hover:bg-border', !shape.locked && 'opacity-0 group-hover:opacity-100 focus-visible:opacity-100')}
          aria-label={shape.locked ? `Desbloquear ${shape.name}` : `Bloquear ${shape.name}`}
          title={shape.locked ? 'Desbloquear' : 'Bloquear'}
          onClick={() => setLocked(shape.id, !shape.locked)}
        >
          <UiIcon name={shape.locked ? 'lock' : 'lock-open'} size={14} />
        </button>
      </div>
      {shape.kind === 'group' && open && (
        <ul role="group">
          {[...shape.children].reverse().map((c) => (
            <LayerRow key={c.id} shape={c} depth={depth + 1} />
          ))}
        </ul>
      )}
    </li>
  )
}

/* --------------------------------------------------------------- history */

export function HistoryPanel() {
  const history = useEditor((s) => s.history)
  const all = [...history.past, history.present, ...history.future]
  const cur = historyIndex(history)
  return (
    <div>
      <p className="border-b border-border px-3 py-2 text-xs text-fg-subtle">Clique num passo para voltar a ele. Ctrl Z desfaz, Ctrl Shift Z refaz.</p>
      <ol className="py-1">
        {all
          .map((e, i) => ({ e, i }))
          .reverse()
          .map(({ e, i }) => (
            <li key={i}>
              <button
                type="button"
                onClick={() => jumpToStep(i)}
                aria-current={i === cur ? 'step' : undefined}
                className={cn('flex h-8 w-full items-center gap-2 px-3 text-left text-sm', i === cur ? 'bg-primary/10 font-medium text-fg' : i > cur ? 'text-fg-subtle line-through decoration-fg-subtle/40 hover:bg-muted' : 'text-fg-muted hover:bg-muted hover:text-fg')}
              >
                <span className="w-6 text-xs text-fg-subtle tabular-nums">{i}</span>
                <span className="truncate">{e.label}</span>
              </button>
            </li>
          ))}
      </ol>
    </div>
  )
}

/* --------------------------------------------------------------- preview */

const PREVIEW_SIZES = [16, 20, 24, 32, 48]

/** The drawing as the library draws it: every interface size, in the styles it can derive. */
export function PreviewPanel() {
  const doc = useEditor(currentDoc)
  const nodes = useMemo(() => docToNodes(doc), [doc])
  const packed = useMemo(() => pack(nodes), [nodes])
  const styles = derivableStyles(nodes)
  const [style, setStyle] = useState<StyleId>('outline')
  const effective = styles.includes(style) ? style : 'outline'
  const [dark, setDark] = useState(false)
  const options: Array<{ value: StyleId; label: string }> = [
    { value: 'outline', label: 'Contorno' },
    { value: 'solid', label: 'Sólido' },
    { value: 'duotone', label: 'Duotone' },
  ]
  return (
    <section aria-label="Prévia do ícone">
      <div className="flex items-center gap-3 px-4 pt-3">
        <h2 className="sr-only">Prévia</h2>
        <div role="radiogroup" aria-label="Estilo da prévia" className="flex gap-3">
          {options.map((o) => {
            const has = o.value === 'outline' || styles.includes(o.value)
            const active = effective === o.value
            return (
              <button
                key={o.value}
                type="button"
                role="radio"
                aria-checked={active}
                disabled={!has}
                title={has ? undefined : 'Precisa de uma forma fechada com papel Corpo (o Style Matching marca os papéis)'}
                onClick={() => setStyle(o.value)}
                className={cn(
                  'relative py-1 text-sm transition-colors duration-fast',
                  active ? 'text-fg' : 'text-fg-muted hover:text-fg',
                  !has && 'cursor-not-allowed text-fg-disabled hover:text-fg-disabled',
                )}
              >
                {o.label}
                <span aria-hidden className={cn('absolute inset-x-0 -bottom-px h-px bg-accent transition-opacity', active ? 'opacity-100' : 'opacity-0')} />
              </button>
            )
          })}
        </div>
        <button
          type="button"
          onClick={() => setDark((v) => !v)}
          aria-pressed={dark}
          className="ml-auto inline-flex items-center gap-1.5 text-xs text-fg-muted hover:text-fg"
          title="Ver a prévia no outro fundo"
        >
          <span aria-hidden className={cn('size-3 rounded-xs ring-1 ring-border', dark ? 'bg-[#151514]' : 'bg-[#F7F7F4]')} />
          {dark ? 'Escuro' : 'Claro'}
        </button>
      </div>
      <div className={cn('mt-3 px-4 pt-5 pb-3 transition-colors duration-base', dark ? 'bg-[#151514] text-[#EDEDE8]' : 'bg-background-subtle text-fg')}>
        <div className="flex items-end justify-between border-b border-current/15 pb-2">
          {PREVIEW_SIZES.map((s) => (
            <Glyph key={s} nodes={packed} style={effective} size={s} box={doc.box} label={s === 24 ? 'Prévia do ícone' : undefined} />
          ))}
        </div>
        <div className="mt-1.5 flex justify-between" aria-hidden>
          {PREVIEW_SIZES.map((s) => (
            <span key={s} className="inscription text-center opacity-60" style={{ width: s }}>
              {s}
            </span>
          ))}
        </div>
      </div>
    </section>
  )
}
