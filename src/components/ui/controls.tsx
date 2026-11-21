/**
 * Controls drawn by GLYPHOS instead of the browser's: select (listbox),
 * checkbox, switch, colour picker and tooltip. They keep the native
 * semantics (roles, keyboard, labels) and use the brand tokens only.
 * Floating parts go to the top layer (popover API), so they are never
 * clipped by scrolling panels and stay above an open <dialog>.
 */
import {
  Children,
  isValidElement,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ChangeEvent,
  type CSSProperties,
  type ReactElement,
  type ReactNode,
} from 'react'
import { cn } from '~/lib/utils'
import { UiIcon } from '../icons/UiIcon'

/* ------------------------------------------------------------------ */
/* Floating layer                                                      */
/* ------------------------------------------------------------------ */

type Placement = { top: number; left: number; minWidth: number; up: boolean }

function place(anchor: HTMLElement, floating: HTMLElement | null, gap = 6): Placement {
  const r = anchor.getBoundingClientRect()
  const h = floating?.offsetHeight ?? 0
  const w = floating?.offsetWidth ?? r.width
  const below = window.innerHeight - r.bottom
  const up = below < h + gap + 8 && r.top > below
  const top = up ? r.top - h - gap : r.bottom + gap
  const left = Math.max(8, Math.min(r.left, window.innerWidth - Math.max(w, r.width) - 8))
  return { top, left, minWidth: r.width, up }
}

/** Opens `ref` as a manual popover next to `anchor`; closes on outside press, Esc, scroll of the page. */
function useFloating(open: boolean, onClose: () => void) {
  const anchor = useRef<HTMLElement | null>(null)
  const floating = useRef<HTMLDivElement | null>(null)
  const [pos, setPos] = useState<Placement | null>(null)

  useLayoutEffect(() => {
    const el = floating.current
    if (!el) return
    if (open) {
      try {
        if (!el.matches(':popover-open')) el.showPopover()
      } catch {
        /* no popover API: stays in the flow, still positioned fixed */
      }
      if (anchor.current) setPos(place(anchor.current, el))
    } else {
      try {
        if (el.matches(':popover-open')) el.hidePopover()
      } catch {
        /* ignore */
      }
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const reposition = () => anchor.current && setPos(place(anchor.current, floating.current))
    const outside = (e: PointerEvent) => {
      const t = e.target as Node
      if (floating.current?.contains(t) || anchor.current?.contains(t)) return
      onClose()
    }
    window.addEventListener('resize', reposition)
    window.addEventListener('scroll', reposition, true)
    document.addEventListener('pointerdown', outside, true)
    return () => {
      window.removeEventListener('resize', reposition)
      window.removeEventListener('scroll', reposition, true)
      document.removeEventListener('pointerdown', outside, true)
    }
  }, [open, onClose])

  const style: CSSProperties = pos
    ? { position: 'fixed', inset: 'auto', margin: 0, top: pos.top, left: pos.left, minWidth: pos.minWidth }
    : { position: 'fixed', inset: 'auto', margin: 0, visibility: 'hidden' }
  return { anchor, floating, style, up: pos?.up ?? false }
}

const FLOATING = 'glyphos-pop rounded-lg border border-border bg-surface-elevated p-1 text-fg shadow-lg'

/* ------------------------------------------------------------------ */
/* Select                                                              */
/* ------------------------------------------------------------------ */

type Opt = { value: string; label: ReactNode; disabled?: boolean }

function readOptions(children: ReactNode): Opt[] {
  const out: Opt[] = []
  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return
    const el = child as ReactElement<{ value?: string | number; children?: ReactNode; disabled?: boolean }>
    if (el.type === 'option') out.push({ value: String(el.props.value ?? ''), label: el.props.children, disabled: el.props.disabled })
    else if (el.props.children) out.push(...readOptions(el.props.children))
  })
  return out
}

export interface SelectProps {
  id?: string
  value?: string | number
  onChange?: (e: ChangeEvent<HTMLSelectElement>) => void
  children: ReactNode
  className?: string
  disabled?: boolean
  'aria-label'?: string
}

/**
 * Same API as a native <select> with <option> children (onChange receives
 * an event-like object with target.value), drawn as a listbox.
 */
