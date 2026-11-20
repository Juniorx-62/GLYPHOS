/**
 * Minimal Chrome DevTools Protocol client — no dependencies.
 * Launches the locally installed Chrome (or Edge) headless and drives pages
 * through the protocol. Used by the contact sheets, the brand PNGs, the page checker and the e2e flows. Adapted from THOTH (same owner).
 */
import { spawn } from 'node:child_process'
import { existsSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const CANDIDATES = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
].filter(Boolean)

export function findChrome() {
  const exe = CANDIDATES.find((p) => existsSync(p))
  if (!exe) throw new Error('Chrome não encontrado. Defina CHROME_PATH com o caminho do executável.')
  return exe
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

export async function launch({ port = 9300 + Math.floor(Math.random() * 500), headless = true } = {}) {
  const profile = mkdtempSync(join(tmpdir(), 'glyphos-chrome-'))
  const args = [
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${profile}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-extensions',
    '--autoplay-policy=no-user-gesture-required',
    '--hide-scrollbars',
    ...(headless ? ['--headless=new'] : []),
    'about:blank',
  ]
  const proc = spawn(findChrome(), args, { stdio: 'ignore' })
  let version
  for (let i = 0; i < 100 && !version; i++) {
    await sleep(100)
    try {
      version = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json()
    } catch {
      /* not up yet */
    }
  }
  if (!version) throw new Error('O Chrome não respondeu na porta de depuração.')
  const ws = new WebSocket(version.webSocketDebuggerUrl)
  await new Promise((ok, fail) => {
    ws.onopen = ok
    ws.onerror = fail
  })

  let seq = 0
  const pending = new Map()
  const listeners = new Set()
  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data)
    if (msg.id && pending.has(msg.id)) {
      const { ok, fail } = pending.get(msg.id)
      pending.delete(msg.id)
      msg.error ? fail(new Error(`${msg.error.message} ${msg.error.data ?? ''}`)) : ok(msg.result)
    } else if (msg.method) listeners.forEach((fn) => fn(msg))
  }
  const send = (method, params = {}, sessionId) =>
    new Promise((ok, fail) => {
      const id = ++seq
      pending.set(id, { ok, fail })
      ws.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }))
    })

  async function newPage({ width = 1280, height = 900, mobile = false } = {}) {
    const { targetId } = await send('Target.createTarget', { url: 'about:blank' })
    const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true })
    const call = (method, params) => send(method, params, sessionId)
    const events = []
    const onEvent = (msg) => msg.sessionId === sessionId && events.push(msg)
    listeners.add(onEvent)
    await call('Page.enable')
    await call('Runtime.enable')
    await call('Log.enable')
    await call('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile })
    if (mobile) {
      await call('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 })
      await call('Emulation.setEmitTouchEventsForMouse', { enabled: true, configuration: 'mobile' })
    }

    const page = {
      call,
      events,
      /** Console errors, uncaught exceptions and failed resource loads so far. */
      errors() {
        return events
          .filter(
            (m) =>
              (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') ||
              m.method === 'Runtime.exceptionThrown' ||
              (m.method === 'Log.entryAdded' && m.params.entry.level === 'error'),
          )
          .map((m) =>
            m.method === 'Runtime.consoleAPICalled'
              ? m.params.args.map((a) => a.value ?? a.description ?? '').join(' ')
              : m.method === 'Runtime.exceptionThrown'
                ? (m.params.exceptionDetails.exception?.description ?? m.params.exceptionDetails.text)
                : `${m.params.entry.text} ${m.params.entry.url ?? ''}`,
          )
      },
      clearEvents() {
        events.length = 0
      },
      async goto(url, { waitMs = 600, timeout = 30000 } = {}) {
        const loaded = new Promise((ok) => {
          const t0 = Date.now()
          const tick = () => {
            if (events.some((m) => m.method === 'Page.loadEventFired') || Date.now() - t0 > timeout) ok()
            else setTimeout(tick, 50)
          }
          tick()
        })
        events.length = 0
        await call('Page.navigate', { url })
        await loaded
        await sleep(waitMs)
      },
      async eval(expression, { timeout = 60000 } = {}) {
        const res = await Promise.race([
          call('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }),
          sleep(timeout).then(() => {
            throw new Error('Tempo esgotado ao avaliar a expressão')
          }),
        ])
        if (res.exceptionDetails) throw new Error(res.exceptionDetails.exception?.description ?? res.exceptionDetails.text)
        return res.result.value
      },
      async screenshot({ fullPage = false } = {}) {
        const { data } = await call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: fullPage })
        return Buffer.from(data, 'base64')
      },
      async resize(w, h, mob = mobile) {
        await call('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: mob })
      },
      async close() {
        listeners.delete(onEvent)
        await send('Target.closeTarget', { targetId }).catch(() => {})
      },
    }
    return page
  }

  async function close() {
    // A busy or hung browser may never answer Browser.close: don't wait forever.
    await Promise.race([send('Browser.close').catch(() => {}), sleep(2000)])
    ws.close()
    proc.kill()
    await sleep(300)
    try {
      rmSync(profile, { recursive: true, force: true })
    } catch {
      /* Chrome may still hold a lock on Windows */
    }
  }

  return { newPage, close, send }
}
