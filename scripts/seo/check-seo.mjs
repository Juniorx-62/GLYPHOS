/**
 * Technical SEO of the pages in the sitemap: status 200, title (10–70
 * characters, unique), description (50–160, unique), canonical equal to the
 * page's address, robots, Open Graph (title, description, image, url), valid
 * JSON-LD and exactly one <h1>. Reads the server's HTML (what crawlers see),
 * without running JavaScript.
 *
 *   npm run check:seo                                  against http://localhost:3100
 *   npm run check:seo -- https://glyphos.vercel.app    after a deploy
 *   npm run check:seo -- --limit=200                   at most N pages (default: all)
 *
 * Canonicals point to VITE_SITE_URL; against localhost only the path is compared.
 */
const args = process.argv.slice(2)
const origin = (args.find((a) => /^https?:/.test(a)) ?? 'http://localhost:3100').replace(/\/$/, '')
const limit = Number(args.find((a) => a.startsWith('--limit='))?.slice(8) ?? Infinity)

const sitemap = await (await fetch(`${origin}/sitemap.xml`)).text()
const paths = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname).slice(0, limit)
const robots = await (await fetch(`${origin}/robots.txt`)).text()
const problems = []
if (!/Sitemap:/.test(robots)) problems.push('robots.txt sem a linha Sitemap')

const decode = (s) => s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#x27;|&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>')
const meta = (html, key, attr = 'name') => decode(new RegExp(`<meta[^>]*${attr}="${key}"[^>]*content="([^"]*)"`, 'i').exec(html)?.[1] ?? new RegExp(`<meta[^>]*content="([^"]*)"[^>]*${attr}="${key}"`, 'i').exec(html)?.[1] ?? '')
const titles = new Map()
const descriptions = new Map()

let done = 0
const queue = [...paths]
async function worker() {
  while (queue.length) {
    const path = queue.shift()
    const res = await fetch(origin + path)
    const html = await res.text()
    const p = (msg) => problems.push(`${path}: ${msg}`)
    if (res.status !== 200) p(`status ${res.status}`)
    const title = decode(/<title>([^<]*)<\/title>/.exec(html)?.[1] ?? '')
    const description = meta(html, 'description')
    const canonical = /<link[^>]*rel="canonical"[^>]*href="([^"]+)"/.exec(html)?.[1]
    if (title.length < 10 || title.length > 70) p(`título com ${title.length} caracteres: "${title}"`)
    if (description.length < 50 || description.length > 160) p(`descrição com ${description.length} caracteres`)
    if (!canonical) p('sem canonical')
    else if (new URL(canonical).pathname !== path) p(`canonical aponta para ${canonical}`)
    if (!/index, follow/.test(meta(html, 'robots'))) p('robots não permite indexar')
    for (const k of ['og:title', 'og:description', 'og:image', 'og:url']) if (!meta(html, k, 'property')) p(`sem ${k}`)
    const h1 = (html.match(/<h1[\s>]/g) ?? []).length
    if (h1 !== 1) p(`${h1} elementos <h1>`)
    for (const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
      try {
        const data = JSON.parse(m[1])
        if (!data['@context'] || !data['@type']) p('JSON-LD sem @context/@type')
      } catch {
        p('JSON-LD inválido')
      }
    }
    titles.set(title, [...(titles.get(title) ?? []), path])
    descriptions.set(description, [...(descriptions.get(description) ?? []), path])
    done++
  }
}
await Promise.all(Array.from({ length: 8 }, worker))
for (const [t, list] of titles) if (list.length > 1) problems.push(`título repetido em ${list.length} páginas: "${t}"`)
for (const [d, list] of descriptions) if (list.length > 1) problems.push(`descrição repetida em ${list.length} páginas: ${list.slice(0, 3).join(', ')}`)

if (problems.length) {
  console.log(problems.slice(0, 80).join('\n'))
  if (problems.length > 80) console.log(`… e mais ${problems.length - 80}.`)
}
console.log(`\nSEO: ${done} páginas conferidas, ${problems.length} problema(s).`)
process.exitCode = problems.length ? 1 : 0