export function Select({ id, value, onChange, children, className, disabled, 'aria-label': ariaLabel }: SelectProps) {
  const auto = useId()
  const btnId = id ?? auto
  const listId = `${btnId}-list`
  const options = readOptions(children)
  const current = options.find((o) => o.value === String(value ?? ''))
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const close = useCallback(() => setOpen(false), [])
  const { anchor, floating, style, up } = useFloating(open, close)
  const typed = useRef({ text: '', at: 0 })

  const choose = (o: Opt | undefined) => {
    if (!o || o.disabled) return
    setOpen(false)
    ;(anchor.current as HTMLButtonElement | null)?.focus()
    if (o.value !== String(value ?? '')) onChange?.({ target: { value: o.value }, currentTarget: { value: o.value } } as unknown as ChangeEvent<HTMLSelectElement>)
  }
  const openAt = () => {
    setActive(Math.max(0, options.findIndex((o) => o.value === String(value ?? ''))))
    setOpen(true)
  }
  const step = (dir: 1 | -1) => {
    let i = active
    for (let n = 0; n < options.length; n++) {
      i = (i + dir + options.length) % options.length
      if (!options[i]?.disabled) break
    }
    setActive(i)
  }

  useEffect(() => {
    if (open) floating.current?.querySelector<HTMLElement>(`[data-option="${active}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [open, active, floating])

  return (
    <div className="relative inline-flex">
      <button
        ref={anchor as React.RefObject<HTMLButtonElement>}
        id={btnId}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={ariaLabel}
        aria-activedescendant={open ? `${listId}-${active}` : undefined}
        disabled={disabled}
        onClick={() => (open ? setOpen(false) : openAt())}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault()
            if (!open) openAt()
            else step(e.key === 'ArrowDown' ? 1 : -1)
          } else if (e.key === 'Home' && open) {
            e.preventDefault()
            setActive(0)
          } else if (e.key === 'End' && open) {
            e.preventDefault()
            setActive(options.length - 1)
          } else if ((e.key === 'Enter' || e.key === ' ') && open) {
            e.preventDefault()
            choose(options[active])
          } else if (e.key === 'Escape' && open) {
            e.preventDefault()
            e.stopPropagation()
            setOpen(false)
          } else if (e.key === 'Tab') {
            setOpen(false)
          } else if (e.key.length === 1 && !e.metaKey && !e.ctrlKey) {
            const now = Date.now()
            typed.current.text = (now - typed.current.at > 600 ? '' : typed.current.text) + e.key.toLowerCase()
            typed.current.at = now
            const i = options.findIndex((o) => String(typeof o.label === 'string' ? o.label : o.value).toLowerCase().startsWith(typed.current.text))
            if (i >= 0) open ? setActive(i) : choose(options[i])
          }
        }}
        className={cn(
          'group inline-flex h-control-md w-full items-center justify-between gap-2 rounded-md border border-border bg-surface pr-2 pl-3 text-left text-sm text-fg transition-colors duration-fast hover:border-border-strong disabled:opacity-50 aria-expanded:border-border-strong',
          className,
        )}
      >
        <span className="truncate">{current?.label ?? ''}</span>
        <UiIcon name="chevron-down" size={14} className="text-fg-subtle transition-transform duration-base ease-out group-aria-expanded:rotate-180" />
      </button>
      <div ref={floating} popover="manual" style={style} data-up={up || undefined} className={cn(FLOATING, 'max-h-72 overflow-auto')}>
        <ul id={listId} role="listbox" aria-labelledby={btnId} className="grid gap-px">
          {options.map((o, i) => {
            const selected = o.value === String(value ?? '')
            return (
              <li
                key={o.value}
                id={`${listId}-${i}`}
                data-option={i}
                role="option"
                aria-selected={selected}
                aria-disabled={o.disabled || undefined}
                onPointerMove={() => !o.disabled && setActive(i)}
                onClick={() => choose(o)}
                className={cn(
                  'flex cursor-pointer items-center justify-between gap-3 rounded-md px-2.5 py-1.5 text-sm whitespace-nowrap',
                  i === active && 'bg-muted',
                  o.disabled && 'cursor-default opacity-40',
                )}
              >
                <span>{o.label}</span>
                <UiIcon name="check" size={14} className={cn('glyphos-check-mark', selected ? 'opacity-100' : 'opacity-0')} />
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Checkbox and switch                                                 */
/* ------------------------------------------------------------------ */

interface CheckProps {
  checked: boolean
  onChange: (checked: boolean) => void
  children?: ReactNode
  disabled?: boolean
  className?: string
  'aria-label'?: string
}

/** A real checkbox input (form semantics, Space toggles) under a drawn box. */
export function Checkbox({ checked, onChange, children, disabled, className, 'aria-label': ariaLabel }: CheckProps) {
  return (
    <label className={cn('group inline-flex cursor-pointer items-start gap-2 text-sm text-fg has-disabled:cursor-default has-disabled:text-fg-subtle', className)}>
      <span className="relative mt-0.5 inline-grid size-4 shrink-0 place-items-center">
        <input type="checkbox" className="peer absolute inset-0 m-0 cursor-[inherit] opacity-0" checked={checked} disabled={disabled} aria-label={ariaLabel} onChange={(e) => onChange(e.target.checked)} />
        <span
          aria-hidden
          className="grid size-4 place-items-center rounded-xs border border-border-strong bg-surface text-primary-fg transition-[background-color,border-color] duration-fast group-hover:border-fg-muted peer-checked:border-primary peer-checked:bg-primary peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring peer-disabled:opacity-50"
        >
          <svg viewBox="0 0 16 16" className="glyphos-tick size-3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3.5 8.5 6.5 11.5 12.5 4.5" pathLength={1} />
          </svg>
        </span>
      </span>
      {children && <span className="min-w-0">{children}</span>}
    </label>
  )
}

/** On/off setting that applies at once (role=switch). */
export function Switch({ checked, onChange, children, disabled, className, 'aria-label': ariaLabel }: CheckProps) {
  return (
    <label className={cn('group inline-flex cursor-pointer items-center gap-2.5 text-sm text-fg has-disabled:cursor-default', className)}>
      <span className="relative inline-flex h-5 w-8 shrink-0">
        <input
          type="checkbox"
          role="switch"
          className="peer absolute inset-0 m-0 cursor-[inherit] opacity-0"
          checked={checked}
          disabled={disabled}
          aria-label={ariaLabel}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span
          aria-hidden
          className="glyphos-switch pointer-events-none h-5 w-8 rounded-full bg-border-strong/70 transition-colors duration-base peer-checked:bg-primary peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring peer-disabled:opacity-50"
        />
      </span>
      {children && <span className="min-w-0">{children}</span>}
    </label>
  )
}

/* ------------------------------------------------------------------ */
/* Colour picker                                                       */
/* ------------------------------------------------------------------ */

type Hsv = { h: number; s: number; v: number }

function hexToHsv(hex: string): Hsv {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim())
  const n = m ? parseInt(m[1]!, 16) : 0x151514
  const r = ((n >> 16) & 255) / 255
  const g = ((n >> 8) & 255) / 255
  const b = (n & 255) / 255
  const max = Math.max(r, g, b)
  const d = max - Math.min(r, g, b)
  let h = 0
  if (d) h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4
  return { h: (h * 60 + 360) % 360, s: max ? d / max : 0, v: max }
}

function hsvToHex({ h, s, v }: Hsv): string {
  const f = (k: number) => {
    const x = (k + h / 60) % 6
    return v - v * s * Math.max(0, Math.min(x, 4 - x, 1))
  }
  return '#' + [f(5), f(3), f(1)].map((c) => Math.round(c * 255).toString(16).padStart(2, '0')).join('').toUpperCase()
}

/** Pointer drag on an area, reporting 0..1 coordinates. Arrow keys also move. */
function useDrag(onMove: (x: number, y: number) => void) {
  return (e: React.PointerEvent<HTMLElement>) => {
    const el = e.currentTarget
    const r = el.getBoundingClientRect()
    const at = (ev: PointerEvent | React.PointerEvent) => onMove(Math.min(1, Math.max(0, (ev.clientX - r.left) / r.width)), Math.min(1, Math.max(0, (ev.clientY - r.top) / r.height)))
    el.setPointerCapture(e.pointerId)
    at(e)
    const move = (ev: PointerEvent) => at(ev)
    const up = () => {
      el.removeEventListener('pointermove', move)
      el.removeEventListener('pointerup', up)
    }
    el.addEventListener('pointermove', move)
    el.addEventListener('pointerup', up)
  }
}

/** Saturation/value square, hue strip and hex field. */
export function ColorPicker({ value, onChange }: { value: string; onChange: (hex: string) => void }) {
  const [hsv, setHsv] = useState(() => hexToHsv(value))
  const [text, setText] = useState(value.toUpperCase())
  const last = useRef(value.toUpperCase())
  useEffect(() => {
    if (value.toUpperCase() !== last.current) {
      last.current = value.toUpperCase()
      setHsv(hexToHsv(value))
      setText(value.toUpperCase())
    }
  }, [value])
  const set = (next: Hsv) => {
    setHsv(next)
    const hex = hsvToHex(next)
    last.current = hex
    setText(hex)
    onChange(hex)
  }
  const area = useDrag((x, y) => set({ ...hsv, s: x, v: 1 - y }))
  const hue = useDrag((x) => set({ ...hsv, h: x * 359.9 }))
  const eyedropper = typeof window !== 'undefined' && 'EyeDropper' in window

  return (
    <div className="grid w-56 gap-2.5 p-1.5">
      <div
        role="slider"
        tabIndex={0}
        aria-label="Saturação e brilho"
        aria-valuetext={`saturação ${Math.round(hsv.s * 100)}%, brilho ${Math.round(hsv.v * 100)}%`}
        onPointerDown={area}
        onKeyDown={(e) => {
          const d = e.shiftKey ? 0.1 : 0.02
          const k = { ArrowRight: [d, 0], ArrowLeft: [-d, 0], ArrowUp: [0, d], ArrowDown: [0, -d] }[e.key]
          if (!k) return
          e.preventDefault()
          set({ ...hsv, s: Math.min(1, Math.max(0, hsv.s + k[0]!)), v: Math.min(1, Math.max(0, hsv.v + k[1]!)) })
        }}
        className="relative h-36 cursor-crosshair touch-none rounded-md"
        style={{ background: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, hsl(${hsv.h} 100% 50%))` }}
      >
        <span
          className="pointer-events-none absolute size-3.5 -translate-1/2 rounded-full border-2 border-white shadow-[0_0_0_1px_rgb(0_0_0/0.35)]"
          style={{ left: `${hsv.s * 100}%`, top: `${(1 - hsv.v) * 100}%`, background: hsvToHex(hsv) }}
        />
      </div>
      <div
        role="slider"
        tabIndex={0}
        aria-label="Matiz"
        aria-valuemin={0}
        aria-valuemax={360}
        aria-valuenow={Math.round(hsv.h)}
        onPointerDown={hue}
        onKeyDown={(e) => {
          const d = e.key === 'ArrowRight' || e.key === 'ArrowUp' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowDown' ? -1 : 0
          if (!d) return
          e.preventDefault()
          set({ ...hsv, h: (hsv.h + d * (e.shiftKey ? 15 : 3) + 360) % 360 })
        }}
        className="relative h-3 cursor-pointer touch-none rounded-full"
        style={{ background: 'linear-gradient(to right, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)' }}
      >
        <span className="pointer-events-none absolute top-1/2 size-3.5 -translate-1/2 rounded-full border-2 border-white shadow-[0_0_0_1px_rgb(0_0_0/0.35)]" style={{ left: `${(hsv.h / 360) * 100}%`, background: `hsl(${hsv.h} 100% 50%)` }} />
      </div>
      <div className="flex items-center gap-1.5">
        <span className="size-7 shrink-0 rounded-sm border border-border" style={{ background: hsvToHex(hsv) }} aria-hidden />
        <input
          aria-label="Cor em hexadecimal"
          value={text}
          spellCheck={false}
          onChange={(e) => {
            const t = e.target.value.toUpperCase()
            setText(t)
            const hex = t.startsWith('#') ? t : `#${t}`
            if (/^#[0-9A-F]{6}$/.test(hex)) {
              last.current = hex
              setHsv(hexToHsv(hex))
              onChange(hex)
            }
          }}
          className="inscription h-control-sm min-w-0 flex-1 rounded-md border border-border bg-surface px-2 text-fg uppercase"
        />
        {eyedropper && (
          <button
            type="button"
            aria-label="Pegar uma cor da tela"
            data-tip="Pegar uma cor da tela"
            className="grid size-control-sm shrink-0 place-items-center rounded-md text-fg-muted hover:bg-muted hover:text-fg"
            onClick={async () => {
              try {
                const res = await new (window as unknown as { EyeDropper: new () => { open: () => Promise<{ sRGBHex: string }> } }).EyeDropper().open()
                const hex = res.sRGBHex.toUpperCase()
                setHsv(hexToHsv(hex))
                setText(hex)
                last.current = hex
                onChange(hex)
              } catch {
                /* cancelled */
              }
            }}
          >
            <UiIcon name="crosshair" size={15} />
          </button>
        )}
      </div>
    </div>
  )
}

