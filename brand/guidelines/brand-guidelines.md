# GLYPHOS — Identidade visual e sistema de design

> Fonte de verdade: `brand/geometry.ts` (marca) e `brand/tokens/source.ts` (tokens). Todos os arquivos de `brand/logo`, `brand/tokens/*.css|json`, o favicon e o manifest são gerados por `npm run brand` e conferidos por `npm run check:brand`.

## Conceito

**Ícones desenhados com a mesma pena.** O GLYPHOS é a biblioteca de sinais do ecossistema THOTH. Se o THOTH é o escriba, o GLYPHOS é o que ele grava: o glifo. A identidade vem do ofício do escriba:

- **a pena:** um traço só, redondo, de espessura constante. O mesmo traço desenha os ícones, a marca e o nome;
- **o grid:** a pedra em que se grava. Todo ícone nasce num quadrado de 24 unidades;
- **a rubrica:** o vermelho que os escribas usavam para destacar o que importava. É a única cor saturada da interface.

Atributos: sofisticação, minimalismo, precisão, organização, qualidade técnica. A interface é discreta para que os ícones sejam os protagonistas.

## Marca

### Símbolo

Um **G monolinha** no grid de 24: um círculo de raio 8 aberto no canto superior direito (de −40° até 0°), com a barra entrando até o centro, onde fica um **quadrado de rubrica** de 3,75 unidades: a unidade do grid e a marca vermelha do escriba. Traço de 2,5 (mais pesado que o dos ícones, 1,5, para presença em tamanho pequeno), pontas redondas.

Lê como G, como um olho (o THOTH restaurou o olho de Hórus) e como o ponto no centro do grid.

### Logotipo

O nome é **escrito com a mesma pena**: maiúsculas monolinha com altura de 16 unidades e traço de 2,5, desenhadas no código (sem fonte). O G do nome é o próprio símbolo, então não há símbolo ao lado do nome: o logotipo já o contém.

| Arquivo | Uso |
| --- | --- |
| `brand/logo/glyphos-wordmark.svg` | Logotipo sobre fundo claro (tinta + rubrica) |
| `brand/logo/glyphos-wordmark-inverse.svg` | Sobre fundo escuro (papel + rubrica clara) |
| `brand/logo/glyphos-wordmark-mono.svg` | Uma cor (`currentColor`): gravação, carimbo, impressão a uma cor |
| `brand/logo/glyphos-symbol*.svg` | Símbolo nas mesmas três versões |
| `brand/logo/glyphos-app-icon.svg` | Ícone de aplicativo: símbolo em papel sobre placa de tinta |
| `public/favicon.svg`, `favicon.ico`, `icon-*.png`, `apple-touch-icon.png` | Favicon e ícones do app (gerados) |
| `public/images/og-glyphos.png` | Imagem de compartilhamento 1200 × 630 (gerada com ícones reais do catálogo) |

Regras de uso em [logo-usage.md](logo-usage.md).

## Cores

Paleta **"tinta e rubrica"**: neutros de tinta e papel, levemente quentes, e um único acento. Cada token tem valor claro e escuro; os componentes só usam tokens (a paleta padrão do Tailwind foi removida).

| Token | Claro | Escuro | Uso |
| --- | --- | --- | --- |
| `background` | `#F7F7F4` | `#0C0C0B` | Fundo do app |
| `background-subtle` | `#F0F0EC` | `#10100F` | Rodapé, faixas, blocos de código |
| `surface` | `#FFFFFF` | `#151514` | Cartões, painéis, campos |
| `surface-elevated` | `#FAFAF8` | `#1B1B19` | Selecionado, mouse em cima |
| `surface-overlay` | `#FFFFFF` | `#1E1E1C` | Diálogos, busca global, menus |
| `muted` | `#EDEDE8` | `#242422` | Preenchimentos neutros |
| `border` | `#E4E4DE` | `#262624` | Divisórias |
| `border-strong` | `#8F8F88` | `#5E5E58` | Contorno de campos (3:1) |
| `fg` | `#151514` | `#EDEDE8` | Texto e **ícones** |
| `fg-muted` | `#575752` | `#A2A29A` | Texto de apoio |
| `fg-subtle` | `#6B6B65` | `#8C8C85` | Legendas, metadados |
| `primary` | `#151514` | `#EDEDE8` | Ação principal (tinta) |
| `accent` | `#D9401F` | `#FF6A4A` | Rubrica: marca, foco, seleção ativa, favoritos |
| `accent-emphasis` | `#B5341A` | `#FF8A70` | Rubrica como texto |
| `success` · `warning` · `error` · `info` | `#1E7A4C` · `#8F5600` · `#C42640` · `#2D6BAE` | `#4CC38A` · `#F0A848` · `#F26A7E` · `#6AA8F0` | Retorno |

Contraste medido (WCAG 2.2):

