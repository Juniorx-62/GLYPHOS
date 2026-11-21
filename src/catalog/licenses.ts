/**
 * Where icons come from and under which terms they may be used. Every icon's
 * metadata names a `source` and a `license` from here, and `check:licenses`
 * refuses anything else. See docs/LICENSING.md for the policy.
 */
import type { LicenseId, SourceId } from './types'

export interface LicenseDef {
  id: LicenseId
  name: string
  url: string
  /** Text people must keep when they redistribute the icons. */
  attribution: string
  /** Allows use in commercial and closed-source projects. */
  commercial: boolean
  /** Allows redistribution (in packages, apps and sites). */
  redistribution: boolean
}

export interface SourceDef {
  id: SourceId
  name: string
  /** original: drawn for GLYPHOS. third-party: incorporated under its license. */
  kind: 'original' | 'third-party'
  url?: string
  licenses: LicenseId[]
}

export const LICENSES: Record<LicenseId, LicenseDef> = {
  MIT: {
    id: 'MIT',
    name: 'MIT License',
    url: 'https://opensource.org/license/mit',
    attribution: 'GLYPHOS icons — MIT License — © 2026 GLYPHOS',
    commercial: true,
    redistribution: true,
  },
}

export const SOURCES: Record<SourceId, SourceDef> = {
  glyphos: {
    id: 'glyphos',
    name: 'GLYPHOS (desenho próprio)',
    kind: 'original',
    licenses: ['MIT'],
  },
}

export const DEFAULT_AUTHOR = 'GLYPHOS'
export const DEFAULT_SOURCE: SourceId = 'glyphos'
export const DEFAULT_LICENSE: LicenseId = 'MIT'
