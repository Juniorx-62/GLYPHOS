/**
 * Demonstrations of the drawing system on the home page: every piece is drawn
 * live from the catalogue (Glyph), and every control changes the real render.
 * Nothing here is a picture of the product; it is the product.
 */
import { Link } from '@tanstack/react-router'
import { useEffect, useState, type ReactNode } from 'react'
import { CATEGORIES, DEFAULT_STROKE, STROKE_RANGE, STYLES, catalogInfo } from '~/catalog'
import type { ShardIcon, StyleId } from '~/catalog/types'
import { Glyph } from '~/components/icons/Glyph'
import { Segmented, Slider } from '~/components/ui/primitives'
import { cn, formatNumber } from '~/lib/utils'

export type IconMap = Record<string, ShardIcon>

const LIVE_STYLES = STYLES.filter((s) => (catalogInfo.styles[s.id] ?? 0) > 0)
const styleOptions = LIVE_STYLES.map((s) => ({ value: s.id, label: s.name.pt }))
const strokeLabel = (v: number) => v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })

function styleFor(icon: ShardIcon, style: StyleId): StyleId {
  return icon.styles.includes(style) ? style : 'outline'
}

function Draw({ icon, style, size, strokeWidth, className }: { icon?: ShardIcon; style: StyleId; size: number | string; strokeWidth?: number; className?: string }) {
  if (!icon) return <span className="block" style={{ width: size, height: size }} />
  const s = styleFor(icon, style)
  return <Glyph nodes={icon.nodes} override={icon.overrides?.[s]} style={s} size={size} strokeWidth={strokeWidth} className={className} />
}

/** Section opener shared by the editorial blocks: number, title, text. */
export function Chapter({ index, title, children, id, aside }: { index: string; title: string; children?: ReactNode; id: string; aside?: ReactNode }) {
  return (
    <header className="mb-8 grid gap-4 border-t border-fg pt-5 md:grid-cols-[8rem_1fr_auto] md:items-start">
      <span className="inscription text-accent-emphasis">{index}</span>
      <div className="max-w-2xl">
        <h2 id={id} className="text-xl font-semibold tracking-tight text-fg sm:text-2xl">
          {title}
        </h2>
        {children && <p className="mt-2 text-base text-fg-muted">{children}</p>}
      </div>
      {aside}
    </header>
  )
}

/* ------------------------------------------------------------ specimen */

/** The 24-unit construction grid, keylines and live area, in icon units. */
function Construction() {
  const lines = Array.from({ length: 23 }, (_, i) => i + 1)
  return (
    <svg viewBox="0 0 24 24" className="absolute inset-0 size-full" aria-hidden>
      {lines.map((i) => (
        <path key={i} d={`M${i} 0V24M0 ${i}H24`} style={{ stroke: 'var(--color-canvas-grid)' }} strokeWidth="0.05" />
      ))}
      <path d="M0 0L24 24M24 0L0 24M12 0V24M0 12H24" style={{ stroke: 'var(--color-canvas-grid)' }} strokeWidth="0.05" />
      <g fill="none" style={{ stroke: 'var(--color-border-strong)' }} strokeWidth="0.05" opacity="0.7">
        <circle cx="12" cy="12" r="9" />
        <rect x="3" y="3" width="18" height="18" rx="3" />
      </g>
      <rect x="2" y="2" width="20" height="20" fill="none" style={{ stroke: 'var(--color-accent)' }} strokeWidth="0.06" strokeDasharray="0.35 0.25" />
    </svg>
  )
}

export const SPECIMEN_SLUGS = ['camera', 'bell', 'map-pin', 'calendar', 'lock', 'cloud', 'rocket', 'coffee']

