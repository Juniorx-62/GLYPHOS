/**
 * Public identity of the site: the production address used in canonical URLs,
 * the sitemap, robots.txt and Open Graph tags. Set VITE_SITE_URL to move the
 * site to another domain; every absolute URL follows it.
 */
const envUrl = (import.meta.env?.VITE_SITE_URL as string | undefined)?.trim()

export const SITE_URL = (envUrl || 'https://glyphos-icons.vercel.app').replace(/\/+$/, '')
export const SITE_NAME = 'GLYPHOS'
export const SITE_LANGUAGE = 'pt-BR'
export const SITE_LOCALE = 'pt_BR'
export const SITE_TAGLINE = 'Biblioteca de ícones SVG'
export const SITE_DESCRIPTION =
  'Ícones SVG originais, pesquisáveis em português e inglês, para personalizar e copiar em SVG, JSX, CSS ou PNG. Licença MIT.'

/** Default share image (1200 × 630), for pages without one of their own. */
export const SITE_IMAGE = {
  url: `${SITE_URL}/images/og-glyphos.png`,
  width: 1200,
  height: 630,
  alt: 'GLYPHOS, biblioteca de ícones SVG: o logotipo sobre uma faixa de ícones da coleção',
}

/** Absolute URL for a path of this site. */
export function absoluteUrl(path: string) {
  return SITE_URL + (path.startsWith('/') ? path : `/${path}`)
}
