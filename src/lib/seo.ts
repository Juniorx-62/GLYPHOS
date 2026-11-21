/**
 * Builds the <head> of a page for search engines and link previews: title,
 * description, canonical URL, robots, Open Graph, Twitter card and JSON-LD.
 *
 * TanStack merges `head()` from the root to the leaf: the deepest route wins
 * for `title` and for any meta with the same name/property, while links are
 * concatenated. So only leaf routes call `pageHead` (one canonical per page).
 */
import type { JSX } from 'react'
import { SITE_IMAGE, SITE_LANGUAGE, SITE_LOCALE, SITE_NAME, SITE_URL, absoluteUrl } from './site'

type JsonLd = Record<string, unknown>
type MetaTag = JSX.IntrinsicElements['meta']
type LinkTag = JSX.IntrinsicElements['link']

/** TanStack renders `{ 'script:ld+json': data }` as an escaped JSON-LD script; the head() type only lists <meta>. */
const ldJson = (data: JsonLd) => ({ 'script:ld+json': data }) as unknown as MetaTag

export interface PageSeo {
  /** Full document title, already with the site name. */
  title: string
  /** 50–160 characters, plain Portuguese. */
  description: string
  /** Canonical path, without query string. */
  path: string
  /** Pages built from the visitor's own data. */
  noindex?: boolean
  type?: 'website' | 'article'
  image?: { url: string; width: number; height: number; alt: string }
  jsonLd?: JsonLd[]
}

/** Shortens text to `max` characters on a word boundary. */
export function clip(text: string, max = 160) {
  const clean = text.replace(/\s+/g, ' ').trim()
  if (clean.length <= max) return clean
  const cut = clean.slice(0, max - 1)
  const at = cut.lastIndexOf(' ')
  return `${(at > max * 0.6 ? cut.slice(0, at) : cut).replace(/[\s,;:.(–-]+$/, '')}…`
}

export function pageHead({ title, description, path, noindex, type = 'website', image = SITE_IMAGE, jsonLd = [] }: PageSeo) {
  const url = absoluteUrl(path)
  const meta: MetaTag[] = [
    { title },
    { name: 'description', content: description },
    { name: 'robots', content: noindex ? 'noindex, follow' : 'index, follow, max-image-preview:large' },
    { property: 'og:type', content: type },
    { property: 'og:site_name', content: SITE_NAME },
    { property: 'og:locale', content: SITE_LOCALE },
    { property: 'og:url', content: url },
    { property: 'og:title', content: title },
    { property: 'og:description', content: description },
    { property: 'og:image', content: image.url },
    { property: 'og:image:width', content: String(image.width) },
    { property: 'og:image:height', content: String(image.height) },
    { property: 'og:image:alt', content: image.alt },
    { name: 'twitter:card', content: 'summary_large_image' },
    { name: 'twitter:title', content: title },
    { name: 'twitter:description', content: description },
    { name: 'twitter:image', content: image.url },
    ...(noindex ? [] : jsonLd.map(ldJson)),
  ]
  const links: LinkTag[] = noindex ? [] : [{ rel: 'canonical', href: url }]
  return { meta, links }
}

/* ------------------------------------------------------------- JSON-LD */

const WEBSITE_ID = `${SITE_URL}/#website`

export function websiteLd(description: string): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': WEBSITE_ID,
    name: SITE_NAME,
    url: `${SITE_URL}/`,
    description,
    inLanguage: SITE_LANGUAGE,
    potentialAction: {
      '@type': 'SearchAction',
      target: { '@type': 'EntryPoint', urlTemplate: `${SITE_URL}/icons?q={search_term_string}` },
      'query-input': 'required name=search_term_string',
    },
  }
}

export interface Crumb {
  name: string
  path: string
}

export function breadcrumbLd(crumbs: Crumb[]): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.name, item: absoluteUrl(c.path) })),
  }
}

/** A page that lists icons (category, collection). */
export function collectionLd({ name, description, path, items }: { name: string; description: string; path: string; items: Crumb[] }): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name,
    description,
    url: absoluteUrl(path),
    inLanguage: SITE_LANGUAGE,
    isPartOf: { '@id': WEBSITE_ID },
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: items.length,
      itemListElement: items.slice(0, 200).map((item, i) => ({ '@type': 'ListItem', position: i + 1, name: item.name, url: absoluteUrl(item.path) })),
    },
  }
}

/** One icon: an image with its licence, author and keywords. */
export function iconLd({ name, description, path, image, keywords, license, author, dateCreated }: {
  name: string
  description: string
  path: string
  image: string
  keywords: string[]
  license: string
  author: string
  dateCreated: string
}): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'ImageObject',
    name,
    description,
    url: absoluteUrl(path),
    contentUrl: absoluteUrl(image),
    encodingFormat: 'image/svg+xml',
    keywords: keywords.join(', '),
    license,
    acquireLicensePage: absoluteUrl('/about#licenca'),
    creditText: author,
    creator: { '@type': 'Organization', name: author },
    copyrightNotice: `© ${author}`,
    dateCreated,
    inLanguage: SITE_LANGUAGE,
    isPartOf: { '@id': WEBSITE_ID },
  }
}
