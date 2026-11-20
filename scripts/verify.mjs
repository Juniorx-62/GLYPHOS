/**
 * The quick gate before every push: types, tests, dependency rules, brand,
 * licences and the catalogue (strict: any error fails, and the index must
 * build with every interface icon and every collection reference present).
 *
 *   npm run verify
 *
 * The slow checks (check:pages, check:seo, test:e2e) need a running server;
 * see docs/TESTING.md.
 */
import { spawnSync } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const node = process.execPath
const TS = ['--import', './scripts/lib/register-ts.mjs']

const steps = [
  ['Catálogo (validação)', [node, ...TS, 'scripts/validation/validate.ts', '--errors']],
  ['Índices do catálogo', [node, ...TS, 'scripts/catalog/build.ts', '--strict']],
  ['Tipos (tsc --noEmit)', [node, 'node_modules/typescript/bin/tsc', '--noEmit']],
  ['Testes', [node, ...TS, '--test', 'tests/unit/**/*.test.ts', 'tests/integration/**/*.test.ts']],
  ['Dependências', [node, 'scripts/validation/check-deps.mjs']],
  ['Licenças', [node, ...TS, 'scripts/validation/licenses.ts']],
  ['Marca', [node, ...TS, 'scripts/brand/generate.ts', '--check']],
]

let failed = 0
for (const [label, [cmd, ...args]] of steps) {
  const t0 = Date.now()
  const run = spawnSync(cmd, args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
  const seconds = ((Date.now() - t0) / 1000).toFixed(1)
  const output = `${run.stdout ?? ''}${run.stderr ?? ''}`.trim()
  if (run.status === 0) console.log(`✓ ${label} (${seconds} s)`)
  else {
    failed++
    console.log(`✗ ${label} (${seconds} s)\n${output.split('\n').slice(-40).join('\n').replace(/^/gm, '    ')}`)
  }
}
if (failed) {
  console.log(`\n${failed} verificação(ões) falharam. Corrija antes do push.`)
  process.exit(1)
}
console.log('\nTudo certo para o push.')
