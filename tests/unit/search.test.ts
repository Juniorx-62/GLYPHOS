import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { LEXICON } from '../../src/catalog/search/lexicon.ts'
import { buildSearchIndex, createSearcher, type SearchDocument } from '../../src/catalog/search/engine.ts'
import { editDistance, fold, stem, tokenize } from '../../src/catalog/search/normalize.ts'
import { fixtureDocs } from '../fixtures/search-docs.ts'

describe('normalização', () => {
  it('remove acentos e pontuação', () => assert.equal(fold('Notificações — Calendário!'), 'notificacoes calendario'))
  it('reduz plurais em português e inglês', () => {
    assert.equal(stem('carrinhos'), 'carrinho')
    assert.equal(stem('botoes'), 'botao')
    assert.equal(stem('animais'), 'animal')
    assert.equal(stem('imagens'), 'imagem')
    assert.equal(stem('boxes'), 'box')
    assert.equal(stem('batteries'), 'battery')
    assert.equal(stem('bus'), 'bus')
  })
  it('ignora palavras vazias', () => assert.deepEqual(tokenize('carrinho de compras'), ['carrinho', 'compra']))
  it('distância de edição com transposição', () => {
    assert.equal(editDistance('calendar', 'calednar'), 1)
    assert.ok(editDistance('casa', 'mesa', 1) > 1)
  })
})

describe('busca', () => {
  const searcher = createSearcher(buildSearchIndex(fixtureDocs, LEXICON))
  const top = (q: string, n = 3) => searcher.search(q).hits.slice(0, n).map((h) => h.slug)

  it('"carrinho de compras" encontra o carrinho e os ícones de compra', () => {
    assert.equal(top('carrinho de compras')[0], 'shopping-cart')
    assert.ok(searcher.search('carrinho de compras').hits.some((h) => h.slug === 'cart-plus'))
  })
  it('busca em inglês e por sinônimo', () => {
    assert.equal(top('cart')[0], 'shopping-cart')
    assert.equal(top('lixeira')[0], 'trash')
    assert.equal(top('bin')[0], 'trash')
  })
  it('equivalentes do léxico (apagar → lixeira)', () => assert.ok(top('apagar').includes('trash')))
  it('sem acento, no plural e por prefixo', () => {
    assert.equal(top('calendario')[0], 'calendar')
    assert.equal(top('calendários')[0], 'calendar')
    assert.equal(top('calen')[0], 'calendar')
  })
  it('tolera um erro de digitação', () => assert.equal(top('calendr')[0], 'calendar'))
  it('o nome exato vence o prefixo de outra palavra', () => assert.notEqual(top('cart')[0], 'credit-card'))
  it('sem resultado com todas as palavras, devolve parciais marcados', () => {
    const r = searcher.search('carrinho zzzzzz')
    assert.equal(r.partial, true)
    assert.deepEqual(r.unmatched, ['zzzzzz'])
  })
  it('consulta vazia não devolve nada', () => assert.equal(searcher.search('  ').hits.length, 0))

  it('continua rápida com um catálogo grande (20 mil ícones)', () => {
    const docs: SearchDocument[] = []
    for (let i = 0; i < 20000; i++) {
      const base = fixtureDocs[i % fixtureDocs.length]
      docs.push({ ...base, slug: `${base.slug}-${i}`, name: { pt: `${base.name.pt} ${i}`, en: `${base.name.en} ${i}` } })
    }
    const big = createSearcher(buildSearchIndex(docs, LEXICON))
    const t0 = performance.now()
    for (const q of ['carrinho', 'calendario de eventos', 'lix', 'shopping cart', 'calendr']) big.search(q, { limit: 100 })
    const ms = (performance.now() - t0) / 5
    assert.ok(ms < 150, `média de ${ms.toFixed(1)} ms por busca`)
  })
})
