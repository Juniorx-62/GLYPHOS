import { useEffect } from 'react'
import { flushSync } from 'react-dom'
import { colors } from '@brand/tokens/source'
import { THEME_STORAGE_KEY, updateSettings, useThemePreference } from '~/data/stores/settings'
import type { ThemePreference } from '~/data/types'

/**
 * Two themes, light and dark. A first visit (nothing
 * saved yet) starts in the system's theme; from then on the button decides.
 *
 * Runs in <head> before the first paint (server-rendered once): applies the
 * saved theme, or the system one, so the page never flashes the wrong colours.
 */
export const themeBootScript = `(function(){try{var p=localStorage.getItem('${THEME_STORAGE_KEY}');var t=p==='light'||p==='dark'?p:(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');var r=document.documentElement;r.dataset.theme=t;r.style.colorScheme=t;var m=document.querySelector('meta[name="theme-color"]');if(m)m.setAttribute('content',t==='dark'?'${colors.dark.background}':'${colors.light.background}')}catch(e){}})()`

function paintTheme(theme: ThemePreference) {
  const root = document.documentElement
  root.dataset.theme = theme
  root.style.colorScheme = theme
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', colors[theme].background)
}

/** The theme on screen. */
export function useResolvedTheme(): ThemePreference {
  return useThemePreference()
}

/** Keeps <html data-theme> in sync when the saved settings load or another tab changes them. */
export function ThemeController() {
  const theme = useThemePreference()
  useEffect(() => {
    if (document.documentElement.dataset.theme !== theme) paintTheme(theme)
  }, [theme])
  return null
}

/**
 * Switches the theme with the whole page changing at once. The view
 * transition takes its "before" picture with the old theme, the new tokens are
 * applied inside it with component transitions frozen (buttons and fields
 * would otherwise fade in late), and the page cross-fades once. Without view
 * transitions, or with reduced motion, the colours just swap.
 */
export function setTheme(theme: ThemePreference) {
  const root = document.documentElement
  if (root.dataset.theme === theme) return updateSettings({ theme })
  const commit = () => {
    root.setAttribute('data-theme-switching', '')
    flushSync(() => updateSettings({ theme }))
    paintTheme(theme)
  }
  const release = () => requestAnimationFrame(() => requestAnimationFrame(() => root.removeAttribute('data-theme-switching')))
  const reduced = root.dataset.motion === 'reduce' || matchMedia('(prefers-reduced-motion: reduce)').matches
  if (typeof document.startViewTransition !== 'function' || reduced || document.visibilityState !== 'visible') {
    commit()
    release()
    return
  }
  document.startViewTransition(commit).finished.finally(release)
}

/** Light ⇄ dark from whatever is showing now. */
export function toggleTheme() {
  setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark')
}
