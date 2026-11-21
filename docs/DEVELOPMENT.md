# Desenvolvimento

## Requisitos de ambiente

| Ferramenta | Versão | Para quê |
| --- | --- | --- |
| Node.js | 22.22 ou mais recente (testado no 24) | Tudo. Os scripts rodam TypeScript direto (o Node remove os tipos sozinho) |
| Bun | opcional | O `bun.lock` é o lockfile do projeto; `npm install` também funciona |
| Chrome ou Edge | qualquer recente | `catalog:sheet`, `brand -- --png`, `check:pages`, `test:e2e`. Em outro lugar, defina `CHROME_PATH` |

## Instalação

```bash
bun install
```

Sem o Bun:

```bash
npm install
```

## Execução local

```bash
npm run dev
```

Abra <http://localhost:3100>. O `dev` gera os índices do catálogo (`catalog:index`) e sobe o Vite com SSR e recarga automática. Depois de mudar ícones com o servidor rodando, rode `npm run catalog:index` em outro terminal e recarregue a página.

## Variáveis de ambiente

| Variável | Padrão | Uso |
| --- | --- | --- |
| `VITE_SITE_URL` | `https://glyphos-eight.vercel.app` | Endereço público: canonical, sitemap, Open Graph, JSON-LD |
| `CHROME_PATH` | detectado | Caminho do Chrome/Edge para os scripts que usam o navegador |
| `PORT` | `3000` | Porta do `npm run start` (servidor Node do build) |

## Scripts

### Aplicação

| Comando | O que faz |
| --- | --- |
| `npm run dev` | Índices + servidor de desenvolvimento na porta 3100 |
| `npm run build` | Índices + build de produção (cliente e servidor). Não confere tipos: rode `verify` antes |
| `npm run preview` | Serve o build pelo Vite |
| `npm run start` | Servidor Node do build (`.output/server/index.mjs`) |

### Catálogo

| Comando | O que faz |
| --- | --- |
| `npm run catalog:new -- <cat> <slug> "<pt>" "<en>"` | Novo ícone (desenho provisório + metadados) |
| `npm run catalog:add -- <lote.txt>` | Grava uma série de ícones de um lote em texto |
| `npm run catalog:import -- <arquivo.svg> --category= --slug=` | Importa um SVG de editor |
| `npm run catalog:remove -- <slug>` | Remove um ícone (recusa se algo ainda aponta para ele) |
| `npm run catalog:format [-- --category=]` | Formato canônico de desenhos e metadados |
| `npm run catalog:ids` | Gera ids que faltam |
| `npm run catalog:validate [-- --category= --errors --no-similar --json]` | Validação completa |
| `npm run catalog:sheet -- --category= \| --slugs= [--name=]` | Folha de contato em `tmp/sheets/` |
| `npm run catalog:index [-- --strict]` | Gera os índices e `public/svg` |
| `npm run catalog:stats [-- --write --json]` | Relatório de saúde |

### Qualidade

| Comando | O que faz |
| --- | --- |
| `npm run verify` | Portão antes do push: catálogo (estrito), índices, tipos, testes, dependências, licenças e marca |
| `npm test` | Testes unitários e de integração (`node:test`) |
| `npm run test:e2e [-- <origem>]` | Fluxos no Chrome contra um servidor rodando |
| `npm run check:pages [-- <origem>]` | Varredura de páginas em desktop, tablet e celular |
| `npm run check:seo [-- <origem>]` | SEO técnico das páginas do sitemap |
| `npm run check:deps` · `check:licenses` · `check:brand` | Verificações isoladas (também no `verify`) |
| `npm run typecheck` | `tsc --noEmit` |

### Marca

| Comando | O que faz |
| --- | --- |
| `npm run brand` | Regenera tokens (CSS, JSON), logos, favicon SVG e manifest a partir de `brand/` |
| `npm run brand -- --png` | Também as imagens: favicon.ico, PNGs de ícone do app e a imagem de compartilhamento |

## Build

```bash
npm run verify
```

```bash
npm run build
```

O Nitro detecta o ambiente: na Vercel gera `.vercel/output`; fora dela, `.output/` (servidor Node). `npm run start` serve o build localmente.

## Publicação

- **Vercel:** importe o repositório, use a predefinição **TanStack Start** e mantenha build, saída e instalação no padrão. Defina `VITE_SITE_URL` se o domínio não for `glyphos-eight.vercel.app`. Cada push na `main` publica.
- **Node (VPS, Docker):** `npm ci && npm run build && npm run start`, atrás de um proxy com HTTPS.

Depois de publicar: `npm run check:seo -- <endereço>` e `npm run check:pages -- <endereço>`.

## Debug

| Sintoma | Onde olhar |
| --- | --- |
| Ícone não aparece no site | `npm run catalog:validate`: ícones com erro ficam de fora do índice. Depois `npm run catalog:index` |
| Sólido estranho | `npm run catalog:sheet -- --slugs=<slug>`: falta `data-part="cut"` num detalhe ou o corpo não é fechado |
| Busca não acha um termo | Acrescente o termo às tags do ícone ou um grupo em `src/catalog/search/lexicon.ts`; teste em `tests/unit/search.test.ts` |
| Erro de hidratação | Algo lido só no navegador (armazenamento, `matchMedia`) usado no primeiro render: use `useHydrated` ou o snapshot do servidor das stores |
| Página 500 no servidor | Log do `npm run dev`; loaders rodam no servidor no primeiro acesso |
| Tema errado ao carregar | `themeBootScript` em `components/layout/theme.tsx` e a chave `glyphos:theme-preference` |
| Dados locais estranhos | DevTools → Application → IndexedDB → `glyphos` → `kv`; ou exporte a cópia de segurança em `/library?tab=data` |

## Organização do trabalho

- Uma mudança por branch; `npm run verify` antes de cada push.
- Mudou algo visível: confira no navegador nos temas claro e escuro, em 375 px e no desktop, e rode `npm run check:pages`.
- Mudou ícones: folha de contato revisada e `catalog:stats` sem novos erros.
- Mudou uma decisão de arquitetura: registre em [DECISIONS](DECISIONS/README.md) e atualize o documento afetado no mesmo commit.
- Fim de uma fase ou auditoria: registro em [history](history/README.md).

### Trabalhando em paralelo

Várias pessoas (ou agentes) podem desenhar ao mesmo tempo, **uma categoria por pessoa**: `catalog:add` só regrava os metadados das categorias do lote, e `catalog:format`/`catalog:validate`/`catalog:sheet` aceitam `--category`. Nunca rode `catalog:format` ou `catalog:ids` sem `--category` enquanto outros trabalham. As folhas de contato têm nome por seleção (`--name` para escolher).

## Procedimentos de desenvolvimento

- **Novo ícone:** [ADDING_ICONS.md](ADDING_ICONS.md).
- **Nova categoria:** registre em `src/catalog/categories/index.ts` (id, nomes, descrição, símbolo, subcategorias), crie `metadata/<id>.json` e `icons/<id>/`, rode `catalog:index`.
- **Novo estilo desenhado à mão:** os arquivos `<slug>.<estilo>.svg`; o estilo já existe no registry (`sharp`, `rounded`, `filled`). Um estilo novo é uma entrada em `styles/index.ts`.
- **Nova coleção temática:** `src/catalog/collections.ts`; o `verify` falha se citar um slug que não existe.
- **Novo formato de exportação:** `src/features/export/formats.ts` (função pura + teste) e a aba em `ExportPanel.tsx`.
- **Novo token:** `brand/tokens/source.ts` e `npm run brand`.
