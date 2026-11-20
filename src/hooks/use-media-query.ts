import { useSyncExternalStore } from 'react'

/** Matches a media query; false on the server and during hydration. */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (cb) => {
      const mql = matchMedia(query)
      mql.addEventListener('change', cb)
      return () => mql.removeEventListener('change', cb)
    },
    () => matchMedia(query).matches,
    () => false,
  )
}

/** True after hydration: for values only the browser knows (platform, storage). */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  )
}

/** "⌘" on Apple platforms, "Ctrl" elsewhere (after hydration). */
export function useModKey(): string {
  const hydrated = useHydrated()
  if (!hydrated) return 'Ctrl'
  return /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent) ? '⌘' : 'Ctrl'
}
