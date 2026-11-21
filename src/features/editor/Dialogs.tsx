/** Dialogs of the editor: export, Style Matching and inserting a library icon. */
import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react'
import { loadIcon } from '~/catalog'
import { derivableStyles, pack, unpack } from '~/catalog/styles'
import type { StyleId } from '~/catalog/types'
import type { CreationDoc } from '~/data/types'
import { Glyph } from '~/components/icons/Glyph'
import { UiIcon } from '~/components/icons/UiIcon'
import { Button, Checkbox, ColorButton, IconButton, Segmented, Select, TextInput } from '~/components/ui/primitives'
import { toast } from '~/components/ui/toast'
import { CodePanel, PngExport, QuickExportActions, type ExportableIcon } from '~/features/export/ExportPanel'
import type { ExportOptions } from '~/features/export/formats'
import { LazyGlyph } from '~/features/exploration/LazyGlyph'
import { useIconSearch } from '~/features/search/use-search'
import { downloadBlob } from '~/lib/utils'
import { applyStyleMatch, insertShapes, restorePrevious } from './actions'
import { fitArtboard } from './camera'
import { emptyDoc, GLYPHOS_STROKE } from './model/doc'
import { scaleShape } from './model/geometry'
import { docToNodes, nodesToShapes } from './model/serialize'
import { DEFAULT_MATCH, matchStyle, type MatchOptions } from './model/style-match'
import { creationFile, slugify } from './project-file'
import { currentDoc, editor, load, useEditor } from './state'

/** A native <dialog> that opens when `open` is true and reports Esc / backdrop. */
export function Dialog({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title: string; children: ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null)
  const id = useId()
  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) d.showModal()
    if (!open && d.open) d.close()
  }, [open])
  return (
    <dialog
      ref={ref}
      aria-labelledby={id}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      className={`m-auto max-h-[min(92dvh,900px)] w-[calc(100%-24px)] overflow-hidden rounded-xl border border-border bg-surface p-0 text-fg shadow-lg backdrop:bg-black/40 ${wide ? 'max-w-4xl' : 'max-w-xl'}`}
    >
      {open && (
        <div className="flex max-h-[inherit] flex-col">
          <header className="flex items-center justify-between gap-2 border-b border-border px-5 py-3">
            <h2 id={id} className="text-md font-semibold">
              {title}
            </h2>
            <IconButton icon="x" label="Fechar" onClick={onClose} />
          </header>
          <div className="overflow-y-auto px-5 py-4">{children}</div>
        </div>
      )}
    </dialog>
  )
}

/* --------------------------------------------------------------- export */

