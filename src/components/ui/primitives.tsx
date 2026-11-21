/**
 * Base controls of the interface. Native elements first (button, input,
 * select, range), styled with the brand tokens only.
 */
import { forwardRef, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from 'react'
import { cn } from '~/lib/utils'
import { UiIcon } from '../icons/UiIcon'
import type { UiIconName } from '../icons/ui-icon-names'

type Variant = 'primary' | 'secondary' | 'ghost' | 'outline'
type Size = 'sm' | 'md' | 'lg'

const VARIANT: Record<Variant, string> = {
  primary: 'bg-primary text-primary-fg hover:bg-primary-hover',
  secondary: 'bg-muted text-fg hover:bg-border',
  outline: 'border border-border bg-surface text-fg hover:bg-surface-elevated hover:border-border-strong',
  ghost: 'text-fg-muted hover:bg-muted hover:text-fg',
}
const SIZE: Record<Size, string> = {
  sm: 'h-control-sm gap-1.5 px-2.5 text-xs',
  md: 'h-control-md gap-2 px-3.5 text-sm',
  lg: 'h-control-lg gap-2 px-5 text-sm',
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  icon?: UiIconName
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button({ variant = 'outline', size = 'md', icon, className, children, type = 'button', ...rest }, ref) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-md font-medium whitespace-nowrap transition-colors duration-fast select-none disabled:pointer-events-none disabled:opacity-50',
        VARIANT[variant],
        SIZE[size],
        className,
      )}
      {...rest}
    >
      {icon && <UiIcon name={icon} size={size === 'sm' ? 14 : 16} />}
      {children}
    </button>
  )
})

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: UiIconName
  label: string
  size?: Size
  variant?: Variant
  pressed?: boolean
  iconStyle?: 'outline' | 'solid'
}

/** A button with only an icon: always has an accessible name (and a native tooltip). */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { icon, label, size = 'md', variant = 'ghost', pressed, iconStyle = 'outline', className, type = 'button', ...rest },
  ref,
) {
  const dim = size === 'sm' ? 'size-control-sm' : size === 'lg' ? 'size-control-lg' : 'size-control-md'
  return (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      title={label}
      aria-pressed={pressed}
      className={cn('inline-grid shrink-0 place-items-center rounded-md transition-colors duration-fast disabled:opacity-50', VARIANT[variant], dim, className)}
      {...rest}
    >
      <UiIcon name={icon} size={size === 'sm' ? 15 : 18} style={iconStyle} />
    </button>
  )
})

export function Kbd({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <kbd className={cn('inline-flex h-5 min-w-5 items-center justify-center rounded-xs border border-border bg-surface px-1 font-sans text-xs leading-none text-fg-subtle', className)}>
      {children}
    </kbd>
  )
}

/** A choice between a few options (role=radiogroup, arrow keys move). */
export function Segmented<T extends string>({ value, onChange, options, label, size = 'md', className }: {
  value: T
  onChange: (v: T) => void
  options: Array<{ value: T; label: string; icon?: UiIconName; disabled?: boolean }>
  label: string
  size?: 'sm' | 'md'
  className?: string
}) {
  const enabled = options.filter((o) => !o.disabled)
  const move = (dir: 1 | -1) => {
    const i = enabled.findIndex((o) => o.value === value)
    const next = enabled[(i + dir + enabled.length) % enabled.length]
    if (next) onChange(next.value)
  }
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn('inline-flex rounded-md bg-muted p-0.5', className)}
      onKeyDown={(e) => {
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
          e.preventDefault()
          move(1)
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
          e.preventDefault()
          move(-1)
        }
      }}
    >
      {options.map((o) => {
        const active = o.value === value
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            tabIndex={active ? 0 : -1}
            disabled={o.disabled}
            onClick={() => onChange(o.value)}
            title={o.icon ? o.label : undefined}
            aria-label={o.icon ? o.label : undefined}
            className={cn(
              'inline-flex flex-1 items-center justify-center gap-1.5 rounded-sm font-medium whitespace-nowrap transition-colors duration-fast disabled:opacity-40',
              size === 'sm' ? 'h-6 px-2 text-xs' : 'h-8 px-3 text-xs',
              active ? 'bg-surface text-fg shadow-xs' : 'text-fg-muted hover:text-fg',
            )}
          >
            {o.icon ? <UiIcon name={o.icon} size={15} /> : o.label}
          </button>
        )
      })}
    </div>
  )
}

