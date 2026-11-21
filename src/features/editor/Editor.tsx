/**
 * The icon editor (CREATE): top bar with the project, tools on the left, the
 * canvas, and properties / layers / history on the right. On small screens
 * the tools move to a bottom bar and the panels to a sheet.
 */
import { Link } from '@tanstack/react-router'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { loadIcon } from '~/catalog'
import { unpack } from '~/catalog/styles'
import { creationsStore, draftStore, getCreation } from '~/data/stores/creations'
import { UiIcon } from '~/components/icons/UiIcon'
import type { UiIconName } from '~/components/icons/ui-icon-names'
import { Button, IconButton, Kbd } from '~/components/ui/primitives'
import { toast } from '~/components/ui/toast'
import { useMediaQuery, useModKey } from '~/hooks/use-media-query'
import { cn } from '~/lib/utils'
import {
  copySelection,
  cutSelection,
  deleteSelection,
  duplicateSelection,
  editableIds,
  enterNodeEditing,
  groupSelection,
  orderSelection,
  paste,
  selectAll,
  translateSelection,
  ungroupSelection,
} from './actions'
import { fitArtboard, setZoom, useCamera, zoomAt } from './camera'
import { Canvas } from './Canvas'
import { Dialog, ExportDialog, InsertIconDialog, StyleMatchDialog } from './Dialogs'
import { emptyDoc, findShape, updateShapes } from './model/doc'
import { nodesToShapes } from './model/serialize'
import { HistoryPanel, LayersPanel, PreviewPanel, PropertiesPanel } from './Panels'
import {
  apply,
  currentDoc,
  editor,
  finishPen,
  isDirty,
  load,
  loadCreation,
  redoStep,
  saveProject,
  select,
  setNode,
  setProjectName,
  setTool,
  setView,
  startAutosave,
  undoStep,
  useEditor,
  type Tool,
} from './state'

const TOOLS: Array<{ id: Tool; label: string; icon: UiIconName; key: string; hint: string }> = [
  { id: 'select', label: 'Selecionar e mover', icon: 'mouse-pointer', key: 'V', hint: 'Clique para selecionar, arraste para mover. Ctrl clica dentro de grupos.' },
  { id: 'node', label: 'Editar pontos', icon: 'bezier-curve', key: 'A', hint: 'Arraste pontos e alças. Clique duplo no contorno insere um ponto; num ponto, alterna canto e suave.' },
  { id: 'rect', label: 'Retângulo', icon: 'square', key: 'R', hint: 'Shift: quadrado.' },
  { id: 'ellipse', label: 'Elipse', icon: 'circle', key: 'O', hint: 'Shift: círculo.' },
  { id: 'line', label: 'Linha', icon: 'line-segment', key: 'L', hint: 'Shift: ângulos de 45°.' },
  { id: 'polygon', label: 'Polígono', icon: 'pentagon', key: 'P', hint: 'Polígono regular; lados no painel.' },
  { id: 'pencil', label: 'Desenho livre', icon: 'pencil', key: 'N', hint: 'O traço vira curvas suaves.' },
  { id: 'pen', label: 'Caneta', icon: 'pen-tool', key: 'B', hint: 'Clique: ponto reto. Arraste: curva. Enter termina.' },
  { id: 'hand', label: 'Mover a vista', icon: 'hand', key: 'H', hint: 'Ou segure Espaço.' },
]

type PanelTab = 'props' | 'layers' | 'history'

