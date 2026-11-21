# Testes e verificações

## Visão geral

| Verificação | Comando | Quando | Tempo aproximado |
| --- | --- | --- | --- |
| Portão completo | `npm run verify` | Antes de cada push | 1 a 2 min |
| Unitários + integração | `npm test` | Durante o desenvolvimento | segundos |
| Catálogo | `npm run catalog:validate` | Ao mexer em ícones | segundos |
| Ponta a ponta | `npm run test:e2e` | Mudou um fluxo (busca, exploração, exportação, biblioteca) | ~30 s |
| Páginas | `npm run check:pages` | Mudou algo visível | alguns minutos |
| SEO | `npm run check:seo` | Depois de cada publicação | ~1 min |

Os testes usam o executor do Node (`node:test`), sem dependência nova ([DECISIONS/0007](DECISIONS/0007-testes-e-portao.md)). Os de navegador usam o Chrome instalado, por um cliente CDP sem dependências (`scripts/lib/chrome.mjs`).

## Testes unitários (`tests/unit`)

| Arquivo | Cobre |
| --- | --- |
| `svg.test.ts` | Leitor estrito: aceita o formato do catálogo e recusa script, `foreignObject`, `image`, `use`, grupos, `style`, links, eventos, `href`, `class`, `transform`, raiz diferente, comentários, DOCTYPE, unidades e caminhos inválidos; serialização canônica estável; caminhos (flags de arco, relativos); geometria (limites, formas fechadas, ponto dentro, semelhança) |
| `styles-export.test.ts` | Estilos derivados (Sólido com máscara, barra, Duotone), personalização sem alterar o original, exportação SVG/JSX/TSX/CSS/data URI |
| `search.test.ts` | Normalização (acentos, plural pt/en, palavras vazias), distância de edição, busca em português e inglês, sinônimos, léxico, prefixo, erro de digitação, frases ("carrinho de compras"), resultados parciais e desempenho com 20 mil ícones |
| `data.test.ts` | Limpeza de dados lidos do armazenamento, preferências fora da faixa, cópia de segurança (recusa arquivo de outro app, versão futura, parte danificada; aceita arquivo válido) |

## Testes de integração (`tests/integration`)

`catalog.test.ts` roda sobre o catálogo real:

- nenhum erro de validação;
- toda categoria tem ícones e o seu ícone-símbolo;
- todo ícone da interface existe; toda coleção cita só ícones que existem, sem repetir;
- todo desenho com corpo gera Sólido e Duotone;
- **todo ícone é encontrado pelo próprio nome, em português e em inglês** (entre os 12 primeiros);
- o manifesto gerado tem um registro por ícone válido.

## Testes de catálogo e validação de SVG

`npm run catalog:validate` aplica as regras de [ADDING_ICONS.md](ADDING_ICONS.md#10-validar): formato permitido e canônico, área viva, proporção, complexidade, corpos fechados, recortes dentro dos corpos, metadados, licenças, unicidade de id/slug/alias, referências e duplicatas visuais (raster 24 × 24, Jaccard ≥ 0,9, exceto membros da mesma família). Erros reprovam; avisos aparecem no relatório de saúde.

`npm run catalog:sheet` é a verificação visual: nenhuma regra automática diz se um desenho é bom.

## Testes de pesquisa

Além dos unitários, a integração confere a busca de todos os ícones pelo nome. Para um termo novo, acrescente um caso em `tests/unit/search.test.ts` (com os documentos de `tests/fixtures/search-docs.ts`).

## Testes de exportação

`styles-export.test.ts` confere o texto de cada formato. O fluxo ponta a ponta "Exportação" baixa SVG e PNG de verdade e confere os arquivos.

## Testes ponta a ponta (`tests/e2e/run.mjs`)

Contra um servidor rodando (`npm run dev`, `npm run start` ou um deploy):

1. Busca da página inicial ("carrinho de compras" → primeiro resultado é o carrinho).
2. Busca global com `Ctrl K` e Enter.
3. Filtros de categoria e estilo, indicadores e "Limpar filtros".
4. Painel rápido ao clicar num ícone.
5. Copiar SVG na página do ícone (confirmação).
6. Personalização: o traço muda a prévia e o código.
7. Download de SVG e PNG.
8. Favoritar e ver na biblioteca.
9. 404 de ícone inexistente.
10. Celular (375 px): painel inferior e nenhuma rolagem lateral.

## Testes de responsividade

`npm run check:pages` abre as páginas principais, todas as categorias e coleções e uma amostra de páginas de ícone em **1366 px (claro), 768 px (escuro) e 375 px (claro)** e acusa erros no console, falhas de carregamento, conteúdo mais largo que a tela e páginas sem exatamente um `<h1>`. `--shots=pasta` grava uma captura de cada página.

## Testes de acessibilidade

Automáticos:

- `check:pages`: um `<h1>` por página.
- Componentes com nome acessível obrigatório (`IconButton` exige `label`); grupos com `role="radiogroup"`; grade com navegação por setas.

Manuais (a cada mudança de interface):

- percorrer a página só com teclado (Tab, setas na grade, Esc nos diálogos, `Ctrl K`);
- foco sempre visível;
- leitor de tela (NVDA ou VoiceOver) na busca global, na grade e na página do ícone;
- contraste dos tokens (valores em [brand-guidelines](../brand/guidelines/brand-guidelines.md#cores));
- movimento reduzido (`prefers-reduced-motion`).

## Verificações de desempenho

- Busca: teste com 20 mil ícones (< 150 ms por consulta na máquina de CI; na prática, poucos milissegundos com o catálogo atual).
- Peso: depois do `npm run build`, compare os tamanhos em `.output/public/assets` (o manifesto, os fragmentos e o índice de busca são chunks separados). Os números da última medição estão nas [auditorias](audits/README.md).
- Primeira pintura: as páginas são renderizadas no servidor; a grade de `/icons` chega com as primeiras 48 células desenhadas.

## Critérios de aprovação

Uma mudança está pronta quando:

- [ ] `npm run verify` passa;
- [ ] `npm run test:e2e` passa (se tocou em fluxos). Rode contra o build (`npm run build` e `vite preview --port 3101`, depois `npm run test:e2e -- http://localhost:3101`): no servidor de dev a primeira carga pode passar das esperas dos fluxos e falhar sem defeito real;
- [ ] `npm run check:pages` sem problemas novos (se tocou na interface);
- [ ] ícones novos revisados na folha de contato;
- [ ] documentação correspondente atualizada.
