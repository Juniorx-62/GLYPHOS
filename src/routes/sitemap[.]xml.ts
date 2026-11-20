import { createFileRoute } from '@tanstack/react-router'
import { crawlerFileHeaders, sitemapXml } from '~/features/seo/sitemap'

/** /sitemap.xml: every indexable page, generated from the catalogue. */
export const Route = createFileRoute('/sitemap.xml')({
  server: {
    handlers: {
      GET: async () => new Response(await sitemapXml(), { headers: crawlerFileHeaders('application/xml; charset=utf-8') }),
    },
  },
})
