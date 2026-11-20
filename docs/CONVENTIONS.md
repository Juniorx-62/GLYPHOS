# Convenções

## Código

- TypeScript estrito, com `verbatimModuleSyntax` e `erasableSyntaxOnly`: sem `enum`, `namespace` nem propriedades de parâmetro, para que o Node rode os módulos de `src/catalog` direto (scripts e testes) sem compilação.
- Imports de tipo com `import type`. Sem `any`.
- Comentários e identificadores em inglês; documentação e toda a interface em português do Brasil.
- `src/catalog` não importa React nem nada fora do catálogo ([regras de importação](ARCHITECTURE.md#regras-de-importação), conferidas por `npm run check:deps`).
- Rotas ficam com `loader`, `head`, `validateSearch` e a página; interface reaproveitada ou com mais de ~250 linhas vai para `features/`.
- Nenhum dado fictício apresentado como real. Totais e listas vêm do catálogo; a popularidade é declarada como editorial.
- Nenhum botão sem ação, nenhum controle decorativo.

## Componentes

- Elementos nativos primeiro: `<button>`, `<dialog>`, `<input type="range">`, `<select>`.
- Botão só com ícone usa `IconButton`, que exige `label` (vira `aria-label` e `title`).
- Ícones da interface vêm do próprio catálogo (`UiIcon` + `ui-icon-names.ts`); ícones do catálogo em listas usam `Glyph`/`LazyGlyph`. Nada de SVG solto colado em componentes.
- Escolhas entre poucas opções usam `Segmented` (`role="radiogroup"`, setas movem).
- Arquivos `PascalCase.tsx` para componentes, `kebab-case.ts` para módulos e hooks.

## Nomes

| Item | Padrão | Exemplo |
| --- | --- | --- |
| Slug de ícone | kebab-case em inglês, objeto + modificador | `file-plus`, `circle-check` |
| Id de ícone | `g` + 7 base-32 | `g3k9m2qx` |
| Categoria, subcategoria | kebab-case em inglês | `photo-video`, `rail-air-sea` |
| Componente React | PascalCase | `IconGrid.tsx` |
| Hook | `use-*.ts` → `useX` | `use-search.ts` → `useIconSearch` |
| Token | namespace do Tailwind 4 | `--color-fg-muted`, `--radius-lg` |
| Rota | arquivo = segmento | `icons/$slug.tsx` |
| Componente exportado | slug em PascalCase + `Icon` | `ShoppingCartIcon` |
| Classe CSS exportada | `.icon-<slug>` | `.icon-shopping-cart` |

## SVG

O formato do catálogo é restrito e conferido pelo validador ([ADDING_ICONS.md](ADDING_ICONS.md#3-o-arquivo-svg)):

- Raiz fixa: `viewBox="0 0 24 24"`, `fill="none"`, `stroke="currentColor"`, `stroke-width="1.5"`, pontas e cantos redondos.
- Só `path`, `circle`, `ellipse`, `rect`, `line`, `polyline` e `polygon`, sem grupos nem transformações.
- Formato canônico (`catalog:format`): ordem fixa de atributos, números com até 3 casas, caminhos com espaçamento uniforme.
- Área viva de 2 a 22; traço nunca cortado (1 a 23).
- Papéis com `data-part` (`body`, `cut`, `slash`).

## Metadados

- Nomes em português com inicial maiúscula; em inglês, idem ("Shopping cart").
- De 4 a 8 palavras de busca por idioma, entre sinônimos e tags, sem repetir o nome.
- Popularidade comedida: 5 só para o essencial universal.
- Metadados escritos por `catalog:add`, `catalog:new` ou `catalog:import`, e formatados por `catalog:format` (ordem de chaves e de ícones fixas).

## Categorias

- A categoria é a do objeto desenhado, não a do uso.
- Um conceito, uma categoria. A busca encontra o ícone por qualquer tag.
- Subcategorias existem no registry antes de serem usadas.

## Acessibilidade

- Todo controle tem nome acessível; ícones decorativos têm `aria-hidden`; um ícone que é o conteúdo (a prévia ampliada) tem `role="img"` e `aria-label`.
- Teclado: Tab, setas na grade (com Home, End, PageUp e PageDown), setas nos grupos `Segmented`, Esc fecha diálogos e devolve o foco, `Ctrl K`/`⌘K` e `/` abrem a busca.
- Foco visível em todo elemento interativo (anel na cor `ring`).
- Contraste AA no texto (os valores estão em [brand-guidelines](../brand/guidelines/brand-guidelines.md#cores)); cor nunca é a única informação (erros têm ícone e texto).
- `prefers-reduced-motion` zera transições e animações.
- Campos com 16 px em telas de toque (o iOS não aproxima a página).

## Estilos (CSS)

- Só tokens. A paleta, a escala de texto, os raios e as sombras padrão do Tailwind foram removidos: `bg-surface`, `text-fg-muted`, `border-border`, `rounded-lg`, `shadow-md` só existem como valores da marca.
- Novo valor? Acrescente em `brand/tokens/source.ts` e rode `npm run brand`.
- Espaçamento em múltiplos de 4 px. Raio `md` (8 px) para controles, `lg`/`xl` para cartões, `2xl` para a prévia.
- Alturas de controle: `h-control-sm` (28), `h-control-md` (36), `h-control-lg` (44).
- Texto: `text-xs` (12, piso) a `text-4xl`. Pesos 400, 500 (rótulos) e 600 (títulos).
- Valores em `style` só para o que é dado (cor escolhida, coluna calculada da grade).

## Organização de arquivos

- `src/catalog`: dados e lógica pura do catálogo. `src/features/<área>`: lógica e partes de uma área. `src/components`: peças sem regra de negócio. `scripts/<tipo>`: `catalog`, `validation`, `generation`, `brand`, `seo`, `lib`.
- Testes: `tests/unit` (funções puras), `tests/integration` (o catálogo real), `tests/e2e` (fluxos no navegador), `tests/fixtures` (dados de teste).
- Gerados ficam fora do git (`src/catalog/registry/generated`, `public/svg`) e nunca são editados à mão. Os da marca (`brand/tokens/*.css`, logos) são versionados e conferidos por `check:brand`.
- Rascunhos (lotes de desenho, folhas de contato) vão para `tmp/`, fora do git.
