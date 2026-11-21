/**
 * Demonstrations of the drawing system on the home page: every piece is drawn
 * live from the catalogue (Glyph), and every control changes the real render.
 * Nothing here is a picture of the product; it is the product.
 */
import { Link } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { CATEGORIES, DEFAULT_STROKE, STROKE_RANGE, STYLES, catalogInfo } from '~/catalog'
import type { ShardIcon, StyleId } from '~/catalog/types'
import { Glyph } from '~/components/icons/Glyph'
import { Slider } from '~/components/ui/primitives'
import { cn, formatNumber } from '~/lib/utils'

export type IconMap = Record<string, ShardIcon>

const LIVE_STYLES = STYLES.filter((s) => (catalogInfo.styles[s.id] ?? 0) > 0)
const strokeLabel = (v: number) => v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })

function styleFor(icon: ShardIcon, style: StyleId): StyleId {
  return icon.styles.includes(style) ? style : 'outline'
}

function Draw({ icon, style, size, strokeWidth, className }: { icon?: ShardIcon; style: StyleId; size: number | string; strokeWidth?: number; className?: string }) {
  if (!icon) return <span className="block" style={{ width: size, height: size }} />
  const s = styleFor(icon, style)
  return <Glyph nodes={icon.nodes} override={icon.overrides?.[s]} style={s} size={size} strokeWidth={strokeWidth} className={className} />
}

/** Text tabs: the selected one is ink and underlined in rubric; no boxes. */
function TextTabs<T extends string>({ value, onChange, options, label }: { value: T; onChange: (v: T) => void; options: Array<{ value: T; label: string }>; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-x-5 gap-y-1">
      {options.map((o) => {
        const active = o.value === value
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={cn('relative py-1 text-sm transition-colors duration-fast', active ? 'text-fg' : 'text-fg-muted hover:text-fg')}
          >
            {o.label}
            <span aria-hidden className={cn('absolute inset-x-0 -bottom-px h-px origin-left bg-accent transition-transform duration-base', active ? 'scale-x-100' : 'scale-x-0')} />
          </button>
        )
      })}
    </div>
  )
}

const styleOptions = LIVE_STYLES.map((s) => ({ value: s.id, label: s.name.pt }))

/* ------------------------------------------------------------ construction */

/** The 24-unit construction grid, keylines and live area, in icon units. */
export function Construction({ strong = false }: { strong?: boolean }) {
  const lines = Array.from({ length: 23 }, (_, i) => i + 1)
  return (
    <svg viewBox="0 0 24 24" className="absolute inset-0 size-full" aria-hidden>
      {lines.map((i) => (
        <path key={i} d={`M${i} 0V24M0 ${i}H24`} style={{ stroke: 'var(--color-canvas-grid)' }} strokeWidth="0.05" />
      ))}
      <path d="M0 0L24 24M24 0L0 24M12 0V24M0 12H24" style={{ stroke: 'var(--color-canvas-grid)' }} strokeWidth="0.05" />
      <g fill="none" style={{ stroke: 'var(--color-border-strong)' }} strokeWidth="0.04" opacity={strong ? 0.8 : 0.5}>
        <circle cx="12" cy="12" r="9" />
        <rect x="3" y="3" width="18" height="18" rx="3" />
      </g>
      <rect x="2" y="2" width="20" height="20" fill="none" style={{ stroke: 'var(--color-accent)' }} strokeWidth="0.05" strokeDasharray="0.35 0.25" />
    </svg>
  )
}

export const SPECIMEN_SLUGS = ['camera', 'bell', 'map-pin', 'calendar', 'lock', 'cloud', 'rocket', 'coffee']

/**
 * Hero plate: one drawing over its construction grid, with no frame around it.
 * Cycles through a few drawings until the visitor takes a control.
 */
