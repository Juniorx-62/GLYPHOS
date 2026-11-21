/**
 * The indexable pages, read from the catalogue: home, the lists, every
 * category, collection and icon. Filtered views of /icons and the personal
 * library carry noindex and stay out.
 */
import { CATEGORIES, COLLECTIONS, catalogInfo, loadManifest } from '~/catalog'
import { absoluteUrl } from '~/lib/site'

export async function indexablePaths(): Promise<Array<{ path: string; lastmod?: string }>> {
  const manifest = await loadManifest()
  const day = catalogInfo.generatedAt.slice(0, 10)
  return [
    { path: '/', lastmod: day },
    { path: '/icons', lastmod: day },
    { path: '/categories', lastmod: day },
    ...CATEGORIES.map((c) => ({ path: `/categories/${c.id}`, lastmod: day })),
    { path: '/collections', lastmod: day },
    ...COLLECTIONS.map((c) => ({ path: `/collections/${c.id}`, lastmod: day })),
    { path: '/create' },
    { path: '/about' },
    ...manifest.map((e) => ({ path: `/icons/${e.slug}`, lastmod: e.added })),
  ]
}

const escapeXml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

export async function sitemapXml() {
  const urls = (await indexablePaths())
    .map(({ path, lastmod }) => `  <url><loc>${escapeXml(absoluteUrl(path))}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ''}</url>`)
    .join('\n')
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`
}

export function robotsTxt() {
  return ['User-agent: *', 'Allow: /', 'Disallow: /library', '', `Sitemap: ${absoluteUrl('/sitemap.xml')}`, ''].join('\n')
}

export const crawlerFileHeaders = (type: string) => ({
  'content-type': type,
  'cache-control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800',
})
