# 0006 · O que foi reaproveitado de outros projetos, e como

_Data: 2026-11-19 · Situação: aceita_

**Contexto.** O autor mantém outros projetos de front-end: um laboratório em React e uma biblioteca de componentes em HTML, CSS e JS puro. O GLYPHOS é um produto independente e pode aproveitar padrões deles sem criar dependência entre repositórios.

**Decisão.**

| Origem | O que foi reaproveitado | Como |
| --- | --- | --- |
| Laboratório em React | Camada de persistência (driver IndexedDB → localStorage → memória, `createPersistentStore`, eventos) | Copiada e adaptada (sem armazenamento de imagens; nomes do GLYPHOS) |
| Laboratório em React | Cliente CDP sem dependências (`chrome.mjs`), carregador de TypeScript para scripts, verificador de dependências, `pageHead`/JSON-LD, padrão do `verify` | Copiados e adaptados |
| Laboratório em React | Tipografia Geist, padrão de tokens nos namespaces do Tailwind 4, script de tema antes da pintura | Mesmo padrão, valores próprios |
| Biblioteca de componentes | Padrões de interação: busca global com combobox e `aria-activedescendant`, toaster com região viva e pausa ao passar o mouse, botão de copiar com confirmação, controle segmentado | Reimplementados em React; nenhum código copiado |

**O que não foi reaproveitado.** O CSS e o JS globais da biblioteca de componentes (conflitariam com React e com a hidratação); os componentes do laboratório (dependem do tema e do pacote de ícones dele); pacotes de ícones de terceiros (o GLYPHOS usa os próprios ícones).

**Justificativa.** Mesmo dono e mesma stack tornam a cópia adaptada mais simples e segura que um pacote compartilhado, que criaria acoplamento de versões. A biblioteca de componentes não tem licença definida, então só padrões (não código) foram usados.

**Consequências.** Melhorias numa cópia não chegam à outra sozinhas. Se mais um projeto precisar da persistência, vale extrair um pacote comum. Nenhum dos projetos existentes foi alterado.
