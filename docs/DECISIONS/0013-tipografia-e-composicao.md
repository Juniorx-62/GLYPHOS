# 0013 · IBM Plex e composição por espaço, não por caixas

_Data: 2026-11-21 · Situação: aceita_

**Contexto.** A interface usava Geist e Geist Mono, a combinação de inúmeros produtos de software, e organizava quase todo conteúdo em cartões com borda, rótulos pequenos acima dos títulos e seções com a mesma estrutura em sequência. O resultado parecia montado a partir de um modelo, não desenhado para o GLYPHOS.

**Decisão.**
- **Tipografia:** IBM Plex Sans (variável) na interface e IBM Plex Mono nos nomes técnicos, medidas e código. A família nasceu como sistema, com raiz em desenho técnico e engenharia: as duas conversam na mesma métrica e combinam com a ideia de grid, traço e construção. Pesos 400 e 500, sem negrito pesado; títulos médios em vez de gigantes; textos de apoio mais escuros que antes.
- **Raios e sombras:** cantos de 2 a 8 px e quase nenhuma sombra. Bordas só onde separam algo de verdade (a tela de exemplo, campos, menus).
- **Composição:** os assuntos se separam por espaço e por tipografia, não por cartões e divisórias. Sem rótulos numerados ou caixa alta acima dos títulos. A home alterna composições (prancha solta sobre o grid, faixa contínua com a biblioteca, comparação em três colunas, tela de exemplo com controles ao lado, prateleira de ícones com abas de texto, coleções em lista). Categorias e coleções viram índices em lista com os próprios desenhos.
- **Controles:** a personalização é uma lista de propriedades (rótulo, trilho, valor em mono), com amostras de cor quadradas e seleção por contorno de tinta.

**Consequências.** Valores em `brand/tokens/source.ts` (fontes, raios, sombras, contraste dos textos de apoio). O componente `Eyebrow` e os capítulos numerados da 0012 saem. As regras visuais estão no [guia da marca](../../brand/guidelines/brand-guidelines.md).
