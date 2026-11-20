import { createFileRoute } from '@tanstack/react-router'
import { crawlerFileHeaders, robotsTxt } from '~/features/seo/sitemap'

export const Route = createFileRoute('/robots.txt')({
  server: {
    handlers: {
      GET: () => new Response(robotsTxt(), { headers: crawlerFileHeaders('text/plain; charset=utf-8') }),
    },
  },
})