export function ExportDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const doc = useEditor(currentDoc)
  const project = useEditor((s) => s.project)
  const nodes = useMemo(() => docToNodes(doc), [doc])
  const styles = derivableStyles(nodes)
  const [style, setStyle] = useState<StyleId>('outline')
  const [size, setSize] = useState(24)
  const [color, setColor] = useState<'currentColor' | 'custom'>('currentColor')
  const [hex, setHex] = useState('#151514')
  const id = useId()
  const effective = styles.includes(style) ? style : 'outline'
  const slug = slugify(project.name)
  const icon: ExportableIcon = useMemo(
    () => ({ id: project.id ?? 'rascunho', slug, name: { pt: project.name, en: project.name }, nodes: pack(nodes), styles, box: doc.box }),
    [project.id, slug, project.name, nodes, styles, doc.box],
  )
  const options: Partial<ExportOptions> = { style: effective, size, color: color === 'currentColor' ? 'currentColor' : hex, strokeWidth: (GLYPHOS_STROKE * doc.box) / 24, opacity: 1 }
  const empty = !nodes.length
  return (
    <Dialog open={open} onClose={onClose} title="Exportar ícone" wide>
      {empty ? (
        <p className="text-sm text-fg-muted">A prancheta está vazia (ou só tem formas ocultas). Desenhe algo para exportar.</p>
      ) : (
        <div className="grid gap-6 md:grid-cols-[220px_minmax(0,1fr)]">
          <div className="grid content-start gap-4">
            <div className="grid aspect-square place-items-center rounded-lg border border-border bg-background-subtle text-fg" style={doc.background ? { background: doc.background, color: doc.background === '#151514' ? '#f2f2f0' : '#151514' } : undefined}>
              <Glyph nodes={icon.nodes} style={effective} size={Math.min(160, Math.max(48, size * 3))} box={doc.box} color={options.color} strokeWidth={options.strokeWidth} label={`Prévia de ${project.name}`} />
            </div>
            <div className="grid gap-1.5">
              <span className="text-xs font-medium text-fg-muted">Estilo</span>
              <Segmented
                size="sm"
                label="Estilo exportado"
                value={effective}
                onChange={setStyle}
                options={(['outline', 'solid', 'duotone'] as StyleId[]).filter((s) => styles.includes(s)).map((s) => ({ value: s, label: s === 'outline' ? 'Contorno' : s === 'solid' ? 'Sólido' : 'Duotone' }))}
              />
            </div>
            <div className="grid gap-1.5">
              <label htmlFor={`${id}-size`} className="text-xs font-medium text-fg-muted">
                Tamanho (width e height)
              </label>
              <Select id={`${id}-size`} value={size} onChange={(e) => setSize(Number(e.target.value))} className="h-control-sm text-xs">
                {[16, 20, 24, 32, 40, 48, 64, 96, 128, 256].map((s) => (
                  <option key={s} value={s}>
                    {s} px
                  </option>
                ))}
              </Select>
            </div>
            <div className="grid gap-1.5">
              <span className="text-xs font-medium text-fg-muted">Cor</span>
              <div className="flex items-center gap-2">
                <Segmented
                  size="sm"
                  label="Cor exportada"
                  value={color}
                  onChange={setColor}
                  options={[
                    { value: 'currentColor', label: 'Cor do texto' },
                    { value: 'custom', label: 'Fixa' },
                  ]}
                />
                {color === 'custom' && (
                  <ColorButton value={hex} onChange={setHex} label="Cor fixa" className="h-control-sm w-10 rounded-md border border-border p-1">
                    <span className="block size-full rounded-sm" style={{ background: hex }} />
                  </ColorButton>
                )}
              </div>
              <p className="text-xs text-fg-subtle">Formas com cor própria mantêm a sua.</p>
            </div>
          </div>
          <div className="grid min-w-0 content-start gap-5">
            <QuickExportActions icon={icon} options={options} />
            <CodePanel icon={icon} options={options} />
            <div className="grid gap-2">
              <h3 className="text-sm font-semibold">PNG com transparência</h3>
              <PngExport icon={icon} options={options} sizes={[1, 2, 3, 4, 8].map((k) => size * k)} defaultBackground={doc.background === '#ffffff' ? 'white' : doc.background === '#151514' ? 'black' : 'transparent'} />
              <p className="text-xs text-fg-subtle">Escalas de 1× a 8× do tamanho escolhido.</p>
            </div>
            <div className="rounded-lg border border-border bg-background-subtle p-3">
              <h3 className="text-sm font-semibold">Projeto editável</h3>
              <p className="mt-1 text-xs text-fg-muted">
                Os arquivos acima são o ícone final. O projeto, com camadas, grupos e papéis, fica salvo na sua biblioteca; baixe o arquivo do projeto para continuar a edição em outro navegador.
              </p>
              <Button
                size="sm"
                className="mt-2"
                icon="download"
                onClick={() => {
                  const s = editor.get()
                  const file = creationFile({ name: s.project.name, doc: s.history.present.doc, origin: s.project.origin })
                  downloadBlob(new Blob([JSON.stringify(file, null, 2)], { type: 'application/json' }), `${slug}.glyphos.json`)
                  toast(`${slug}.glyphos.json baixado`)
                }}
              >
                Baixar projeto (.glyphos.json)
              </Button>
            </div>
          </div>
        </div>
      )}
    </Dialog>
  )
}

/* -------------------------------------------------------- style matching */

const MATCH_FIELDS: Array<{ key: keyof Omit<MatchOptions, 'snap'>; label: string }> = [
  { key: 'grid', label: 'Prancheta no grid de 24' },
  { key: 'fit', label: 'Ocupar a área viva (2 a 22) e centralizar' },
  { key: 'center', label: 'Só centralizar (sem redimensionar)' },
  { key: 'stroke', label: 'Traço de 1,5' },
  { key: 'caps', label: 'Pontas e cantos arredondados' },
  { key: 'color', label: 'Cores → currentColor' },
  { key: 'roles', label: 'Papéis para Sólido e Duotone (corpo, recorte)' },
]

