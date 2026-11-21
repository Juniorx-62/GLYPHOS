import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useHydrated } from '~/hooks/use-media-query'
import { Editor } from '~/features/editor/Editor'
import { pageHead } from '~/lib/seo'

interface CreateSearch {
  /** A saved creation to continue. */
  project?: string
  /** A library icon to start from (opened as a copy). */
  from?: string
}

export const Route = createFileRoute('/create')({
  validateSearch: (raw: Record<string, unknown>): CreateSearch => ({
    project: typeof raw.project === 'string' && /^c[a-z0-9]{8}$/.test(raw.project) ? raw.project : undefined,
    from: typeof raw.from === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(raw.from) ? raw.from : undefined,
  }),
  head: () =>
    pageHead({
      title: 'Criar ícone · GLYPHOS',
      description: 'Editor de ícones no grid do GLYPHOS: desenhe do zero ou a partir de um ícone da biblioteca, ajuste com o Style Matching e exporte em SVG, PNG e JSX.',
      path: '/create',
    }),
  component: CreatePage,
})

function CreatePage() {
  const { project, from } = Route.useSearch()
  const navigate = useNavigate({ from: '/create' })
  const hydrated = useHydrated()
  return (
    <>
      <h1 className="sr-only">Editor de ícones</h1>
      {hydrated ? (
        <Editor projectId={project} from={from} onSaved={(id) => void navigate({ search: { project: id }, replace: true })} />
      ) : (
        <div className="grid h-[calc(100dvh-3.5rem)] place-items-center text-sm text-fg-muted">Abrindo o editor…</div>
      )}
    </>
  )
}
