# 0001 · Stack: TypeScript, TanStack Start com SSR, Vite e Tailwind 4

_Data: 2026-11-19 · Situação: aceita_

**Contexto.** O GLYPHOS precisa de páginas indexáveis (uma por ícone e por categoria), primeira pintura rápida, grade com milhares de itens e manutenção simples. O THOTH, do mesmo ecossistema, usa React 19, TypeScript, TanStack Start, Vite 8, Tailwind 4 e Nitro, publicado na Vercel.

**Problema.** Escolher a linguagem e a stack sem replicar o THOTH por inércia.

**Alternativas consideradas.**
- SPA com Vite: simples, mas sem HTML para os rastreadores nas páginas de ícone.
- Geração estática completa (prerender de todas as páginas): ótima para CDN, mas o build cresce com o catálogo e cada ícone novo exige rebuild completo das páginas.
- Next.js ou Astro: resolveriam o SSR, mas trocariam o padrão do ecossistema sem ganho claro.
- TanStack Start com SSR (o padrão do THOTH).

**Decisão.** TypeScript estrito em tudo (app, scripts e testes; os scripts rodam no Node sem compilação, com `erasableSyntaxOnly`). React 19 + TanStack Start com SSR e rotas por arquivo, Vite 8, Tailwind 4 com tokens próprios e Nitro (Vercel ou Node). Sem Motion: as transições são poucas e cabem em CSS.

**Justificativa.** SSR dá HTML completo a cada página sem prerender de milhares de arquivos; o cache de borda (`s-maxage`) deixa o custo por página próximo de um site estático. Mesma stack do THOTH reduz o custo de manutenção do ecossistema e permite reaproveitar padrões (SEO, persistência, scripts).

**Consequências.** Loaders rodam no servidor no primeiro acesso e no navegador nas navegações; dados que só existem no navegador nunca entram no primeiro render (ver [0008](0008-local-first.md)). O build não confere tipos: o `verify` confere.
