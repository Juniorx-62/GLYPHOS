import { useEffect } from 'react'
import { colors } from '@brand/tokens/source'
import { THEME_STORAGE_KEY, updateSettings, useThemePreference } from '~/data/stores/settings'
import type { ThemePreference } from '~/data/types'
import { useMediaQuery } from '~/hooks/use-media-query'

type Theme = 'light' | 'dark'

/**
 * Runs in <head> before the first paint (server-rendered once): applies the
 * saved theme, or the system one, so the page never flashes the wrong colours.
 */
export const themeBootScript = `(function(){try{var p=localStorage.getItem('${THEME_STORAGE_KEY}');var t=p==='light'||p==='dark'?p:(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');var r=document.documentElement;r.dataset.theme=t;r.style.colorScheme=t;var m=document.querySelector('meta[name="theme-color"]');if(m)m.setAttribute('content',t==='dark'?'${colors.dark.background}':'${colors.light.background}')}catch(e){}})()`

export function useResolvedTheme(): Theme {
  const preference = useThemePreference()
  const prefersDark = useMediaQuery('(prefers-color-scheme: dark)')
  if (preference === 'system') return prefersDark ? 'dark' : 'light'
  return preference
}

/** Keeps <html data-theme> in sync with the preference and the OS. */
export function ThemeController() {
  const theme = useResolvedTheme()
  useEffect(() => {
    const root = document.documentElement
    root.dataset.theme = theme
    root.style.colorScheme = theme
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', colors[theme].background)
  }, [theme])
  return null
}

export function setTheme(preference: ThemePreference) {
  updateSettings({ theme: preference })
}
