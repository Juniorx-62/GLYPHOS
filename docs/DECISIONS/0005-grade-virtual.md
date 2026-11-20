# 0005 · Grade virtual com @tanstack/react-virtual e desenhos por fragmento de categoria

_Data: 2026-11-19 · Situação: aceita_

**Contexto.** A página de exploração mostra o catálogo inteiro filtrado e ordenado. Montar milhares de SVGs de uma vez pesa em aparelhos modestos.

**Alternativas consideradas.** Paginação (quebra a varredura visual, que é como se procura ícone); `content-visibility` (ainda monta todos os nós); virtualização própria.

**Decisão.** `useWindowVirtualizer` do `@tanstack/react-virtual` (mesma família do roteador, pequeno, mantido): só as linhas visíveis existem no DOM. Cada célula pede o fragmento da sua categoria; o servidor desenha as primeiras 48 células.

**Justificativa.** Dependência consolidada para um problema com casos difíceis (rolagem da janela, medidas, `scrollToIndex` na navegação por teclado); escrever uma própria não traria ganho.

**Consequências.** Ctrl F do navegador não encontra ícones fora da tela (a busca do site encontra). Listas pequenas (categoria, coleção, relacionados) usam uma grade simples, totalmente no HTML.
