/**
 * GLYPHOS design tokens — the single source of truth.
 *
 * `npm run brand` turns this file into brand/tokens/tokens.css (runtime values
 * per theme), brand/tokens/tailwind.css (utilities for Tailwind 4),
 * brand/tokens/tokens.json and the manifest colours. `npm run check:brand`
 * (part of verify) fails when a generated file differs from this source.
 *
 * Palette — "tinta e rubrica" (ink and rubric):
 *   Ink     the scribe's black ink: text, primary actions, the drawings.
 *   Paper   a warm, neutral writing surface.
 *   Rubric  vermilion, the red the scribes used for headings and marks. Used
 *           sparingly: the mark in the logo, focus, the active selection,
 *           favourites. It is the only saturated colour of the interface, so
 *           the icons (always ink) stay the protagonists.
 * Ink and paper, with the rubric as the one saturated colour.
 */

export type ThemeName = 'light' | 'dark'

export const colorTokenNames = [
  'background',
  'background-subtle',
  'surface',
  'surface-elevated',
  'surface-overlay',
  'muted',
  'border',
  'border-strong',
  'fg',
  'fg-muted',
  'fg-subtle',
  'fg-disabled',
  'primary',
  'primary-hover',
  'primary-fg',
  'accent',
  'accent-hover',
  'accent-fg',
  'accent-emphasis',
  'accent-subtle',
  'success',
  'warning',
  'error',
  'info',
  'ring',
  'canvas-grid',
] as const

export type ColorTokenName = (typeof colorTokenNames)[number]

export const colorTokenMeta: Record<ColorTokenName, string> = {
  background: 'Fundo do aplicativo, a camada mais baixa.',
  'background-subtle': 'Áreas rebaixadas: rodapé, faixas de seção.',
  surface: 'Cartões, painéis, campos e a grade de ícones.',
  'surface-elevated': 'Itens com o mouse em cima, barras de ferramentas.',
  'surface-overlay': 'Menus, diálogos e a busca global.',
  muted: 'Preenchimentos neutros: etiquetas, trilhos, botões secundários.',
  border: 'Divisória fina padrão.',
  'border-strong': 'Contorno de campos (3:1 contra o fundo).',
  fg: 'Texto principal e os ícones.',
  'fg-muted': 'Descrições e textos de apoio.',
  'fg-subtle': 'Legendas, metadados, textos de exemplo nos campos.',
  'fg-disabled': 'Rótulos desativados (decorativo, sem exigência de contraste).',
  primary: 'Tinta: botões e ações principais.',
  'primary-hover': 'Ação principal com o mouse em cima.',
  'primary-fg': 'Texto sobre a ação principal.',
  accent: 'Rubrica: a marca, o foco, a seleção ativa e os favoritos.',
  'accent-hover': 'Rubrica com o mouse em cima.',
  'accent-fg': 'Texto sobre a rubrica.',
  'accent-emphasis': 'Rubrica como texto (contraste AA).',
  'accent-subtle': 'Fundo tingido de rubrica: item selecionado.',
  success: 'Confirmações ("Copiado").',
  warning: 'Atenção.',
  error: 'Erros (sempre com ícone e texto, nunca só a cor).',
  info: 'Informações neutras.',
  ring: 'Anel de foco do teclado.',
  'canvas-grid': 'Linhas do grid de 24 unidades na prévia ampliada.',
}

