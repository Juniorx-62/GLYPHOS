/// <reference types="vite/client" />
import { HeadContent, Outlet, ScriptOnce, Scripts, createRootRoute } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import geistLatin from '@fontsource-variable/geist/files/geist-latin-wght-normal.woff2?url'
import { colors } from '@brand/tokens/source'
import { AppShell } from '~/components/layout/AppShell'
import { NotFound } from '~/components/layout/route-states'
import { themeBootScript } from '~/components/layout/theme'
import { SITE_DESCRIPTION, SITE_NAME, SITE_TAGLINE } from '~/lib/site'
import appCss from '~/styles/app.css?url'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
      // Fallbacks for pages without their own head (e.g. "not found"); every page sets its own.
      { title: `${SITE_NAME} · ${SITE_TAGLINE}` },
      { name: 'description', content: SITE_DESCRIPTION },
      { name: 'theme-color', content: colors.light.background },
      { name: 'color-scheme', content: 'light dark' },
    ],
    links: [
      { rel: 'preload', href: geistLatin, as: 'font', type: 'font/woff2', crossOrigin: 'anonymous' },
      { rel: 'stylesheet', href: appCss },
      { rel: 'icon', href: '/favicon.ico', sizes: '48x48' },
      { rel: 'icon', href: '/favicon.svg', type: 'image/svg+xml' },
      { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' },
      { rel: 'manifest', href: '/manifest.webmanifest' },
    ],
  }),
  shellComponent: RootDocument,
  component: () => (
    <AppShell>
      <Outlet />
    </AppShell>
  ),
  notFoundComponent: NotFound,
})

function RootDocument({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        {/* Paints the saved (or system) theme before the first frame. */}
        <ScriptOnce>{themeBootScript}</ScriptOnce>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  )
}
