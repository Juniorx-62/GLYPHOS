/**
 * Licensing check (docs/LICENSING.md): every icon names a registered source
 * and licence, the licence is one the source offers and allows commercial use
 * and redistribution, third-party sources declare where they come from, and
 * the LICENSE file and the credits exist.
 *
 *   npm run check:licenses
 */
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { LICENSES, SOURCES } from '../../src/catalog/licenses.ts'
import { ROOT, loadCatalog } from '../lib/catalog.ts'

const problems: string[] = []
const { icons } = loadCatalog()

for (const source of Object.values(SOURCES)) {
  if (source.kind === 'third-party' && !source.url) problems.push(`Fonte ${source.id}: recurso de terceiros sem endereço de origem (url).`)
  for (const id of source.licenses) {
    const license = LICENSES[id]
    if (!license) problems.push(`Fonte ${source.id}: licença ${id} não registrada.`)
    else if (!license.commercial || !license.redistribution) problems.push(`Fonte ${source.id}: a licença ${id} não permite uso comercial e redistribuição, exigidos pelo catálogo.`)
  }
}

const bySource = new Map<string, number>()
for (const icon of icons) {
  const { source, license, author, slug } = icon.meta
  bySource.set(source, (bySource.get(source) ?? 0) + 1)
  const def = SOURCES[source]
  if (!def) problems.push(`${icon.category}/${slug}: fonte "${source}" não registrada.`)
  else if (!def.licenses.includes(license)) problems.push(`${icon.category}/${slug}: a fonte ${source} não oferece a licença ${license}.`)
  if (!author?.trim()) problems.push(`${icon.category}/${slug}: sem autoria.`)
  if (def?.kind === 'original' && author !== 'GLYPHOS') problems.push(`${icon.category}/${slug}: desenho próprio com autoria "${author}" (esperado GLYPHOS).`)
}

const licenseFile = join(ROOT, 'LICENSE')
if (!existsSync(licenseFile) || !/MIT License/.test(readFileSync(licenseFile, 'utf8'))) problems.push('O arquivo LICENSE (MIT) dos ícones não existe ou não traz o texto da licença.')
const thirdParty = [...bySource.keys()].filter((s) => SOURCES[s as keyof typeof SOURCES]?.kind === 'third-party')
if (thirdParty.length && !existsSync(join(ROOT, 'docs/CREDITS.md'))) problems.push('Há recursos de terceiros, mas falta docs/CREDITS.md com as atribuições.')

if (problems.length) {
  console.error(`Licenças: ${problems.length} problema(s):\n  ${problems.join('\n  ')}`)
  process.exit(1)
}
console.log(`Licenças: ${icons.length} ícones, origens ${[...bySource].map(([s, n]) => `${s} (${n})`).join(', ')}, tudo registrado.`)
