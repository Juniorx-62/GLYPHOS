# 0007 · Testes com o executor do Node e um portão antes do push

_Data: 2026-11-19 · Situação: aceita_

**Contexto.** O build não confere tipos; o catálogo muda com frequência; a busca e a exportação têm regras que quebram em silêncio.

**Decisão.** `node:test` para unitários e integração, rodando TypeScript direto (sem Vitest/Jest). Fluxos ponta a ponta e varredura de páginas no Chrome instalado, por CDP, sem Playwright. `npm run verify` reúne catálogo estrito, índices, tipos, testes, dependências, licenças e marca.

**Justificativa.** Nenhuma dependência nova para testar; o mesmo padrão de outros projetos do autor; os testes de integração rodam sobre o catálogo real (todo ícone encontrável pelo nome).

**Consequências.** Os testes de navegador precisam de um servidor rodando e do Chrome; ficam fora do `verify` e documentados em [TESTING](../TESTING.md).
