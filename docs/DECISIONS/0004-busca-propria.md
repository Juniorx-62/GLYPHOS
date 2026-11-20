# 0004 · Busca com índice invertido próprio, gerado no build, em vez de uma biblioteca

_Data: 2026-11-19 · Situação: aceita_

**Contexto.** A busca precisa funcionar em português e inglês, por sinônimos, com plural e acento, tolerar erro de digitação, ser instantânea e escalar para um catálogo muito grande.

**Alternativas consideradas.** Fuse.js (busca difusa por varredura linear: lenta com dezenas de milhares de documentos e ruim para frases); MiniSearch ou Lunr (bons, mas o índice é montado no navegador ou serializado num formato próprio, e não conhecem plural em português nem o léxico pt/en).

**Decisão.** `src/catalog/search`: normalização com plural pt/en, índice invertido com pesos por campo gerado no build, léxico de equivalências aplicado na consulta, frases do léxico como um termo, prefixo, um erro de digitação e modo parcial. Roda na thread principal com `useDeferredValue`.

**Justificativa.** O caso é estreito e bem definido (campos curtos, dois idiomas, vocabulário de ícones); um módulo pequeno, testado e sem dependência resolve melhor que adaptar uma biblioteca genérica. O índice vem pronto do build, então o navegador só carrega e consulta.

**Consequências.** O comportamento da busca é responsabilidade do projeto e está coberto por testes (incluindo desempenho com 20 mil ícones). O motor é puro e pode ir para um Web Worker se o catálogo crescer muito.