| Par | Claro | Escuro |
| --- | --- | --- |
| `fg` sobre `background` | 17,0:1 | 16,7:1 |
| `fg-muted` sobre `surface` | 7,3:1 | 7,1:1 |
| `fg-subtle` sobre `surface` | 5,4:1 | 5,4:1 |
| `accent-emphasis` sobre `surface` | 6,1:1 | 7,9:1 |
| `accent` sobre `background` (não texto) | 4,2:1 | 6,9:1 |
| `border-strong` sobre `background` | 3,0:1 | 3,0:1 |
| `error` sobre `surface` | 5,7:1 | 6,2:1 |

A rubrica (`accent`) não é usada para texto pequeno no tema claro; para texto, `accent-emphasis`. O vermelho de erro é carmim (mais frio que a rubrica) e sempre acompanha ícone e texto.

### Relação com o ecossistema

O THOTH usa a "paleta do escriba" (carvão, papiro, azul egípcio, ocre). O GLYPHOS mantém a tinta e o papel e toma a rubrica como sua: os dois produtos parecem da mesma família e não se confundem.

## Tipografia

| Papel | Fonte | Tamanho / altura / peso |
| --- | --- | --- |
| Interface e títulos | Geist (variável) | escala abaixo |
| Nomes técnicos, slugs, ids, medidas, código | Geist Mono (variável) | 12–13 px |

Escala (`text-*`): xs 12/16 · sm 14/20 · base 16/24 · md 18/26 · lg 22/30 · xl 28/34 · 2xl 36/42 · 3xl 48/54 · 4xl 60/64. Letter-spacing negativo cresce com o tamanho. Pesos: 400 texto, 500 rótulos e botões, 600 títulos. Piso de 12 px para qualquer texto. As fontes são empacotadas (funcionam offline) e a principal é pré-carregada.

## Espaçamento, bordas, raios e sombras

- **Espaçamento:** base de 4 px (escala do Tailwind). Seções da página inicial separadas por 80 px; cartões com 16–20 px de respiro interno.
- **Bordas:** 1 px em `border`; campos e foco em `border-strong`/`ring`. Bordas antes de sombras.
- **Raios:** xs 4 · sm 6 · md 8 (controles) · lg 10 (células da grade) · xl 14 (cartões) · 2xl 20 (prévia, painel inferior) · full.
- **Sombras:** só onde há sobreposição real (diálogos, menu, painel flutuante). xs/sm/md/lg, mais fortes no escuro.
- **Alturas de controle:** 28 (sm), 36 (md), 44 (lg, também o mínimo de toque).

## Estados de interação

| Estado | Tratamento |
| --- | --- |
| Mouse em cima | Fundo `surface`/`muted` ou borda `border-strong`; texto sobe de `fg-muted` para `fg` |
| Foco (teclado) | Contorno de 2 px em `ring` (rubrica), afastado 2 px |
| Selecionado | Borda `fg` + fundo `surface-elevated` (célula da grade); preenchimento `fg` (chip ativo) |
| Pressionado/ativo | `aria-pressed`/`aria-checked`; nunca só cor |
| Desativado | 50% de opacidade, sem ponteiro |
| Carregando | Esqueletos `muted` com a mesma geometria do conteúdo; `aria-busy` |
| Vazio | Ícone em círculo `muted`, título, explicação e uma ação |

Movimento: 120–260 ms, curva `cubic-bezier(0.2, 0, 0, 1)`, só entradas de painéis e trocas de estado. Desligado com `prefers-reduced-motion`.

## Componentes

| Componente | Arquivo | Notas |
| --- | --- | --- |
| Button / IconButton | `components/ui/primitives.tsx` | Variantes primary (tinta), secondary, outline, ghost; IconButton exige nome |
| Segmented | idem | `radiogroup`, setas movem |
| Slider | idem | `input range` nativo, trilho preenchido até o valor |
| Chip, Kbd, Select, TextInput, EmptyState, SectionHeader | idem | |
| Toast | `components/ui/toast.tsx` | Região viva sempre montada, pausa ao passar o mouse |
| Glyph / UiIcon | `components/icons/` | Desenho de ícones a partir dos nós do catálogo |
| CodeBlock | `components/code/CodeBlock.tsx` | Realce leve, rolável, com rótulo |
| Busca global | `features/search/CommandPalette.tsx` | `<dialog>` + combobox |
| Grade e célula | `features/exploration/IconGrid.tsx` | Virtual; navegação por setas |
| Painel rápido | `features/exploration/QuickPanel.tsx` | Lateral no desktop, inferior no celular |

## Responsividade

| Faixa | Layout |
| --- | --- |
| < 640 px | Cabeçalho com símbolo, busca como botão, menu em gaveta; grade de 3+ colunas; painel do ícone na parte de baixo; filtros por `select` |
| 640–1023 px | Logotipo completo, busca com atalho; filtros na barra |
| 1024–1279 px | Categorias em coluna lateral na exploração |
| ≥ 1280 px | Painel do ícone ao lado da grade |

A grade calcula as colunas pela largura (mínimo de 104 px por célula, 76 px na densidade compacta). Campos têm 16 px em telas de toque.

## Linguagem visual

Detalhes de composição, imagens e tom em [visual-language.md](visual-language.md).
