---
name: glyphos-standards
description: Padrões de código, arquitetura e documentação do GLYPHOS (camadas e regras de importação, tokens, acessibilidade, local-first, catálogo como fonte de verdade). Use ao mexer em qualquer arquivo de src/, scripts/ ou docs/ do projeto.
---

# Padrões do GLYPHOS

Leia conforme a tarefa:

- Arquitetura e regras de importação: `docs/ARCHITECTURE.md` (conferidas por `npm run check:deps`).
- Código, nomes, estilos e acessibilidade: `docs/CONVENTIONS.md`.
- Catálogo e modelo de dados: `docs/CATALOG.md`.
- Testes e critérios de aprovação: `docs/TESTING.md`.

Regras que mais se quebram:

1. `src/catalog` não importa React nem nada fora dele (os scripts de Node usam os mesmos módulos).
2. Só tokens nos estilos (`bg-surface`, `text-fg-muted`); novo valor vai em `brand/tokens/source.ts` + `npm run brand`. Em SVG, `var(--x)` não funciona em atributos: use `style`.
3. Nada lido só no navegador (armazenamento, `matchMedia`, caches carregados no cliente) no primeiro render: o HTML do servidor precisa ser igual (use `useHydrated` ou o snapshot do servidor das stores).
4. Ícones nunca como HTML injetado: `Glyph`/`UiIcon` a partir dos nós do catálogo.
5. Nada de números fixos do catálogo em documentos permanentes: os totais vêm de `catalog:stats`.
6. Decisão nova → `docs/DECISIONS`; documento afetado atualizado no mesmo commit.
7. Antes de terminar: `npm run verify`; se mexeu na interface, `npm run test:e2e` e `npm run check:pages` com o servidor rodando.
