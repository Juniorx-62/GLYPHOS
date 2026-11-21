# 0009 · Ícones sob MIT, desenho próprio, sem logotipos de marcas

_Data: 2026-11-19 · Situação: aceita_

**Contexto.** Os ícones precisam poder ser usados em projetos externos, inclusive comerciais. Referências de mercado (Lucide, Phosphor, Tabler…) não podem ser copiadas.

**Decisão.** Licença MIT para os ícones e o que é gerado deles (arquivo `LICENSE`). Todo desenho é próprio, com autoria e origem registradas; recursos de terceiros só com licença compatível e atribuição. Logotipos de marcas registradas ficam de fora. A licença do código da aplicação fica para o dono decidir.

**Consequências.** `check:licenses` no `verify`; política em [LICENSING](../LICENSING.md). A troca de licença é uma mudança em `src/catalog/licenses.ts` e no `LICENSE`, sem tocar nos ícones.