/** A swatch-like trigger that opens the colour picker in a popover. */
export function ColorButton({ value, onChange, label, className, children }: { value: string; onChange: (hex: string) => void; label: string; className?: string; children?: ReactNode }) {
  const [open, setOpen] = useState(false)
  const close = useCallback(() => setOpen(false), [])
  const { anchor, floating, style } = useFloating(open, close)
  return (
    <>
      <button
        ref={anchor as React.RefObject<HTMLButtonElement>}
        type="button"
        aria-label={label}
        aria-haspopup="dialog"
        aria-expanded={open}
        data-tip={label}
        onClick={() => setOpen((o) => !o)}
        className={className}
      >
        {children}
      </button>
      <div
        ref={floating}
        popover="manual"
        role="dialog"
        aria-label={label}
        style={style}
        className={cn(FLOATING, 'overflow-visible')}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            e.preventDefault()
            e.stopPropagation()
            setOpen(false)
            ;(anchor.current as HTMLButtonElement | null)?.focus()
          }
        }}
      >
        {open && <ColorPicker value={value} onChange={onChange} />}
      </div>
    </>
  )
}

/* ------------------------------------------------------------------ */
/* Tooltip layer                                                       */
/* ------------------------------------------------------------------ */

/**
 * One tooltip for the whole app. Any element with `data-tip` (or a native
 * `title`, which is moved aside while hovered so the browser's own tooltip
 * does not appear) shows a styled tooltip after a short delay, on hover and
 * on keyboard focus.
 */
