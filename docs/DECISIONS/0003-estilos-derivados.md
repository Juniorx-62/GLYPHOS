# 0003 · Um desenho-mestre por conceito; Sólido e Duotone derivados pelo papel das formas

_Data: 2026-11-19 · Situação: aceita_

**Contexto.** O produto deve suportar Contorno, Sólido, Duotone, Reto, Arredondado e Preenchido, e identificar o mesmo conceito em estilos diferentes.

**Problema.** Desenhar cada estilo à mão multiplica o trabalho e deixa os estilos divergirem; derivar automaticamente um preenchimento de um traço é ambíguo (o que é silhueta, o que é detalhe?).

**Alternativas consideradas.** Arquivos separados por estilo para todo ícone; expansão de traço e operações booleanas no build (dependências pesadas e resultados imprevisíveis); só Contorno.

**Decisão.** O desenho-mestre marca o papel de cada forma (`data-part`: `body`, `cut`, `slash`). O Duotone tinge os corpos; o Sólido preenche os corpos e vaza recortes e barras com uma máscara SVG. Um arquivo `<slug>.<estilo>.svg` substitui a derivação ou cria um estilo que só existe à mão.

**Justificativa.** Uma correção no desenho chega a todos os estilos; o designer controla o resultado com uma marcação simples; o validador confere a marcação (corpo fechado, detalhe dentro do corpo).

**Consequências.** Ícones sem silhueta fechada (setas, letras) existem só em Contorno, e o relatório de saúde mostra a cobertura. O Sólido usa `<mask>` com id: no app o id é único por instância (`useId`) e no JSX exportado também. Reto, Arredondado e Preenchido estão no registry, mas só aparecem quando houver desenhos.