export function Specimen({ icons }: { icons: IconMap }) {
  const slugs = SPECIMEN_SLUGS.filter((s) => icons[s])
  const [index, setIndex] = useState(0)
  const [style, setStyle] = useState<StyleId>('outline')
  const [stroke, setStroke] = useState(DEFAULT_STROKE)
  const [auto, setAuto] = useState(true)

  useEffect(() => {
    if (!auto || slugs.length < 2) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const t = window.setInterval(() => setIndex((i) => (i + 1) % slugs.length), 3200)
    return () => window.clearInterval(t)
  }, [auto, slugs.length])

  const take =
    <T,>(fn: (v: T) => void) =>
    (v: T) => {
      setAuto(false)
      fn(v)
    }
  const slug = slugs[index] ?? slugs[0]
  const icon = slug ? icons[slug] : undefined

  return (
    <figure className="grid gap-6">
      <div className="relative mx-auto aspect-square w-full max-w-[26rem] text-fg">
        <Construction strong />
        <div key={`${slug}-${style}`} className="animate-in absolute inset-0">
          <Draw icon={icon} style={style} size="100%" strokeWidth={stroke} />
        </div>
        <span className="inscription absolute -bottom-6 left-0 text-fg-subtle">{slug}</span>
        <span className="inscription absolute -bottom-6 right-0 text-fg-subtle">24 × 24</span>
      </div>
      <div className="mx-auto mt-4 grid w-full max-w-[26rem] gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <TextTabs label="Estilo do desenho" value={style} onChange={take(setStyle)} options={styleOptions} />
          <div className="flex" role="group" aria-label="Desenho">
            {slugs.map((s, i) => (
              <button
                key={s}
                type="button"
                aria-label={icons[s]?.name.pt ?? s}
                aria-pressed={i === index}
                onClick={() => take(setIndex)(i)}
                className={cn('grid size-8 place-items-center transition-colors duration-fast', i === index ? 'text-fg' : 'text-fg-subtle hover:text-fg')}
              >
                <Draw icon={icons[s]} style={i === index ? 'solid' : 'outline'} size={16} />
              </button>
            ))}
          </div>
        </div>
        <Slider id="specimen-stroke" label="Traço" value={stroke} onChange={take(setStroke)} min={STROKE_RANGE.min} max={STROKE_RANGE.max} step={STROKE_RANGE.step} format={strokeLabel} />
      </div>
      <figcaption className="sr-only">Um ícone do catálogo desenhado sobre o grid de 24 unidades, com a área viva tracejada e as formas-chave.</figcaption>
    </figure>
  )
}

/* ------------------------------------------------------------- anatomy */

const ANATOMY: Record<string, string> = {
  outline: 'O desenho-mestre, feito à mão no grid. Cada forma tem um papel: contorno, corpo ou recorte.',
  solid: 'Os corpos viram silhueta; os recortes abrem na cor do fundo e o detalhe continua legível.',
  duotone: 'O contorno fica inteiro e os corpos ganham uma tinta mais leve da mesma cor.',
}
const SIZES = [16, 20, 24, 32, 48]

/**
 * Construction, in one composition: a drawing in the three styles, then the
 * same family across interface sizes under one stroke control.
 */