/** A labelled range input with its value shown. */
export function Slider({ label, value, onChange, min, max, step, format = String, id }: {
  label: string
  value: number
  onChange: (v: number) => void
  min: number
  max: number
  step: number
  format?: (v: number) => string
  id: string
}) {
  const pct = ((value - min) / (max - min)) * 100
  return (
    <div className="grid gap-1.5">
      <div className="flex items-center justify-between text-xs">
        <label htmlFor={id} className="font-medium text-fg-muted">
          {label}
        </label>
        <output htmlFor={id} className="inscription text-fg">
          {format(value)}
        </output>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="glyphos-range h-5 w-full cursor-pointer appearance-none bg-transparent"
        style={{ ['--p' as string]: `${pct}%` }}
      />
    </div>
  )
}

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function Select({ className, children, ...rest }, ref) {
  return (
    <div className="relative inline-flex">
      <select
        ref={ref}
        className={cn('h-control-md w-full appearance-none rounded-md border border-border bg-surface pr-8 pl-3 text-sm text-fg hover:border-border-strong', className)}
        {...rest}
      >
        {children}
      </select>
      <UiIcon name="chevron-down" size={14} className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-fg-subtle" />
    </div>
  )
})

export const TextInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function TextInput({ className, ...rest }, ref) {
  return (
    <input
      ref={ref}
      className={cn('h-control-md w-full rounded-md border border-border-strong/40 bg-surface px-3 text-sm text-fg placeholder:text-fg-subtle hover:border-border-strong', className)}
      {...rest}
    />
  )
})

export function Chip({ children, onRemove, removeLabel, active, onClick, className }: {
  children: ReactNode
  onRemove?: () => void
  removeLabel?: string
  active?: boolean
  onClick?: () => void
  className?: string
}) {
  const base = cn(
    'inline-flex h-7 items-center gap-1 rounded-full border text-xs font-medium transition-colors duration-fast',
    active ? 'border-fg bg-fg text-background' : 'border-border bg-surface text-fg-muted hover:border-border-strong hover:text-fg',
    onRemove ? 'pr-1 pl-2.5' : 'px-2.5',
    className,
  )
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={base} aria-pressed={active}>
        {children}
      </button>
    )
  }
  return (
    <span className={base}>
      {children}
      {onRemove && (
        <button type="button" onClick={onRemove} aria-label={removeLabel} className="grid size-5 place-items-center rounded-full hover:bg-muted">
          <UiIcon name="x" size={12} />
        </button>
      )}
    </span>
  )
}

export function SectionHeader({ title, description, action, as: Tag = 'h2', id }: {
  title: string
  description?: string
  action?: ReactNode
  as?: 'h2' | 'h3'
  id?: string
}) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <div className="min-w-0">
        <Tag id={id} className={cn('font-semibold text-fg', Tag === 'h2' ? 'text-lg' : 'text-md')}>
          {title}
        </Tag>
        {description && <p className="mt-1 text-sm text-fg-muted">{description}</p>}
      </div>
      {action}
    </div>
  )
}

export function EmptyState({ icon = 'search', title, children }: { icon?: UiIconName; title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border px-6 py-14 text-center">
      <div className="grid size-12 place-items-center rounded-full bg-muted text-fg-muted">
        <UiIcon name={icon} size={22} />
      </div>
      <p className="text-base font-medium text-fg">{title}</p>
      {children && <div className="max-w-md text-sm text-fg-muted">{children}</div>}
    </div>
  )
}

/** Page kicker: the rubric square and a technical label above a page title. */
export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p className={cn('inscription flex items-center gap-2 text-fg-muted', className)}>
      <span aria-hidden className="size-2 shrink-0 bg-accent" />
      {children}
    </p>
  )
}
