/**
 * Catalogue health report, computed from the real files: totals, distribution
 * by category, subcategory and style, icons without keywords, incomplete
 * metadata, look-alikes, invalid files and incomplete families.
 *
 *   npm run catalog:stats             print the report
 *   npm run catalog:stats -- --write  also save docs/audits/CATALOG_HEALTH.md
 *   npm run catalog:stats -- --json   machine-readable
 */
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { CATEGORIES } from '../../src/catalog/categories/index.ts'
import { STYLES } from '../../src/catalog/styles/index.ts'
import { ROOT, findSimilar, loadCatalog, parseArgs } from '../lib/catalog.ts'

const { flags } = parseArgs()
const { icons, problems } = loadCatalog()
const similar = findSimilar(icons)
const errors = problems.filter((p) => p.level === 'error')
const warnings = problems.filter((p) => p.level === 'warning')
const valid = icons.filter((i) => i.nodes.length && !errors.some((e) => e.subject === i.meta.slug))

const kw = (i: (typeof icons)[number]) => ({
  pt: (i.meta.synonyms?.pt?.length ?? 0) + (i.meta.tags?.pt?.length ?? 0),
  en: (i.meta.synonyms?.en?.length ?? 0) + (i.meta.tags?.en?.length ?? 0),
})
const noTags = icons.filter((i) => !(i.meta.tags?.pt?.length || i.meta.tags?.en?.length))
const fewKeywords = icons.filter((i) => kw(i).pt < 2 || kw(i).en < 2)
const noSub = icons.filter((i) => !i.meta.subcategory)

// Families: a family is incomplete when its base drawing (the slug equal to the family) is missing,
// or when some members have Solid/Duotone and others don't.
const families = new Map<string, typeof icons>()
for (const i of icons) if (i.meta.family) families.set(i.meta.family, [...(families.get(i.meta.family) ?? []), i])
const incompleteFamilies: string[] = []
for (const [family, members] of families) {
  const issues: string[] = []
  if (!icons.some((i) => i.meta.slug === family)) issues.push('sem o desenho base')
  const withSolid = members.filter((m) => m.styles.includes('solid')).length
  if (withSolid && withSolid < members.length) issues.push(`${members.length - withSolid} de ${members.length} sem Sólido/Duotone`)
  if (members.length === 1) issues.push('família de um ícone só')
  if (issues.length) incompleteFamilies.push(`${family}: ${issues.join(', ')}`)
}

const styleCount = Object.fromEntries(STYLES.map((s) => [s.id, valid.filter((i) => i.styles.includes(s.id)).length]))
const byCategory = CATEGORIES.map((c) => {
  const list = valid.filter((i) => i.category === c.id)
  const subs = c.subcategories.map((s) => [s.name.pt, list.filter((i) => i.meta.subcategory === s.id).length] as const)
  return { id: c.id, name: c.name.pt, count: list.length, solid: list.filter((i) => i.styles.includes('solid')).length, subs }
})
const popularity = [5, 4, 3, 2, 1].map((p) => [p, valid.filter((i) => i.meta.popularity === p).length] as const)

if (flags.has('json')) {
  console.log(JSON.stringify({ icons: icons.length, valid: valid.length, styles: styleCount, categories: byCategory, errors: errors.length, warnings: warnings.length, similar: similar.length, noTags: noTags.length, fewKeywords: fewKeywords.length, incompleteFamilies }, null, 2))
  process.exit(0)
}

const date = new Date().toISOString().slice(0, 10)
const lines: string[] = []
lines.push('# Saúde do catálogo', '', `> Gerado por \`npm run catalog:stats -- --write\` em ${date}, a partir dos arquivos de \`src/catalog\`. Os números registram o estado nesta data.`, '')
lines.push('## Resumo', '', '| Medida | Valor |', '| --- | --- |')
lines.push(`| Ícones (desenho + metadados) | ${icons.length} |`, `| Ícones válidos (publicados) | ${valid.length} |`)
lines.push(`| Categorias com ícones | ${byCategory.filter((c) => c.count).length} de ${CATEGORIES.length} |`)
lines.push(`| Famílias de conceito | ${families.size} |`)
lines.push(`| Erros de validação | ${errors.length} |`, `| Avisos de validação | ${warnings.length} |`, `| Possíveis duplicatas visuais | ${similar.length} |`, '')
lines.push('## Estilos', '', '| Estilo | Ícones | Cobertura |', '| --- | --- | --- |')
for (const s of STYLES) lines.push(`| ${s.name.pt} (${s.id}) | ${styleCount[s.id]} | ${valid.length ? Math.round((styleCount[s.id] / valid.length) * 100) : 0}% |`)
lines.push('', '## Categorias', '', '| Categoria | Ícones | Com Sólido | Subcategorias |', '| --- | --- | --- | --- |')
for (const c of byCategory) lines.push(`| ${c.name} (\`${c.id}\`) | ${c.count} | ${c.solid} | ${c.subs.map(([n, k]) => `${n} ${k}`).join(' · ')} |`)
lines.push('', '## Popularidade editorial', '', '| Nível | Ícones |', '| --- | --- |')
for (const [p, n] of popularity) lines.push(`| ${p} | ${n} |`)
const list = (title: string, items: string[], empty = 'Nenhum.') => {
  lines.push('', `## ${title}`, '')
  if (!items.length) lines.push(empty)
  else {
    for (const i of items.slice(0, 60)) lines.push(`- ${i}`)
    if (items.length > 60) lines.push(`- … e mais ${items.length - 60}.`)
  }
}
list('Ícones sem tags', noTags.map((i) => `${i.category}/${i.meta.slug}`))
list('Ícones com poucas palavras-chave (menos de 2 por idioma)', fewKeywords.map((i) => `${i.category}/${i.meta.slug} (pt ${kw(i).pt}, en ${kw(i).en})`))
list('Ícones sem subcategoria', noSub.map((i) => `${i.category}/${i.meta.slug}`))
list('Arquivos inválidos e metadados com erro', errors.map((e) => `${e.category ?? ''}/${e.subject}: ${e.message}`))
list('Possíveis duplicatas visuais', similar.map((p) => `${p.a.category}/${p.a.meta.slug} ≈ ${p.b.category}/${p.b.meta.slug} (${Math.round(p.score * 100)}%)`))
list('Famílias incompletas', incompleteFamilies)
list('Outros avisos', warnings.filter((w) => w.code !== 'keywords').map((w) => `${w.category ?? ''}/${w.subject}: ${w.message}`))

const report = lines.join('\n') + '\n'
console.log(report)
if (flags.has('write')) {
  writeFileSync(join(ROOT, 'docs/audits/CATALOG_HEALTH.md'), report)
  console.log('Gravado em docs/audits/CATALOG_HEALTH.md')
}
