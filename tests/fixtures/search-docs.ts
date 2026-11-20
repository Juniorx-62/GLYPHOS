import type { SearchDocument } from '../../src/catalog/search/engine.ts'

const cat = (id: string, pt: string, en: string) => ({ id, pt, en })
const commerce = cat('commerce', 'Comércio e pagamentos', 'Commerce & payments')
const finance = cat('finance', 'Finanças', 'Finance')
const ui = cat('interface', 'Interface', 'Interface')
const time = cat('time', 'Tempo e calendário', 'Time & calendar')

/** A small, fixed catalogue for search tests (independent of the real one). */
export const fixtureDocs: SearchDocument[] = [
  {
    slug: 'shopping-cart',
    name: { pt: 'Carrinho de compras', en: 'Shopping cart' },
    synonyms: { pt: ['carrinho', 'cesta'], en: ['cart', 'basket'] },
    tags: { pt: ['comprar', 'loja', 'checkout'], en: ['buy', 'shop', 'ecommerce'] },
    category: commerce,
    popularity: 5,
  },
  {
    slug: 'cart-plus',
    name: { pt: 'Adicionar ao carrinho', en: 'Add to cart' },
    synonyms: { pt: ['incluir no carrinho'], en: ['cart add'] },
    tags: { pt: ['comprar'], en: ['buy'] },
    category: commerce,
    family: 'shopping-cart',
    popularity: 4,
  },
  {
    slug: 'credit-card',
    name: { pt: 'Cartão de crédito', en: 'Credit card' },
    synonyms: { pt: ['cartão', 'débito'], en: ['card', 'debit card'] },
    tags: { pt: ['pagamento'], en: ['payment'] },
    category: finance,
    popularity: 5,
  },
  {
    slug: 'trash',
    name: { pt: 'Lixeira', en: 'Trash' },
    synonyms: { pt: ['lixo', 'cesto'], en: ['bin', 'garbage'] },
    tags: { pt: ['excluir', 'remover'], en: ['delete', 'remove'] },
    category: ui,
    popularity: 5,
  },
  {
    slug: 'calendar',
    name: { pt: 'Calendário', en: 'Calendar' },
    synonyms: { pt: ['agenda'], en: ['schedule'] },
    tags: { pt: ['data', 'evento'], en: ['date', 'event'] },
    category: time,
    popularity: 4,
  },
  {
    slug: 'clock',
    name: { pt: 'Relógio', en: 'Clock' },
    synonyms: { pt: ['hora'], en: ['time'] },
    tags: { pt: ['horário'], en: ['hour'] },
    category: time,
    popularity: 5,
  },
]
