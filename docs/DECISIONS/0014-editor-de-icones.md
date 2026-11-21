# 0014 · Editor de ícones (CREATE) sobre o mesmo sistema de desenho

_Data: 2026-11-21 · Situação: aceita_

**Contexto.** O GLYPHOS deixava encontrar, personalizar e exportar ícones da biblioteca, mas não criar os próprios. Um editor genérico de desenho vetorial ficaria à parte do produto e não aproveitaria o grid, o traço e os estilos derivados.

**Decisão.** Um editor especializado em ícones em `/create` (`src/features/editor`), com estas escolhas:

- **Documento estruturado, não SVG.** A criação é um `CreationDoc` (`src/data/types.ts`): retângulos, elipses, linhas, polígonos, caminhos com âncoras e alças Bézier, e grupos, cada forma com estilo, rotação e papel (`line`, `body`, `cut`, `slash`). O projeto guarda tudo para continuar a edição; o SVG é sempre gerado.
- **Um único caminho até o SVG.** `docToNodes` converte o documento nos mesmos `IconNode` do catálogo; o canvas, a prévia, o Style Matching e todas as exportações passam por `renderIcon` e `features/export/formats.ts`. Por isso uma criação ganha Contorno, Sólido e Duotone como um ícone da biblioteca, pelos papéis das formas. A opção `box` do `renderIcon` aceita pranchetas diferentes de 24.
- **Estado separado do desenho.** `state.ts` (histórico, seleção, ferramenta, projeto) é um store externo lido com `useSyncExternalStore`; `camera.ts` guarda zoom e posição; `Canvas.tsx` só desenha e traduz gestos. Gestos escrevem uma prévia transitória e viram um único passo do histórico ao terminar. O histórico guarda instantâneos imutáveis (até 150), que compartilham as formas não alteradas.
- **Geometria pura e testada.** `model/` (geometria, árvore de formas, conversões, Style Matching, histórico) roda em Node sem DOM; `tests/unit/editor.test.ts` cobre ida e volta, booleanas, histórico e Style Matching.
- **Booleanas com `polygon-clipping`.** União, subtração, interseção e exclusão usam essa biblioteca pequena e sem dependências, já no `package.json`. As curvas são aproximadas por segmentos antes da operação; a interface diz que o resultado é um caminho de segmentos retos.
- **Style Matching honesto.** Ajustes opcionais (grid de 24, área viva, traço 1,5, pontas redondas, `currentColor`, alinhamento de pontos, papéis) com antes e depois e relatório. O que exigiria redesenhar o caminho (uma forma só preenchida virar contorno) não é feito, só apontado. O desenho anterior fica em `Creation.previous`, além do desfazer.
- **Biblioteca protegida.** Abrir um ícone do catálogo no editor (`/create?from=<slug>`, "Editar uma cópia") cria uma cópia; `origin` registra de onde veio. O catálogo não é editável pela interface.
- **Local-first, como o resto.** Criações em `creationsStore` (IndexedDB), com saneamento de tudo que é lido; o trabalho não salvo vai para `editor-draft`. Projetos salvos se salvam sozinhos após cada mudança. As criações entram na cópia de segurança e nas coleções pessoais (`PersonalCollection.creations`). O arquivo `.glyphos.json` leva o projeto editável para outro navegador.

**Consequências.** A biblioteca e o editor compartilham marca, componentes e formatos; uma correção em `renderIcon` vale para os dois. Retângulos e elipses girados são exportados com `transform`; caminhos, linhas e polígonos têm a rotação gravada nos pontos. Não há texto, gradientes nem imagens: fogem do formato de ícone do GLYPHOS. Em telas pequenas o editor troca a barra lateral por uma barra inferior e os painéis por uma folha, mas o uso principal continua sendo o computador.
