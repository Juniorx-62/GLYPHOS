<!--
  Mantenha este README sem contagens ("N ícones", "N categorias").
  O catálogo muda com frequência e a fonte de verdade é src/catalog:
  descreva o que o GLYPHOS faz, não quanto ele tem. Os números estão em
  `npm run catalog:stats` e em docs/audits/CATALOG_HEALTH.md.
-->

<p align="center">
  <img src="brand/logo/glyphos-wordmark.svg" alt="GLYPHOS" width="320">
</p>

<p align="center">
  <strong>Biblioteca de ícones SVG do ecossistema THOTH</strong><br>
  Ícones originais desenhados com a mesma pena, pesquisáveis em português e inglês, para personalizar e levar ao seu projeto em SVG, JSX, CSS ou PNG.
</p>

<p align="center">
  <a href="https://glyphos.vercel.app">Site</a> ·
  <a href="docs/ARCHITECTURE.md">Arquitetura</a> ·
  <a href="docs/ADDING_ICONS.md">Adicionar ícones</a> ·
  <a href="docs/CATALOG.md">Catálogo</a> ·
  <a href="docs/DEVELOPMENT.md">Desenvolvimento</a> ·
  <a href="docs/TESTING.md">Testes</a> ·
  <a href="docs/LICENSING.md">Licenciamento</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React_19-20232A?style=flat-square&logo=react&logoColor=61DAFB" alt="React 19">
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript">
  <img src="https://img.shields.io/badge/TanStack_Start-SSR-151514?style=flat-square" alt="TanStack Start com SSR">
  <img src="https://img.shields.io/badge/Vite_8-646CFF?style=flat-square&logo=vite&logoColor=white" alt="Vite 8">
  <img src="https://img.shields.io/badge/Tailwind_CSS_4-0F172A?style=flat-square&logo=tailwindcss&logoColor=38BDF8" alt="Tailwind CSS 4">
  <img src="https://img.shields.io/badge/ícones-MIT-D9401F?style=flat-square" alt="Ícones sob a licença MIT">
</p>

## Sobre o projeto

O GLYPHOS é uma plataforma de descoberta, consulta, personalização e exportação de ícones. Todos os ícones são desenhos próprios, num grid de 24 unidades com traço de 1,5 e pontas redondas, organizados por categoria e descritos com nomes, sinônimos e tags em português e em inglês.

Cada conceito tem um desenho-mestre (Contorno). Os estilos Sólido e Duotone são derivados dele pelo papel de cada forma, então uma correção no desenho chega a todos os estilos. A arquitetura também aceita estilos desenhados à mão (Reto, Arredondado, Preenchido).

- **Para quem:** quem desenvolve e desenha interfaces, de quem está começando a quem precisa de um ícone pronto, acessível e portátil.
- **Sem cadastro:** favoritos, histórico, coleções e preferências ficam no navegador, com cópia de segurança em JSON.
- **Livre:** os ícones são distribuídos sob a licença MIT, inclusive para uso comercial.

## Funcionalidades

| Área | Rota | O que oferece |
| --- | --- | --- |
| Início | `/` | Busca em destaque, populares, categorias, estilos, novidades, coleções temáticas e como usar |
| Explorar | `/icons` | Grade virtual com busca instantânea, filtros por categoria e estilo, ordenação por popularidade, nome ou novidade, filtros ativos e painel rápido do ícone. A URL guarda a vista |
| Ícone | `/icons/:slug` | Prévia ampliada sobre o grid, escalas reais, temas claro e escuro, personalização, estilos, código (SVG, JSX, TSX, CSS, data URI), PNG, metadados, família e relacionados |
| Categorias | `/categories`, `/categories/:id` | Todas as categorias e, em cada uma, todos os ícones por subcategoria |
| Coleções | `/collections`, `/collections/:id` | Conjuntos temáticos para um tipo de produto, que podem ser copiados para a sua biblioteca |
| Minha biblioteca | `/library` | Favoritos, vistos por último, coleções pessoais, exportar e importar dados em JSON |
| Sobre | `/about` | O grid e o traço, os estilos, a licença e como contribuir |

