# Auditorias

Diagnósticos do GLYPHOS com evidências. Cada relatório registra o estado numa data, então os números ficam como foram medidos.

| Relatório | Área | Data |
| --- | --- | --- |
| [2026-11-fase-7.md](2026-11-fase-7.md) | Arquitetura, interface, desempenho, acessibilidade, catálogo, segurança e SEO (auditoria de publicação da versão inicial) | 2026-11-20 |
| [CATALOG_HEALTH.md](CATALOG_HEALTH.md) | Saúde do catálogo (gerado por `npm run catalog:stats -- --write`) | a cada geração |

## Como escrever um relatório

Um arquivo por auditoria, `AAAA-MM-<tema>.md`, com:

1. **Escopo e método:** o que foi auditado, com quais comandos e em que ambiente.
2. **Achados**, um por linha:

| Id | Área | Gravidade | Onde | Evidência | Situação |
| --- | --- | --- | --- | --- | --- |
| A-01 | Acessibilidade | Alta / Média / Baixa / Informativa | arquivo:linha ou rota | saída do comando, captura (em `docs/audits/<tema>/`) | Corrigido em … / Aberto / Aceito (motivo) |

3. **Medições:** números com data (tempo, peso, contagens).
4. **Pendências:** o que ficou aberto, com o próximo passo.

Gravidade: **alta** quebra uma função ou exclui alguém; **média** prejudica a experiência ou a manutenção; **baixa** é polimento; **informativa** é registro sem ação.

Ao concluir, acrescente uma linha na tabela acima e um registro em [history](../history/README.md).

## Áreas e ferramentas

| Área | Ferramentas |
| --- | --- |
| Arquitetura | `npm run check:deps`, leitura de `docs/ARCHITECTURE.md` contra o código |
| Interface | `npm run check:pages -- --shots=docs/audits/<tema>`, revisão nos dois temas e em 375 px |
| Desempenho | `npm run build` (tamanhos), teste de busca, medição de carregamento no Chrome |
| Acessibilidade | Teclado, leitor de tela, contraste dos tokens, `check:pages` (h1) |
| Catálogo | `npm run catalog:validate`, `npm run catalog:stats -- --write`, folhas de contato |
| Segurança | Leitor de SVG (testes), cabeçalhos (`src/start.ts`), dados importados (`restoreBackup`) |
| SEO | `npm run check:seo` |
