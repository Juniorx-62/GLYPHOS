import { DEFAULT_STROKE, STROKE_RANGE, STYLE_IDS } from '~/catalog/styles'
import type { StyleId } from '~/catalog/types'
import { createPersistentStore, useStore, useStoreSelector } from '../store'
import type { IconAppearance, Settings, ThemePreference } from '../types'
import { isRecord } from '../validate'

/** Copied to localStorage too, where the boot script reads it before React loads. */
export const THEME_STORAGE_KEY = 'glyphos:theme-preference'

export const DEFAULT_APPEARANCE: IconAppearance = { style: 'outline', strokeWidth: DEFAULT_STROKE, color: 'currentColor', size: 24, opacity: 1 }

export const DEFAULT_SETTINGS: Settings = {
  theme: 'system',
  appearance: DEFAULT_APPEARANCE,
  previewBackground: 'surface',
  showNames: true,
  gridDensity: 'comfortable',
}

const COLOR = /^(currentColor|#[0-9a-fA-F]{6})$/
const BACKGROUND = /^(surface|transparent|#[0-9a-fA-F]{6})$/
const clamp = (n: unknown, min: number, max: number, fallback: number) =>
  typeof n === 'number' && Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback

export function cleanSettings(data: unknown): Settings | undefined {
  if (!isRecord(data)) return undefined
  const a = isRecord(data.appearance) ? data.appearance : {}
  return {
    theme: data.theme === 'light' || data.theme === 'dark' ? data.theme : 'system',
    appearance: {
      style: STYLE_IDS.includes(a.style as StyleId) ? (a.style as StyleId) : 'outline',
      strokeWidth: clamp(a.strokeWidth, STROKE_RANGE.min, STROKE_RANGE.max, DEFAULT_STROKE),
      color: typeof a.color === 'string' && COLOR.test(a.color) ? a.color : 'currentColor',
      size: Math.round(clamp(a.size, 12, 1024, 24)),
      opacity: clamp(a.opacity, 0.1, 1, 1),
    },
    previewBackground: typeof data.previewBackground === 'string' && BACKGROUND.test(data.previewBackground) ? data.previewBackground : 'surface',
    showNames: data.showNames !== false,
    gridDensity: data.gridDensity === 'compact' ? 'compact' : 'comfortable',
  }
}

export const settingsStore = createPersistentStore<Settings>({
  key: 'settings',
  version: 1,
  initial: () => DEFAULT_SETTINGS,
  migrate: (data) => cleanSettings(data),
})

export function updateSettings(patch: Partial<Omit<Settings, 'appearance'>> & { appearance?: Partial<IconAppearance> }) {
  settingsStore.set((s) => cleanSettings({ ...s, ...patch, appearance: { ...s.appearance, ...patch.appearance } }) ?? s)
  if (patch.theme) {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, patch.theme)
    } catch {
      /* storage blocked: the theme still applies to this page */
    }
  }
}

export function resetAppearance() {
  settingsStore.set((s) => ({ ...s, appearance: DEFAULT_APPEARANCE }))
}

export const useSettings = () => useStoreSelector(settingsStore, (s) => s)
export const useAppearance = () => useStoreSelector(settingsStore, (s) => s.appearance)

/** Theme preference without waiting for IndexedDB: localStorage until the store loads. */
export function useThemePreference(): ThemePreference {
  const snap = useStore(settingsStore)
  if (snap.status === 'ready') return snap.data.theme
  if (typeof localStorage === 'undefined') return 'system'
  try {
    const v = localStorage.getItem(THEME_STORAGE_KEY)
    return v === 'light' || v === 'dark' ? v : 'system'
  } catch {
    return 'system'
  }
}