Em qualquer página, `Ctrl K` (`⌘K` no Mac) ou `/` abre a busca global: ícones, categorias, coleções e páginas. `Enter` abre; `Ctrl Enter` copia o SVG do ícone selecionado.

## Como utilizar a biblioteca

1. **Encontre.** Busque pelo nome, por um sinônimo ou pela palavra em inglês ("carrinho de compras", "cart", "checkout"). A busca ignora acentos e plural e tolera um erro de digitação.
2. **Personalize.** Estilo, espessura do traço, cor, tamanho e opacidade, com prévia ao vivo. A personalização fica salva no navegador e vale para a grade e as exportações.
3. **Leve para o projeto.**

| Saída | Uso |
| --- | --- |
| SVG | Cole no HTML (assume a cor do texto, `currentColor`) ou baixe o arquivo |
| JSX / TSX | Componente React autocontido: `<ShoppingCartIcon size={20} color="currentColor" strokeWidth={1.5} />` |
| CSS | Classe `.icon-<slug>` que pinta o ícone com máscara, na cor do texto |
| Data URI | Para `<img src>` e `background-image` |
| PNG | De 16 a 1024 px, fundo transparente, branco ou preto |
| Arquivo estático | `https://glyphos.vercel.app/svg/<estilo>/<slug>.svg` |

Nada depende do GLYPHOS depois de copiado: o código exportado não importa pacotes nem arquivos externos.

## Princípios

- **Desenho próprio.** Nenhum ícone é copiado ou adaptado de outra biblioteca. Cada ícone registra autoria, origem e licença.
- **Um desenho, vários estilos.** Os estilos derivam do desenho-mestre; não existe uma segunda cópia da geometria.
- **O catálogo é a fonte de verdade.** Desenhos e metadados versionados; índices, páginas, contagens e SEO são gerados a partir deles.
- **SVG seguro.** Só formas simples, por lista de permissões; os desenhos viram elementos React, nunca HTML injetado.
- **Busca em português.** Português e inglês, sinônimos, plural, acento e erro de digitação.
- **Local-first.** Sem cadastro e sem servidor de dados.
- **Acessível por padrão.** Teclado em toda a interface, nomes acessíveis, contraste AA, movimento reduzido.

As razões de cada escolha estão em [docs/DECISIONS](docs/DECISIONS/README.md).

## Stack tecnológica

| Camada | Tecnologias |
| --- | --- |
| Linguagem | TypeScript estrito (app, scripts e testes) |
| Interface | React 19, Tailwind CSS 4 com tokens próprios, fontes Geist empacotadas |
| Aplicação | TanStack Start (SSR, rotas por arquivo), Vite 8, Nitro (Vercel ou Node) |
| Grade | `@tanstack/react-virtual` |
| Busca | Índice invertido próprio, gerado no build |
| Dados | IndexedDB, com localStorage e memória como reserva |
| Ferramentas | Node.js (scripts em TypeScript), SVGO (importação), Chrome/Edge (folhas de contato, imagens da marca, testes de navegador) |

## Primeiros passos

### Requisitos

