import { createFileRoute, notFound, redirect } from '@tanstack/react-router'
import { categoryById, loadIcons, loadManifest, loadShard, relatedEntries, resolveAlias } from '~/catalog'
import { IconDetail, type IconDetailData } from '~/features/icon-preview/IconDetail'
import { breadcrumbLd, clip, iconLd, pageHead } from '~/lib/seo'

export const Route = createFileRoute('/icons/$slug')({
  loader: async ({ params }): Promise<IconDetailData> => {
    const manifest = await loadManifest()
    const entry = manifest.find((e) => e.slug === params.slug)
    if (!entry) {
      const renamed = resolveAlias(params.slug)
      if (renamed) throw redirect({ to: '/icons/$slug', params: { slug: renamed }, statusCode: 301 })
      throw notFound()
    }
    const icon = (await loadShard(entry.category))[entry.slug]
    if (!icon) throw notFound()
    const related = relatedEntries(icon, manifest, 18)
    const family = icon.family ? manifest.filter((e) => e.family === icon.family) : []
    const relatedIcons = Object.fromEntries((await loadIcons([...new Set([...related, ...family].map((e) => e.slug))])).map((i) => [i.slug, i]))
    const siblings = manifest.filter((e) => e.category === entry.category)
    const at = siblings.findIndex((e) => e.slug === entry.slug)
    const neighbour = (i: number) => (siblings[i] ? { slug: siblings[i].slug, name: siblings[i].name.pt } : undefined)
    return { icon, related, relatedIcons, family, prev: neighbour(at - 1), next: neighbour(at + 1) }
  },
  head: ({ loaderData }) => {
    if (!loaderData) return {}
    const { icon } = loaderData
    const category = categoryById(icon.category)
    const keywords = [...icon.synonyms.pt, ...icon.tags.pt, ...icon.synonyms.en, ...icon.tags.en]
    const description = clip(
      `Ícone "${icon.name.pt}" (${icon.name.en}) em SVG, da categoria ${category?.name.pt}. ${keywords.length ? `Também para: ${keywords.slice(0, 6).join(', ')}.` : ''} Copie em SVG, JSX ou CSS, ou baixe em PNG. Licença MIT.`,
    )
    const path = `/icons/${icon.slug}`
    // Up to 70 characters: long names drop the slug from the title (it stays in the page and the URL).
    const full = `${icon.name.pt} · ícone SVG ${icon.slug} · GLYPHOS`
    return pageHead({
      title: full.length <= 70 ? full : `${icon.name.pt} · ícone SVG · GLYPHOS`,
      description,
      path,
      type: 'article',
      jsonLd: [
        iconLd({
          name: `${icon.name.pt} (${icon.name.en})`,
          description,
          path,
          image: `/svg/outline/${icon.slug}.svg`,
          keywords,
          license: 'https://opensource.org/license/mit',
          author: icon.author,
          dateCreated: icon.added,
        }),
        breadcrumbLd([
          { name: 'Ícones', path: '/icons' },
          { name: category?.name.pt ?? icon.category, path: `/categories/${icon.category}` },
          { name: icon.name.pt, path },
        ]),
      ],
    })
  },
  component: IconPage,
})

function IconPage() {
  const data = Route.useLoaderData()
  return <IconDetail key={data.icon.slug} data={data} />
}
