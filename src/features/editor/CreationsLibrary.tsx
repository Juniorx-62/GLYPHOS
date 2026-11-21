/**
 * The visitor's creations in Minha biblioteca: thumbnails, last edit,
 * open / rename / duplicate / collections / export / delete, project files
 * in and out, and every creation as one SVG sprite.
 */
import { Link, useNavigate } from '@tanstack/react-router'
import { useId, useMemo, useRef, useState } from 'react'
import { derivableStyles, pack, renderIcon, toSvgString } from '~/catalog/styles'
import type { StyleId } from '~/catalog/types'
import { createCollection, toggleCreationInCollection, useCollections } from '~/data/stores/collections'
import { deleteCreation, duplicateCreation, renameCreation, saveCreation, useCreations } from '~/data/stores/creations'
import { useSettings } from '~/data/stores/settings'
import type { Creation, CreationDoc } from '~/data/types'
import { Glyph } from '~/components/icons/Glyph'
import { UiIcon } from '~/components/icons/UiIcon'
import { Button, EmptyState, IconButton, TextInput } from '~/components/ui/primitives'
import { toast } from '~/components/ui/toast'
import { toSvg } from '~/features/export/formats'
import { cn, downloadBlob, plural } from '~/lib/utils'
import { GLYPHOS_STROKE } from './model/doc'
import { docToNodes } from './model/serialize'
import { readCreationFile, slugify } from './project-file'

/** "21 de nov. de 2026, 14:05": the moment of the last edit, in the visitor's time zone. */
const formatEdited = (iso: string) => new Date(iso).toLocaleString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })

/** A creation drawn like a library icon (in the person's chosen style when it has it). */
export function CreationThumb({ doc, size = 40, style = 'outline', className }: { doc: CreationDoc; size?: number; style?: StyleId; className?: string }) {
  const nodes = useMemo(() => docToNodes(doc), [doc])
  const packed = useMemo(() => pack(nodes), [nodes])
  const styles = derivableStyles(nodes)
  if (!nodes.length) return <span className={cn('grid place-items-center text-xs text-fg-subtle', className)} style={{ width: size, height: size }}>vazio</span>
  return <Glyph nodes={packed} box={doc.box} size={size} style={styles.includes(style) ? style : 'outline'} strokeWidth={(GLYPHOS_STROKE * doc.box) / 24} className={className} />
}

/** "Criação" badge: tells the visitor's own icons apart from the library's. */
export function CreationBadge({ className }: { className?: string }) {
  return <span className={cn('inline-flex items-center rounded-sm bg-accent-subtle px-1.5 py-0.5 text-[11px] leading-none font-medium text-accent-emphasis', className)}>Criação</span>
}

function spriteOf(list: Creation[], style: StyleId): string {
  const used = new Set<string>()
  const symbols = list.map((c) => {
    let id = slugify(c.name)
    for (let i = 2; used.has(id); i++) id = `${slugify(c.name)}-${i}`
    used.add(id)
    const nodes = docToNodes(c.doc)
    const s = derivableStyles(nodes).includes(style) ? style : 'outline'
    const tree = renderIcon(nodes, { style: s, uid: id, box: c.doc.box, strokeWidth: (GLYPHOS_STROKE * c.doc.box) / 24 })
    const { xmlns: _x, width: _w, height: _h, ...attrs } = tree.attrs
    return toSvgString({ tag: 'symbol', attrs: { id, ...attrs }, children: tree.children }, { depth: 1 })
  })
  return `<svg xmlns="http://www.w3.org/2000/svg" style="display:none">\n  <!-- GLYPHOS · criações · use <svg><use href="#nome"/></svg> -->\n  ${symbols.join('\n  ')}\n</svg>\n`
}

