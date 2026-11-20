/**
 * Checks the catalogue: metadata, drawings, roles, licences, references and
 * look-alike icons. Exit code 1 when there is any error.
 *
 *   npm run catalog:validate
 *   npm run catalog:validate -- --category=animals,food   only these categories
 *   npm run catalog:validate -- --errors                  hide warnings
 *   npm run catalog:validate -- --no-similar              skip the look-alike search (faster)
 *   npm run catalog:validate -- --json                    machine-readable output
 */
import { findSimilar, loadCatalog, parseArgs, printProblems } from '../lib/catalog.ts'

const { flags, list } = parseArgs()
const only = list('category')
const t0 = Date.now()
const { icons, problems } = loadCatalog({ only })

if (!flags.has('no-similar')) {
  // Look-alikes are searched across the whole catalogue, even when checking one category.
  const all = only ? loadCatalog().icons : icons
  for (const pair of findSimilar(all)) {
    if (only && !only.includes(pair.a.category) && !only.includes(pair.b.category)) continue
    problems.push({
      level: 'warning',
      code: 'similar',
      subject: pair.a.meta.slug,
      category: pair.a.category,
      message: `Parece muito com ${pair.b.category}/${pair.b.meta.slug} (${Math.round(pair.score * 100)}% de sobreposição). Diferencie os desenhos ou relacione-os (family/variantOf).`,
    })
  }
}

const errors = problems.filter((p) => p.level === 'error')
const warnings = problems.filter((p) => p.level === 'warning')
if (flags.has('json')) {
  console.log(JSON.stringify({ icons: icons.length, errors, warnings }, null, 2))
} else {
  printProblems(problems, { warnings: !flags.has('errors') })
  console.log(`\n${icons.length} ícones conferidos em ${((Date.now() - t0) / 1000).toFixed(1)} s: ${errors.length} erro(s), ${warnings.length} aviso(s).`)
}
process.exitCode = errors.length ? 1 : 0
