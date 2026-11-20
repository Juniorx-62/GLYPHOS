import { Link, type ErrorComponentProps } from '@tanstack/react-router'
import { Button } from '../ui/primitives'
import { LogoMark } from './Logo'

export function NotFound() {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center px-4 py-24 text-center">
      <LogoMark size={48} className="text-fg" />
      <h1 className="mt-6 text-xl font-semibold">Página não encontrada</h1>
      <p className="mt-2 text-base text-fg-muted">O endereço pode ter mudado, ou o ícone foi renomeado. A busca encontra ícones pelo nome em português ou em inglês.</p>
      <div className="mt-6 flex gap-2">
        <Link to="/icons">
          <Button variant="primary" icon="search">
            Explorar ícones
          </Button>
        </Link>
        <Link to="/">
          <Button>Ir para o início</Button>
        </Link>
      </div>
    </div>
  )
}

export function RouteError({ error, reset }: ErrorComponentProps) {
  const chunk = /dynamically imported module|Importing a module script failed|Failed to fetch/i.test(String((error as Error | undefined)?.message))
  return (
    <div role="alert" className="mx-auto max-w-lg px-4 py-24 text-center">
      <h1 className="text-xl font-semibold">{chunk ? 'O site foi atualizado' : 'Algo deu errado nesta página'}</h1>
      <p className="mt-2 text-base text-fg-muted">
        {chunk ? 'Uma versão nova foi publicada enquanto a página estava aberta. Recarregue para continuar.' : 'Tente de novo. Se o problema continuar, recarregue a página.'}
      </p>
      <div className="mt-6 flex justify-center gap-2">
        <Button variant="primary" icon="rotate-cw" onClick={() => (chunk ? location.reload() : reset())}>
          {chunk ? 'Recarregar' : 'Tentar de novo'}
        </Button>
      </div>
    </div>
  )
}