export function Anatomy({ icons, slugs, scaleSlugs }: { icons: IconMap; slugs: string[]; scaleSlugs: string[] }) {
  const options = slugs.filter((s) => icons[s])
  const [slug, setSlug] = useState(options[0] ?? '')
  const [stroke, setStroke] = useState(DEFAULT_STROKE)
  const icon = icons[slug]
  const scale = scaleSlugs.filter((s) => icons[s])
  return (
    <div>
      <TextTabs label="Ícone da comparação" value={slug} onChange={setSlug} options={options.map((s) => ({ value: s, label: icons[s]?.name.pt ?? s }))} />
      <ol className="mt-10 grid gap-x-10 gap-y-12 sm:grid-cols-3">
        {LIVE_STYLES.map((s) => (
          <li key={s.id}>
            <div className="relative aspect-square w-full max-w-[17rem] text-fg">
              <Construction />
              <div key={slug} className="animate-in absolute inset-0">
                <Draw icon={icon} style={s.id} size="100%" />
              </div>
            </div>
            <p className="mt-5 font-medium text-fg">{s.name.pt}</p>
            <p className="mt-1 max-w-[17rem] text-sm text-fg-muted">{ANATOMY[s.id]}</p>
          </li>
        ))}
      </ol>

      <div className="mt-20 grid gap-8 lg:grid-cols-[18rem_1fr] lg:gap-16">
        <div>
          <h3 className="text-md font-medium text-fg">Do 16 ao 48 sem retoque.</h3>
          <p className="mt-2 text-sm text-fg-muted">O traço é um parâmetro, não uma decisão gravada no arquivo. O mesmo controle está na exportação de cada ícone.</p>
          <div className="mt-6">
            <Slider id="scale-stroke" label="Traço" value={stroke} onChange={setStroke} min={STROKE_RANGE.min} max={STROKE_RANGE.max} step={STROKE_RANGE.step} format={strokeLabel} />
          </div>
        </div>
        <div className="min-w-0">
          <table className="w-full border-collapse text-fg sm:min-w-[30rem]">
            <caption className="sr-only">Os mesmos ícones em cinco tamanhos, com o traço escolhido</caption>
            <tbody>
              {SIZES.map((size) => (
                <tr key={size}>
                  <th scope="row" className="inscription w-12 pr-4 text-left align-middle font-normal text-fg-subtle">
                    {size}
                  </th>
                  {scale.map((s, i) => (
                    <td key={s} className={cn('text-center align-middle', i >= 4 && 'hidden sm:table-cell')} style={{ height: size + 24 }}>
                      <span className="inline-grid place-items-center">
                        <Draw icon={icons[s]} style="outline" size={size} strokeWidth={stroke} />
                      </span>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

/* ---------------------------------------------------------- in context */

const NAV = [
  { slug: 'house', label: 'Início' },
  { slug: 'inbox', label: 'Entrada', badge: 12 },
  { slug: 'calendar', label: 'Agenda' },
  { slug: 'chart-bar', label: 'Relatórios' },
  { slug: 'users', label: 'Equipe' },
  { slug: 'settings', label: 'Ajustes' },
]
const ROWS = [
  { slug: 'truck', title: 'Pedido em trânsito', meta: 'Entrega prevista para quinta' },
  { slug: 'credit-card', title: 'Pagamento aprovado', meta: 'Cartão final 0000' },
  { slug: 'message', title: 'Nova mensagem', meta: 'Responder até amanhã' },
  { slug: 'shield', title: 'Acesso verificado', meta: 'Dispositivo novo confirmado' },
]
const TOOLBAR = ['search', 'bell', 'mail', 'bookmark', 'share']

export const CONTEXT_SLUGS = [...NAV.map((n) => n.slug), ...ROWS.map((r) => r.slug), ...TOOLBAR]

/**
 * A fictional app screen built with catalogue icons, to judge them where they
 * live: next to text, in navigation, in a list. All controls are real.
 */
export function InContext({ icons }: { icons: IconMap }) {
  const [style, setStyle] = useState<StyleId>('outline')
  const [stroke, setStroke] = useState(DEFAULT_STROKE)
  const [active, setActive] = useState(1)
  const [accent, setAccent] = useState(false)
  const strokeFor = style === 'solid' ? undefined : stroke

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_18rem] lg:gap-16">
      <div className="order-last overflow-hidden rounded-lg border border-border bg-surface shadow-sm lg:order-none" aria-label="Exemplo de tela de aplicativo" role="group">
        <div className="grid min-h-[22rem] grid-cols-[auto_1fr]">
          <nav aria-label="Navegação do exemplo" className="border-r border-border bg-background-subtle p-2 sm:w-48">
            <ul className="grid gap-px">
              {NAV.map((n, i) => (
                <li key={n.slug}>
                  <button
                    type="button"
                    onClick={() => setActive(i)}
                    aria-current={i === active ? 'page' : undefined}
                    className={cn('flex w-full items-center gap-2.5 rounded-sm px-2.5 py-2 text-sm transition-colors duration-fast', i === active ? 'bg-surface text-fg shadow-sm' : 'text-fg-muted hover:text-fg')}
                  >
                    <span className={cn(i === active && accent && 'text-accent')}>
                      <Draw icon={icons[n.slug]} style={i === active ? style : 'outline'} size={18} strokeWidth={strokeFor} />
                    </span>
                    <span className="hidden sm:inline">{n.label}</span>
                    {n.badge && <span className="inscription ml-auto hidden text-fg-subtle sm:inline">{n.badge}</span>}
                  </button>
                </li>
              ))}
            </ul>
          </nav>
          <div className="min-w-0 p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <p className="truncate font-medium text-fg">{NAV[active]?.label}</p>
              <div className="flex text-fg-muted">
                {TOOLBAR.map((s, i) => (
                  <span key={s} className={cn('size-8 place-items-center', i >= 2 ? 'hidden sm:grid' : 'grid')}>
                    <Draw icon={icons[s]} style={style} size={18} strokeWidth={strokeFor} />
                  </span>
                ))}
              </div>
            </div>
            <ul className="mt-4 divide-y divide-border">
              {ROWS.map((r) => (
                <li key={r.slug} className="flex items-center gap-3 py-3">
                  <span className={cn('shrink-0', accent ? 'text-accent' : 'text-fg')}>
                    <Draw icon={icons[r.slug]} style={style} size={20} strokeWidth={strokeFor} />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm text-fg">{r.title}</span>
                    <span className="block truncate text-xs text-fg-muted">{r.meta}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
      <div className="grid content-start gap-6">
        <div>
          <h2 id="context-title" className="text-xl font-medium text-fg">
            Onde o ícone trabalha
          </h2>
          <p className="mt-2 text-sm text-fg-muted">Ao lado do texto, na navegação, numa lista. A tela é um exemplo; os controles mudam os desenhos dela de verdade.</p>
        </div>
        <TextTabs label="Estilo dos ícones do exemplo" value={style} onChange={setStyle} options={styleOptions} />
        <Slider id="context-stroke" label="Traço" value={stroke} onChange={setStroke} min={STROKE_RANGE.min} max={STROKE_RANGE.max} step={STROKE_RANGE.step} format={strokeLabel} />
        <label className="flex items-center gap-3 text-sm text-fg-muted">
          <input type="checkbox" checked={accent} onChange={(e) => setAccent(e.target.checked)} className="size-4 accent-[var(--color-accent)]" />
          Ícones na cor de destaque
        </label>
        <p className="text-xs text-fg-subtle">Os ícones usam currentColor: mudar a cor do texto muda o ícone.</p>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------- mosaic */

/**
 * The whole library at a glance: one dense field of drawings, a row per
 * category, each row a link into it. Counts come from the catalogue metadata.
 */
export function Mosaic({ icons, byCategory }: { icons: IconMap; byCategory: Record<string, string[]> }) {
  return (
    <ul className="grid gap-x-12 lg:grid-cols-2">
      {CATEGORIES.map((c) => {
        const slugs = byCategory[c.id] ?? []
        return (
          <li key={c.id}>
            <Link to="/categories/$categoryId" params={{ categoryId: c.id }} className="group grid grid-cols-[9.5rem_1fr] items-center gap-4 py-2.5 sm:grid-cols-[11rem_1fr]">
              <span className="min-w-0">
                <span className="block truncate text-sm text-fg group-hover:underline group-hover:decoration-accent group-hover:underline-offset-4">{c.name.pt}</span>
                <span className="inscription text-fg-subtle">{formatNumber(catalogInfo.categories[c.id] ?? 0)}</span>
              </span>
              <span className="flex min-w-0 gap-3 overflow-hidden text-fg-muted transition-colors duration-base group-hover:text-fg [mask-image:linear-gradient(to_right,black_85%,transparent)]">
                {slugs.map((s) => (
                  <Draw key={s} icon={icons[s]} style="outline" size={20} />
                ))}
              </span>
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