export function StyleMatchDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const doc = useEditor(currentDoc)
  const previous = useEditor((s) => s.project.previous)
  const [o, setO] = useState<MatchOptions>(DEFAULT_MATCH)
  const [style, setStyle] = useState<StyleId>('outline')
  const report = useMemo(() => matchStyle(doc, o), [doc, o])
  return (
    <Dialog open={open} onClose={onClose} title="Style Matching" wide>
      <p className="text-sm text-fg-muted">Ajusta o desenho ao sistema do GLYPHOS para que ele combine com a biblioteca e ganhe os mesmos estilos. Cada ajuste é opcional; o desenho de antes fica guardado no projeto.</p>
      <div className="mt-4 grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <fieldset className="grid content-start gap-2">
          <legend className="mb-1 text-xs font-semibold tracking-wide text-fg-subtle uppercase">Ajustes</legend>
          {MATCH_FIELDS.map((f) => (
            <Checkbox key={f.key} checked={o[f.key]} disabled={f.key === 'center' && o.fit} onChange={(v) => setO({ ...o, [f.key]: v })}>
              <span className={f.key === 'center' && o.fit ? 'text-fg-subtle' : undefined}>{f.label}</span>
            </Checkbox>
          ))}
          <label className="mt-1 grid gap-1 text-sm">
            <span>Alinhar pontos à grade</span>
            <Select value={o.snap} onChange={(e) => setO({ ...o, snap: Number(e.target.value) })} className="h-control-sm text-xs" aria-label="Passo da grade para os pontos">
              <option value={0}>Não alinhar</option>
              <option value={0.125}>0,125 unidade</option>
              <option value={0.25}>0,25 unidade</option>
              <option value={0.5}>0,5 unidade</option>
            </Select>
          </label>
        </fieldset>
        <div className="grid content-start gap-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold tracking-wide text-fg-subtle uppercase">Antes e depois</span>
            <Segmented
              size="sm"
              label="Estilo da comparação"
              value={style}
              onChange={setStyle}
              options={[
                { value: 'outline', label: 'Contorno' },
                { value: 'solid', label: 'Sólido' },
                { value: 'duotone', label: 'Duotone' },
              ]}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Compare doc={doc} style={style} label="Antes" />
            <Compare doc={report.doc} style={style} label="Depois" />
          </div>
          {report.changes.length > 0 && (
            <ul className="grid gap-1 text-sm">
              {report.changes.map((c) => (
                <li key={c} className="flex gap-2">
                  <UiIcon name="check" size={16} className="mt-0.5 shrink-0 text-success" />
                  <span>{c}</span>
                </li>
              ))}
            </ul>
          )}
          {report.warnings.length > 0 && (
            <ul className="grid gap-1 text-sm">
              {report.warnings.map((c) => (
                <li key={c} className="flex gap-2 text-fg-muted">
                  <UiIcon name="triangle-alert" size={16} className="mt-0.5 shrink-0 text-warning" />
                  <span>{c}</span>
                </li>
              ))}
            </ul>
          )}
          {!report.changes.length && !report.warnings.length && <p className="text-sm text-fg-muted">O desenho já segue o sistema com estes ajustes.</p>}
        </div>
      </div>
      <div className="mt-6 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-4">
        {previous ? (
          <Button
            icon="undo"
            onClick={() => {
              restorePrevious()
              toast('Desenho anterior ao ajuste restaurado', 'info')
              onClose()
            }}
          >
            Voltar ao desenho anterior ao ajuste
          </Button>
        ) : (
          <span />
        )}
        <div className="flex gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            icon="sparkles"
            disabled={!report.changes.length}
            onClick={() => {
              applyStyleMatch(o)
              toast('Style Matching aplicado. Ctrl Z desfaz.')
              onClose()
            }}
          >
            Aplicar ajustes
          </Button>
        </div>
      </div>
    </Dialog>
  )
}

