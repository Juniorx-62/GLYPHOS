# SEO

## Estratégia de indexação

O GLYPHOS é encontrado por buscas como "ícone de carrinho SVG", "calendar icon svg" ou "ícones de clima". Por isso as páginas indexadas são as que respondem a essas buscas, e nenhuma página vazia ou repetida é criada só para aumentar o número de URLs.

| Página | Indexada | Por quê |
| --- | --- | --- |
| `/` | sim | Apresentação e busca |
| `/icons` (sem filtros) | sim | A lista completa |
| `/icons?q=…`, `?category=…`, `?style=…`, `?sort=…`, `?icon=…` | não (`noindex`, sem canonical) | Repetem páginas de categoria e de ícone |
| `/categories`, `/categories/:id` | sim | Conteúdo textual por categoria + todos os ícones dela, com links |
| `/collections`, `/collections/:id` | sim | Conjuntos temáticos |
| `/icons/:slug` | sim | Uma página por conceito, com nome, sinônimos, tags, licença e o próprio SVG |
| `/about` | sim | Grid, estilos e licença |
| `/library` | não (`noindex` e `Disallow` no robots) | Dados de quem visita |

Estilos não geram páginas próprias: Contorno, Sólido e Duotone do mesmo ícone são a mesma página (o conteúdo seria repetido).

## Páginas individuais

Cada `/icons/:slug` é renderizada no servidor com:

- `<h1>` com o nome em português; o nome em inglês logo abaixo;
- o desenho em SVG no HTML (não depende de JavaScript);
- sinônimos e tags (pt e en) como links para a busca;
- categoria, subcategoria, estilos, autoria, origem e licença;
- ícones da mesma família e relacionados, com links (rastreáveis);
- links para o anterior e o próximo da categoria.

Ícones renomeados respondem com **301** para o slug novo (`aliases`), e slugs inexistentes com **404** real.

## Categorias

`/categories/:id` traz a descrição da categoria (texto escrito em `categories/index.ts`), o total de ícones, as subcategorias como seções com âncoras e **todos os ícones como links** para as páginas individuais. É a página que liga o site inteiro para os rastreadores.

## Metadados

`src/lib/seo.ts` (`pageHead`) monta, para cada rota folha:

| Tag | Regra |
| --- | --- |
| `<title>` | Único, de 10 a 70 caracteres, termina com "GLYPHOS" |
| `description` | Única, de 50 a 160 caracteres, cortada em palavra inteira (`clip`) |
| `canonical` | URL absoluta do caminho, sem parâmetros |
| `robots` | `index, follow, max-image-preview:large` ou `noindex, follow` |
| Open Graph / Twitter | título, descrição, URL e a imagem `public/images/og-glyphos.png` (1200 × 630, gerada por `npm run brand -- --png`) |

O endereço vem de `VITE_SITE_URL` (padrão `https://glyphos.vercel.app`).

## Sitemap e robots

- `/sitemap.xml` (`src/routes/sitemap[.]xml.ts` + `src/features/seo/sitemap.ts`): gerado do catálogo a cada requisição (com cache de borda de um dia), com `lastmod` (data de entrada de cada ícone).
- `/robots.txt`: permite tudo menos `/library` e aponta o sitemap.

## Dados estruturados

| Página | JSON-LD |
| --- | --- |
| Início | `WebSite` com `SearchAction` (`/icons?q={search_term_string}`) |
| Ícone | `ImageObject` (nome, descrição, `contentUrl` do SVG estático, palavras-chave, licença MIT, `acquireLicensePage`, autor, data) + `BreadcrumbList` |
| Categoria, coleção, listas | `CollectionPage` com `ItemList` + `BreadcrumbList` |

Nenhum dado inventado: não há notas, avaliações ou preços.

## Conteúdo indexável

- Os nomes e as palavras-chave em português e em inglês aparecem no HTML de cada página de ícone, o que permite ser encontrado nos dois idiomas.
- As descrições das categorias são texto escrito, não gerado.
- `public/svg/<estilo>/<slug>.svg` são arquivos estáticos indexáveis como imagens.

## Verificação de SEO

```bash
npm run check:seo
```

Lê o HTML do servidor (o que um rastreador vê, sem JavaScript) de todas as páginas do sitemap e confere: status 200, título e descrição (tamanho e unicidade), canonical igual ao endereço, robots, Open Graph, JSON-LD válido e exatamente um `<h1>`. Contra um deploy:

```bash
npm run check:seo -- https://glyphos.vercel.app
```

Rode depois de cada publicação e registre o resultado nas [auditorias](audits/README.md).