export function CreationsLibrary() {
  const creations = useCreations()
  const settings = useSettings()
  const navigate = useNavigate()
  const fileRef = useRef<HTMLInputElement>(null)
  const style = settings.appearance.style
  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-2xl text-sm text-fg-muted">
          Ícones que você desenhou no editor. Cada um é um projeto editável (camadas, grupos e papéis) salvo neste navegador; o SVG, o PNG e o código são gerados dele na exportação.
        </p>
        <div className="flex flex-wrap gap-2">
          <Link to="/create">
            <Button variant="primary" icon="plus">
              Novo ícone
            </Button>
          </Link>
          <Button icon="upload" onClick={() => fileRef.current?.click()}>
            Abrir projeto
          </Button>
          {creations.length > 0 && (
            <Button
              icon="download"
              onClick={() => {
                downloadBlob(new Blob([spriteOf(creations, style)], { type: 'image/svg+xml' }), 'glyphos-criacoes-sprite.svg')
                toast('Sprite SVG com todas as criações baixado')
              }}
            >
              Sprite SVG
            </Button>
          )}
          <input
            ref={fileRef}
            type="file"
            accept=".json,application/json"
            className="sr-only"
            aria-label="Arquivo de projeto (.glyphos.json)"
            onChange={async (e) => {
              const file = e.target.files?.[0]
              e.target.value = ''
              if (!file) return
              if (file.size > 3_000_000) return toast('O arquivo é grande demais para um projeto de ícone.', 'error')
              try {
                const r = readCreationFile(JSON.parse(await file.text()))
                if (!r.ok) return toast(r.reason, 'error')
                const id = saveCreation({ name: r.name, doc: r.doc, origin: r.origin })
                toast(`"${r.name}" adicionado às criações`)
                void navigate({ to: '/create', search: { project: id } })
              } catch {
                toast('O arquivo não é um JSON válido.', 'error')
              }
            }}
          />
        </div>
      </div>
      {!creations.length ? (
        <EmptyState icon="pen-tool" title="Nenhuma criação ainda">
          <p>Desenhe um ícone do zero, ou abra um ícone da biblioteca no editor e modifique uma cópia. O original nunca muda.</p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Link to="/create">
              <Button variant="primary" icon="pen-tool">
                Criar um ícone
              </Button>
            </Link>
            <Link to="/icons">
              <Button icon="search">Escolher um ponto de partida</Button>
            </Link>
          </div>
        </EmptyState>
      ) : (
        <ul className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-3">
          {creations.map((c) => (
            <CreationCard key={c.id} creation={c} style={style} />
          ))}
        </ul>
      )}
    </div>
  )
}

