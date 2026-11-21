# Arquitetura

## Visão geral

O GLYPHOS é uma aplicação React com renderização no servidor (TanStack Start), cujo conteúdo, a biblioteca de ícones, é **código versionado**: desenhos SVG e metadados em JSON dentro de `src/catalog`. Um passo de build (`catalog:index`) lê esses arquivos, valida tudo e gera os índices que o site consome. Os dados de quem usa (favoritos, histórico, coleções, preferências) ficam só no navegador.

```
                ┌──────────────── src/catalog (fonte de verdade, versionada) ────────────────┐
                │ icons/<categoria>/<slug>.svg      desenho-mestre (+ <slug>.<estilo>.svg)  │
                │ metadata/<categoria>.json         nome, sinônimos, tags, licença…         │
                │ categories/ · styles/ · collections.ts · licenses.ts · search/lexicon.ts  │
                └───────────────┬────────────────────────────────────────────────────────────┘
                                │ npm run catalog:index (valida + gera)
        ┌───────────────────────┼──────────────────────────┬──────────────────────────────┐
        ▼                       ▼                          ▼                              ▼
 registry/generated/      registry/generated/        registry/generated/          public/svg/<estilo>/
 manifest.json            shards/<categoria>.json    search-index.json            <slug>.svg
 (lista leve)             (registro + desenho)       (índice invertido)           (arquivos estáticos)
        │                       │                          │
        └────────────┬──────────┴──────────────┬───────────┘
                     ▼                         ▼
          src/catalog/index.ts  ◄──── carregamento sob demanda (chunks do Vite, em cache)
                     │
     ┌───────────────┼──────────────────────────────────────────────┐
     ▼               ▼                                              ▼
 routes/ (SSR)   features/ (busca, exploração, prévia,         components/ (casca,
 loader + head   personalização, exportação)                    UI, ícones, código)
                     │
                     ▼
                 data/ (stores) ──► IndexedDB → localStorage → memória
```

Duas fontes de dados, que não se misturam:

1. **Catálogo** (`src/catalog`): igual para todo visitante; gerado no build; servido em pedaços.
2. **Dados de quem usa** (`src/data`): favoritos, histórico, coleções pessoais e preferências de personalização; persistidos no navegador, com cópia de segurança em JSON.

## Camadas

| Pasta | Responsabilidade | Pode importar |
| --- | --- | --- |
| `src/catalog` | Modelo de dados, leitura e validação de SVG, geometria, estilos derivados, busca, registries, API de acesso | só `src/catalog` (roda também em Node, sem React) |
| `src/lib`, `src/hooks` | Utilitários puros (SEO, site, formatação, área de transferência) e hooks genéricos | só `lib` e `hooks` |
| `src/data` | Stores locais, drivers de persistência, cópia de segurança | `data`, `lib`, `hooks`, `catalog`, `brand` |
| `src/components` | `ui` (controles), `icons` (desenho de ícones), `code` (blocos de código), `layout` (casca do app) | `ui`/`icons`/`code` não importam `features`, `routes` nem `data`; `layout` compõe `features` |
| `src/features` | Lógica e partes de cada área: busca, exploração, prévia, personalização, exportação, SEO | tudo, menos `routes` |
| `src/routes` | Rotas por arquivo: `loader`, `head`, `validateSearch` e a página | tudo |
| `scripts/` | Ferramentas de catálogo, marca, validação e SEO (Node) | `src`, `brand` |

### Regras de importação

`npm run check:deps` (parte do `verify`) confere as regras acima e a ausência de ciclos de import, lendo os imports reais de cada arquivo:

1. `lib/` e `hooks/` não importam nada de `src/` fora deles.
2. `catalog/` só importa `catalog/` e nunca `react`: os scripts de Node usam os mesmos módulos.
3. `data/` importa só `data/`, `lib/`, `hooks/`, `catalog/` e `brand/`.
4. `components/ui`, `components/icons` e `components/code` não importam `features/`, `routes/` nem `data/`.
5. `features/` não importa `routes/`; nada importa `routes/`, exceto o `routeTree.gen.ts` gerado.
6. Nenhum ciclo de import.

## Catálogo

### Modelo de dados

Os tipos estão em `src/catalog/types.ts`. Resumo:

```ts
interface IconMeta {            // escrito à mão em metadata/<categoria>.json
  id: string                    // "g" + 7 caracteres base-32, estável (sobrevive a renomeações)
  slug: string                  // nome técnico, inglês, kebab-case, único
  name: { pt: string; en: string }
  subcategory?: string
  synonyms: { pt: string[]; en: string[] }
  tags: { pt: string[]; en: string[] }
  family?: string               // família de conceito (file, file-plus…)
  variantOf?: string            // desenho base de uma versão com modificador
  aliases?: string[]            // slugs antigos
  popularity: 1 | 2 | 3 | 4 | 5 // editorial
  added: string; updated?: string
  author: string; source: SourceId; license: LicenseId
}
// IconNode: { tag: 'path'|'circle'|'ellipse'|'rect'|'line'|'polyline'|'polygon', attrs, part: 'line'|'body'|'cut'|'slash' }
```

A categoria não é um campo: é o arquivo em que a entrada está. O caminho do SVG é derivado (`icons/<categoria>/<slug>.svg`). O detalhamento de cada campo está em [CATALOG.md](CATALOG.md#modelo-de-dados).

### Registries

| Registry | Arquivo | Conteúdo |
| --- | --- | --- |
| Categorias | `src/catalog/categories/index.ts` | Ordem, nomes pt/en, descrição (texto da página e SEO), ícone-símbolo e subcategorias |
| Estilos | `src/catalog/styles/index.ts` | Os estilos, como cada um é obtido (`master`, `auto`, `manual`) e a derivação |
| Coleções | `src/catalog/collections.ts` | Coleções temáticas: nome, descrição e slugs |
| Licenças e origens | `src/catalog/licenses.ts` | Licenças aceitas e origens registradas |
| Léxico | `src/catalog/search/lexicon.ts` | Grupos de sinônimos gerais pt/en para a busca |
| Ícones da interface | `src/components/icons/ui-icon-names.ts` | Os ícones do catálogo que o próprio app usa |

### Índices gerados

`scripts/catalog/build.ts` (`npm run catalog:index`) lê o catálogo com o mesmo carregador do validador (`scripts/lib/catalog.ts`), deixa de fora ícones com erro (ou falha, com `--strict`) e grava em `src/catalog/registry/generated/` (fora do git):

| Arquivo | Conteúdo | Quem carrega |
| --- | --- | --- |
| `manifest.json` | id, slug, nomes, categoria, subcategoria, estilos, popularidade, data e família de cada ícone | Exploração, loaders, sitemap (chunk sob demanda) |
| `shards/<categoria>.json` | Registro completo e o desenho em forma compacta (`[tag, attrs, papel]`) | Uma requisição por categoria, quando um ícone dela aparece |
| `search-index.json` | Índice invertido (termos ordenados, listas de ocorrência com peso), nomes e popularidade | Na primeira busca |
| `ui-icons.json` | Desenhos dos ícones da interface | Junto com o app (render no servidor) |
| `catalog-meta.json` | Totais por categoria e estilo, data mais recente | Junto com o app |
| `aliases.json` | Slug antigo → atual | Junto com o app (redirecionamento 301) |

Também gera `public/svg/<estilo>/<slug>.svg`, os arquivos estáticos de cada estilo disponível.

## Renderização SVG

Os desenhos nunca são injetados como HTML. O caminho é sempre:

```
arquivo SVG ──parseIconSvg (lista permitida)──► IconNode[] ──renderIcon(estilo, opções)──► SvgElement
                                                                                   ├─► React (components/icons/Glyph.tsx)
                                                                                   └─► texto (toSvgString → exportação, public/svg)
```

- `src/catalog/svg/parse.ts` aceita só a raiz do catálogo e as formas simples, com atributos de geometria, `fill="currentColor"`, `stroke="none"` e `data-part`. Qualquer outra coisa (script, `foreignObject`, `use`, `href`, `style`, eventos, grupos, transformações, comentários, DOCTYPE) é recusada com o motivo.
- `renderIcon` (`src/catalog/styles/index.ts`) monta o estilo pedido sem alterar os nós de entrada:
  - **Contorno:** o desenho como está.
  - **Duotone:** os corpos recebem `fill` a 20%.
  - **Sólido:** os corpos são preenchidos; recortes e barras viram uma máscara (`<mask>` com id único por instância, `useId` no React) que vaza o corpo; as barras são redesenhadas na fenda.
  - Um arquivo `<slug>.<estilo>.svg` substitui a derivação.
- `Glyph.tsx` converte a árvore em elementos React (`createElement`), com `aria-hidden` ou `role="img"` + `aria-label`.

## Pesquisa

`src/catalog/search/` tem três partes puras, testadas em Node:

- `normalize.ts`: minúsculas, sem acento, pontuação vira espaço, palavras vazias fora (de, da, para, the, of…), plural reduzido ao singular em português e inglês (carrinhos → carrinho, botões → botão, boxes → box) e distância de Damerau-Levenshtein.
- `engine.ts`: `buildSearchIndex` cria o índice invertido; `createSearcher` responde às consultas.
- `lexicon.ts`: grupos de equivalentes (excluir ↔ apagar ↔ trash ↔ bin; carrinho de compras ↔ cart ↔ checkout).

```
consulta ──tokenize──► palavras ──frases do léxico ("carrinho de compras") viram um termo──► termos
termo: exato → prefixo (enquanto digita) → equivalentes do léxico (peso 0,6) → 1 erro de digitação (≥ 4 letras)
cada termo precisa casar (E); se nada casa com todos, volta o OU, marcado como parcial
pontos = peso do campo (nome 10, slug 9, sinônimo 7, alias 6, tag 4, família 3, subcategoria 2, categoria 1,5)
       + nome exato (+15) ou nome que começa com a consulta (+6) + popularidade × 0,4
```

No navegador, `useIconSearch` carrega o índice no primeiro uso e consulta com `useDeferredValue`, então digitar nunca espera a busca. O teste de desempenho (`tests/unit/search.test.ts`) mede consultas num catálogo sintético de 20 mil ícones. O motor não depende do DOM: se o catálogo crescer a ponto de pesar na thread principal, ele roda num Web Worker sem mudanças ([DECISIONS/0004](DECISIONS/0004-busca-propria.md)).

## Exploração e desempenho

- **Grade virtual** (`features/exploration/IconGrid.tsx`, com `@tanstack/react-virtual`): só as linhas na tela, mais uma margem, existem no DOM. A coluna é calculada pela largura (`ResizeObserver`).
- **Desenhos sob demanda**: cada célula pede o fragmento da sua categoria (`useShardIcon`); um fragmento carregado atende todas as células da categoria.
- **Primeira pintura no servidor**: o loader de `/icons` desenha as primeiras 48 células com os desenhos já incluídos; no navegador, a página monta a grade virtual quando o manifesto chega.
- **Páginas de categoria, coleção e ícone** são renderizadas por completo no servidor, com links rastreáveis.
- O cache de borda guarda o HTML (`s-maxage=86400`, `src/start.ts`); os chunks do Vite têm hash e cache longo.

## Exportação

`src/features/export/formats.ts` gera, a partir do desenho e da personalização atual (estilo, traço, cor, tamanho, opacidade):

| Formato | Saída |
| --- | --- |
| SVG | Arquivo ou código independente, com `currentColor` ou a cor escolhida |
| JSX / TSX | Componente React autocontido, com `size`, `color` e `strokeWidth` como props; `useId` quando há máscara |
| CSS | Classe `.icon-<slug>` que pinta o ícone por `mask-image`, na cor do texto |
| Data URI | O SVG como endereço `data:`, para `<img>` ou CSS |
| PNG | Rasterizado no navegador por `<canvas>`, de 16 a 1024 px, com fundo transparente, branco ou preto |

As funções são puras (menos o PNG) e testadas em `tests/unit/styles-export.test.ts`. O arquivo original nunca é alterado.

## Persistência local

Adaptada de outro projeto do mesmo autor ([DECISIONS/0006](DECISIONS/0006-reuso-de-outros-projetos.md)):

- `data/persistence`: driver IndexedDB (`glyphos` → store `kv`), com localStorage e memória como reserva.
- `data/store.ts`: `createPersistentStore({ key, version, initial, migrate })`, reativa com `useSyncExternalStore` (o servidor vê os valores iniciais, sem divergência na hidratação), gravação com debounce, sincronização entre abas por `BroadcastChannel('glyphos-sync')`, envelope versionado e `migrate`.
- `data/stores`: `favorites` (`toggleFavorite`, `useIsFavorite`), `history` (`recordView`), `collections` (`createCollection`, `toggleInCollection`, `toggleCreationInCollection`, `renameCollection`, `deleteCollection`), `creations` (projetos do editor: `saveCreation`, `renameCreation`, `duplicateCreation`, `deleteCreation`, saneados por `cleanDoc`; e `draftStore`, o trabalho ainda não salvo, fora da cópia de segurança), `settings` (`updateSettings`, `useAppearance`, `useThemePreference`).
- `data/backup.ts`: exporta um JSON com todas as stores; ao importar, confere o arquivo inteiro (cada parte pelo `migrate` da store) e só aplica se tudo for válido.
- O tema também fica em `localStorage` (`glyphos:theme-preference`), lido por um script no `<head>` antes da primeira pintura.
- Tema: só claro e escuro. A primeira visita começa no tema do sistema; depois vale o que o botão escolheu. A troca (`toggleTheme` em `components/layout/theme.tsx`, botão no cabeçalho ou tecla `T`) usa uma View Transition: a página inteira esmaece de uma vez, com as transições dos componentes congeladas (`data-theme-switching`). Com movimento reduzido, as cores só trocam.
- `history`: abrir um ícone no painel rápido da grade conta como visto, igual a abrir a página dele.

## Editor de ícones

`src/features/editor` ([DECISIONS/0014](DECISIONS/0014-editor-de-icones.md)):

```
model/ (puro, testado em Node)        state.ts (store externo)          Canvas.tsx / Panels.tsx / Dialogs.tsx
  doc.ts       árvore de formas   ──►   histórico (instantâneos)    ──►   desenha e traduz gestos em passos
  geometry.ts  limites, Bézier,         seleção, ferramenta, projeto      camera.ts: zoom e posição da vista
               transformações           salvamento automático e rascunho
  serialize.ts CreationDoc ⇄ IconNode ──► renderIcon / formats.ts (os mesmos da biblioteca)
  boolean.ts   polygon-clipping
  style-match.ts  ajuste ao sistema do GLYPHOS, com relatório
```

- O canvas desenha cada forma a partir de `shapeToNode`, o mesmo nó que vai para a exportação.
- `actions.ts` reúne os comandos (alinhar, agrupar, ordenar, booleanas, área de transferência); cada um é um passo do histórico com rótulo.
- `CreationsLibrary.tsx` é a aba Criações da biblioteca (miniaturas, coleções, sprite SVG, projeto `.glyphos.json`).

## Rotas

| Arquivo | Rota | Detalhes |
| --- | --- | --- |
| `__root.tsx` | — | Documento, `<head>` padrão, script de tema, `AppShell` |
| `index.tsx` | `/` | Início: busca, populares, categorias, estilos, novidades, coleções, como usar |
| `icons/index.tsx` | `/icons` | Exploração. `?q=&category=&style=&sort=&icon=` validados; o loader renderiza as primeiras linhas no servidor |
| `icons/$slug.tsx` | `/icons/:slug` | Página do ícone; 404 real; slug antigo → 301 para o atual |
| `categories/index.tsx`, `categories/$categoryId.tsx` | `/categories`, `/categories/:id` | Lista e página de categoria (todos os ícones, por subcategoria) |
| `collections/index.tsx`, `collections/$collectionId.tsx` | `/collections`, `/collections/:id` | Coleções temáticas |
| `create.tsx` | `/create` | Editor de ícones. `?project=` continua uma criação; `?from=<slug>` abre cópia de um ícone da biblioteca |
| `library.tsx` | `/library` | Favoritos, recentes, criações, coleções pessoais, cópia de segurança (`noindex`) |
| `about.tsx` | `/about` | Grid, estilos, licença e contribuição |
| `sitemap[.]xml.ts`, `robots[.]txt.ts` | | Rotas de servidor geradas do catálogo |

## SEO

Cada rota folha chama `pageHead` (`src/lib/seo.ts`): título, descrição, canonical, robots, Open Graph, Twitter e JSON-LD (`WebSite` com `SearchAction`, `CollectionPage`, `ImageObject` com licença, `BreadcrumbList`). Detalhes em [SEO.md](SEO.md).

## Dependências

| Pacote | Por quê |
| --- | --- |
| `react`, `react-dom` | Interface |
| `@tanstack/react-start`, `@tanstack/react-router`, `nitro` | SSR, rotas por arquivo, servidor para Vercel/Node ([DECISIONS/0001](DECISIONS/0001-stack.md)) |
| `@tanstack/react-virtual` | Virtualização da grade ([DECISIONS/0005](DECISIONS/0005-grade-virtual.md)) |
| `@fontsource-variable/geist`, `-mono` | Tipografia empacotada, funciona offline |
| `tailwindcss`, `@tailwindcss/vite`, `vite`, `typescript` | Build e estilos (desenvolvimento) |
| `svgo` | Limpeza de SVGs vindos de editores no `catalog:import` (desenvolvimento) |

| `polygon-clipping` | Operações booleanas do editor (união, subtração, interseção, exclusão) ([DECISIONS/0014](DECISIONS/0014-editor-de-icones.md)) |

Não há biblioteca de componentes, de estado, de busca ou de ícones de terceiros.

## Fluxo de inclusão de conteúdo

```
desenho (catalog:new | catalog:add | catalog:import)
   └► catalog:format ─► catalog:validate ─► catalog:sheet (revisão visual) ─► catalog:index ─► verify ─► push
```

O passo a passo completo está em [ADDING_ICONS.md](ADDING_ICONS.md).