/**
 * Hero specimen: one icon at plate size over its construction grid. Cycles
 * through a few drawings until the visitor takes a control.
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

  const take = <T,>(fn: (v: T) => void) => (v: T) => {
    setAuto(false)
    fn(v)
  }
  const slug = slugs[index] ?? slugs[0]
  const icon = slug ? icons[slug] : undefined

  return (
    <figure className="relative rounded-2xl border border-border bg-surface shadow-xs">
      <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
        <span className="inscription text-fg-subtle">prancha · 24 × 24</span>
        <span className="inscription text-fg">{slug}</span>
      </div>
      <div className="relative mx-auto aspect-square w-full max-w-[22rem] p-6 text-fg">
        <div className="relative size-full">
          <Construction />
          <div key={`${slug}-${style}`} className="animate-in absolute inset-0">
            <Draw icon={icon} style={style} size="100%" strokeWidth={stroke} />
          </div>
        </div>
      </div>
      <div className="grid gap-4 border-t border-border p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Segmented size="sm" label="Estilo da prancha" value={style} onChange={take(setStyle)} options={styleOptions} />
          <div className="flex gap-0.5" role="group" aria-label="Desenho da prancha">
            {slugs.map((s, i) => (
              <button
                key={s}
                type="button"
                aria-label={icons[s]?.name.pt ?? s}
                aria-pressed={i === index}
                onClick={() => take(setIndex)(i)}
                className={cn('grid size-7 place-items-center rounded-md transition-colors duration-fast', i === index ? 'bg-fg text-background' : 'text-fg-muted hover:bg-muted hover:text-fg')}
              >
                <Draw icon={icons[s]} style="outline" size={16} />
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

const ANATOMY: Record<string, { title: string; text: string }> = {
  outline: { title: 'O desenho-mestre', text: 'Feito à mão no grid. Cada forma recebe um papel: contorno, corpo ou recorte.' },
  solid: { title: 'Corpo preenchido', text: 'Os corpos viram silhueta e os recortes abrem na cor do fundo, para o detalhe continuar legível.' },
  duotone: { title: 'Duas camadas', text: 'O contorno fica inteiro; os corpos ganham uma tinta mais leve da mesma cor.' },
}

/** One drawing, three styles, with the rule that derives each one. */
export function Anatomy({ icons, slugs }: { icons: IconMap; slugs: string[] }) {
  const options = slugs.filter((s) => icons[s])
  const [slug, setSlug] = useState(options[0])
  const icon = slug ? icons[slug] : undefined
  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-1" role="group" aria-label="Ícone da comparação">
        {options.map((s) => (
          <button
            key={s}
            type="button"
            aria-pressed={s === slug}
            onClick={() => setSlug(s)}
            className={cn('inline-flex h-8 items-center gap-2 rounded-full border px-3 text-xs transition-colors duration-fast', s === slug ? 'border-fg bg-fg text-background' : 'border-border bg-surface text-fg-muted hover:border-border-strong hover:text-fg')}
          >
            <Draw icon={icons[s]} style="outline" size={14} />
            {icons[s]?.name.pt}
          </button>
        ))}
      </div>
      <ol className="grid overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-3" style={{ gap: 1 }}>
        {LIVE_STYLES.map((s, i) => (
          <li key={s.id} className="flex flex-col bg-surface">
            <div className="relative mx-auto mt-6 aspect-square w-full max-w-[15rem] px-4 text-fg">
              <Construction />
              <div key={slug} className="animate-in absolute inset-[8%]">
                <Draw icon={icon} style={s.id} size="100%" />
              </div>
            </div>
            <div className="mt-auto p-5">
              <p className="flex items-baseline justify-between gap-2">
                <span className="font-medium text-fg">{s.name.pt}</span>
                <span className="inscription text-fg-subtle">{String(i + 1).padStart(2, '0')}</span>
              </p>
              <p className="mt-1 text-sm text-fg-muted">
                <span className="text-fg">{ANATOMY[s.id]?.title}.</span> {ANATOMY[s.id]?.text}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  )
}

/* -------------------------------------------------------------- scale */

const SIZES = [16, 20, 24, 32, 48]

/** The same drawings at the sizes interfaces use, under one stroke control. */
export function ScaleRuler({ icons, slugs }: { icons: IconMap; slugs: string[] }) {
  const [stroke, setStroke] = useState(DEFAULT_STROKE)
  const list = slugs.filter((s) => icons[s])
  return (
    <div className="rounded-2xl border border-border bg-surface">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[34rem] border-collapse text-fg">
          <caption className="sr-only">Os mesmos ícones em cinco tamanhos, com o traço escolhido</caption>
          <thead>
            <tr>
              <th scope="col" className="inscription w-20 px-4 py-3 text-left font-normal text-fg-subtle">
                px
              </th>
              {list.map((s) => (
                <th key={s} scope="col" className="inscription px-2 py-3 font-normal text-fg-subtle">
                  {s}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {SIZES.map((size) => (
              <tr key={size} className="border-t border-border">
                <th scope="row" className="inscription px-4 text-left font-normal text-fg-muted">
                  {size}
                </th>
                {list.map((s) => (
                  <td key={s} className="px-2 py-3 text-center" style={{ height: size + 28 }}>
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
      <div className="grid gap-2 border-t border-border p-4 sm:grid-cols-[1fr_auto] sm:items-end sm:gap-6">
        <Slider id="scale-stroke" label="Traço em unidades do grid" value={stroke} onChange={setStroke} min={STROKE_RANGE.min} max={STROKE_RANGE.max} step={STROKE_RANGE.step} format={strokeLabel} />
        <p className="text-xs text-fg-subtle">O mesmo controle existe na exportação de cada ícone.</p>
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
  { slug: 'credit-card', title: 'Pagamento aprovado', meta: 'Cartão final 0000 · exemplo' },
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
    <div className="grid gap-4 lg:grid-cols-[1fr_16rem]">
      <div className="overflow-hidden rounded-2xl border border-border bg-background-subtle" aria-label="Exemplo de tela de aplicativo" role="group">
        <div className="flex items-center gap-1.5 border-b border-border bg-surface px-4 py-2.5">
          <span className="size-2.5 rounded-full bg-muted" />
          <span className="size-2.5 rounded-full bg-muted" />
          <span className="size-2.5 rounded-full bg-muted" />
          <span className="inscription ml-3 text-fg-subtle">exemplo de aplicação</span>
        </div>
        <div className="grid min-h-[22rem] grid-cols-[auto_1fr]">
          <nav aria-label="Navegação do exemplo" className="border-r border-border bg-surface p-2 sm:w-48">
            <ul className="grid gap-0.5">
              {NAV.map((n, i) => (
                <li key={n.slug}>
                  <button
                    type="button"
                    onClick={() => setActive(i)}
                    aria-current={i === active ? 'page' : undefined}
                    className={cn('flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors duration-fast', i === active ? 'bg-muted text-fg' : 'text-fg-muted hover:bg-muted/60 hover:text-fg')}
                  >
                    <span className={cn(i === active && accent && 'text-accent')}>
                      <Draw icon={icons[n.slug]} style={i === active ? style : 'outline'} size={18} strokeWidth={strokeFor} />
                    </span>
                    <span className="hidden sm:inline">{n.label}</span>
                    {n.badge && <span className="inscription ml-auto hidden rounded-full bg-fg px-1.5 text-background sm:inline">{n.badge}</span>}
                  </button>
                </li>
              ))}
            </ul>
          </nav>
          <div className="min-w-0 p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="truncate font-medium text-fg">{NAV[active]?.label}</p>
              <div className="flex gap-0.5 text-fg-muted">
                {TOOLBAR.map((s) => (
                  <span key={s} className="grid size-8 place-items-center rounded-md hover:bg-muted hover:text-fg">
                    <Draw icon={icons[s]} style={style} size={18} strokeWidth={strokeFor} />
                  </span>
                ))}
              </div>
            </div>
            <ul className="mt-4 grid gap-2">
              {ROWS.map((r) => (
                <li key={r.slug} className="flex items-center gap-3 rounded-lg border border-border bg-surface p-3">
                  <span className={cn('grid size-9 shrink-0 place-items-center rounded-md bg-background-subtle', accent ? 'text-accent' : 'text-fg')}>
                    <Draw icon={icons[r.slug]} style={style} size={20} strokeWidth={strokeFor} />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-fg">{r.title}</span>
                    <span className="block truncate text-xs text-fg-muted">{r.meta}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
      <div className="grid content-start gap-5 rounded-2xl border border-border bg-surface p-4">
        <div className="grid gap-1.5">
          <span className="text-xs font-medium text-fg-muted">Estilo</span>
          <Segmented size="sm" label="Estilo dos ícones do exemplo" value={style} onChange={setStyle} options={styleOptions} />
        </div>
        <Slider id="context-stroke" label="Traço" value={stroke} onChange={setStroke} min={STROKE_RANGE.min} max={STROKE_RANGE.max} step={STROKE_RANGE.step} format={strokeLabel} />
        <label className="flex items-center justify-between gap-3 text-xs font-medium text-fg-muted">
          Ícones na cor de destaque
          <input type="checkbox" checked={accent} onChange={(e) => setAccent(e.target.checked)} className="size-4 accent-[var(--color-accent)]" />
        </label>
        <p className="text-xs text-fg-subtle">Os ícones herdam a cor do texto (currentColor): mudar a cor do componente muda o ícone.</p>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------- mosaic */

/**
 * The whole library at a glance: a band of drawings per category, each one a
 * link into it. Counts come from the generated catalogue metadata.
 */
export function Mosaic({ icons, byCategory }: { icons: IconMap; byCategory: Record<string, string[]> }) {
  return (
    <ul className="grid gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-2 xl:grid-cols-3">
      {CATEGORIES.map((c) => {
        const slugs = byCategory[c.id] ?? []
        return (
          <li key={c.id} className="bg-surface">
            <Link to="/categories/$categoryId" params={{ categoryId: c.id }} className="group flex h-full flex-col gap-3 p-4 transition-colors duration-fast hover:bg-surface-elevated">
              <span className="flex items-baseline justify-between gap-2">
                <span className="text-sm font-medium text-fg">{c.name.pt}</span>
                <span className="inscription text-fg-subtle group-hover:text-accent-emphasis">{formatNumber(catalogInfo.categories[c.id] ?? 0)}</span>
              </span>
              <span className="grid grid-cols-8 gap-x-1 gap-y-2 text-fg-muted transition-colors duration-base group-hover:text-fg">
                {slugs.map((s) => (
                  <span key={s} className="grid place-items-center">
                    <Draw icon={icons[s]} style="outline" size={18} />
                  </span>
                ))}
              </span>
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