export function Editor({ projectId, from, onSaved }: { projectId?: string; from?: string; onSaved: (id: string) => void }) {
  const [ready, setReady] = useState(false)
  const desktop = useMediaQuery('(min-width: 1024px)')

  // Opens what the URL asks for: a saved creation, a copy of a library icon, or the draft.
  useEffect(() => {
    let alive = true
    let stop: (() => void) | null = null
    ;(async () => {
      await Promise.all([creationsStore.ready(), draftStore.ready()])
      if (!alive) return
      const open = editor.get().project.id
      if (projectId && projectId === open && getCreation(projectId)) {
        // Already being edited (the URL got the id on the first save, or we came back to it): keep the history.
      } else if (projectId) {
        if (!loadCreation(projectId)) {
          toast('Esta criação não existe mais neste navegador. Começamos uma nova.', 'error')
          load(emptyDoc(), { name: 'Ícone sem nome' })
        }
      } else if (from) {
        const icon = await loadIcon(from)
        if (!alive) return
        if (icon) load({ ...emptyDoc(), shapes: nodesToShapes(unpack(icon.nodes)) }, { name: `${icon.name.pt} (cópia)`, origin: { slug: icon.slug, name: icon.name.pt } }, `Cópia de "${icon.name.pt}"`)
        else {
          toast('Ícone não encontrado na biblioteca.', 'error')
          load(emptyDoc(), { name: 'Ícone sem nome' })
        }
      } else {
        const draft = draftStore.getSnapshot().data
        if (draft) {
          load(draft.doc, { name: draft.name, origin: draft.origin }, 'Rascunho recuperado')
          toast('Rascunho não salvo recuperado', 'info')
        } else load(emptyDoc(), { name: 'Ícone sem nome' })
      }
      stop = startAutosave()
      setReady(true)
    })()
    return () => {
      alive = false
      stop?.()
    }
  }, [projectId, from])

  const [exportOpen, setExportOpen] = useState(false)
  const [matchOpen, setMatchOpen] = useState(false)
  const [insertOpen, setInsertOpen] = useState(false)
  const [keysOpen, setKeysOpen] = useState(false)
  const [tab, setTab] = useState<PanelTab>('props')
  const [sheet, setSheet] = useState(false)

  const save = () => {
    const firstSave = !editor.get().project.id
    const id = saveProject()
    toast(firstSave ? `"${editor.get().project.name}" salvo em Minha biblioteca › Criações` : 'Projeto salvo')
    if (firstSave) onSaved(id)
  }

  useShortcuts({ save, openExport: () => setExportOpen(true), openKeys: () => setKeysOpen(true), enabled: ready && !exportOpen && !matchOpen && !insertOpen && !keysOpen })

  const panel = (
    <PanelTabs tab={tab} onTab={setTab}>
      {tab === 'props' ? <PropertiesPanel /> : tab === 'layers' ? <LayersPanel /> : <HistoryPanel />}
    </PanelTabs>
  )

  return (
    <div className="flex h-[calc(100dvh-3.5rem)] flex-col bg-background">
      <TopBar ready={ready} onSave={save} onExport={() => setExportOpen(true)} onMatch={() => setMatchOpen(true)} onInsert={() => setInsertOpen(true)} onKeys={() => setKeysOpen(true)} compact={!desktop} />
      <div className="relative flex min-h-0 flex-1">
        {desktop && <ToolRail />}
        <div className="relative flex min-w-0 flex-1 flex-col">
          {ready ? <Canvas className="flex-1" /> : <div className="grid flex-1 place-items-center text-sm text-fg-muted">Abrindo o editor…</div>}
          <ViewBar />
        </div>
        {desktop ? (
          <aside aria-label="Painéis do editor" className="flex w-[300px] shrink-0 flex-col border-l border-border bg-surface">
            <div className="min-h-0 flex-1 overflow-y-auto">{panel}</div>
            <div className="border-t border-border">
              <PreviewPanel />
            </div>
          </aside>
        ) : (
          sheet && (
            <aside aria-label="Painéis do editor" className="absolute inset-x-0 bottom-0 z-20 flex max-h-[62%] flex-col rounded-t-xl border-t border-border bg-surface shadow-lg">
              <div className="flex items-center justify-between border-b border-border px-3 py-1.5">
                <span className="text-sm font-medium">Painéis</span>
                <IconButton icon="x" label="Fechar painéis" onClick={() => setSheet(false)} />
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto">
                {panel}
                <div className="border-t border-border">
                  <PreviewPanel />
                </div>
              </div>
            </aside>
          )
        )}
      </div>
      {!desktop && (
        <div className="flex items-center gap-1 border-t border-border bg-surface px-2 py-1.5">
          <ToolStrip />
          <Button size="sm" variant={sheet ? 'secondary' : 'outline'} icon="sliders" className="ml-auto" onClick={() => setSheet((v) => !v)}>
            Painéis
          </Button>
        </div>
      )}
      <ExportDialog open={exportOpen} onClose={() => setExportOpen(false)} />
      <StyleMatchDialog open={matchOpen} onClose={() => setMatchOpen(false)} />
      <InsertIconDialog open={insertOpen} onClose={() => setInsertOpen(false)} />
      <ShortcutsDialog open={keysOpen} onClose={() => setKeysOpen(false)} />
    </div>
  )
}

