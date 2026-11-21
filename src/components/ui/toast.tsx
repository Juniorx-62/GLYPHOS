/**
 * Toasts: short confirmations ("SVG copiado") and errors. One live region is
 * always mounted, so screen readers announce every message; hovering or
 * focusing a toast pauses it.
 */
import { useEffect, useState, useSyncExternalStore } from 'react'
import { UiIcon } from '../icons/UiIcon'
import { cn } from '~/lib/utils'

export interface ToastItem {
  id: number
  message: string
  tone: 'success' | 'error' | 'info'
}

let items: ToastItem[] = []
let seq = 0
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())

export function toast(message: string, tone: ToastItem['tone'] = 'success') {
  items = [...items.slice(-3), { id: ++seq, message, tone }]
  emit()
}

function dismiss(id: number) {
  items = items.filter((t) => t.id !== id)
  emit()
}

const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => listeners.delete(l)
}

function Toast({ item }: { item: ToastItem }) {
  const [paused, setPaused] = useState(false)
  useEffect(() => {
    if (paused) return
    const t = setTimeout(() => dismiss(item.id), item.tone === 'error' ? 6000 : 2600)
    return () => clearTimeout(t)
  }, [paused, item])
  return (
    <div
      role={item.tone === 'error' ? 'alert' : 'status'}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      className="animate-in pointer-events-auto flex items-center gap-2.5 rounded-lg border border-border bg-surface-overlay py-2 pr-2 pl-3 text-sm text-fg shadow-md"
    >
      <UiIcon
        name={item.tone === 'error' ? 'triangle-alert' : item.tone === 'info' ? 'info' : 'circle-check'}
        size={16}
        className={cn(item.tone === 'error' ? 'text-error' : item.tone === 'info' ? 'text-info' : 'text-success')}
      />
      <span className="min-w-0 flex-1">{item.message}</span>
      <button type="button" onClick={() => dismiss(item.id)} aria-label="Fechar aviso" className="grid size-7 place-items-center rounded-md text-fg-subtle hover:bg-muted hover:text-fg">
        <UiIcon name="x" size={14} />
      </button>
    </div>
  )
}

export function Toaster() {
  const list = useSyncExternalStore(subscribe, () => items, () => items)
  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-4 bottom-4 z-50 flex flex-col items-center gap-2 sm:inset-x-auto sm:right-4 sm:items-end">
      {list.map((t) => (
        <Toast key={t.id} item={t} />
      ))}
    </div>
  )
}
