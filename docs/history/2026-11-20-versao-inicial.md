# Versão inicial: fases 1 a 7

_2026-11-19 a 2026-11-20_

## Fase 1 · Diagnóstico e planejamento

- Análise do THOTH (README, arquitetura, persistência, SEO, scripts, marca) e do Orthos UI (tokens, componentes, licença).
- Decisões registradas em [DECISIONS](../DECISIONS/README.md): stack, catálogo em arquivos, estilos derivados, busca própria, grade virtual, reuso do ecossistema, testes, local-first, licença, SVG seguro e identidade.
- Nome definido: **GLYPHOS** (o provisório era "THOTH Icons").

## Fase 2 · Fundação

- Projeto TypeScript + TanStack Start + Vite 8 + Tailwind 4.
- Marca gerada por código (`brand/geometry.ts`, `brand/tokens/source.ts`): G monolinha com quadrado de rubrica, paleta "tinta e rubrica", temas claro e escuro, favicon, ícones do app e imagem de compartilhamento.
- Núcleo do catálogo: tipos, leitor estrito de SVG, geometria, derivação de estilos (papéis `body`, `cut`, `slash`), validador, formatador, gerador de índices, folhas de contato.
- 61 ícones de referência, que fixaram o estilo e cobrem os ícones da interface.

## Fase 3 · Biblioteca inicial

- Plano de conceitos por categoria, com dono único para cada slug.
- 11 desenhistas trabalhando em paralelo (um grupo de categorias cada), mais um lote de complemento para as categorias menores, todos seguindo [ADDING_ICONS.md](../ADDING_ICONS.md) e revisando as próprias folhas de contato.
- Resultado: 2.096 ícones em 33 categorias, 0 erros de validação, 1.746 com Sólido e Duotone. Desenhos sem silhueta fechada ficaram só em Contorno. Logotipos de marcas (inclusive o símbolo do Bluetooth) ficaram de fora.

## Fases 4 a 6 · Busca, exploração, personalização, exportação e dados locais

- Busca pt/en com léxico, plural, prefixo e erro de digitação; busca global (`Ctrl K`).
- Exploração com grade virtual, filtros, ordenação, painel rápido; páginas de categoria, coleção e ícone renderizadas no servidor.
- Personalização ao vivo (estilo, traço, cor, tamanho, opacidade) e exportação em SVG, JSX, TSX, CSS, data URI e PNG.
- Favoritos, histórico, coleções pessoais e cópia de segurança em JSON; 18 coleções temáticas.

## Fase 7 · Auditoria e publicação

- [Auditoria da fase 7](../audits/2026-11-fase-7.md): `verify`, 10 fluxos ponta a ponta, 252 verificações de página, SEO de 2.152 páginas, todos aprovados depois das correções. Pendências priorizadas no relatório.
- Repositório publicado em <https://github.com/Juniorx-62/GLYPHOS>, com CI (`.github/workflows/verify.yml`).
