/**
 * Catalogue icons the GLYPHOS interface itself uses. The interface is drawn
 * with its own library: `npm run catalog:index` copies these drawings into
 * src/catalog/registry/generated/ui-icons.json (bundled with the app) and fails
 * when one of them is missing from the catalogue.
 */
export const UI_ICON_NAMES = [
  'search', 'x', 'plus', 'minus', 'check', 'copy', 'trash', 'link', 'bookmark', 'more-horizontal', 'settings', 'sliders', 'filter',
  'external-link', 'info', 'triangle-alert', 'circle-check', 'eye', 'menu',
  'chevron-down', 'chevron-up', 'chevron-left', 'chevron-right', 'arrow-right', 'arrow-left', 'arrow-up-right', 'arrows-up-down', 'rotate-cw',
  'layout-grid', 'layers', 'list', 'file', 'folder', 'download', 'upload', 'image', 'code', 'clock', 'history', 'lock', 'user',
  'mail', 'monitor', 'keyboard', 'command', 'sun', 'moon', 'heart', 'star', 'share', 'shopping-cart', 'tag', 'map-pin', 'house',
] as const

export type UiIconName = (typeof UI_ICON_NAMES)[number]
