/**
 * Page sweep: opens every main page and a sample of icon pages in a headless
 * Chrome, on desktop (1366 px), tablet (768 px) and phone (375 px), in light
 * and dark, and reports console errors, failed loads, hydration warnings,
 * content wider than the screen and missing <h1>.
 *
 *   npm run check:pages                                  against http://localhost:3100
 *   npm run check:pages -- https://glyphos-icons.vercel.app    against a deploy
 *   npm run check:pages -- --only=/icons,/about --shots=tmp/shots
 *   npm run check:pages -- --sample=60                   icon pages sampled (default 24)
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { launch } from '../lib/chrome.mjs'

const args = process.argv.slice(2)
const origin = (args.find((a) => /^https?:/.test(a)) ?? 'http://localhost:3100').replace(/\/$/, '')
const only = args.find((a) => a.startsWith('--only='))?.slice(7).split(',')
const shots = args.find((a) => a.startsWith('--shots='))?.slice(8)
const sample = Number(args.find((a) => a.startsWith('--sample='))?.slice(9) ?? 24)
if (shots) mkdirSync(shots, { recursive: true })

const viewports = [
  { name: 'desktop', width: 1366, height: 900, mobile: false, theme: 'light' },
  { name: 'tablet', width: 768, height: 1024, mobile: true, theme: 'dark' },
  { name: 'celular', width: 375, height: 812, mobile: true, theme: 'light' },
]

const chrome = await launch()
const results = []
try {
  // Pages come from the site itself: the main pages, every category and collection, and a sample of icons from the sitemap.
  const boot = await chrome.newPage()
  await boot.goto(`${origin}/sitemap.xml`, { waitMs: 300 })
  const locs = await boot.eval(`[...document.querySelectorAll('loc')].map(l => new URL(l.textContent).pathname)`)
  await boot.close()
  const icons = locs.filter((p) => p.startsWith('/icons/'))
  const step = Math.max(1, Math.floor(icons.length / sample))
  let paths = [
    ...locs.filter((p) => !p.startsWith('/icons/')),
    '/icons?q=carrinho%20de%20compras',
    '/icons?category=weather&style=solid',
    '/library',
    '/library?tab=creations',
    '/create?from=house',
    '/rota-que-nao-existe',
    ...icons.filter((_, i) => i % step === 0).slice(0, sample),
  ]
  if (only) paths = paths.filter((p) => only.some((o) => p === o || p.startsWith(`${o}/`) || p.startsWith(`${o}?`)))
  console.log(`${paths.length} páginas × ${viewports.length} larguras`)

  for (const vp of viewports) {
    const page = await chrome.newPage(vp)
    await page.call('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: vp.theme }] })
    for (const path of paths) {
      page.clearEvents()
      await page.goto(origin + path, { waitMs: 1500 })
      const m = await page
        .eval(`(() => {
          const cw = document.documentElement.clientWidth;
          const over = [];
          for (const el of document.querySelectorAll('body *')) {
            const r = el.getBoundingClientRect();
            if (r.width && r.right > cw + 1 && getComputedStyle(el).position !== 'fixed' && !el.closest('dialog:not([open])') && !el.closest('.overflow-x-auto, .overflow-auto, pre')) {
              const p = el.parentElement && el.parentElement.getBoundingClientRect();
              if (!p || p.right <= cw + 1) over.push(el.tagName.toLowerCase() + '.' + String(el.className.baseVal ?? el.className).split(' ').slice(0, 3).join('.'));
            }
          }
          return { sw: document.documentElement.scrollWidth, cw, over: over.slice(0, 4), h1: document.querySelectorAll('h1').length, title: document.title };
        })()`)
        .catch((e) => ({ error: String(e) }))
      const errors = page.errors().filter((e) => !/favicon|404 \(Not Found\)/.test(e) || path !== '/rota-que-nao-existe')
      const expected404 = path === '/rota-que-nao-existe'
      const res = { vp: vp.name, path, ...m, errors: expected404 ? errors.filter((e) => !/404/.test(e)) : errors }
      results.push(res)
      const bad = res.errors.length || m.sw > m.cw || m.error || m.h1 !== 1
      if (bad) console.log(`✗ ${vp.name} ${path}`, JSON.stringify({ overflow: m.sw > m.cw ? m.over : undefined, h1: m.h1 !== 1 ? m.h1 : undefined, errors: res.errors.slice(0, 3) }))
      if (shots) writeFileSync(join(shots, `${vp.name}${path.replace(/[/?=&%]+/g, '_') || '_home'}.png`), await page.screenshot())
    }
    await page.close()
  }
} finally {
  await chrome.close()
}
const bad = results.filter((r) => r.errors.length || r.sw > r.cw || r.error || r.h1 !== 1)
console.log(`\n${results.length} verificações, ${bad.length} com problema.`)
process.exitCode = bad.length ? 1 : 0
