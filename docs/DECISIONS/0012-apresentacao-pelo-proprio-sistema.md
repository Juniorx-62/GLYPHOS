# 0012 · O produto se apresenta pelo próprio sistema de desenho

_Data: 2026-11-20 · Situação: aceita_

**Contexto.** A página inicial mostrava listas (populares, categorias, coleções), mas não o que torna o GLYPHOS diferente: um grid, um traço e estilos derivados de um único desenho.

**Decisão.** A home abre com uma prancha viva (ícone sobre o grid de 24, área viva e formas-chave, com estilo e traço ajustáveis) e segue em capítulos numerados: estilos lado a lado com a regra de derivação, régua de tamanhos com controle de traço, uma tela de aplicativo de exemplo com os ícones do catálogo e o mosaico das categorias. Tudo é desenhado com `Glyph` a partir do catálogo e todo controle altera o desenho real (`src/features/showcase`). As páginas internas ganham o mesmo cabeçalho: o quadrado em rubrica com um rótulo técnico (`Eyebrow`) e o título; o Sobre usa os capítulos numerados.

**Consequências.** Nenhuma imagem estática do produto: se o desenho de um ícone muda, a apresentação muda junto. Números exibidos vêm de `catalogInfo`. A tela de exemplo é rotulada como exemplo e não simula funções inexistentes.
