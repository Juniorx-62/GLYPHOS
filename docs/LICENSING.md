# Licenciamento

## Política

1. **O catálogo é original.** Todo ícone publicado é desenhado para o GLYPHOS, no grid do projeto, ou é um recurso de terceiros incorporado sob uma licença que permite o uso pretendido, com a procedência registrada.
2. **Cada ícone declara autoria, origem e licença** nos metadados (`author`, `source`, `license`). A página do ícone mostra as três.
3. **Nada entra sem registro.** Origens e licenças aceitas vivem em `src/catalog/licenses.ts`; `npm run check:licenses` (parte do `verify`) recusa ícones com origem ou licença desconhecida, ou com uma licença que a origem não oferece.

## Licença dos ícones

Os ícones do GLYPHOS (os desenhos em `src/catalog/icons`, os metadados em `src/catalog/metadata` e tudo o que é gerado a partir deles: SVGs estáticos, PNGs e código exportado pelo site) são distribuídos sob a **licença MIT** ([LICENSE](../LICENSE)).

| Pode | Condição |
| --- | --- |
| Usar em projetos pessoais e comerciais, sites, aplicativos, impressos | — |
| Modificar (cor, traço, tamanho, desenho) | — |
| Redistribuir o conjunto (pacote, kit de design, outra biblioteca) | Manter o aviso de copyright e o texto da licença |

Usar um ícone num produto não exige crédito. A licença do **código da aplicação** (o site, os scripts) ainda não foi definida; até lá, vale o padrão legal (todos os direitos reservados ao autor).

## Procedência dos ícones

| Origem (`source`) | Tipo | Licença | Observação |
| --- | --- | --- | --- |
| `glyphos` | Desenho próprio | MIT | Desenhado do zero no grid de 24 do projeto |

A distribuição atual por origem é calculada pelo `npm run check:licenses` e aparece no relatório de saúde.

### Como garantimos que um desenho é próprio

- O guia de desenho ([ADDING_ICONS.md](ADDING_ICONS.md#1-antes-de-desenhar)) proíbe copiar, decalcar ou adaptar caminhos de outras bibliotecas, inclusive de memória.
- O formato do catálogo (raiz e espessura fixas, papéis `data-part`, formato canônico) difere do de outras bibliotecas: um arquivo copiado não passa no validador sem ser redesenhado.
- O validador compara cada desenho com todo o catálogo (raster 24 × 24, sobreposição de 90% ou mais) e aponta semelhanças internas.
- Revisão visual obrigatória pela folha de contato.

Trocar o nome ou a pasta de um arquivo alheio não o torna original. Desenhos que não passem por esse processo não entram.

## Recursos de terceiros

Um recurso de terceiros só entra quando:

1. A licença permite uso comercial e redistribuição (as licenças registradas precisam de `commercial: true` e `redistribution: true`).
2. A origem é registrada em `src/catalog/licenses.ts` com nome, endereço (`url`) e licenças.
3. Cada ícone tem `author` com o autor original e `source` com a origem.
4. As atribuições exigidas estão em `docs/CREDITS.md` (o `check:licenses` exige esse arquivo quando há recursos de terceiros).
5. O desenho é adaptado ao formato do catálogo (grid, raiz, papéis) sem perder a atribuição.

Licenças compatíveis: MIT, ISC, Apache 2.0 (com o NOTICE), CC0, CC BY 4.0 (com atribuição). **Não são aceitas**: licenças que proíbem uso comercial (CC BY-NC), que exigem a mesma licença em obras derivadas no conjunto (CC BY-SA, GPL) ou recursos sem licença explícita.

## Restrições de redistribuição

- **Marcas registradas não entram.** Logotipos de empresas, redes sociais, produtos e protocolos (incluindo símbolos como o do Bluetooth) têm regras de uso dos donos. Para esses, recomenda-se uma biblioteca dedicada a marcas, respeitando as diretrizes de cada uma.
- **Símbolos culturais e religiosos específicos** não entram sem revisão cuidadosa.
- Quem redistribui o conjunto mantém o aviso MIT; quem redistribui um recurso de terceiros mantém a atribuição dele.

## Condições para inclusão no catálogo

- [ ] Origem e licença registradas e compatíveis (`check:licenses`).
- [ ] Autoria preenchida.
- [ ] Desenho no formato do catálogo, validado e revisado na folha de contato.
- [ ] Não é marca registrada nem cópia de outra biblioteca.
- [ ] Para terceiros: atribuição em `docs/CREDITS.md`.

## Créditos do produto

- **Tipografia:** IBM Plex Sans e IBM Plex Mono (IBM), sob a SIL Open Font License 1.1, empacotadas por `@fontsource`.
- **Ícones da interface:** o próprio catálogo GLYPHOS.
- **Padrões de interface:** a busca global, o toaster e os controles reaproveitam *padrões de interação* de outro projeto do mesmo autor, reimplementados para React; nenhum código foi copiado ([DECISIONS/0006](DECISIONS/0006-reuso-de-outros-projetos.md)).