export function TooltipLayer() {
  const ref = useRef<HTMLDivElement>(null)
  const [tip, setTip] = useState<{ text: string; x: number; y: number; below: boolean } | null>(null)

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined
    let target: HTMLElement | null = null
    let warm = 0

    const restore = () => {
      if (target?.dataset.glyphosTitle !== undefined) {
        target.setAttribute('title', target.dataset.glyphosTitle)
        delete target.dataset.glyphosTitle
      }
    }
    const hide = () => {
      clearTimeout(timer)
      restore()
      if (target) warm = Date.now()
      target = null
      setTip(null)
    }
    const show = (el: HTMLElement) => {
      if (el === target) return
      hide()
      const title = el.getAttribute('title')
      const text = el.dataset.tip ?? title
      if (!text) return
      target = el
      if (title !== null) {
        el.dataset.glyphosTitle = title
        el.removeAttribute('title')
      }
      const delay = Date.now() - warm < 400 ? 0 : 450
      timer = setTimeout(() => {
        if (target !== el || !el.isConnected) return
        const r = el.getBoundingClientRect()
        const below = r.top < 48
        setTip({ text, x: r.left + r.width / 2, y: below ? r.bottom + 8 : r.top - 8, below })
      }, delay)
    }
    const find = (n: EventTarget | null) => (n instanceof Element ? n.closest<HTMLElement>('[data-tip],[title]') : null)

    const over = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return
      const el = find(e.target)
      if (el) show(el)
      else if (target) hide()
    }
    const focus = (e: FocusEvent) => {
      const el = find(e.target)
      if (el && (e.target as HTMLElement).matches(':focus-visible')) show(el)
    }
    window.addEventListener('pointerover', over, true)
    window.addEventListener('focusin', focus, true)
    window.addEventListener('focusout', hide, true)
    window.addEventListener('pointerdown', hide, true)
    window.addEventListener('scroll', hide, true)
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && hide()
    window.addEventListener('keydown', esc, true)
    return () => {
      hide()
      window.removeEventListener('pointerover', over, true)
      window.removeEventListener('focusin', focus, true)
      window.removeEventListener('focusout', hide, true)
      window.removeEventListener('pointerdown', hide, true)
      window.removeEventListener('scroll', hide, true)
      window.removeEventListener('keydown', esc, true)
    }
  }, [])

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    try {
      if (tip && !el.matches(':popover-open')) el.showPopover()
      if (!tip && el.matches(':popover-open')) el.hidePopover()
    } catch {
      /* no popover API */
    }
    if (tip) {
      const w = el.offsetWidth
      el.style.left = `${Math.max(8, Math.min(tip.x - w / 2, window.innerWidth - w - 8))}px`
    }
  }, [tip])

  return (
    <div
      ref={ref}
      popover="manual"
      role="tooltip"
      data-below={tip?.below || undefined}
      className="glyphos-tip pointer-events-none max-w-64 rounded-md bg-fg px-2 py-1 text-xs leading-snug font-medium text-background shadow-md"
      style={{ position: 'fixed', inset: 'auto', margin: 0, top: tip?.y ?? 0, translate: tip?.below ? '0 0' : '0 -100%' }}
    >
      {tip?.text}
    </div>
  )
}
