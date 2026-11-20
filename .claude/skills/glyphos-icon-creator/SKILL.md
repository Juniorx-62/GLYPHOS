---
name: glyphos-icon-creator
description: Desenha e inclui ícones no catálogo do GLYPHOS (grid de 24, traço 1,5, papéis data-part, metadados pt/en), com validação e revisão visual pela folha de contato. Use ao criar, corrigir, renomear ou remover ícones em src/catalog.
---

# Criar ícones no GLYPHOS

A fonte de verdade é `docs/ADDING_ICONS.md`. Leia-o inteiro antes do primeiro desenho da sessão. Este roteiro resume o fluxo.

## Antes

1. Procure o conceito: `npm run catalog:validate -- --json` não ajuda nisso; use a busca do site (`npm run dev`, `/icons`) ou `grep -r '"slug": "<nome>"' src/catalog/metadata`.
2. Escolha a categoria do **objeto desenhado** (`src/catalog/categories/index.ts`) e uma subcategoria existente.
3. Veja ícones vizinhos da mesma categoria para pegar proporções e detalhes (`npm run catalog:sheet -- --category=<id>` e abra o PNG).

## Desenhar

- 24 × 24, traço 1,5, pontas e cantos redondos, área viva de 2 a 22.
- Formas-chave: círculo r=9; quadrado 18 com rx 3; retângulo deitado 19×14 rx 2,5; em pé 14×19 rx 2.
- Só `path`, `circle`, `ellipse`, `rect`, `line`, `polyline`, `polygon`. Sem grupos, transformações, estilos.
- Papéis: silhueta fechada → `data-part="body"`; detalhe dentro dela → `data-part="cut"`; diagonal "desligado" atravessando o corpo → `data-part="slash"`.
- Pontos: `<circle r="1" fill="currentColor" stroke="none"/>`.
- Desenho próprio sempre: nunca reproduza caminhos de outras bibliotecas, nem de memória. Sem logotipos de marcas.

## Registrar

Lote em `tmp/batches/<categoria>-<n>.txt` (formato na seção 8 do guia) e:

```bash
npm run catalog:add -- tmp/batches/<arquivo>.txt
npm run catalog:sheet -- --category=<id>
npm run catalog:validate -- --category=<id>
```

Abra cada PNG da folha e corrija o que não ler bem em 16 px ou ficar errado no Sólido. Repita o `catalog:add` (o mesmo slug é atualizado).

## Fechar

```bash
npm run catalog:index
npm run verify
```

Renomear: `aliases` com o slug antigo. Mover de categoria: lote na categoria nova com `--move`. Remover: `npm run catalog:remove -- <slug>`.
