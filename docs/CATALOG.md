# Catálogo

O catálogo é a fonte de verdade do GLYPHOS. Tudo o que o site mostra sobre um ícone (desenho, nome, categoria, tags, estilos, licença) sai de `src/catalog`, e nada sobre um ícone é guardado em páginas ou componentes.

> Este documento descreve a estrutura, não o tamanho. Totais por categoria e estilo, ícones sem tags, possíveis duplicatas e famílias incompletas estão no relatório gerado `npm run catalog:stats` ([audits/CATALOG_HEALTH.md](audits/CATALOG_HEALTH.md)).

## Estrutura

```
src/catalog/
├── icons/<categoria>/<slug>.svg          desenho-mestre (Contorno), um arquivo por ícone
├── icons/<categoria>/<slug>.<estilo>.svg estilo desenhado à mão (opcional)
├── metadata/<categoria>.json             lista de IconMeta da categoria
├── categories/index.ts                   categorias e subcategorias
├── styles/index.ts                       estilos e derivação
├── collections.ts                        coleções temáticas
├── licenses.ts                           licenças e origens aceitas
├── search/                               normalização, motor de busca e léxico
├── svg/                                  leitor estrito, caminhos e geometria
├── types.ts                              modelo de dados
├── index.ts                              API que o app usa
└── registry/generated/                   gerado por catalog:index (fora do git)
```

Por que um arquivo por desenho e um JSON por categoria: os desenhos ficam legíveis e comparáveis no diff, os metadados de uma categoria são editados juntos, e nenhum arquivo cresce sem limite. Uma categoria grande pode ser dividida sem mudar nada além do registry.

## Modelo de dados