function Compare({ doc, style, label }: { doc: CreationDoc; style: StyleId; label: string }) {
  const nodes = useMemo(() => docToNodes(doc), [doc])
  const styles = derivableStyles(nodes)
  const s = styles.includes(style) ? style : 'outline'
  return (
    <figure className="grid gap-1">
      <div className="relative grid aspect-square place-items-center rounded-lg border border-border bg-background-subtle text-fg">
        <svg viewBox={`0 0 ${doc.box} ${doc.box}`} className="absolute inset-[12%] size-[76%]" aria-hidden>
          <rect x={(doc.box * 2) / 24} y={(doc.box * 2) / 24} width={(doc.box * 20) / 24} height={(doc.box * 20) / 24} fill="none" className="stroke-accent" strokeOpacity={0.4} strokeWidth={doc.box / 200} strokeDasharray={`${doc.box / 60} ${doc.box / 90}`} />
        </svg>
        <Glyph nodes={pack(nodes)} style={s} size={120} box={doc.box} className="relative size-[76%]" label={`${label}: ${s === style ? '' : 'sem corpo, em Contorno · '}${nodes.length} formas`} />
      </div>
      <figcaption className="text-xs text-fg-muted">
        {label}
        {s !== style && ' (sem corpo: mostrado em Contorno)'}
      </figcaption>
    </figure>
  )
}

/* ----------------------------------------------------------- insert icon */

/** Search the library and bring an icon in: as a new project, or into the current drawing. */
export function InsertIconDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [query, setQuery] = useState('')
  const { outcome, ready } = useIconSearch(query, { enabled: open, limit: 60 })
  const docEmpty = useEditor((s) => !currentDoc(s).shapes.length)
  const [busy, setBusy] = useState<string | null>(null)
  async function use(slug: string, mode: 'new' | 'insert') {
    setBusy(slug)
    try {
      const icon = await loadIcon(slug)
      if (!icon) return toast('Não foi possível carregar o ícone.', 'error')
      const box = mode === 'insert' ? currentDoc().box : 24
      const k = box / 24
      const shapes = nodesToShapes(unpack(icon.nodes), 24)
      if (mode === 'new') {
        const s = editor.get()
        if (!s.project.id && s.history.present.doc.shapes.length && !confirm('O desenho atual não foi salvo. Abrir a cópia no lugar dele?')) return
        load({ ...emptyDoc(24), shapes }, { name: `${icon.name.pt} (cópia)`, origin: { slug: icon.slug, name: icon.name.pt } }, `Cópia de "${icon.name.pt}"`)
        fitArtboard(24)
        toast(`"${icon.name.pt}" aberto como cópia editável. O original da biblioteca não muda.`, 'info')
      } else {
        const scaled = k === 1 ? shapes : shapes.map((s) => scaleShape(s, k, k, { x: 0, y: 0 }))
        insertShapes(scaled, `Inserir "${icon.name.pt}"`)
        toast(`"${icon.name.pt}" inserido no desenho`, 'info')
      }
      onClose()
    } finally {
      setBusy(null)
    }
  }
  return (
    <Dialog open={open} onClose={onClose} title="Começar de um ícone da biblioteca" wide>
      <p className="text-sm text-fg-muted">O ícone vira formas editáveis numa cópia; o original da biblioteca fica intacto.</p>
      <label htmlFor="insert-search" className="sr-only">
        Buscar ícone
      </label>
      <TextInput id="insert-search" className="mt-3" autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar: casa, seta, carrinho, nuvem…" />
      <div className="mt-4 min-h-40">
        {!query.trim() ? (
          <p className="text-sm text-fg-subtle">Digite para buscar entre os ícones do GLYPHOS.</p>
        ) : !ready ? (
          <p className="text-sm text-fg-subtle">Carregando a busca…</p>
        ) : !outcome?.entries.length ? (
          <p className="text-sm text-fg-muted">Nada encontrado para "{query}".</p>
        ) : (
          <ul className="grid grid-cols-[repeat(auto-fill,minmax(132px,1fr))] gap-2">
            {outcome.entries.map((e) => (
              <li key={e.slug} className="grid gap-2 rounded-lg border border-border p-2">
                <div className="grid h-16 place-items-center text-fg">
                  <LazyGlyph entry={e} size={32} />
                </div>
                <p className="truncate text-center text-xs text-fg-muted">{e.name.pt}</p>
                <div className="grid gap-1">
                  <Button size="sm" variant="primary" disabled={!!busy} onClick={() => use(e.slug, 'new')}>
                    Editar cópia
                  </Button>
                  {!docEmpty && (
                    <Button size="sm" disabled={!!busy} onClick={() => use(e.slug, 'insert')}>
                      Inserir aqui
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Dialog>
  )
}
