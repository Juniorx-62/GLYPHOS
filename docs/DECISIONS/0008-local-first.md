# 0008 · Sem cadastro: dados de quem usa só no navegador

_Data: 2026-11-19 · Situação: aceita_

**Contexto.** Favoritos, histórico, coleções pessoais e preferências de personalização. O pedido do produto é priorizar a experiência sem cadastro.

**Decisão.** Tudo no navegador (IndexedDB, com localStorage e memória como reserva), atrás de um driver; cópia de segurança em JSON para levar a outro aparelho. Nenhum servidor de dados, nenhuma autenticação.

**Consequências.** Não há sincronização entre dispositivos; a evolução prevista é um driver HTTP no lugar do IndexedDB (as stores e a interface não mudam). Os dados nunca entram no HTML do servidor: o primeiro render usa os valores iniciais e a interface se atualiza depois da hidratação. Também não há "popularidade" medida: ela é editorial até existir uma coleta anônima e agregada.