function CreationCard({ creation: c, style }: { creation: Creation; style: StyleId }) {
  const navigate = useNavigate()
  const shapes = useMemo(() => docToNodes(c.doc).length, [c.doc])
  const open = () => void navigate({ to: '/create', search: { project: c.id } })
  return (
    <li className="group flex flex-col rounded-xl border border-border bg-surface transition-colors hover:border-border-strong">
      <button type="button" onClick={open} className="relative grid aspect-[4/3] place-items-center rounded-t-xl bg-background-subtle text-fg" aria-label={`Abrir "${c.name}" no editor`}>
        <CreationThumb doc={c.doc} size={64} style={style} />
        <CreationBadge className="absolute top-2 left-2" />
      </button>
      <div className="flex flex-1 flex-col gap-1 border-t border-border p-3">
        <h3 className="truncate text-sm font-semibold text-fg" title={c.name}>
          {c.name}
        </h3>
        <p className="text-xs text-fg-subtle">
          Editado em {formatEdited(c.updatedAt)} · {plural(shapes, 'forma', 'formas')}
        </p>
        {c.origin && (
          <p className="truncate text-xs text-fg-subtle">
            a partir de{' '}
            <Link to="/icons/$slug" params={{ slug: c.origin.slug }} className="underline decoration-border-strong underline-offset-2 hover:text-fg">
              {c.origin.name}
            </Link>
          </p>
        )}
        <div className="mt-2 flex items-center gap-0.5">
          <Button size="sm" variant="primary" icon="pen-tool" onClick={open}>
            Editar
          </Button>
          <span className="flex-1" />
          <IconButton
            size="sm"
            icon="settings"
            label={`Renomear "${c.name}"`}
            onClick={() => {
              const next = prompt('Novo nome do ícone', c.name)
              if (next?.trim()) renameCreation(c.id, next)
            }}
          />
          <IconButton
            size="sm"
            icon="copy"
            label={`Duplicar "${c.name}"`}
            onClick={() => {
              duplicateCreation(c.id)
              toast(`"${c.name}" duplicado`)
            }}
          />
          <IconButton
            size="sm"
            icon="download"
            label={`Baixar SVG de "${c.name}"`}
            onClick={() => {
              const nodes = docToNodes(c.doc)
              const styles = derivableStyles(nodes)
              const slug = slugify(c.name)
              const svg = toSvg({ slug, nodes: pack(nodes), styles, box: c.doc.box }, { style: styles.includes(style) ? style : 'outline', strokeWidth: (GLYPHOS_STROKE * c.doc.box) / 24, color: 'currentColor', size: 24, opacity: 1 })
              downloadBlob(new Blob([svg], { type: 'image/svg+xml' }), `${slug}.svg`)
              toast(`${slug}.svg baixado`)
            }}
          />
          <CreationCollectionMenu creation={c} />
          <IconButton
            size="sm"
            icon="trash"
            label={`Excluir "${c.name}"`}
            onClick={() => {
              if (!confirm(`Excluir "${c.name}"? O projeto e suas camadas saem deste navegador e isso não pode ser desfeito.`)) return
              deleteCreation(c.id)
              toast(`"${c.name}" excluído`, 'info')
            }}
          />
        </div>
      </div>
    </li>
  )
}

function CreationCollectionMenu({ creation }: { creation: Creation }) {
  const collections = useCollections()
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState('')
  const id = useId()
  const ref = useRef<HTMLDivElement>(null)
  return (
    <div
      ref={ref}
      className="relative"
      onBlur={(e) => {
        if (!ref.current?.contains(e.relatedTarget as Node)) setOpen(false)
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape' && open) {
          e.stopPropagation()
          setOpen(false)
        }
      }}
    >
      <IconButton size="sm" icon="bookmark" label={`Guardar "${creation.name}" numa coleção`} aria-expanded={open} aria-controls={`${id}-menu`} onClick={() => setOpen((v) => !v)} />
      {open && (
        <div id={`${id}-menu`} className="animate-in absolute right-0 bottom-full z-30 mb-2 w-60 rounded-lg border border-border bg-surface-overlay p-2 shadow-md">
          <p className="px-2 pt-1 pb-2 text-xs text-fg-subtle">Guardar "{creation.name}" em:</p>
          <ul className="max-h-48 overflow-y-auto">
            {collections.map((col) => {
              const has = col.creations.includes(creation.id)
              return (
                <li key={col.id}>
                  <button
                    type="button"
                    role="menuitemcheckbox"
                    aria-checked={has}
                    onClick={() => toggleCreationInCollection(col.id, creation.id)}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-fg hover:bg-muted"
                  >
                    <span className={cn('grid size-4 place-items-center rounded-xs border', has ? 'border-fg bg-fg text-background' : 'border-border-strong')}>{has && <UiIcon name="check" size={12} />}</span>
                    <span className="flex-1 truncate">{col.name}</span>
                  </button>
                </li>
              )
            })}
          </ul>
          <form
            className="mt-2 flex gap-1 border-t border-border pt-2"
            onSubmit={(e) => {
              e.preventDefault()
              if (!draft.trim()) return
              const cid = createCollection(draft)
              toggleCreationInCollection(cid, creation.id)
              toast(`"${creation.name}" guardado em "${draft.trim()}"`)
              setDraft('')
            }}
          >
            <TextInput aria-label="Nova coleção" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Nova coleção" className="h-control-sm text-xs" />
            <IconButton size="sm" icon="plus" label="Criar coleção" type="submit" />
          </form>
        </div>
      )}
    </div>
  )
}