/* ---------------------------------------------------------------- top bar */

function TopBar({ ready, onSave, onExport, onMatch, onInsert, onKeys, compact }: { ready: boolean; onSave: () => void; onExport: () => void; onMatch: () => void; onInsert: () => void; onKeys: () => void; compact: boolean }) {
  const project = useEditor((s) => s.project)
  const dirty = useEditor(isDirty)
  const canUndo = useEditor((s) => s.history.past.length > 0)
  const canRedo = useEditor((s) => s.history.future.length > 0)
  const mod = useModKey()
  const status = !project.id ? 'Rascunho neste navegador' : dirty ? 'Salvando…' : `Salvo${project.savedAt ? ` às ${new Date(project.savedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}` : ''}`
  return (
    <div className="flex h-12 shrink-0 items-center gap-2 border-b border-border bg-surface px-2 sm:px-3">
      <Link to="/library" search={{ tab: 'creations' }} className="hidden items-center gap-1 rounded-md px-2 py-1 text-sm text-fg-muted hover:bg-muted hover:text-fg sm:flex" title="Voltar para as criações">
        <UiIcon name="arrow-left" size={16} />
        Criações
      </Link>
      <span className="hidden h-5 w-px bg-border sm:block" aria-hidden />
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <label htmlFor="project-name" className="sr-only">
          Nome do ícone
        </label>
        <input
          id="project-name"
          value={project.name}
          disabled={!ready}
          onChange={(e) => setProjectName(e.target.value)}
          onBlur={(e) => !e.target.value.trim() && setProjectName('Ícone sem nome')}
          className="h-control-sm w-full max-w-64 min-w-24 rounded-md border border-transparent bg-transparent px-2 text-sm font-medium text-fg outline-none hover:border-border focus:border-ring"
        />
        <span className={cn('hidden shrink-0 text-xs md:inline', !project.id ? 'text-warning' : 'text-fg-subtle')} aria-live="polite">
          {status}
        </span>
        {project.origin && !compact && (
          <Link to="/icons/$slug" params={{ slug: project.origin.slug }} className="hidden truncate text-xs text-fg-subtle hover:text-fg xl:inline" title="Ícone da biblioteca usado como ponto de partida">
            a partir de “{project.origin.name}”
          </Link>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-0.5">
        <IconButton icon="undo" label={`Desfazer (${mod} Z)`} disabled={!canUndo} onClick={undoStep} />
        <IconButton icon="redo" label={`Refazer (${mod} Shift Z)`} disabled={!canRedo} onClick={redoStep} />
        {!compact && <IconButton icon="keyboard" label="Atalhos de teclado (?)" onClick={onKeys} />}
      </div>
      <span className="h-5 w-px bg-border" aria-hidden />
      <div className="flex shrink-0 items-center gap-1.5">
        {compact ? (
          <>
            <IconButton icon="layout-grid" label="Começar de um ícone da biblioteca" onClick={onInsert} />
            <IconButton icon="sparkles" label="Style Matching" onClick={onMatch} />
            <IconButton icon="floppy-disk" label="Salvar na biblioteca" onClick={onSave} />
          </>
        ) : (
          <>
            <Button size="sm" variant="ghost" icon="layout-grid" onClick={onInsert}>
              Da biblioteca
            </Button>
            <Button size="sm" variant="ghost" icon="sparkles" onClick={onMatch} title="Ajustar o desenho ao sistema do GLYPHOS">
              Style Matching
            </Button>
            <Button size="sm" icon="floppy-disk" onClick={onSave} title={`Salvar (${mod} S)`}>
              {project.id ? 'Salvar' : 'Salvar na biblioteca'}
            </Button>
          </>
        )}
        <Button size="sm" variant="primary" icon="download" onClick={onExport} title={`Exportar (${mod} E)`}>
          Exportar
        </Button>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ tools */

function ToolRail() {
  return (
    <nav aria-label="Ferramentas" className="flex w-12 shrink-0 flex-col items-center gap-0.5 border-r border-border bg-surface py-2">
      {TOOLS.map((t, i) => (
        <ToolButton key={t.id} tool={t} divider={i === 1 || i === 7} />
      ))}
    </nav>
  )
}

function ToolStrip() {
  return (
    <nav aria-label="Ferramentas" className="flex min-w-0 gap-0.5 overflow-x-auto">
      {TOOLS.map((t) => (
        <ToolButton key={t.id} tool={t} />
      ))}
    </nav>
  )
}

function ToolButton({ tool, divider }: { tool: (typeof TOOLS)[number]; divider?: boolean }) {
  const active = useEditor((s) => s.tool === tool.id)
  return (
    <>
      <button
        type="button"
        aria-pressed={active}
        aria-label={`${tool.label} (${tool.key})`}
        title={`${tool.label} (${tool.key}). ${tool.hint}`}
        onClick={() => {
          if (tool.id === 'node') {
            const sel = editor.get().selection
            if (sel.length === 1) enterNodeEditing(sel[0])
          }
          setTool(tool.id)
        }}
        className={cn('relative grid size-9 shrink-0 place-items-center rounded-md transition-colors duration-fast', active ? 'bg-primary text-primary-fg' : 'text-fg-muted hover:bg-muted hover:text-fg')}
      >
        <UiIcon name={tool.icon} size={18} />
      </button>
      {divider && <span className="my-1 h-px w-6 bg-border" aria-hidden />}
    </>
  )
}

function ViewBar() {
  const cam = useCamera()
  const view = useEditor((s) => s.view)
  const box = useEditor((s) => currentDoc(s).box)
  return (
    <div className="pointer-events-none absolute top-3 left-3 flex flex-wrap gap-2">
      <div className="pointer-events-auto flex items-center gap-0.5 rounded-lg border border-border bg-surface-overlay p-0.5 shadow-sm">
        <IconButton size="sm" icon="zoom-out" label="Afastar (-)" onClick={() => zoomAt(1 / 1.25)} />
        <button type="button" className="h-control-sm min-w-14 rounded-md px-1 text-xs text-fg tabular-nums hover:bg-muted" title="Tamanho real do ícone (24 px na tela por 24 unidades)" onClick={() => setZoom(1)}>
          {Math.round((cam.zoom / 1) * 100)}%
        </button>
        <IconButton size="sm" icon="zoom-in" label="Aproximar (+)" onClick={() => zoomAt(1.25)} />
        <IconButton size="sm" icon="maximize" label="Ajustar à tela (Shift 1)" onClick={() => fitArtboard(box)} />
      </div>
      <div className="pointer-events-auto flex items-center gap-0.5 rounded-lg border border-border bg-surface-overlay p-0.5 shadow-sm">
        <IconButton size="sm" icon="magnet" label={view.snap ? 'Encaixe na grade ligado' : 'Encaixe na grade desligado'} pressed={view.snap} className={cn(view.snap && 'text-primary')} onClick={() => setView({ snap: !view.snap })} />
        <IconButton size="sm" icon="grid-3x3" label={view.grid ? 'Ocultar grade' : 'Mostrar grade'} pressed={view.grid} className={cn(view.grid && 'text-primary')} onClick={() => setView({ grid: !view.grid })} />
        <IconButton size="sm" icon="crosshair" label={view.keylines ? 'Ocultar linhas-guia' : 'Mostrar linhas-guia'} pressed={view.keylines} className={cn(view.keylines && 'text-primary')} onClick={() => setView({ keylines: !view.keylines })} />
      </div>
    </div>
  )
}

function PanelTabs({ tab, onTab, children }: { tab: PanelTab; onTab: (t: PanelTab) => void; children: ReactNode }) {
  const tabs: Array<[PanelTab, string]> = [
    ['props', 'Propriedades'],
    ['layers', 'Camadas'],
    ['history', 'Histórico'],
  ]
  const refs = useRef<Array<HTMLButtonElement | null>>([])
  return (
    <div>
      <div role="tablist" aria-label="Painel" className="sticky top-0 z-10 flex border-b border-border bg-surface">
        {tabs.map(([id, label], i) => (
          <button
            key={id}
            ref={(el) => {
              refs.current[i] = el
            }}
            role="tab"
            id={`tab-${id}`}
            aria-selected={tab === id}
            aria-controls={`panel-${id}`}
            tabIndex={tab === id ? 0 : -1}
            onClick={() => onTab(id)}
            onKeyDown={(e) => {
              if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return
              const n = (i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length
              onTab(tabs[n][0])
              refs.current[n]?.focus()
            }}
            className={cn('h-10 flex-1 border-b-2 text-sm', tab === id ? 'border-primary font-medium text-fg' : 'border-transparent text-fg-muted hover:text-fg')}
          >
            {label}
          </button>
        ))}
      </div>
      <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
        {children}
      </div>
    </div>
  )
}

/* -------------------------------------------------------------- shortcuts */

const SHORTCUTS: Array<[string, string]> = [
  ['V · A · R · O · L · P · N · B · H', 'Selecionar, pontos, retângulo, elipse, linha, polígono, livre, caneta, mão'],
  ['Espaço (segurar)', 'Mover a vista'],
  ['Ctrl/⌘ + rolagem · + · -', 'Aproximar e afastar'],
  ['Shift 1', 'Ajustar a prancheta à tela'],
  ['Ctrl Z · Ctrl Shift Z', 'Desfazer · refazer'],
  ['Ctrl S · Ctrl E', 'Salvar · exportar'],
  ['Ctrl C · X · V · D', 'Copiar, recortar, colar, duplicar'],
  ['Ctrl G · Ctrl Shift G', 'Agrupar · desagrupar'],
  ['Ctrl ] · Ctrl [', 'Avançar · recuar camada (com Shift: frente · trás)'],
  ['Setas (Shift ×4)', 'Mover pela grade'],
  ['Delete', 'Excluir forma (ou o ponto, ao editar pontos)'],
  ['Enter', 'Editar pontos da forma; com a caneta, terminar o caminho'],
  ['Esc', 'Terminar, sair da edição de pontos, limpar a seleção'],
  ['Shift ao desenhar', 'Proporção 1:1, ângulos de 45°, giro de 15°'],
  ['Alt ao arrastar', 'Ignorar grade e guias'],
]

function ShortcutsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onClose={onClose} title="Atalhos do editor">
      <dl className="grid gap-2 text-sm">
        {SHORTCUTS.map(([k, v]) => (
          <div key={k} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] gap-3">
            <dt>
              <Kbd>{k}</Kbd>
            </dt>
            <dd className="text-fg-muted">{v}</dd>
          </div>
        ))}
      </dl>
    </Dialog>
  )
}

function useShortcuts({ save, openExport, openKeys, enabled }: { save: () => void; openExport: () => void; openKeys: () => void; enabled: boolean }) {
  const ref = useRef({ save, openExport, openKeys })
  ref.current = { save, openExport, openKeys }
  useEffect(() => {
    if (!enabled) return
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null
      if (el?.closest('input, textarea, select, [contenteditable="true"], dialog[open]')) return
      const s = editor.get()
      const mod = e.ctrlKey || e.metaKey
      const k = e.key.toLowerCase()
      const handled = () => {
        e.preventDefault()
        e.stopPropagation()
      }
      if (mod) {
        if (k === 'z') return handled(), e.shiftKey ? redoStep() : undoStep()
        if (k === 'y') return handled(), redoStep()
        if (k === 's') return handled(), ref.current.save()
        if (k === 'e') return handled(), ref.current.openExport()
        if (k === 'd') return handled(), duplicateSelection()
        if (k === 'g') return handled(), e.shiftKey ? ungroupSelection() : groupSelection()
        if (k === 'c') return copySelection() && handled()
        if (k === 'x') return handled(), cutSelection()
        if (k === 'v') return handled(), paste()
        if (k === 'a') return handled(), selectAll()
        if (e.key === ']') return handled(), orderSelection(e.shiftKey ? 'front' : 'forward')
        if (e.key === '[') return handled(), orderSelection(e.shiftKey ? 'back' : 'backward')
        return
      }
      if (e.altKey) return
      if (e.key === 'Escape') {
        if (s.pen) return handled(), finishPen()
        if (s.tool === 'node') return handled(), setTool('select')
        if (s.tool !== 'select') return handled(), setTool('select')
        return handled(), select([])
      }
      if (e.key === 'Enter') {
        if (s.pen) return handled(), finishPen()
        if (s.tool === 'select' && s.selection.length === 1 && enterNodeEditing(s.selection[0])) return handled(), setTool('node')
        return
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        handled()
        if (s.tool === 'node' && s.node && s.selection.length === 1) return deleteAnchor(s.selection[0], s.node.sub, s.node.idx)
        return deleteSelection()
      }
      if (e.key.startsWith('Arrow')) {
        if (!editableIds().length) return
        handled()
        const unit = (s.view.snap ? s.view.gridStep : 0.25) * (e.shiftKey ? 4 : 1)
        const dx = e.key === 'ArrowLeft' ? -unit : e.key === 'ArrowRight' ? unit : 0
        const dy = e.key === 'ArrowUp' ? -unit : e.key === 'ArrowDown' ? unit : 0
        return translateSelection(dx, dy, 'Mover com as setas')
      }
      if (e.key === '?') return handled(), ref.current.openKeys()
      if (e.key === '+' || e.key === '=') return handled(), zoomAt(1.25)
      if (e.key === '-' || e.key === '_') return handled(), zoomAt(1 / 1.25)
      if (e.key === '!' || (e.shiftKey && e.code === 'Digit1')) return handled(), fitArtboard(currentDoc().box)
      const tool = TOOLS.find((t) => t.key.toLowerCase() === k) ?? (k === 'e' ? TOOLS.find((t) => t.id === 'ellipse') : undefined)
      if (tool && !e.shiftKey) {
        handled()
        if (tool.id === 'node' && s.selection.length === 1) enterNodeEditing(s.selection[0])
        setTool(tool.id)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [enabled])
}

function deleteAnchor(id: string, sub: number, idx: number) {
  const s = findShape(editor.get().history.present.doc.shapes, id)
  if (!s || s.kind !== 'path') return
  const sp = s.paths[sub]
  if (sp.anchors.length <= 2) {
    toast('Um caminho precisa de pelo menos dois pontos. Para apagar a forma, saia da edição de pontos (Esc).', 'info')
    return
  }
  apply('Excluir ponto', (d) =>
    updateShapes(d, [id], (x) => (x.kind !== 'path' ? x : { ...x, paths: x.paths.map((p, i) => (i !== sub ? p : { ...p, anchors: p.anchors.filter((_, j) => j !== idx) })) })),
  )
  setNode(null)
}