- **Node.js 22.22 ou mais recente.**
- **[Bun](https://bun.sh)**, opcional (o `bun.lock` é o lockfile; `npm install` também funciona).
- **Chrome ou Edge**, para `catalog:sheet`, `brand -- --png`, `check:pages` e `test:e2e` (ou defina `CHROME_PATH`).

### Instalação e execução

```bash
bun install
```

```bash
npm run dev
```

Abra <http://localhost:3100>. O `dev` gera os índices do catálogo antes de subir o servidor.

## Scripts

| Comando | O que faz |
| --- | --- |
| `npm run dev` | Índices do catálogo + servidor de desenvolvimento (porta 3100) |
| `npm run build` | Índices + build de produção |
| `npm run start` | Serve o build com Node |
| `npm run verify` | Portão antes do push: catálogo, índices, tipos, testes, dependências, licenças e marca |
| `npm test` | Testes unitários e de integração |
| `npm run test:e2e` | Fluxos no navegador contra um servidor rodando |
| `npm run catalog:validate` | Valida desenhos e metadados, incluindo duplicatas visuais |
| `npm run catalog:index` | Gera manifesto, fragmentos, índice de busca e SVGs estáticos |
| `npm run catalog:stats` | Relatório de saúde do catálogo |
| `npm run catalog:add` · `catalog:new` · `catalog:import` | Incluem ícones (lote em texto, um a um ou de um editor) |
| `npm run catalog:sheet` | Folha de contato em PNG para revisão visual |
| `npm run check:pages` · `check:seo` | Varredura de páginas (desktop, tablet, celular) e SEO técnico |
| `npm run brand` | Regenera tokens, logos e ícones do app |

A lista completa está em [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md#scripts).

## Arquitetura

- **Catálogo** (`src/catalog`): um SVG por ícone, um JSON de metadados por categoria e registries tipados de categorias, estilos, coleções e licenças. O leitor de SVG aceita só o formato do catálogo; a geometria é conferida (área viva, formas fechadas, duplicatas).
- **Índices** (`catalog:index`): manifesto leve, um fragmento por categoria e o índice de busca, carregados sob demanda pelo app; e os SVGs estáticos em `public/svg`.
- **Estilos** (`src/catalog/styles`): Sólido e Duotone derivados dos papéis das formas (`body`, `cut`, `slash`).
- **Busca** (`src/catalog/search`): normalização pt/en, índice invertido com pesos, léxico de equivalências.
- **App** (`src/routes`, `src/features`): páginas renderizadas no servidor, grade virtual, painel rápido, personalização e exportação.
- **Dados de quem usa** (`src/data`): stores locais com versão, migração, sincronização entre abas e cópia de segurança.

```
GLYPHOS/
├── brand/            marca: geometria do logo, tokens (fonte + gerados), logos e diretrizes
├── docs/             arquitetura, desenvolvimento, testes, catálogo, convenções, licenças, SEO, decisões, auditorias, histórico
├── public/           favicon, ícones do app, imagem de compartilhamento; svg/ é gerado
├── scripts/
│   ├── catalog/      index, add, new, import, format, ids, stats
│   ├── validation/   validate, licenses, check-deps, check-pages
│   ├── generation/   folhas de contato
│   ├── brand/        geração da marca
│   ├── seo/          check-seo
│   └── lib/          leitura do catálogo, cliente do Chrome, carregador de TypeScript
├── src/
│   ├── catalog/      icons/, metadata/, categories/, styles/, svg/, search/, registry/, types, API
│   ├── features/     search, exploration, icon-preview, customization, export, seo
│   ├── components/   layout (casca), ui, icons, code
│   ├── data/         stores, persistência, cópia de segurança
│   ├── routes/       páginas e rotas de servidor (sitemap, robots)
│   ├── lib/ hooks/   utilitários
│   └── styles/       app.css
└── tests/            unit, integration, e2e, fixtures
```

Detalhes em [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Qualidade e testes

| Verificação | Quando | O que cobre |
| --- | --- | --- |
| `npm run verify` | Antes de cada push | Catálogo sem erros, índices completos, tipos, testes, regras de dependência, licenças, marca |
| `npm test` | Durante o desenvolvimento | Leitor de SVG (segurança), geometria, estilos, exportações, busca (inclusive desempenho), dados locais, catálogo real |
| `npm run test:e2e` | Mudou um fluxo | Busca, busca global, filtros, painel, copiar, personalizar, baixar SVG e PNG, favoritos, 404, celular |
| `npm run check:pages` | Mudou a interface | Erros, rolagem lateral e `<h1>` em desktop, tablet e celular |
| `npm run check:seo` | Depois de publicar | Título, descrição, canonical, Open Graph, JSON-LD e `<h1>` de cada página do sitemap |

Detalhes e critérios de aprovação em [docs/TESTING.md](docs/TESTING.md).

## Build e publicação

```bash
npm run verify
```

```bash
npm run build
```

- **Vercel:** predefinição **TanStack Start**, sem mudanças. Defina `VITE_SITE_URL` para outro domínio. Cada push na `main` publica.
- **Node:** `npm run build` e `npm run start`.

Depois de publicar: `npm run check:seo -- <endereço>`.

## Contribuindo

1. Para incluir ícones, siga [docs/ADDING_ICONS.md](docs/ADDING_ICONS.md): desenho no grid, papéis das formas, metadados em português e inglês, validação e folha de contato.
2. Siga [docs/CONVENTIONS.md](docs/CONVENTIONS.md) no código e nos nomes.
3. Antes de cada push, rode `npm run verify`; se mexeu na interface, confira os temas claro e escuro em 375 px e no desktop e rode `npm run check:pages`.
4. Decisões novas vão para [docs/DECISIONS](docs/DECISIONS/README.md); marcos e auditorias, para [docs/history](docs/history/README.md).

O repositório traz [skills do Claude Code](.claude/skills/) com o fluxo de desenho de ícones e os padrões do projeto.

## Documentação

| Documento | Conteúdo |
| --- | --- |
| [Arquitetura](docs/ARCHITECTURE.md) | Camadas, catálogo, índices, renderização SVG, busca, exportação, persistência, rotas, SEO, dependências |
| [Adicionar ícones](docs/ADDING_ICONS.md) | Do desenho ao site: grid, SVG, papéis, nomes, metadados, validação, revisão, variações |
| [Catálogo](docs/CATALOG.md) | Estrutura, modelo de dados, categorias, estilos, identificadores, indexação, expansão |
| [Desenvolvimento](docs/DEVELOPMENT.md) | Ambiente, scripts, variáveis, build, publicação, debug |
| [Testes](docs/TESTING.md) | Unitários, integração, ponta a ponta, páginas, SEO, acessibilidade, desempenho |
| [Convenções](docs/CONVENTIONS.md) | Código, componentes, nomes, SVG, metadados, acessibilidade, estilos |
| [Licenciamento](docs/LICENSING.md) | Política, procedência, terceiros, marcas, condições de inclusão |
| [SEO](docs/SEO.md) | Indexação, páginas, metadados, sitemap, dados estruturados |
| [Decisões](docs/DECISIONS/README.md) | Por que o GLYPHOS é como é |
| [Marca](brand/guidelines/brand-guidelines.md) | Identidade, cores, tipografia, componentes, responsividade |
| [Auditorias](docs/audits/README.md) · [Histórico](docs/history/README.md) | Diagnósticos com evidências e registro das fases |

## Limitações conhecidas

- **Popularidade editorial.** A ordenação por popularidade usa uma escala definida por quem desenha (o quanto o conceito é usado em interfaces), não visitas: o site não coleta dados.
- **Estilos derivados.** Ícones sem silhueta fechada (setas, letras, linhas) existem só em Contorno. Reto, Arredondado e Preenchido estão previstos na arquitetura, mas ainda sem desenhos.
- **Sem sincronização entre aparelhos.** Use a cópia de segurança em JSON (`/library`, aba Dados).
- **Sem marcas.** Logotipos de empresas e redes sociais não fazem parte do catálogo.
- **Sem pacote npm.** Os ícones são levados por cópia ou download; um pacote gerado dos mesmos índices é uma evolução prevista.
- **Imagem de compartilhamento única.** Todas as páginas usam a mesma imagem Open Graph; imagens por ícone exigiriam gerar PNGs no servidor.
- A verificação automática de acessibilidade é parcial; ela não substitui um teste com leitor de tela.

## Créditos e licenciamento

- **Ícones:** desenhos próprios do GLYPHOS, sob a [licença MIT](LICENSE). Política completa em [docs/LICENSING.md](docs/LICENSING.md).
- **Tipografia:** Geist e Geist Mono (Vercel), SIL Open Font License 1.1.
- **Ecossistema:** padrões de persistência e scripts adaptados do THOTH; padrões de interação inspirados no Orthos UI, reimplementados em React ([DECISIONS/0006](docs/DECISIONS/0006-reuso-do-ecossistema.md)).
- **Código da aplicação:** a licença ainda não foi definida; até lá, todos os direitos reservados ao autor.
