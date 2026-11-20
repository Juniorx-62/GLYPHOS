/** Shapes of the visitor's own data, kept in the browser (see docs/ARCHITECTURE.md#persistência-local). */
import type { StyleId } from '~/catalog/types'

export interface SlugEntry {
  slug: string
  /** ISO timestamp. */
  at: string
}

export interface PersonalCollection {
  id: string
  name: string
  icons: string[]
  createdAt: string
  updatedAt: string
}

export type ThemePreference = 'system' | 'light' | 'dark'

/** How icons are drawn in the grid and exported: the live customisation. */
export interface IconAppearance {
  style: StyleId
  /** Stroke width on the 24-unit grid. */
  strokeWidth: number
  /** CSS colour (#hex) or 'currentColor'. */
  color: string
  /** Export size in px. */
  size: number
  opacity: number
}

export interface Settings {
  theme: ThemePreference
  appearance: IconAppearance
  /** Background of the large preview: 'surface' follows the theme. */
  previewBackground: string
  showNames: boolean
  gridDensity: 'comfortable' | 'compact'
}
