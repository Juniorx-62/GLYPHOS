# 0002 · O catálogo é um SVG por ícone e um JSON de metadados por categoria; os índices são gerados

_Data: 2026-11-19 · Situação: aceita_

**Contexto.** A biblioteca começa com milhares de ícones e precisa crescer, com inclusão, renomeação, validação e detecção de duplicatas.

**Problema.** Onde e como guardar desenhos e metadados para que sejam a fonte de verdade, fáceis de revisar e sem um arquivo gigante.

**Alternativas consideradas.** Um JSON único com tudo (diffs enormes, conflitos); um arquivo de metadados por ícone (milhares de arquivos pequenos, edição em série difícil); metadados dentro do SVG (mistura desenho e texto, e o SVG publicado carregaria dados internos); um banco de dados (backend sem necessidade).

**Decisão.** `src/catalog/icons/<categoria>/<slug>.svg` (um desenho por arquivo, formato canônico) e `src/catalog/metadata/<categoria>.json` (lista de metadados da categoria), com categorias, estilos, coleções e licenças em registries TypeScript. `catalog:index` gera manifesto, fragmentos por categoria, índice de busca e SVGs estáticos em pastas fora do git.

**Justificativa.** Desenhos revisáveis no diff, metadados de uma categoria editados juntos, índices sempre coerentes com os arquivos (não há como esquecer de regenerar: `dev` e `build` geram).

**Consequências.** Clonar e rodar exige o passo de geração (automático nos scripts). O `verify` gera em modo estrito, então um erro no catálogo bloqueia o push.
