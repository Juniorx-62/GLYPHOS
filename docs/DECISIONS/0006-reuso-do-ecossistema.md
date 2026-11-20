# 0006 · O que vem do THOTH e do Orthos UI, e como

_Data: 2026-11-19 · Situação: aceita_

**Contexto.** O ecossistema tem o THOTH (laboratório de front-end, React) e o Orthos UI (biblioteca de componentes em HTML, CSS e JS puro). O GLYPHOS deve aproveitar o que fizer sentido sem criar dependência entre repositórios nem perder identidade.

**Decisão.**

| Origem | O que foi reaproveitado | Como |
| --- | --- | --- |
| THOTH | Camada de persistência (driver IndexedDB → localStorage → memória, `createPersistentStore`, eventos) | Copiada e adaptada (sem armazenamento de imagens; nomes do GLYPHOS) |
| THOTH | Cliente CDP sem dependências (`chrome.mjs`), carregador de TypeScript para scripts, verificador de dependências, `pageHead`/JSON-LD, padrão do `verify` | Copiados e adaptados |
| THOTH | Tipografia Geist, conceito da "paleta do escriba", padrão de tokens nos namespaces do Tailwind 4, script de tema antes da pintura | Mesmo padrão, valores próprios |
| Orthos UI | Padrões de interação: busca global com combobox e `aria-activedescendant`, toaster com região viva e pausa ao passar o mouse, botão de copiar com confirmação, controle segmentado | Reimplementados em React; nenhum código copiado |

**O que não foi reaproveitado.** O `orthos.css` e o `orthos.js` (estilos globais e listeners que conflitariam com React e com a hidratação); os componentes do catálogo do THOTH (dependem do tema e do Hugeicons dele); o Hugeicons (o GLYPHOS usa os próprios ícones).

**Justificativa.** Mesmo dono e mesma stack tornam a cópia adaptada mais simples e segura que um pacote compartilhado, que criaria acoplamento de versões. O Orthos UI não tem licença definida, então só padrões (não código) foram usados.

**Consequências.** Melhorias numa cópia não chegam à outra sozinhas. Se mais um projeto precisar da persistência, vale extrair um pacote comum. Nenhum dos projetos existentes foi alterado.
