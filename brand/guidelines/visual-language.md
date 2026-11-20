# Linguagem visual

## Princípios

1. **O ícone é o protagonista.** Tudo ao redor é neutro: tinta, papel e bordas finas. A cor da interface não compete com o desenho.
2. **Precisão visível.** O grid aparece onde ajuda a entender o desenho: na prévia ampliada (com a área viva tracejada em rubrica), no fundo do topo da página inicial e no diagrama da página Sobre.
3. **Densidade calma.** Muitos ícones por tela, com respiro: células quadradas, nomes discretos, nada de cartões decorados.
4. **Uma cor de destaque, usada com parcimônia.** A rubrica marca o que importa: a marca, o foco, a aba ativa, o favorito, a área viva.
5. **Sem efeitos gratuitos.** Nada de gradientes de fundo, sombras exageradas ou animações decorativas. Sombra só em sobreposições; movimento só para orientar.

## Composição

- **Página inicial:** título grande à esquerda, busca em destaque, e um espécime da biblioteca (grade de ícones reais) à direita, com um ícone selecionado em tinta. Depois: números do catálogo, populares, categorias, estilos, novidades, coleções e "como usar".
- **Exploração:** barra fixa com busca, ordenação, estilo e personalização; categorias na lateral; grade; painel do ícone à direita.
- **Página do ícone:** prévia quadrada grande sobre o grid, escalas reais (16 a 64 px) e o ícone nos dois temas; ao lado, nome, identificadores, ações e personalização; abaixo, estilos, código, PNG, detalhes e relacionados.

## Ícones na interface

A interface usa os próprios ícones do GLYPHOS (Contorno, traço 1,5), em 14 a 18 px nos controles. Estados ativos (favorito) usam o Sólido do mesmo ícone.

## Imagens

Não há fotos. A imagem de compartilhamento é o logotipo sobre tinta com uma faixa de ícones reais do catálogo, gerada a cada `npm run brand -- --png`.

## Tom dos textos

Português do Brasil, direto e concreto, para quem não é da área também: "Copiar SVG", "Baixar PNG", "Voltar ao padrão". Explica o porquê quando algo não está disponível ("Este ícone não tem Sólido: mostrando Contorno"). Nada de jargão sem necessidade; termos técnicos (SVG, JSX, currentColor) aparecem com a explicação ao lado na primeira vez.
