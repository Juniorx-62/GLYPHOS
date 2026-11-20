# Uso da marca

## Versões

| Fundo | Arquivo |
| --- | --- |
| Claro (papel, branco) | `glyphos-wordmark.svg` / `glyphos-symbol.svg` |
| Escuro (tinta, preto) | `glyphos-wordmark-inverse.svg` / `glyphos-symbol-inverse.svg` |
| Uma cor só | `glyphos-wordmark-mono.svg` / `glyphos-symbol-mono.svg` (assume a cor do texto) |
| Ícone de app, avatar | `glyphos-app-icon.svg` |

No site, o logotipo é desenhado pelo componente `Logo` (`src/components/layout/Logo.tsx`) com as mesmas geometrias, e o quadrado usa o token `accent`, que muda com o tema.

## Área de proteção e tamanho mínimo

- **Área de proteção:** ao redor do logotipo, a altura do quadrado de rubrica multiplicada por 2 (≈ metade da altura do G). Nada entra nessa área.
- **Tamanho mínimo:** logotipo com 14 px de altura na tela (60 px de largura); símbolo com 16 px. Abaixo disso, use o símbolo.

## Faça

- Use os arquivos gerados, sem redesenhar.
- Mantenha o quadrado em rubrica, ou tudo em uma cor (versão mono).
- Prefira os fundos da marca (`background`, `surface`, tinta).

## Não faça

- Não troque a cor da rubrica por outra cor de destaque.
- Não aplique contorno, sombra, gradiente, inclinação ou rotação.
- Não use o G sem o quadrado, nem o quadrado sozinho como marca.
- Não componha o símbolo ao lado do logotipo: o G do nome já é o símbolo.
- Não escreva "GLYPHOS" com uma fonte no lugar do logotipo em peças de marca (no texto corrido, o nome é escrito normalmente).
- Não coloque a marca sobre fotos ou fundos com pouco contraste.

## Ícone do aplicativo

Placa de tinta (`#151514`) com cantos de 22%, símbolo em papel com a rubrica clara (`#FF6A4A`). A versão *maskable* deixa o símbolo dentro da zona segura de 80%.
