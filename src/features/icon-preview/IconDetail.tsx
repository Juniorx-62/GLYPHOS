import { Link } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { LICENSES, SOURCES, STYLES, categoryById } from '~/catalog'
import type { ManifestEntry, ShardIcon, StyleId } from '~/catalog/types'
import { recordView } from '~/data/stores/history'
import { updateSettings, useAppearance, useSettings } from '~/data/stores/settings'
import { useHydrated } from '~/hooks/use-media-query'
import { cn, formatDate } from '~/lib/utils'
import { Glyph } from '~/components/icons/Glyph'
import { UiIcon } from '~/components/icons/UiIcon'
import { Button, Chip, Segmented, SectionHeader } from '~/components/ui/primitives'
import { AppearanceControls } from '~/features/customization/AppearanceControls'
import { CodePanel, PngExport, QuickExportActions } from '~/features/export/ExportPanel'
import { useIconExport } from '~/features/export/use-export'
import { StaticIconGrid } from '~/features/exploration/IconGrid'
import { CollectionMenu, FavoriteButton } from './IconActions'

export interface IconDetailData {
  icon: ShardIcon
  related: ManifestEntry[]
  relatedIcons: Record<string, ShardIcon>
  family: ManifestEntry[]
  prev?: { slug: string; name: string }
  next?: { slug: string; name: string }
}

const SCALES = [16, 20, 24, 32, 48, 64]
type Background = 'surface' | 'grid' | 'transparent' | 'inverse'