export const colors: Record<ThemeName, Record<ColorTokenName, string>> = {
  light: {
    background: '#F7F7F4',
    'background-subtle': '#F0F0EC',
    surface: '#FFFFFF',
    'surface-elevated': '#FAFAF8',
    'surface-overlay': '#FFFFFF',
    muted: '#EDEDE8',
    border: '#E4E4DE',
    'border-strong': '#8F8F88',
    fg: '#151514',
    'fg-muted': '#575752',
    'fg-subtle': '#6B6B65',
    'fg-disabled': '#B4B4AD',
    primary: '#151514',
    'primary-hover': '#2E2E2B',
    'primary-fg': '#FAFAF7',
    accent: '#D9401F',
    'accent-hover': '#C2381A',
    'accent-fg': '#FFFFFF',
    'accent-emphasis': '#B5341A',
    'accent-subtle': '#FBEBE6',
    success: '#1E7A4C',
    warning: '#8F5600',
    error: '#C42640',
    info: '#2D6BAE',
    ring: '#D9401F',
    'canvas-grid': '#EAEAE4',
  },
  dark: {
    background: '#0C0C0B',
    'background-subtle': '#10100F',
    surface: '#151514',
    'surface-elevated': '#1B1B19',
    'surface-overlay': '#1E1E1C',
    muted: '#242422',
    border: '#262624',
    'border-strong': '#5E5E58',
    fg: '#EDEDE8',
    'fg-muted': '#A2A29A',
    'fg-subtle': '#8C8C85',
    'fg-disabled': '#4E4E4A',
    primary: '#EDEDE8',
    'primary-hover': '#FFFFFF',
    'primary-fg': '#121211',
    accent: '#FF6A4A',
    'accent-hover': '#FF8164',
    'accent-fg': '#1A0A05',
    'accent-emphasis': '#FF8A70',
    'accent-subtle': '#2A1712',
    success: '#4CC38A',
    warning: '#F0A848',
    error: '#F26A7E',
    info: '#6AA8F0',
    ring: '#FF6A4A',
    'canvas-grid': '#232321',
  },
}

/** Brand constants used by the logo, the app icon and the share image. */
export const brand = {
  ink: '#151514',
  paper: '#F7F7F4',
  rubric: '#D9401F',
  rubricOnInk: '#FF6A4A',
}

export const fonts = {
  sans: "'Geist Variable', 'Geist', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif",
  mono: "'Geist Mono Variable', 'Geist Mono', ui-monospace, 'SFMono-Regular', 'Cascadia Code', Menlo, monospace",
}

/** Type scale: [size, line-height, letter-spacing]. 12 px is the floor for any text. */
export const textScale: Record<string, [string, string, string]> = {
  xs: ['0.75rem', '1rem', '0.005em'],
  sm: ['0.875rem', '1.25rem', '-0.003em'],
  base: ['1rem', '1.5rem', '-0.006em'],
  md: ['1.125rem', '1.625rem', '-0.01em'],
  lg: ['1.375rem', '1.875rem', '-0.015em'],
  xl: ['1.75rem', '2.125rem', '-0.02em'],
  '2xl': ['2.25rem', '2.625rem', '-0.025em'],
  '3xl': ['3rem', '3.375rem', '-0.03em'],
  '4xl': ['3.75rem', '4rem', '-0.035em'],
}

export const radius: Record<string, string> = {
  xs: '4px',
  sm: '6px',
  md: '8px',
  lg: '10px',
  xl: '14px',
  '2xl': '20px',
  full: '9999px',
}

export const shadows: Record<ThemeName, Record<string, string>> = {
  light: {
    xs: '0 1px 2px rgb(21 21 20 / 0.05)',
    sm: '0 1px 2px rgb(21 21 20 / 0.05), 0 2px 8px -2px rgb(21 21 20 / 0.06)',
    md: '0 2px 6px -1px rgb(21 21 20 / 0.06), 0 12px 32px -8px rgb(21 21 20 / 0.12)',
    lg: '0 4px 12px -2px rgb(21 21 20 / 0.08), 0 28px 64px -12px rgb(21 21 20 / 0.2)',
  },
  dark: {
    xs: '0 1px 2px rgb(0 0 0 / 0.4)',
    sm: '0 1px 2px rgb(0 0 0 / 0.4), 0 2px 8px -2px rgb(0 0 0 / 0.4)',
    md: '0 2px 6px -1px rgb(0 0 0 / 0.5), 0 12px 32px -8px rgb(0 0 0 / 0.55)',
    lg: '0 4px 12px -2px rgb(0 0 0 / 0.55), 0 28px 64px -12px rgb(0 0 0 / 0.7)',
  },
}

export const motion = {
  fast: '120ms',
  base: '180ms',
  slow: '260ms',
  ease: 'cubic-bezier(0.2, 0, 0, 1)',
  easeOut: 'cubic-bezier(0.16, 1, 0.3, 1)',
}

/** Control heights: sm 28, md 36, lg 44 (44 is also the touch minimum). */
export const controls = { sm: '1.75rem', md: '2.25rem', lg: '2.75rem' }
