/**
 * Contact sheets: every icon of a category in Outline, Solid and Duotone at
 * 48 px over the grid (with the 2-unit live-area margin), plus Outline at
 * 24 and 16 px, rendered to PNG by a headless Chrome. The fastest way to review
 * a series: broken solids, off-grid shapes and look-alikes jump out.
 *
 *   npm run catalog:sheet -- --category=animals          → tmp/sheets/animals-1.png …
 *   npm run catalog:sheet -- --slugs=cat,dog,fish        → tmp/sheets/selection-<hash>-1.png (or --name=<nome>)
 *   npm run catalog:sheet -- --category=animals --html   only the HTML (no Chrome)
 *   npm run catalog:sheet -- --category=animals --per=30 icons per image (default 40)
 */
import { createHash } from 'node:crypto'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { renderIcon, toSvgString } from '../../src/catalog/styles/index.ts'
import type { StyleId } from '../../src/catalog/types.ts'
import { launch } from '../lib/chrome.mjs'
import { ROOT, loadCatalog, parseArgs, rel, type LoadedIcon } from '../lib/catalog.ts'

const { flags, list } = parseArgs()
const categories = list('category')
const slugs = list('slugs')
const per = Number(flags.get('per')) || 40
if (!categories && !slugs) {
  console.error('Uso: npm run catalog:sheet -- --category=<id>[,<id>] | --slugs=<a>,<b>')
  process.exit(1)
}

const { icons } = loadCatalog({ only: categories })
const chosen = icons.filter((i) => i.nodes.length && (!slugs || slugs.includes(i.meta.slug))).sort((a, b) => a.meta.slug.localeCompare(b.meta.slug))
if (!chosen.length) {
  console.error('Nenhum ícone desenhado encontrado.')
  process.exit(1)
}

const svg = (icon: LoadedIcon, style: StyleId, size: number) =>
  toSvgString(renderIcon(icon.nodes, { style, size, uid: `${icon.meta.slug}-${style}-${size}`, override: icon.overrides[style] }), { pretty: false })

const GRID = `<svg class="grid" viewBox="0 0 24 24" width="48" height="48">${Array.from({ length: 23 }, (_, i) => `<path d="M${i + 1} 0V24M0 ${i + 1}H24" />`).join('')}<rect x="2" y="2" width="20" height="20" class="live"/></svg>`

function page(items: LoadedIcon[], title: string) {
  const cells = items
    .map((icon) => {
      const has = (s: StyleId) => icon.styles.includes(s)
      const big = (s: StyleId) => (has(s) ? `<div class="big">${s === 'outline' ? GRID : ''}${svg(icon, s, 48)}</div>` : '<div class="big none">—</div>')
      return `<figure>${big('outline')}${big('solid')}${big('duotone')}<div class="small">${svg(icon, 'outline', 24)}${svg(icon, 'outline', 16)}</div><figcaption>${icon.meta.slug}</figcaption></figure>`
    })
    .join('')
  return `<!doctype html><meta charset="utf-8"><style>
    body{margin:0;padding:16px;font:12px/1.3 ui-monospace,Consolas,monospace;background:#fff;color:#111;width:1568px}
    h1{font:600 14px system-ui;margin:0 0 12px}
    main{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}
    figure{margin:0;border:1px solid #e5e5e5;border-radius:8px;padding:8px;display:grid;grid-template-columns:48px 48px 48px 1fr;gap:8px;align-items:center}
    .big{position:relative;width:48px;height:48px;display:grid;place-items:center;color:#111}
    .big>svg:not(.grid){position:relative}
    .none{color:#bbb}
    .grid{position:absolute;inset:0;stroke:#eee;stroke-width:.05;fill:none}
    .grid .live{stroke:#fbb;stroke-width:.06}
    .small{display:flex;gap:6px;align-items:center}
    figcaption{grid-column:1/-1;font-size:11px;color:#555;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  </style><h1>${title} · Contorno · Sólido · Duotone · 24 px · 16 px</h1><main>${cells}</main>`
}

const outDir = join(ROOT, 'tmp/sheets')
mkdirSync(outDir, { recursive: true })
// Unique per selection, so parallel runs never overwrite each other's sheets.
const name =
  typeof flags.get('name') === 'string'
    ? String(flags.get('name'))
    : categories?.join('+') ?? `selection-${createHash('sha1').update(slugs!.join(',')).digest('hex').slice(0, 8)}`
const pages: string[] = []
for (let i = 0; i < chosen.length; i += per) pages.push(page(chosen.slice(i, i + per), `${name} ${i / per + 1}/${Math.ceil(chosen.length / per)}`))

const htmlFiles = pages.map((html, i) => {
  const file = join(outDir, `${name}-${i + 1}.html`)
  writeFileSync(file, html)
  return file
})

if (flags.has('html')) {
  htmlFiles.forEach((f) => console.log(rel(f)))
} else {
  const chrome = await launch()
  try {
    const tab = await chrome.newPage({ width: 1600, height: 900 })
    for (const file of htmlFiles) {
      await tab.goto(pathToFileURL(file).href, { waitMs: 150 })
      const height = await tab.eval('document.documentElement.scrollHeight')
      await tab.resize(1600, Math.min(height, 16000))
      const png = file.replace(/\.html$/, '.png')
      writeFileSync(png, await tab.screenshot())
      console.log(rel(png))
    }
    await tab.close()
  } finally {
    await chrome.close()
  }
}
