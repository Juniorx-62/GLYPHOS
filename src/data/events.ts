/** Tiny event bus so the data layer can surface problems without importing UI. */
export interface DataEvents {
  error: { message: string; cause?: unknown }
}

type Listener<K extends keyof DataEvents> = (payload: DataEvents[K]) => void

const listeners = new Map<keyof DataEvents, Set<(payload: never) => void>>()

export const dataEvents = {
  on<K extends keyof DataEvents>(event: K, fn: Listener<K>) {
    const set = listeners.get(event) ?? new Set()
    listeners.set(event, set)
    set.add(fn as (payload: never) => void)
    return () => {
      set.delete(fn as (payload: never) => void)
    }
  },
  emit<K extends keyof DataEvents>(event: K, payload: DataEvents[K]) {
    listeners.get(event)?.forEach((fn) => (fn as Listener<K>)(payload))
  },
}
