import { createMiddleware, createStart } from '@tanstack/react-start'

/**
 * Every page renders the same HTML for every visitor (favourites, history and
 * settings live in the browser), so the CDN may keep a copy for a day and
 * serve it from the nearest edge. Browsers revalidate on each visit, and a new
 * deploy starts with an empty CDN cache. Only successful HTML is cached.
 *
 * Basic protection on every page. Icons are rendered as React elements from
 * whitelisted shapes, never as injected HTML, so a strict CSP is possible; it
 * is documented as a next step in docs/audits/SECURITY.md.
 */
const SECURITY_HEADERS = {
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'strict-origin-when-cross-origin',
  'x-frame-options': 'SAMEORIGIN',
  'permissions-policy': 'camera=(), microphone=(), geolocation=()',
}

const pages = createMiddleware({ type: 'request' }).server(async ({ next, request, handlerType }) => {
  const result = await next()
  const { response } = result
  const html = response.headers.get('content-type')?.startsWith('text/html')
  if (handlerType === 'router' && html) {
    if (request.method === 'GET' && response.status === 200 && !response.headers.has('cache-control')) {
      response.headers.set('cache-control', 'public, max-age=0, s-maxage=86400, stale-while-revalidate=604800')
    }
    for (const [name, value] of Object.entries(SECURITY_HEADERS)) if (!response.headers.has(name)) response.headers.set(name, value)
  }
  return result
})

export const startInstance = createStart(() => ({
  requestMiddleware: [pages],
}))
