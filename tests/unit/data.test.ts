import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { BACKUP_APP, restoreBackup } from '../../src/data/backup.ts'
import { cleanSettings } from '../../src/data/stores/settings.ts'
import { cleanSlugEntries } from '../../src/data/validate.ts'

describe('dados locais', () => {
  it('limpa listas de favoritos e histórico vindas do armazenamento', () => {
    const now = new Date().toISOString()
    const out = cleanSlugEntries(
      [
        { slug: 'trash', at: now },
        { slug: 'trash', at: now },
        { slug: 'Bad Slug', at: now },
        { slug: 'clock', at: 'ontem' },
        { slug: 'mail', at: now },
        'lixo',
      ],
      10,
    )
    assert.deepEqual(out?.map((e) => e.slug), ['trash', 'mail'])
    assert.equal(cleanSlugEntries({}, 10), undefined)
  })

  it('preferências inválidas voltam ao padrão, valores fora da faixa são limitados', () => {
    const s = cleanSettings({ theme: 'roxo', appearance: { style: 'neon', strokeWidth: 99, color: 'red; background:url(x)', size: -4, opacity: 3 }, previewBackground: 'url(x)' })!
    assert.equal(s.theme, 'light')
    assert.equal(s.appearance.style, 'outline')
    assert.equal(s.appearance.strokeWidth, 2.5)
    assert.equal(s.appearance.color, 'currentColor')
    assert.equal(s.appearance.size, 12)
    assert.equal(s.appearance.opacity, 1)
    assert.equal(s.previewBackground, 'surface')
  })

  it('a cópia de segurança recusa arquivos de outro app ou danificados, sem aplicar nada', async () => {
    assert.equal((await restoreBackup({ app: 'outro' })).ok, false)
    assert.equal((await restoreBackup({ app: BACKUP_APP, version: 99, stores: {} })).ok, false)
    const damaged = await restoreBackup({ app: BACKUP_APP, version: 1, stores: { favorites: { v: 1, data: 'não é lista' } } })
    assert.equal(damaged.ok, false)
  })

  it('a cópia de segurança aceita um arquivo válido', async () => {
    const result = await restoreBackup({
      app: BACKUP_APP,
      version: 1,
      stores: {
        favorites: { v: 1, data: [{ slug: 'trash', at: new Date().toISOString() }] },
        collections: { v: 1, data: [{ id: 'abc123', name: 'Loja', icons: ['shopping-cart'], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }] },
      },
    })
    assert.deepEqual(result, { ok: true, restored: ['favorites', 'collections'] })
  })
})
