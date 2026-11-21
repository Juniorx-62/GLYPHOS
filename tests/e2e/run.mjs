/**
 * End-to-end flows in a headless Chrome against a running server (dev or
 * production build). Each flow is what a person does on the site.
 *
 *   npm run test:e2e                                  against http://localhost:3100
 *   npm run test:e2e -- https://glyphos-icons.vercel.app
 */
import { existsSync, mkdtempSync, readdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { launch } from '../../scripts/lib/chrome.mjs'

const origin = (process.argv.slice(2).find((a) => /^https?:/.test(a)) ?? 'http://localhost:3100').replace(/\/$/, '')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const results = []

async function flow(name, fn) {
  const t0 = Date.now()
  try {
    await fn()
    results.push({ name, ok: true })
    console.log(`✓ ${name} (${((Date.now() - t0) / 1000).toFixed(1)} s)`)
  } catch (e) {
    results.push({ name, ok: false })
    console.log(`✗ ${name}\n    ${e.message}`)
  }
}

/** Waits until a JS expression is truthy in the page. */
async function until(page, expression, timeout = 10000) {
  const t0 = Date.now()
  for (;;) {
    // Wrapped so DOM nodes come back as true (a node itself cannot be serialised).
    const value = await page.eval(`(() => { const v = (${expression}); return v instanceof Node ? true : v })()`).catch(() => false)
    if (value) return value
    if (Date.now() - t0 > timeout) throw new Error(`Tempo esgotado esperando: ${expression}`)
    await sleep(150)
  }
}

const click = (page, selector) => page.eval(`(() => { const el = document.querySelector(${JSON.stringify(selector)}); if (!el) throw new Error('não achei ${selector.replace(/'/g, '')}'); el.click(); return true })()`)
const clickText = (page, tag, text) =>
  page.eval(`(() => { const el = [...document.querySelectorAll(${JSON.stringify(tag)})].find(e => e.textContent.trim().includes(${JSON.stringify(text)})); if (!el) throw new Error('não achei "${text}"'); el.click(); return true })()`)
const typeInto = async (page, selector, text) => {
  await page.eval(`document.querySelector(${JSON.stringify(selector)}).focus()`)
  await page.call('Input.insertText', { text })
}
const key = async (page, k, modifiers = 0) => {
  const code = { Enter: 'Enter', k: 'KeyK', Escape: 'Escape' }[k] ?? k
  // With a modifier (Ctrl K) no character is typed.
  const text = k === 'Enter' ? '\r' : k.length === 1 && !modifiers ? k : undefined
  await page.call('Input.dispatchKeyEvent', { type: 'keyDown', key: k, code, modifiers, windowsVirtualKeyCode: k === 'Enter' ? 13 : k === 'k' ? 75 : 0, text })
  await page.call('Input.dispatchKeyEvent', { type: 'keyUp', key: k, code, modifiers })
}

const downloads = mkdtempSync(join(tmpdir(), 'glyphos-e2e-'))
const chrome = await launch()
try {
  await chrome.send('Browser.grantPermissions', { origin, permissions: ['clipboardReadWrite', 'clipboardSanitizedWrite'] }).catch(() => {})
  await chrome.send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: downloads }).catch(() => {})
  const page = await chrome.newPage({ width: 1366, height: 900 })

  await flow('Busca da página inicial: "carrinho de compras" leva ao carrinho', async () => {
    await page.goto(`${origin}/`, { waitMs: 1200 })
    await typeInto(page, '#hero-search', 'carrinho de compras')
    await key(page, 'Enter')
    await until(page, `location.pathname === '/icons' && new URLSearchParams(location.search).get('q') === 'carrinho de compras'`)
    const first = await until(page, `document.querySelector('[data-index="0"]')?.dataset.slug`)
    if (first !== 'shopping-cart') throw new Error(`primeiro resultado: ${first}`)
  })

  await flow('Busca global (Ctrl K): "lixeira" + Enter abre a página do ícone', async () => {
    await page.goto(`${origin}/categories`, { waitMs: 1200 })
    await key(page, 'k', 2)
    await until(page, `document.querySelector('dialog[open] input[role=combobox]')`)
    await page.call('Input.insertText', { text: 'lixeira' })
    await until(page, `document.querySelector('[role=option][id="palette-icon-trash"]')`)
    await key(page, 'Enter')
    await until(page, `location.pathname === '/icons/trash'`)
    await until(page, `document.querySelector('h1')?.textContent === 'Lixeira'`)
  })

  await flow('Filtros: categoria e estilo reduzem a grade e aparecem como ativos', async () => {
    await page.goto(`${origin}/icons?category=weather&style=solid`, { waitMs: 1500 })
    await until(page, `document.querySelector('[data-index="0"]')`)
    const chips = await page.eval(`document.querySelector('[aria-label="Filtros ativos"]')?.textContent ?? ''`)
    if (!/Clima/.test(chips) || !/Sólido/.test(chips)) throw new Error(`filtros ativos: ${chips}`)
    await clickText(page, 'button', 'Limpar filtros')
    await until(page, `location.search === ''`)
  })

  await flow('Painel rápido: clicar num ícone mostra prévia e ações', async () => {
    await page.goto(`${origin}/icons?q=sino`, { waitMs: 1500 })
    await until(page, `document.querySelector('[data-slug="bell"]')`)
    await click(page, '[data-slug="bell"]')
    await until(page, `document.querySelector('aside[aria-label="Ícone selecionado"]')?.textContent.includes('Copiar SVG')`)
    await until(page, `new URLSearchParams(location.search).get('icon') === 'bell'`)
  })

  await flow('Página do ícone: copiar SVG mostra a confirmação', async () => {
    await page.goto(`${origin}/icons/shopping-cart`, { waitMs: 1500 })
    await clickText(page, 'button', 'Copiar SVG')
    await until(page, `[...document.querySelectorAll('[role=status]')].some(s => /SVG de "Carrinho de compras" copiado|Não foi possível copiar/.test(s.textContent))`)
  })

  await flow('Personalização: o traço muda a prévia e o código', async () => {
    await page.goto(`${origin}/icons/shopping-cart`, { waitMs: 1500 })
    await page.eval(`(() => { const r = document.querySelector('#detail-stroke'); const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; set.call(r, '2.25'); r.dispatchEvent(new Event('input', { bubbles: true })); return true })()`)
    await until(page, `document.querySelector('section[aria-label="Prévia"] svg[data-glyph]')?.getAttribute('stroke-width') === '2.25'`)
    await until(page, `document.querySelector('pre')?.textContent.includes('stroke-width="2.25"')`)
    await clickText(page, 'button', 'Voltar ao padrão')
  })

  await flow('Exportação: baixar SVG e PNG gera os arquivos', async () => {
    await page.goto(`${origin}/icons/bell`, { waitMs: 1500 })
    await clickText(page, 'button', 'Baixar SVG')
    await clickText(page, 'button', 'Baixar PNG')
    const t0 = Date.now()
    while (Date.now() - t0 < 8000) {
      const files = readdirSync(downloads)
      if (files.some((f) => f === 'bell.svg') && files.some((f) => /^bell.*\.png$/.test(f))) return
      await sleep(200)
    }
    throw new Error(`arquivos baixados: ${readdirSync(downloads).join(', ') || 'nenhum'}`)
  })

  await flow('Favoritos: favoritar aparece na biblioteca', async () => {
    await page.goto(`${origin}/icons/mail`, { waitMs: 1500 })
    await clickText(page, 'button', 'Favoritar')
    await sleep(400)
    await page.goto(`${origin}/library`, { waitMs: 1500 })
    await until(page, `document.querySelector('a[href="/icons/mail"]')`)
  })

  const shapesLabel = `(document.querySelector('svg[role=application]')?.getAttribute('aria-label') ?? '')`
  /** Drags on the editor canvas, from and to fractions of its box. */
  const drag = async (page, from, to) => {
    const r = await page.eval(`(() => { const b = document.querySelector('svg[role=application]').getBoundingClientRect(); return [b.left, b.top, b.width, b.height] })()`)
    const at = ([fx, fy]) => ({ x: r[0] + r[2] * fx, y: r[1] + r[3] * fy })
    const a = at(from)
    const b = at(to)
    await page.call('Input.dispatchMouseEvent', { type: 'mousePressed', x: a.x, y: a.y, button: 'left', buttons: 1, clickCount: 1 })
    for (let i = 1; i <= 6; i++) await page.call('Input.dispatchMouseEvent', { type: 'mouseMoved', x: a.x + ((b.x - a.x) * i) / 6, y: a.y + ((b.y - a.y) * i) / 6, button: 'left', buttons: 1 })
    await page.call('Input.dispatchMouseEvent', { type: 'mouseReleased', x: b.x, y: b.y, button: 'left', buttons: 0, clickCount: 1 })
  }

  await flow('Editor: desenhar, desfazer, salvar e reabrir pela biblioteca', async () => {
    await page.goto(`${origin}/create`, { waitMs: 1800 })
    await until(page, `document.querySelector('svg[role=application]')`)
    await click(page, 'button[aria-label="Retângulo (R)"]')
    await drag(page, [0.35, 0.35], [0.65, 0.65])
    await until(page, `${shapesLabel}.includes('1 forma')`)
    await click(page, 'button[aria-label="Elipse (O)"]')
    await drag(page, [0.42, 0.42], [0.58, 0.58])
    await until(page, `${shapesLabel}.includes('2 formas')`)
    await click(page, 'button[aria-label^="Desfazer"]')
    await until(page, `${shapesLabel}.includes('1 forma')`)
    await click(page, 'button[aria-label^="Refazer"]')
    await until(page, `${shapesLabel}.includes('2 formas')`)
    await clickText(page, 'button', 'Salvar na biblioteca')
    const id = await until(page, `new URLSearchParams(location.search).get('project')`)
    await sleep(400)
    await page.goto(`${origin}/library?tab=creations`, { waitMs: 1500 })
    await until(page, `[...document.querySelectorAll('h3')].some((h) => h.textContent === 'Ícone sem nome')`)
    await page.goto(`${origin}/create?project=${id}`, { waitMs: 1800 })
    await until(page, `${shapesLabel}.includes('2 formas')`)
  })

  await flow('Editor: abrir uma cópia de um ícone da biblioteca e exportar SVG válido', async () => {
    await page.goto(`${origin}/icons/house`, { waitMs: 1500 })
    await clickText(page, 'button', 'Editar uma cópia')
    await until(page, `location.pathname === '/create' && ${shapesLabel}.includes('formas')`)
    await clickText(page, 'button', 'Exportar')
    await until(page, `document.querySelector('dialog[open]')?.textContent.includes('Copiar SVG')`)
    const ok = await until(page, `(() => { const t = [...document.querySelectorAll('dialog[open] pre, dialog[open] code')].map(e => e.textContent).find(t => t.startsWith('<svg')); return t && !new DOMParser().parseFromString(t, 'image/svg+xml').querySelector('parsererror') && t.includes('viewBox="0 0 24 24"') })()`)
    if (!ok) throw new Error('SVG exportado inválido')
  })

  await flow('Ícone renomeado ou inexistente: 404 com caminho de volta', async () => {
    await page.goto(`${origin}/icons/nao-existe-este-icone`, { waitMs: 1200 })
    await until(page, `document.querySelector('h1')?.textContent.includes('não encontrada')`)
  })

  const phone = await chrome.newPage({ width: 375, height: 812, mobile: true })
  await flow('Celular: tocar num ícone abre o painel inferior, sem rolagem lateral', async () => {
    await phone.goto(`${origin}/icons?q=casa`, { waitMs: 1800 })
    await until(phone, `document.querySelector('[data-slug="house"]')`)
    await click(phone, '[data-slug="house"]')
    await until(phone, `document.querySelector('dialog[open]')?.textContent.includes('Copiar SVG')`)
    const overflow = await phone.eval('document.documentElement.scrollWidth > document.documentElement.clientWidth')
    if (overflow) throw new Error('a página rola para o lado em 375 px')
  })
} finally {
  await chrome.close()
  if (existsSync(downloads)) rmSync(downloads, { recursive: true, force: true })
}

const failed = results.filter((r) => !r.ok).length
console.log(`\n${results.length} fluxos, ${failed} com falha.`)
process.exitCode = failed ? 1 : 0
