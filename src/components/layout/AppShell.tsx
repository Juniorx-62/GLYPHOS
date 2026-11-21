import { Link, useRouterState } from '@tanstack/react-router'
import { useEffect, useRef, type ReactNode } from 'react'
import { catalogInfo } from '~/catalog'
import { useFavorites } from '~/data/stores/favorites'
import { useThemePreference } from '~/data/stores/settings'
import { CommandPaletteProvider, useCommandPalette } from '~/features/search/CommandPalette'
import { useHydrated, useModKey } from '~/hooks/use-media-query'
import { cn, formatNumber } from '~/lib/utils'
import { UiIcon } from '../icons/UiIcon'
import { IconButton, Kbd } from '../ui/primitives'
import { Toaster } from '../ui/toast'
import { Logo, LogoMark } from './Logo'
import { ThemeController, toggleTheme } from './theme'

const NAV = [
  { to: '/icons', label: 'Ícones' },
  { to: '/categories', label: 'Categorias' },
  { to: '/collections', label: 'Coleções' },
  { to: '/about', label: 'Sobre' },
] as const

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <CommandPaletteProvider>
      <ThemeController />
      <a href="#conteudo" className="sr-only z-50 rounded-md bg-primary px-3 py-2 text-primary-fg focus:not-sr-only focus:fixed focus:top-2 focus:left-2">
        Pular para o conteúdo
      </a>
      <div className="flex min-h-dvh flex-col">
        <Header />
        <main id="conteudo" className="flex-1">
          {children}
        </main>
        <Footer />
      </div>
      <Toaster />
    </CommandPaletteProvider>
  )
}

function useActivePath() {
  return useRouterState({ select: (s) => s.location.pathname })
}

/**
 * Light ⇄ dark: the icon and the label say where the
 * button goes (sun in the dark theme, moon in the light one). T switches too.
 */
function ThemeButton() {
  const hydrated = useHydrated()
  const theme = useThemePreference()
  const dark = hydrated && theme === 'dark'
  const label = dark ? 'Mudar para o tema claro' : 'Mudar para o tema escuro'

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 't' && e.key !== 'T') return
      if (e.ctrlKey || e.metaKey || e.altKey || e.repeat) return
      const el = e.target as HTMLElement | null
      if (el?.closest('input, textarea, select, [contenteditable=""], [contenteditable="true"], dialog[open]')) return
      e.preventDefault()
      toggleTheme()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return <IconButton icon={dark ? 'sun' : 'moon'} label={label} title={`${label} (T)`} aria-keyshortcuts="t" onClick={toggleTheme} />
}