| Campo | Tipo | Regra |
| --- | --- | --- |
| `id` | `g` + 7 caracteres base-32 | Único, estável, gerado (`catalog:ids`). Nunca muda |
| `slug` | kebab-case em inglês | Único no catálogo e contra os `aliases`; é o nome do arquivo e a URL |
| `name.pt`, `name.en` | texto | Nome exibido e nome em inglês |
| `subcategory` | id | Subcategoria existente na categoria |
| `synonyms.pt`, `synonyms.en` | lista | Outros nomes para o mesmo objeto |
| `tags.pt`, `tags.en` | lista | Conceitos relacionados e usos |
| `family` | slug | Família de conceito |
| `variantOf` | slug | Desenho base de uma versão com modificador; precisa existir |
| `aliases` | lista de slugs | Nomes antigos (redirecionam) |
| `popularity` | 1 a 5 | Editorial ([escala](ADDING_ICONS.md#popularidade)) |
| `added`, `updated` | `aaaa-mm-dd` | Entrada no catálogo e última mudança de desenho |
| `author` | texto | `GLYPHOS` para desenhos próprios |
| `source` | id | Origem registrada em `licenses.ts` |
| `license` | id | Licença registrada e oferecida pela origem |

Derivados (não escritos à mão): a categoria (o arquivo), o caminho do SVG, os estilos disponíveis e os arquivos estáticos.

### O desenho

Um SVG de 24 × 24 com a raiz fixa do catálogo e só formas simples. Cada forma tem um papel:

| Papel (`data-part`) | Uso |
| --- | --- |
| (nenhum) | Linha: traço em todos os estilos |
| `body` | Silhueta fechada: preenchida no Sólido, tingida no Duotone |
| `cut` | Detalhe dentro de um corpo: vazado no Sólido |
| `slash` | Diagonal "desligado" que atravessa um corpo |

As regras de desenho estão em [ADDING_ICONS.md](ADDING_ICONS.md#2-o-grid-e-o-traço).

## Categorias

As categorias seguem **o que o ícone desenha**, e cada conceito mora numa só. A lista, com descrições e subcategorias, é `src/catalog/categories/index.ts`:

| Categoria | id |
| --- | --- |
| Interface e navegação | `interface` |
| Setas e direções | `arrows` |
| Texto e edição | `text-editing` |
| Layout e janelas | `layout` |
| Tecnologia e informática | `technology` |
| Desenvolvimento e programação | `development` |
| Comunicação | `communication` |
| Usuários e pessoas | `people` |
| Negócios e produtividade | `business` |
| Comércio e pagamentos | `commerce` |
| Finanças e investimentos | `finance` |
| Arquivos e documentos | `files` |
| Segurança e privacidade | `security` |
| Redes sociais (interações genéricas, sem marcas) | `social` |
| Multimídia | `media` |
| Fotografia e vídeo | `photo-video` |
| Natureza e meio ambiente | `nature` |
| Animais | `animals` |
| Transporte | `transport` |
| Localização e mapas | `maps` |
| Educação e conhecimento | `education` |
| Saúde e bem-estar | `health` |
| Alimentação | `food` |
| Casa e construção | `home` |
| Indústria e ferramentas | `tools` |
| Gráficos e análise de dados | `charts` |
| Esportes | `sports` |
| Tempo e calendário | `time` |
| Clima | `weather` |
| Viagens | `travel` |
| Objetos cotidianos | `objects` |
| Símbolos | `symbols` |
| Formas geométricas | `shapes` |

A proposta inicial do produto tinha 30 categorias. "Interface e navegação" foi dividida em quatro (interface, setas, texto e edição, layout e janelas), porque cada parte tem muitos ícones e um público próprio (setas e formatação de texto são buscadas como grupos).

### Subcategorias

Cada categoria tem de 3 a 5 subcategorias que organizam a página da categoria (âncoras e seções). Um ícone sem subcategoria aparece em "Outros". Criar uma subcategoria é uma mudança no registry; o validador recusa ids que não existem.

### Fronteiras entre categorias

Quando um conceito poderia morar em duas categorias, vale o objeto desenhado:

- Uma casa usada como "página inicial" é `home/house`, com a tag "página inicial".
- `cloud` (a nuvem) é de Clima; `cloud-upload` e `cloud-download` são de Desenvolvimento, na família `cloud`.
- Pagamentos com cartão: o cartão (`credit-card`) é de Finanças; a maquininha (`payment-terminal`) é de Comércio.
- Pessoas em papéis (médico, chef) ficam em Usuários e pessoas; os objetos do ofício, nas categorias do ofício.

## Famílias visuais e estilos

| Estilo | Origem | Disponível quando |
| --- | --- | --- |
| Contorno (`outline`) | Desenho-mestre | Sempre |
| Sólido (`solid`) | Derivado | O desenho tem ao menos um `body` |
| Duotone (`duotone`) | Derivado | O desenho tem ao menos um `body` |
| Reto (`sharp`), Arredondado (`rounded`), Preenchido (`filled`) | Só desenhados à mão (`<slug>.<estilo>.svg`) | Existe o arquivo do estilo |

Os estilos não são ícones diferentes: o total do catálogo conta conceitos, e cada conceito lista seus estilos. A interface só oferece um estilo quando há ícones nele.

## Convenções de nomenclatura

- Slug: inglês, objeto primeiro, modificador depois (`file-plus`, `bell-off`); forma recipiente primeiro (`circle-check`); direções e estados no fim; nada de versão (`-2`) nem estilo (`-solid`).
- Nome em português: curto, com inicial maiúscula, como uma pessoa chamaria o objeto ("Carrinho de compras", não "Ícone de carrinho").
- Nomes repetidos em português confundem quem busca: prefira especificar ("Enviar arquivo" e "Enviar mensagem").

## Identificadores

| Identificador | Para quê | Muda? |
| --- | --- | --- |
| `id` | Referência estável (dados de terceiros, migrações, histórico) | Nunca |
| `slug` | URL, arquivo, componente exportado (`ShoppingCartIcon`), classe CSS (`.icon-shopping-cart`) | Raramente; o antigo vira `alias` |

## Relações entre variações

- `family` agrupa desenhos do mesmo objeto (`file`, `file-plus`, `file-lock`). A página do ícone mostra a família, e o detector de duplicatas não compara membros da mesma família.
- `variantOf` aponta o desenho base de uma versão com modificador. Precisa existir.
- Relacionados (na página do ícone) = mesma família, depois mesma subcategoria, depois mesma categoria, por popularidade (`relatedEntries`).

## Indexação

`npm run catalog:index` gera os índices a partir dos arquivos (detalhes em [ARCHITECTURE.md](ARCHITECTURE.md#índices-gerados)). O índice de busca indexa, com pesos, o nome em português e em inglês, o slug, os sinônimos, os aliases, as tags, a família, a subcategoria e a categoria, depois de normalizados (sem acento, singular). O léxico (`search/lexicon.ts`) acrescenta equivalências gerais na hora da consulta.

## Ferramentas

| Comando | O que faz |
| --- | --- |
| `catalog:new` | Cria um ícone (desenho provisório + metadados com id e data) |
| `catalog:add` | Grava um lote de ícones a partir de um arquivo de texto |
| `catalog:import` | Converte um SVG de editor (SVGO + conversão) para o formato do catálogo |
| `catalog:remove` | Remove um ícone, recusando se algo ainda aponta para ele |
| `catalog:format` | Reescreve desenhos e metadados no formato canônico |
| `catalog:ids` | Gera ids que faltam |
| `catalog:validate` | Valida tudo, inclusive duplicatas visuais |
| `catalog:sheet` | Folha de contato em PNG para revisão visual |
| `catalog:index` | Gera os índices e os arquivos estáticos |
| `catalog:stats` | Relatório de saúde (`--write` grava em `docs/audits`) |

## Estratégia de expansão

1. **Profundidade antes de largura.** Antes de criar uma categoria nova, complete as famílias das existentes (o relatório de saúde lista famílias incompletas e ícones sem Sólido).
2. **Demanda real.** Termos buscados sem resultado indicam o que falta. Hoje o site não coleta buscas (não há servidor de dados); a evolução prevista é registrar, de forma anônima e agregada, as buscas sem resultado.
3. **Estilos à mão.** O próximo estilo é o Reto (`sharp`), começando pelos ícones de popularidade 5 e 4.
4. **Escala.** O formato aguenta dezenas de milhares de ícones: os fragmentos são por categoria, a grade é virtual e o motor de busca foi medido com 20 mil ícones. Se uma categoria passar de algumas centenas de ícones, divida-a (o slug e o id não mudam; só o arquivo e a pasta).
5. **Pacotes.** Um pacote npm (`@glyphos/react`, `@glyphos/svg`) pode ser gerado dos mesmos índices; está registrado como evolução em [DECISIONS](DECISIONS/README.md).
