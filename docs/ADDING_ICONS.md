# Adicionar ícones

Este guia leva um ícone da ideia até o site: o desenho no grid, o nome, os metadados, o registro no catálogo, a validação e a revisão visual. Quem segue só este documento consegue incluir, alterar, renomear e remover ícones.

> Resumo: desenhe em `src/catalog/icons/<categoria>/<slug>.svg`, descreva em `src/catalog/metadata/<categoria>.json`, rode `npm run catalog:format`, `npm run catalog:validate` e `npm run catalog:sheet`, olhe a folha de contato e rode `npm run verify`.

## Sumário

1. [Antes de desenhar](#1-antes-de-desenhar)
2. [O grid e o traço](#2-o-grid-e-o-traço)
3. [O arquivo SVG](#3-o-arquivo-svg)
4. [Papéis das formas: Sólido e Duotone](#4-papéis-das-formas-sólido-e-duotone)
5. [Nome e identificação](#5-nome-e-identificação)
6. [Categoria e subcategoria](#6-categoria-e-subcategoria)
7. [Sinônimos, tags e popularidade](#7-sinônimos-tags-e-popularidade)
8. [Registrar no catálogo](#8-registrar-no-catálogo)
9. [Otimizar e formatar](#9-otimizar-e-formatar)
10. [Validar](#10-validar)
11. [Revisar a folha de contato](#11-revisar-a-folha-de-contato)
12. [Variações e famílias](#12-variações-e-famílias)
13. [Atualizar os índices e testar](#13-atualizar-os-índices-e-testar)
14. [Renomear, mover e remover](#14-renomear-mover-e-remover)
15. [Checklist final](#15-checklist-final)

## 1. Antes de desenhar

- **Procure antes.** Rode `npm run dev`, abra `/icons` e busque o conceito em português e em inglês. Se já existe um ícone para a mesma ideia, melhore-o em vez de criar outro.
- **Um conceito, um ícone.** Um desenho novo precisa representar algo que os existentes não representam. Girar, espelhar, engrossar ou trocar um detalhe decorativo não cria um ícone novo. Versões com modificador (`file-plus`, `bell-off`) contam como ícones quando correspondem a uma ação ou estado real de interface; veja [Variações e famílias](#12-variações-e-famílias).
- **Sem logotipos de marcas.** Marcas registradas (redes sociais, empresas, produtos) não entram no catálogo: elas têm regras próprias de uso. Veja [LICENSING.md](LICENSING.md).
- **Desenho próprio.** Desenhe do zero, no grid. Não copie, decalque nem adapte caminhos de outras bibliotecas (Lucide, Feather, Tabler, Heroicons, Phosphor, Material, Font Awesome, Hugeicons…), nem de memória. Trocar o nome de um arquivo alheio não o torna original. Para incorporar um recurso de terceiros com licença compatível, siga [LICENSING.md](LICENSING.md#recursos-de-terceiros).

## 2. O grid e o traço

Todos os ícones do GLYPHOS são desenhados com a mesma pena.

| Regra | Valor |
| --- | --- |
| Área | 24 × 24 unidades (`viewBox="0 0 24 24"`) |
| Área viva | de 2 a 22 nos dois eixos (2 unidades de margem). O traço pode encostar em 1 e 23 só em casos excepcionais |
| Traço | 1,5 unidade, `currentColor`, sem preenchimento |
| Pontas e cantos | arredondados (`stroke-linecap="round"`, `stroke-linejoin="round"`) |
| Coordenadas | inteiros ou meios (`12`, `12.5`) sempre que possível; no máximo 2 casas decimais |
| Distância entre traços paralelos | pelo menos 3 unidades de centro a centro (com traço 2,5 ainda sobra 0,5 de respiro) |
| Detalhes mínimos | nada menor que 2 unidades, que some em 16 px |

### Formas-chave

O tamanho visual de cada ícone depende da forma principal. Use a forma-chave que mais se parece com o objeto, para que todos pareçam ter o mesmo peso lado a lado:

| Forma principal | Medida de referência |
| --- | --- |
| Círculo | centro 12,12, raio 9 (de 3 a 21) |
| Quadrado | 18 × 18 (de 3 a 21), raio de canto 3 |
| Retângulo em pé | 14 × 19 (x de 5 a 19, y de 2,5 a 21,5), raio 2 |
| Retângulo deitado | 19 × 14 (x de 2,5 a 21,5, y de 5 a 19), raio 2,5 |
| Triângulo | base de 2,7 a 21,3, altura de 4 a 20,5 |

### Cantos

- Retângulos grandes (lado ≥ 12): raio 2 a 3. Médios (6 a 12): raio 1,5 a 2. Pequenos (< 6): raio 1 ou nenhum.
- Use `<rect rx>` para retângulos arredondados em vez de desenhar arcos à mão: o desenho fica legível e uma versão de cantos retos (estilo Reto) pode ser feita depois só mudando o raio.

### Pontos

Pontos (reticências, olhos, furos) são círculos cheios de raio 0,9 a 1,25: `<circle cx="12" cy="12" r="1" fill="currentColor" stroke="none"/>`. Eles não acompanham a espessura do traço, de propósito: continuam visíveis com traço fino.

### Leitura em tamanhos pequenos

Desenhe pensando em 16, 20 e 24 px. Menos é mais: até 12 formas é o ideal; acima de 18 o validador avisa. Detalhes que só aparecem em 48 px não ajudam e pesam o arquivo.

## 3. O arquivo SVG

Cada ícone é **um arquivo** `src/catalog/icons/<categoria>/<slug>.svg`, sempre neste formato:

```svg
<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
  <rect x="2.5" y="5" width="19" height="14" rx="2.5" data-part="body"/>
  <path d="M3 7.5l9 6 9-6" data-part="cut"/>
</svg>
```

- **Raiz fixa.** O `<svg>` tem exatamente esses atributos e valores. O site e as exportações aplicam tamanho, cor e traço por cima, sem alterar o arquivo.
- **Só formas simples, sem grupos:** `path`, `circle`, `ellipse`, `rect`, `line`, `polyline` e `polygon`. Nada de `<g>`, `transform`, `style`, `class`, `id`, `<defs>`, máscaras, gradientes, texto, imagens, `<use>`, links ou scripts.
- **Atributos permitidos** além da geometria: `fill="currentColor"` (formas cheias, como pontos), `stroke="none"` (junto com `fill`) e `data-part` (veja a próxima seção).
- **Sem comentários, declarações `<?xml?>` ou DOCTYPE.** O `catalog:format` remove o que vem de editores.

O leitor do catálogo (`src/catalog/svg/parse.ts`) é uma lista do que é permitido: qualquer coisa fora dela é recusada com o motivo, nunca "limpa" em silêncio. É isso que garante que nenhum SVG do catálogo carregue script, referência externa ou estilo que vaze para a página.

## 4. Papéis das formas: Sólido e Duotone

O GLYPHOS tem **um desenho por conceito** (o Contorno). Os estilos Sólido e Duotone são derivados dele pelo papel de cada forma, marcado com `data-part`:

| Papel | Marcação | Contorno | Duotone | Sólido |
| --- | --- | --- | --- | --- |
| Linha | nenhuma | traço | traço | traço |
| Corpo | `data-part="body"` | traço | traço sobre preenchimento a 20% | preenchido |
| Recorte | `data-part="cut"` | traço | traço | vazado do corpo |
| Barra | `data-part="slash"` | traço | traço | abre uma fenda larga no corpo e é desenhada dentro dela |

Como marcar:

1. **Corpo** é a silhueta principal: a caixa do envelope, a folha do arquivo, o balão da mensagem, o círculo de `info`. Precisa ser uma forma **fechada** (`rect`, `circle`, `ellipse`, `polygon` ou `path` terminado em `Z`). Um ícone pode ter vários corpos (as rodas e o cesto do carrinho).
2. **Recorte** é todo detalhe desenhado **dentro** de um corpo: a aba do envelope, os ponteiros do relógio, as linhas de texto da folha. Sem a marcação, ele fica invisível no Sólido (traço da mesma cor sobre o preenchimento) e o validador avisa.
3. **Linha** é o que fica fora dos corpos: o cabo da lupa, a alça do cadeado, os raios do sol.
4. **Barra** é a diagonal dos ícones "desligado" (`eye-off`, `bell-off`) quando ela atravessa um corpo.

Um desenho sem nenhum corpo (setas, `x`, `menu`) existe só em Contorno. Isso é esperado: um Sólido de uma seta seria igual ao Contorno.

Quando a derivação não fica boa (por exemplo, um corpo com muitos recortes vira uma mancha), há duas saídas: simplifique o desenho, ou desenhe o estilo à mão em `<slug>.solid.svg` (veja [Variações e famílias](#estilos-desenhados-à-mão)).

## 5. Nome e identificação

### Slug

O slug é o nome técnico: nome do arquivo, parte da URL (`/icons/shopping-cart`) e do componente exportado (`ShoppingCartIcon`).

- Em **inglês**, minúsculas, palavras separadas por hífen: `shopping-cart`, `cloud-rain`.
- **Objeto primeiro, modificador depois:** `file-plus`, `bell-off`, `user-check`, `arrow-up-right`.
- Quando um objeto está **dentro de uma forma**, a forma vem primeiro: `circle-check`, `square-plus`, `triangle-alert`.
- Direções no fim: `-up`, `-down`, `-left`, `-right`. Estados no fim: `-off`, `-check`, `-x`, `-plus`, `-minus`.
- Nada de número de versão (`star-2`) nem de estilo (`star-solid`): estilos não são ícones.
- Único no catálogo inteiro, também contra os `aliases` de outros ícones (o validador confere).

### Nome

`name.pt` é o que a interface mostra: curto, em português do Brasil, com inicial maiúscula ("Carrinho de compras"). `name.en` é o nome em inglês ("Shopping cart").

### Id

O `id` (`g` + 7 caracteres, como `g3k9m2qx`) é o identificador estável: não muda quando o ícone é renomeado nem quando muda de categoria. Não invente um id. `catalog:new` e `catalog:add` criam um novo; para entradas escritas à mão, rode `npm run catalog:ids`.

## 6. Categoria e subcategoria

A categoria é a pasta (e o arquivo de metadados) onde o ícone mora. A lista com nomes, descrições e subcategorias está em `src/catalog/categories/index.ts` e no [CATALOG.md](CATALOG.md#categorias).

- Escolha a categoria **do objeto desenhado**, não do uso. Uma casa usada como "página inicial" é uma casa: fica em Casa e construção, com a tag "página inicial".
- Cada conceito fica em **uma** categoria. A busca encontra o ícone por qualquer tag, então não há por que repetir.
- `subcategory` é opcional, mas recomendada: organiza a página da categoria. Use um id que exista na categoria; criar uma subcategoria nova é uma mudança no registro, feita em `categories/index.ts`.

## 7. Sinônimos, tags e popularidade

A busca não depende do slug. Ela procura no nome, nos sinônimos e nas tags, em português e em inglês, sem acentos, no singular e no plural, por prefixo e com tolerância a um erro de digitação. Bons metadados são o que faz a pessoa encontrar o ícone.

| Campo | O que entra | Exemplo (`trash`) |
| --- | --- | --- |
| `synonyms.pt` | Outros nomes para **o mesmo objeto** ou ação | lixo, cesto, apagar |
| `synonyms.en` | Idem, em inglês | bin, garbage, delete |
| `tags.pt` | Conceitos **relacionados** e usos comuns | excluir, deletar, remover, descartar |
| `tags.en` | Idem, em inglês | remove, discard, wastebasket |

- Pelo menos 2 palavras por idioma somando sinônimos e tags (o validador avisa abaixo disso). O ideal é de 4 a 8.
- Escreva como as pessoas buscam: "carrinho de compras", "ecommerce", "checkout". Termos de várias palavras funcionam.
- Não repita o nome nem palavras já listadas no mesmo idioma.
- Sinônimos gerais (excluir ↔ apagar ↔ deletar) também vivem no léxico da busca (`src/catalog/search/lexicon.ts`), que vale para o catálogo inteiro. Se um termo comum não encontra o que deveria, inclua o grupo lá.

### Popularidade

`popularity` é **editorial**: o quanto o conceito é usado em interfaces. Não é medido de visitas (o site não coleta dados).

| Valor | Significado | Exemplos |
| --- | --- | --- |
| 5 | Essencial: aparece em quase todo produto digital | search, x, menu, user, house, settings |
| 4 | Muito comum | calendar, filter, bookmark, download |
| 3 | Comum no seu domínio (o padrão) | stethoscope, wallet, cloud-rain |
| 2 | Específico | microscope, anchor, tram |
| 1 | Nicho | theodolite, sextant |

## 8. Registrar no catálogo

Há três caminhos. Todos terminam no mesmo lugar: o desenho em `icons/<categoria>/<slug>.svg` e a entrada em `metadata/<categoria>.json`.

### Um ícone: `catalog:new`

```bash
npm run catalog:new -- maps compass "Bússola" "Compass"
```

Cria um desenho provisório (um quadrado) e a entrada de metadados com id e data. Desenhe o ícone no arquivo e preencha sinônimos e tags.

### Uma série: `catalog:add`

O jeito mais rápido de desenhar vários ícones. Escreva um lote em texto (fora de `src/`, por exemplo em `tmp/lotes/`):

```text
category: animals

@ cat | pets | 3
pt: Gato | felino, bichano | pet, animal de estimação, miau
en: Cat | kitty, feline | pet, animal
family: cat
<path d="…" data-part="body"/>
<circle cx="9.5" cy="12" r="1" fill="currentColor" stroke="none" data-part="cut"/>

@ dog | pets | 3
pt: Cachorro | cão, cachorrinho | pet, animal de estimação, latido
en: Dog | puppy, hound | pet, animal
<path d="…"/>
```

- `@ slug | subcategoria | popularidade` abre um ícone.
- `pt:` e `en:` trazem `nome | sinônimos | tags`, com as listas separadas por vírgula.
- `family:` e `variant-of:` são opcionais.
- As linhas que começam com `<` são as formas, no formato da [seção 3](#3-o-arquivo-svg) (sem a raiz `<svg>`).

```bash
npm run catalog:add -- tmp/lotes/animais.txt
```

O script grava os desenhos no formato canônico, cria ou atualiza os metadados (um ícone que já existe mantém id e data e ganha `updated`), confere a geometria de cada desenho e só reescreve os arquivos de metadados das categorias do lote.

### Um SVG pronto (Figma, Illustrator, Inkscape): `catalog:import`

```bash
npm run catalog:import -- caminho/do/arquivo.svg --category=maps --slug=compass --pt="Bússola" --en="Compass"
```

Antes de exportar do editor: prancheta de 24 × 24, traço de 1,5 sem expandir (não converta o traço em contorno), sem grupos com transformação. O script passa o arquivo pelo SVGO (que remove metadados e atributos de editor e aplica às formas as transformações que conseguir), desfaz os grupos, troca as cores fixas por `currentColor` e grava no formato do catálogo. O que não puder ser convertido com segurança é recusado com o motivo: gradientes, máscaras, imagens, texto e transformações que o SVGO não conseguiu aplicar (achate-as no editor e exporte de novo). Depois, marque os papéis (`data-part`) e preencha os metadados.

### Os metadados

Cada entrada de `src/catalog/metadata/<categoria>.json`:

```json
{
  "id": "g3k9m2qx",
  "slug": "shopping-cart",
  "name": { "pt": "Carrinho de compras", "en": "Shopping cart" },
  "subcategory": "shopping",
  "family": "shopping-cart",
  "synonyms": { "pt": ["carrinho", "cesta"], "en": ["cart", "basket", "trolley"] },
  "tags": { "pt": ["comprar", "loja", "ecommerce", "checkout"], "en": ["buy", "shop", "ecommerce", "checkout"] },
  "popularity": 5,
  "added": "2026-11-19",
  "author": "GLYPHOS",
  "source": "glyphos",
  "license": "MIT"
}
```

| Campo | Obrigatório | Descrição |
| --- | --- | --- |
| `id` | sim | Identificador estável, gerado (`catalog:ids`) |
| `slug` | sim | Nome técnico único ([seção 5](#5-nome-e-identificação)) |
| `name` | sim | `pt` e `en` |
| `subcategory` | não | Id de uma subcategoria da categoria |
| `family` | não | Família de conceito, compartilhada por desenhos relacionados |
| `variantOf` | não | Slug do desenho base, para versões com modificador |
| `aliases` | não | Slugs antigos (renomeações) |
| `synonyms`, `tags` | sim | Listas `pt` e `en` (podem ser vazias, mas o validador avisa) |
| `popularity` | sim | 1 a 5 ([tabela](#popularidade)) |
| `added` | sim | Data de entrada no catálogo (`aaaa-mm-dd`) |
| `updated` | não | Data da última mudança no desenho |
| `author` | sim | `GLYPHOS` para desenhos próprios; o autor original para recursos de terceiros |
| `source` | sim | Origem registrada em `src/catalog/licenses.ts` |
| `license` | sim | Licença registrada em `src/catalog/licenses.ts` e aceita pela origem |

A categoria não é um campo: é o arquivo onde a entrada está.

## 9. Otimizar e formatar

```bash
npm run catalog:format -- --category=maps
```

Reescreve os desenhos e os metadados da categoria no formato canônico: atributos da raiz e das formas numa ordem fixa, números com no máximo 3 casas e sem zeros sobrando, caminhos com espaçamento uniforme, metadados ordenados por slug. Só a formatação muda; a geometria fica idêntica. Sem `--category`, formata o catálogo inteiro.

O validador recusa arquivos fora do formato canônico, então todo arquivo do repositório tem a mesma cara e os diffs mostram só mudanças reais.

## 10. Validar

```bash
npm run catalog:validate -- --category=maps
```

| Verificação | Nível |
| --- | --- |
| SVG fora da lista permitida (elemento, atributo, raiz, comentário, DOCTYPE) | erro |
| Formato não canônico | erro |
| Desenho fora da área (traço cortado) | erro |
| Desenho encostando na borda (fora da área viva de 2 a 22) | aviso |
| Desenho pequeno demais (lado maior abaixo de 10 unidades) | aviso |
| Muitas formas (mais de 18) ou geometria longa demais | aviso |
| Corpo aberto; recorte ou barra sem corpo | erro |
| Linha escondida dentro de um corpo (invisível no Sólido); recorte fora do corpo | aviso |
| Metadados ausentes ou inválidos (nome, listas, popularidade, data, subcategoria, campos desconhecidos) | erro |
| Poucas palavras-chave ou palavras repetidas | aviso |
| Origem ou licença não registrada, ou licença que a origem não oferece | erro |
| Desenho sem metadados, metadados sem desenho, arquivo com nome inválido | erro |
| Slug, id ou alias repetido; `variantOf` que não existe | erro |
| Nome em português igual ao de outro ícone | aviso |
| Ícone muito parecido com outro (raster sobreposto em 90% ou mais) que não é da mesma família | aviso |

Erros reprovam o `npm run verify`. Avisos não reprovam, mas aparecem no [relatório de saúde](#13-atualizar-os-índices-e-testar): resolva-os ou justifique.

## 11. Revisar a folha de contato

```bash
npm run catalog:sheet -- --category=maps
npm run catalog:sheet -- --slugs=compass,map,route
```

Gera `tmp/sheets/<nome>-<n>.png` (e o `.html` ao lado): cada ícone em Contorno sobre o grid (com a margem da área viva em vermelho), em Sólido e em Duotone a 48 px, e em Contorno a 24 e 16 px. Abra a imagem e confira:

- **Contorno:** o ícone é reconhecível sem o nome? Ocupa a área viva como os vizinhos? Os traços paralelos respiram?
- **Sólido:** os detalhes internos aparecem vazados? Nenhum detalhe sumiu? A silhueta continua reconhecível?
- **Duotone:** o preenchimento cobre a forma certa?
- **16 px:** ainda dá para entender o desenho?

O validador confere a geometria; só os olhos conferem se o desenho é bom. Não pule esta etapa.

## 12. Variações e famílias

### Famílias de conceito

`family` agrupa desenhos que representam o mesmo objeto em situações diferentes: `file`, `file-plus`, `file-check` e `file-lock` têm `"family": "file"`. A página do ícone mostra a família inteira, e o detector de duplicatas não acusa membros da mesma família de serem parecidos.

### Versões com modificador

`variantOf` aponta o desenho base de uma versão com modificador: `file-plus` tem `"variantOf": "file"`. Regras:

- Comece do desenho base e mude só o necessário. O modificador (mais, menos, x, visto, barra) fica no canto inferior direito, num círculo ou recorte, com pelo menos 1,5 unidade de folga do resto do desenho.
- Só crie a versão quando ela corresponder a uma ação ou estado real de interface (adicionar arquivo, notificações desligadas). Variações decorativas não entram.

### Estilos desenhados à mão

Para substituir um estilo derivado, ou para dar a um ícone um estilo que só existe à mão (Reto, Arredondado, Preenchido), crie `<slug>.<estilo>.svg` ao lado do desenho-mestre:

```
src/catalog/icons/weather/sun.svg          desenho-mestre (Contorno)
src/catalog/icons/weather/sun.solid.svg    Sólido desenhado à mão (substitui o derivado)
src/catalog/icons/weather/sun.sharp.svg    Reto (só existe assim)
```

O arquivo segue as mesmas regras da [seção 3](#3-o-arquivo-svg). O estilo passa a aparecer no site e no relatório de saúde. Os estilos e o tipo de cada um estão em `src/catalog/styles/index.ts`.

## 13. Atualizar os índices e testar

```bash
npm run catalog:index
```

Gera, em `src/catalog/registry/generated/` (fora do git), o manifesto leve, os fragmentos por categoria, o índice de busca e os ícones da interface, e em `public/svg/<estilo>/<slug>.svg` os arquivos estáticos. `npm run dev` e `npm run build` rodam este passo sozinhos; rode à mão para ver o resultado sem reiniciar o servidor.

```bash
npm run catalog:stats
```

Mostra o relatório de saúde do catálogo, calculado dos arquivos reais: total de ícones, distribuição por categoria e estilo, ícones sem tags, metadados incompletos, possíveis duplicatas, arquivos inválidos e famílias incompletas. `--write` grava o relatório em `docs/audits/CATALOG_HEALTH.md`.

```bash
npm run verify
```

O portão antes de cada push: tipos, testes, regras de dependência, marca, licenças e catálogo. Os testes de catálogo (`tests/integration/catalog.test.ts`) conferem, entre outras coisas, que todo ícone é encontrado pela busca pelo próprio nome em português e em inglês.

Por fim, rode `npm run dev`, abra `/icons/<slug>` e confira o ícone nos temas claro e escuro, nos três estilos e com traço 1 e 2,5.

## 14. Renomear, mover e remover

### Renomear

1. Renomeie o arquivo (`old-name.svg` → `new-name.svg`, e os `<slug>.<estilo>.svg` se houver).
2. Na entrada de metadados, troque o `slug` e acrescente o antigo em `aliases`. O `id` não muda.
3. Atualize `variantOf` e as coleções (`src/catalog/collections.ts`) que citam o slug antigo; o validador aponta as referências quebradas.

O endereço antigo (`/icons/old-name`) redireciona para o novo, e a busca continua encontrando o nome antigo.

### Mover de categoria

Mova o arquivo para a pasta da nova categoria e a entrada para o JSON dela, mantendo id e slug. Com `catalog:add`, ponha o ícone num lote da nova categoria e rode com `--move` (`npm run catalog:add -- lote.txt --move`): ele é movido com o mesmo id. Sem `--move`, um slug que já existe em outra categoria é recusado, para que duas pessoas não reivindiquem o mesmo nome.

### Remover

```bash
npm run catalog:remove -- <slug>
```

Apaga o desenho, os estilos desenhados à mão e a entrada de metadados. O comando recusa a remoção enquanto algo apontar para o ícone (`variantOf` de outro ícone, uma coleção, o símbolo de uma categoria, a interface); atualize essas referências ou use `--force`. Remover quebra links de quem usava o ícone: prefira melhorar o desenho.

## 15. Checklist final

- [ ] O conceito ainda não existe no catálogo (busquei em português e em inglês).
- [ ] O desenho é próprio, no grid de 24, traço 1,5, dentro da área viva.
- [ ] Corpos fechados e marcados, recortes marcados; o Sólido e o Duotone ficaram bons na folha de contato.
- [ ] Slug em inglês, objeto primeiro, único.
- [ ] Nome em português e em inglês, de 4 a 8 palavras de busca por idioma, popularidade coerente.
- [ ] `npm run catalog:format` e `npm run catalog:validate` sem erros.
- [ ] Revisei a folha de contato em 48, 24 e 16 px.
- [ ] `npm run verify` passou.