function Header() {
  const path = useActivePath()
  const palette = useCommandPalette()
  const mod = useModKey()
  const favorites = useFavorites()
  const hydrated = useHydrated()
  const menuRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    menuRef.current?.close()
  }, [path])

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-[1440px] items-center gap-2 px-4 sm:gap-4 sm:px-6">
        <Link to="/" className="mr-2 flex items-center gap-2 rounded-md text-fg" aria-label="GLYPHOS, página inicial">
          <Logo height={17} className="hidden sm:block" />
          <LogoMark size={26} className="sm:hidden" />
        </Link>
        <nav aria-label="Principal" className="hidden items-center gap-1 md:flex">
          {NAV.map((item) => {
            const active = path === item.to || path.startsWith(`${item.to}/`)
            return (
              <Link
                key={item.to}
                to={item.to}
                aria-current={active ? 'page' : undefined}
                className={cn('relative rounded-md px-3 py-1.5 text-sm font-medium transition-colors', active ? 'text-fg' : 'text-fg-muted hover:text-fg')}
              >
                {item.label}
                {active && <span className="absolute inset-x-3 -bottom-[11px] h-0.5 rounded-full bg-accent" aria-hidden />}
              </Link>
            )
          })}
        </nav>
        <div className="flex-1" />
        <button
          type="button"
          onClick={() => palette.open()}
          className="group flex h-control-md min-w-0 items-center gap-2 rounded-md border border-border bg-surface pr-1.5 pl-3 text-sm text-fg-subtle transition-colors hover:border-border-strong hover:text-fg-muted sm:w-64"
          aria-label="Buscar ícones (atalho Ctrl K)"
        >
          <UiIcon name="search" size={16} />
          <span className="hidden flex-1 text-left sm:inline">Buscar ícones…</span>
          <span className="hidden items-center gap-0.5 sm:flex">
            <Kbd>{mod}</Kbd>
            <Kbd>K</Kbd>
          </span>
        </button>
        <ThemeButton />
        <Link
          to="/library"
          className="relative inline-grid size-control-md place-items-center rounded-md text-fg-muted transition-colors hover:bg-muted hover:text-fg"
          aria-label={`Minha biblioteca${hydrated && favorites.length ? `, ${favorites.length} favoritos` : ''}`}
          title="Minha biblioteca"
        >
          <UiIcon name="heart" size={18} />
          {hydrated && favorites.length > 0 && (
            <span className="absolute -top-0.5 -right-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-accent px-1 text-[10px] leading-none font-medium text-accent-fg">
              {favorites.length > 99 ? '99+' : favorites.length}
            </span>
          )}
        </Link>
        <IconButton icon="menu" label="Abrir menu" className="md:hidden" onClick={() => menuRef.current?.showModal()} />
      </div>
      <dialog
        ref={menuRef}
        aria-label="Menu"
        onClick={(e) => e.target === menuRef.current && menuRef.current?.close()}
        className="mt-0 mr-0 ml-auto h-dvh max-h-dvh w-72 max-w-[85vw] border-l border-border bg-surface-overlay p-0 text-fg"
      >
        <div className="flex h-14 items-center justify-between border-b border-border px-4">
          <Logo height={15} />
          <IconButton icon="x" label="Fechar menu" onClick={() => menuRef.current?.close()} />
        </div>
        <nav aria-label="Principal (celular)" className="grid gap-1 p-3">
          {[{ to: '/', label: 'Início' }, ...NAV, { to: '/library', label: 'Minha biblioteca' }].map((item) => (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => menuRef.current?.close()}
              className={cn('rounded-md px-3 py-2.5 text-base font-medium', path === item.to ? 'bg-muted text-fg' : 'text-fg-muted hover:bg-muted hover:text-fg')}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </dialog>
    </header>
  )
}

function Footer() {
  return (
    <footer className="mt-24 border-t border-border bg-background-subtle">
      <div className="mx-auto grid max-w-[1440px] gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div className="max-w-sm">
          <Logo height={16} className="text-fg" />
          <p className="mt-4 text-sm text-fg-muted">
            {formatNumber(catalogInfo.icons)} ícones SVG originais, desenhados num grid de 24 com traço de 1,5. Livres para usar em qualquer projeto, sob a licença MIT.
          </p>
        </div>
        <FooterColumn
          title="Biblioteca"
          links={[
            ['/icons', 'Explorar ícones'],
            ['/categories', 'Categorias'],
            ['/collections', 'Coleções'],
            ['/library', 'Minha biblioteca'],
          ]}
        />
        <FooterColumn
          title="Projeto"
          links={[
            ['/about', 'Sobre o GLYPHOS'],
            ['/about#grid', 'O grid e o traço'],
            ['/about#licenca', 'Licença e créditos'],
            ['/about#contribuir', 'Contribuir'],
          ]}
        />
        <FooterColumn
          title="Atalhos"
          links={[
            ['/icons?sort=newest', 'Adicionados recentemente'],
            ['/icons?style=solid', 'Estilo sólido'],
            ['/icons?style=duotone', 'Estilo duotone'],
            ['/sitemap.xml', 'Mapa do site'],
          ]}
        />
      </div>
    </footer>
  )
}

function FooterColumn({ title, links }: { title: string; links: Array<[string, string]> }) {
  return (
    <div>
      <h2 className="text-sm font-medium text-fg">{title}</h2>
      <ul className="mt-3 grid">
        {links.map(([href, label]) => (
          <li key={href}>
            <a href={href} className="inline-block py-1 text-sm text-fg-muted hover:text-fg">
              {label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}