export function IconDetail({ data }: { data: IconDetailData }) {
  const { icon, related, relatedIcons, family } = data
  const hydrated = useHydrated()
  const settings = useSettings()
  const appearance = useAppearance()
  const [background, setBackground] = useState<Background>('grid')
  const category = categoryById(icon.category)
  const subcategory = category?.subcategories.find((s) => s.id === icon.subcategory)
  const style: StyleId = icon.styles.includes(appearance.style) ? appearance.style : 'outline'
  const ex = useIconExport(icon)
  const license = LICENSES[icon.license]
  const source = SOURCES[icon.source]

  useEffect(() => recordView(icon.slug), [icon.slug])

  const glyph = (size: number, extra: { style?: StyleId; color?: string; className?: string; label?: string } = {}) => {
    const s = extra.style ?? style
    return (
      <Glyph
        nodes={icon.nodes}
        override={icon.overrides?.[s]}
        style={s}
        size={size}
        strokeWidth={appearance.strokeWidth}
        color={extra.color ?? appearance.color}
        opacity={appearance.opacity}
        className={extra.className}
        label={extra.label}
      />
    )
  }

  return (
    <div className="mx-auto max-w-[1440px] px-4 pt-6 sm:px-6">
      <nav aria-label="Trilha" className="flex flex-wrap items-center gap-1.5 text-sm text-fg-subtle">
        <Link to="/icons" className="hover:text-fg">
          Ícones
        </Link>
        <UiIcon name="chevron-right" size={14} />
        <Link to="/categories/$categoryId" params={{ categoryId: icon.category }} className="hover:text-fg">
          {category?.name.pt}
        </Link>
        <UiIcon name="chevron-right" size={14} />
        <span aria-current="page" className="text-fg-muted">
          {icon.name.pt}
        </span>
      </nav>

      <div className="mt-5 grid gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        {/* Preview */}
        <section aria-label="Prévia" className="grid content-start gap-4">
          <div
            className={cn(
              'relative grid aspect-square place-items-center overflow-hidden rounded-md',
              background === 'grid' && 'canvas-grid bg-surface',
              background === 'surface' && 'bg-surface',
              background === 'transparent' && 'checkerboard',
              background === 'inverse' && 'bg-fg text-background',
            )}
            style={background === 'grid' ? { backgroundSize: 'calc(100% / 24) calc(100% / 24)' } : undefined}
          >
            {background === 'grid' && <span aria-hidden className="pointer-events-none absolute inset-[8.333%] rounded-xs border border-dashed border-accent/40" />}
            {background === 'grid' && (
              <svg aria-hidden viewBox="0 0 24 24" className="pointer-events-none absolute inset-0 size-full" fill="none" style={{ stroke: 'var(--color-border-strong)' }} strokeWidth="0.04" opacity="0.6">
                <circle cx="12" cy="12" r="9" />
                <rect x="3" y="3" width="18" height="18" rx="3" />
                <path d="M12 0V24M0 12H24" />
              </svg>
            )}
            {glyph(320, { className: 'h-[78%] w-[78%]', label: icon.name.pt, color: background === 'inverse' && appearance.color === 'currentColor' ? 'currentColor' : appearance.color })}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Segmented
              label="Fundo da prévia"
              size="sm"
              value={background}
              onChange={setBackground}
              options={[
                { value: 'grid', label: 'Grid' },
                { value: 'surface', label: 'Liso' },
                { value: 'transparent', label: 'Transparente' },
                { value: 'inverse', label: 'Invertido' },
              ]}
            />
            <span className="text-xs text-fg-subtle">{background === 'grid' ? 'Grid de 24 unidades; a linha tracejada marca a área viva.' : ''}</span>
          </div>
          <div className="mt-4 grid gap-8 sm:grid-cols-[1fr_auto] sm:items-end">
            <div>
              <h2 className="text-sm text-fg-muted">Em escala</h2>
              <ul className="mt-4 flex flex-wrap items-end gap-x-6 gap-y-3 text-fg">
                {SCALES.map((s, i) => (
                  <li key={s} className={cn('flex-col items-center gap-2', i === SCALES.length - 1 ? 'hidden sm:flex' : 'flex')}>
                    {glyph(s)}
                    <span className="inscription text-fg-subtle">{s}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h2 className="text-sm text-fg-muted">Estilos</h2>
              <ul className="mt-4 flex gap-1">
                {STYLES.filter((s) => icon.styles.includes(s.id) || s.derivation !== 'manual').map((s) => {
                  const has = icon.styles.includes(s.id)
                  return (
                    <li key={s.id}>
                      <button
                        type="button"
                        disabled={!has}
                        aria-pressed={s.id === style}
                        aria-label={has ? s.name.pt : `${s.name.pt}: indisponível, o desenho não tem silhueta fechada`}
                        title={has ? s.name.pt : `${s.name.pt}: sem silhueta fechada`}
                        onClick={() => updateSettings({ appearance: { style: s.id } })}
                        className={cn(
                          'grid size-14 place-items-center rounded-md transition-colors duration-fast',
                          s.id === style ? 'bg-surface text-fg shadow-[inset_0_0_0_1px_var(--color-fg)]' : 'text-fg-muted hover:bg-surface hover:text-fg',
                          !has && 'cursor-not-allowed text-fg-disabled hover:bg-transparent',
                        )}
                      >
                        {has ? glyph(28, { style: s.id }) : <span className="inscription">—</span>}
                      </button>
                    </li>
                  )
                })}
              </ul>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 overflow-hidden rounded-md">
            {(['light', 'dark'] as const).map((t) => (
              <div key={t} data-theme={t} className="flex items-center gap-3 bg-background px-4 py-3 text-fg">
                {glyph(20)}
                <p className="min-w-0 truncate text-sm text-fg-muted">Tema {t === 'light' ? 'claro' : 'escuro'}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Identity, actions and customisation */}
        <section aria-labelledby="icon-title" className="order-first grid content-start gap-6 lg:order-none">
          <div>
            <h1 id="icon-title" className="text-2xl font-medium text-fg sm:text-3xl">
              {icon.name.pt}
            </h1>
            <p className="mt-1 text-base text-fg-muted">{icon.name.en}</p>
            <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2">
              <button type="button" onClick={() => ex.copyIdentifier('slug')} className="inscription inline-flex min-h-7 items-center gap-1.5 text-fg-muted hover:text-fg" title="Copiar o nome técnico">
                {icon.slug}
                <UiIcon name="copy" size={12} />
              </button>
              <button type="button" onClick={() => ex.copyIdentifier('id')} className="inscription inline-flex min-h-7 items-center gap-1.5 text-fg-subtle hover:text-fg" title="Copiar o identificador estável">
                id {icon.id}
                <UiIcon name="copy" size={12} />
              </button>
            </div>
          </div>

          <QuickExportActions icon={icon} />
          <div className="flex flex-wrap gap-2">
            <FavoriteButton slug={icon.slug} name={icon.name.pt} withLabel />
            <CollectionMenu slug={icon.slug} name={icon.name.pt} />
          </div>

          <div className="border-t border-border pt-6">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-md font-medium text-fg">Personalizar</h2>
              {hydrated && settings.appearance.style !== style && <span className="text-xs text-fg-subtle">Este ícone não tem {STYLES.find((s) => s.id === settings.appearance.style)?.name.pt}: mostrando Contorno.</span>}
            </div>
            <AppearanceControls available={icon.styles} idPrefix="detail" />
          </div>
        </section>
      </div>

      {/* Variations */}
      {/* Code & export */}
      <section className="mt-20 grid gap-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]" aria-labelledby="code-title">
        <div>
          <SectionHeader id="code-title" title="Código" description="Gerado com a personalização atual. O arquivo original do catálogo não muda." />
          <CodePanel icon={icon} />
        </div>
        <div className="grid content-start gap-8">
          <div>
            <SectionHeader title="Imagem PNG" as="h3" />
            <PngExport icon={icon} />
          </div>
          <div>
            <SectionHeader title="Como usar" as="h3" />
            <ol className="grid gap-2 text-sm text-fg-muted">
              <li>
                <strong className="font-medium text-fg">HTML:</strong> cole o SVG direto na página; ele assume a cor do texto (<code className="inscription">currentColor</code>).
              </li>
              <li>
                <strong className="font-medium text-fg">React:</strong> salve o JSX como <code className="inscription">{icon.slug}.jsx</code> e use{' '}
                <code className="inscription">{`<${ex.text('jsx').match(/function (\w+)/)?.[1] ?? 'Icon'} size={20} />`}</code>.
              </li>
              <li>
                <strong className="font-medium text-fg">CSS:</strong> a classe <code className="inscription">.icon-{icon.slug}</code> pinta o ícone com máscara, na cor do texto.
              </li>
              <li>
                <strong className="font-medium text-fg">Arquivo estático:</strong>{' '}
                <a href={`/svg/${style}/${icon.slug}.svg`} className="text-fg underline underline-offset-2" target="_blank" rel="noopener">
                  /svg/{style}/{icon.slug}.svg
                </a>
              </li>
            </ol>
          </div>
        </div>
      </section>

      {/* Metadata */}
      <section className="mt-20" aria-labelledby="meta-title">
        <SectionHeader id="meta-title" title="Detalhes" />
        <div className="grid gap-x-16 gap-y-8 lg:grid-cols-2">
          <dl className="grid grid-cols-[minmax(0,9rem)_1fr] content-start gap-x-4 gap-y-3 text-sm">
            <Meta label="Categoria">
              <Link to="/categories/$categoryId" params={{ categoryId: icon.category }} className="text-fg hover:underline">
                {category?.name.pt}
              </Link>
              {subcategory ? <span className="text-fg-muted"> · {subcategory.name.pt}</span> : null}
            </Meta>
            <Meta label="Estilos">{icon.styles.map((s) => STYLES.find((d) => d.id === s)?.name.pt).join(', ')}</Meta>
            <Meta label="Nome técnico">
              <code className="inscription">{icon.slug}</code>
            </Meta>
            <Meta label="Identificador">
              <code className="inscription">{icon.id}</code>
            </Meta>
            {icon.aliases?.length ? <Meta label="Nomes antigos">{icon.aliases.join(', ')}</Meta> : null}
            <Meta label="Adicionado em">{formatDate(icon.added)}</Meta>
            {icon.updated && <Meta label="Atualizado em">{formatDate(icon.updated)}</Meta>}
            <Meta label="Autoria">{icon.author}</Meta>
            <Meta label="Origem">{source?.name ?? icon.source}</Meta>
            <Meta label="Licença">
              <a href={license?.url} target="_blank" rel="noopener" className="text-fg underline underline-offset-2">
                {license?.name ?? icon.license}
              </a>
              <span className="block text-xs text-fg-subtle">Uso livre, inclusive comercial. Mantenha o aviso de licença ao redistribuir o conjunto.</span>
            </Meta>
          </dl>
          <div className="grid content-start gap-5">
            <KeywordList title="Sinônimos" items={[...icon.synonyms.pt, ...icon.synonyms.en]} />
            <KeywordList title="Tags em português" items={icon.tags.pt} />
            <KeywordList title="Tags em inglês" items={icon.tags.en} />
          </div>
        </div>
      </section>

      {family.length > 1 && (
        <section className="mt-20" aria-labelledby="family-title">
          <SectionHeader id="family-title" title="Da mesma família" description="Variações do mesmo conceito, com modificadores." />
          <StaticIconGrid entries={family} icons={relatedIcons} options={{ appearance: { ...appearance, style }, showNames: true, density: 'comfortable' }} label="Ícones da mesma família" />
        </section>
      )}

      {related.length > 0 && (
        <section className="mt-20" aria-labelledby="related-title">
          <SectionHeader
            id="related-title"
            title="Ícones relacionados"
            action={
              <Link to="/categories/$categoryId" params={{ categoryId: icon.category }}>
                <Button size="sm" variant="ghost">
                  Ver toda a categoria
                </Button>
              </Link>
            }
          />
          <StaticIconGrid entries={related} icons={relatedIcons} options={{ appearance: { ...appearance, style }, showNames: true, density: 'comfortable' }} label="Ícones relacionados" />
        </section>
      )}

      {(data.prev || data.next) && (
        <nav aria-label="Ícone anterior e próximo da categoria" className="mt-12 flex justify-between gap-4 border-t border-border pt-6">
          {data.prev ? (
            <Link to="/icons/$slug" params={{ slug: data.prev.slug }} className="group flex items-center gap-2 text-sm text-fg-muted hover:text-fg">
              <UiIcon name="arrow-left" size={16} />
              {data.prev.name}
            </Link>
          ) : (
            <span />
          )}
          {data.next && (
            <Link to="/icons/$slug" params={{ slug: data.next.slug }} className="group flex items-center gap-2 text-sm text-fg-muted hover:text-fg">
              {data.next.name}
              <UiIcon name="arrow-right" size={16} />
            </Link>
          )}
        </nav>
      )}
    </div>
  )
}

function Meta({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <>
      <dt className="text-fg-subtle">{label}</dt>
      <dd className="min-w-0 text-fg-muted">{children}</dd>
    </>
  )
}

function KeywordList({ title, items: all }: { title: string; items: string[] }) {
  // The same word can come from both languages ("modem"): show it once.
  const items = [...new Set(all)]
  if (!items.length) return null
  return (
    <div>
      <h3 className="text-xs font-medium text-fg-subtle">{title}</h3>
      <ul className="mt-2 flex flex-wrap gap-1.5">
        {items.map((t) => (
          <li key={t}>
            <a href={`/icons?q=${encodeURIComponent(t)}`} className="inline-flex">
              <Chip>{t}</Chip>
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}
