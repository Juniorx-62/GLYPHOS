import { Link, createFileRoute } from '@tanstack/react-router'
import { CATEGORIES, LICENSES, STYLES, catalogInfo } from '~/catalog'
import { LogoMark } from '~/components/layout/Logo'
import { SectionHeader } from '~/components/ui/primitives'
import { breadcrumbLd, pageHead } from '~/lib/seo'
import { formatNumber } from '~/lib/utils'

export const Route = createFileRoute('/about')({
  head: () =>
    pageHead({
      title: 'Sobre o GLYPHOS: grid, estilos e licença',
      description: 'Como os ícones do GLYPHOS são desenhados (grid de 24, traço de 1,5, área viva), como os estilos são derivados, a licença MIT e como contribuir com novos ícones.',
      path: '/about',
      jsonLd: [breadcrumbLd([{ name: 'Sobre', path: '/about' }])],
    }),
  component: AboutPage,
})

const MIT = `MIT License

Copyright (c) 2026 GLYPHOS

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.`

function GridDiagram() {
  const lines = Array.from({ length: 23 }, (_, i) => i + 1)
  return (
    <svg viewBox="0 0 24 24" className="w-full max-w-sm text-fg" role="img" aria-label="O grid de 24 unidades com a área viva e as formas-chave: círculo de raio 9, quadrado de 18 e os retângulos de 19 por 14">
      <rect x="0" y="0" width="24" height="24" style={{ fill: 'var(--color-surface)' }} />
      {lines.map((i) => (
        <path key={i} d={`M${i} 0V24M0 ${i}H24`} style={{ stroke: 'var(--color-canvas-grid)' }} strokeWidth="0.06" />
      ))}
      <rect x="2" y="2" width="20" height="20" fill="none" style={{ stroke: 'var(--color-accent)' }} strokeWidth="0.08" strokeDasharray="0.4 0.3" />
      <g fill="none" stroke="currentColor" strokeWidth="0.12" opacity="0.55">
        <circle cx="12" cy="12" r="9" />
        <rect x="3" y="3" width="18" height="18" rx="3" />
        <rect x="2.5" y="5" width="19" height="14" rx="2.5" />
        <rect x="5" y="2.5" width="14" height="19" rx="2" />
      </g>
      <path d="M0 0L24 24M24 0L0 24" style={{ stroke: 'var(--color-canvas-grid)' }} strokeWidth="0.06" />
    </svg>
  )
}

