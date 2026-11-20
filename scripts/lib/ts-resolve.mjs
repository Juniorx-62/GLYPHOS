/**
 * Module resolution hooks that let Node run GLYPHOS's TypeScript directly
 * (Node strips the types on its own since 22.18): extensionless relative
 * imports get `.ts`, `.tsx` or `/index.ts`, and the `~/` and `@brand/`
 * aliases of vite.config.ts point to `src/` and `brand/`.
 *
 * Registered by register-ts.mjs:
 *   node --import ./scripts/lib/register-ts.mjs scripts/generate-brand.ts
 *
 * Only for scripts and tests that import plain TypeScript. Code that needs
 * Vite (import.meta.glob, ?raw) is loaded through Vite instead, as in
 * check-exports.mjs and check-catalog.mjs.
 */
import { existsSync, statSync } from 'node:fs'
import { dirname, join, resolve as resolvePath } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = resolvePath(dirname(fileURLToPath(import.meta.url)), '..', '..')
const ALIASES = { '~/': join(ROOT, 'src'), '@brand/': join(ROOT, 'brand') }
const CANDIDATES = ['', '.ts', '.tsx', '/index.ts', '/index.tsx']

const isFile = (path) => existsSync(path) && statSync(path).isFile()

function findFile(base) {
  for (const ext of CANDIDATES) if (isFile(base + ext)) return base + ext
  return undefined
}

export async function resolve(specifier, context, next) {
  for (const [prefix, dir] of Object.entries(ALIASES)) {
    if (specifier.startsWith(prefix)) {
      const file = findFile(join(dir, specifier.slice(prefix.length)))
      if (file) return next(pathToFileURL(file).href, context)
    }
  }
  const relative = specifier.startsWith('./') || specifier.startsWith('../')
  if (relative && context.parentURL?.startsWith('file:') && !/\.[cm]?[jt]sx?$/.test(specifier)) {
    const file = findFile(resolvePath(dirname(fileURLToPath(context.parentURL)), specifier))
    if (file) return next(pathToFileURL(file).href, context)
  }
  return next(specifier, context)
}