function AboutPage() {
  const license = LICENSES.MIT
  return (
    <div className="mx-auto max-w-[1440px] px-4 pt-12 sm:px-6">
      <div className="max-w-[1080px]">
        <div className="grid grid-cols-[auto_1fr] items-start gap-x-3 sm:gap-x-4">
          <LogoMark size={32} className="mt-1.5 text-fg sm:mt-2 sm:size-10" />
          <h1 className="text-2xl font-medium text-fg sm:text-3xl">Sobre o GLYPHOS</h1>
          <p className="col-start-2 mt-1 text-sm text-fg-muted">Biblioteca de ícones SVG originais.</p>
        </div>
        <div className="mt-8 grid max-w-3xl gap-4 text-base text-fg-muted">
          <p>
            O GLYPHOS reúne {formatNumber(catalogInfo.icons)} ícones SVG desenhados para o projeto, organizados em {CATEGORIES.length} categorias e pesquisáveis em português e em inglês. Cada ícone tem nome, sinônimos,
            tags, categoria e licença registrados num catálogo versionado, que é a fonte de verdade do site.
          </p>
          <p>
            O nome vem de <em>glyph</em>, o sinal gravado. A marca é um G escrito com a mesma pena dos ícones; o quadrado em rubrica, o vermelho que os escribas usavam para destacar o
            que importava, é a unidade do grid.
          </p>
        </div>

        <section id="grid" className="mt-24 scroll-mt-20" aria-labelledby="grid-title">
          <SectionHeader id="grid-title" title="O grid e o traço" description="Todos os ícones seguem as mesmas medidas, para parecerem da mesma família lado a lado." />
          <div className="grid items-start gap-8 md:grid-cols-[minmax(0,22rem)_1fr]">
            <div className="overflow-hidden rounded-md">
              <GridDiagram />
            </div>
            <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-3 text-sm">
              {[
                ['Área', '24 × 24 unidades'],
                ['Área viva', 'de 2 a 22, com 2 unidades de margem (linha tracejada)'],
                ['Traço', '1,5 unidade, ajustável de 0,75 a 2,5 na exportação'],
                ['Pontas e cantos', 'arredondados'],
                ['Formas-chave', 'círculo de raio 9, quadrado de 18, retângulos de 19 × 14 e 14 × 19'],
                ['Cor', 'currentColor: o ícone assume a cor do texto ao redor'],
                ['Formato', 'SVG com formas simples (path, circle, rect, line…), sem scripts, estilos, grupos ou referências externas'],
              ].map(([k, v]) => (
                <div key={k} className="contents">
                  <dt className="font-medium text-fg">{k}</dt>
                  <dd className="text-fg-muted">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        <section id="estilos" className="mt-24 scroll-mt-20" aria-labelledby="styles-title">
          <SectionHeader id="styles-title" title="Estilos" description="Um desenho-mestre por conceito. Os outros estilos são derivados dele ou desenhados à mão." />
          <ul className="grid gap-x-12 gap-y-6 sm:grid-cols-2">
            {STYLES.map((s) => (
              <li key={s.id} className="border-t border-border pt-4">
                <p className="flex items-baseline justify-between gap-2">
                  <span className="font-medium text-fg">{s.name.pt}</span>
                  <span className="inscription text-fg-subtle">{(catalogInfo.styles[s.id] ?? 0) > 0 ? `${formatNumber(catalogInfo.styles[s.id] ?? 0)} ícones` : 'previsto'}</span>
                </p>
                <p className="mt-1 text-sm text-fg-muted">{s.description}</p>
              </li>
            ))}
          </ul>
        </section>

        <section id="licenca" className="mt-24 scroll-mt-20" aria-labelledby="license-title">
          <SectionHeader id="license-title" title="Licença" description="Os ícones são livres para usar em projetos pessoais e comerciais, com ou sem modificação." />
          <div className="grid gap-4 text-sm text-fg-muted">
            <p>
              Todos os ícones do catálogo são desenhos próprios do GLYPHOS, publicados sob a <a href={license.url} className="text-fg underline underline-offset-2" target="_blank" rel="noopener">{license.name}</a>. Para usar um ícone num site
              ou aplicativo, não é preciso dar crédito. Ao redistribuir o conjunto (num pacote, num kit de design), mantenha o aviso de licença abaixo.
            </p>
            <p>
              O catálogo não inclui logotipos de marcas: marcas registradas têm regras de uso próprias. Cada ícone registra autoria, origem e licença, que aparecem na sua página.
            </p>
            <pre className="code-surface max-h-72 overflow-auto rounded-md bg-background-subtle p-5 whitespace-pre-wrap text-fg-muted">{MIT}</pre>
          </div>
        </section>

        <section id="contribuir" className="mt-24 scroll-mt-20" aria-labelledby="contrib-title">
          <SectionHeader id="contrib-title" title="Contribuir" />
          <div className="grid max-w-3xl gap-3 text-sm text-fg-muted">
            <p>
              O repositório traz o guia completo para incluir ícones (<code className="inscription">docs/ADDING_ICONS.md</code>): o grid, os papéis das formas que geram os estilos, os metadados de busca, a validação automática e a
              folha de contato para revisão visual.
            </p>
            <p>
              Encontrou um ícone que falta, um desenho que não lê bem em 16 px ou uma busca que não acha o que deveria? Anote o termo que você usou: sinônimos e tags fazem parte do catálogo.
            </p>
            <p>
              <Link to="/icons" className="text-fg underline underline-offset-2">
                Explorar a biblioteca
              </Link>
            </p>
          </div>
        </section>
      </div>
    </div>
  )
}
