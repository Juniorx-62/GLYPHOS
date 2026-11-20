# 0010 · SVG por lista de permissões e renderizado como elementos React

_Data: 2026-11-19 · Situação: aceita_

**Contexto.** SVG pode carregar scripts, links, referências externas e estilos. A plataforma mostra milhares deles e os entrega para outros projetos.

**Decisão.** O catálogo aceita só um subconjunto: raiz fixa e formas simples com atributos de geometria. O leitor recusa qualquer outra coisa (não "limpa"). O app desenha a partir de nós já lidos, com `createElement`, nunca com `dangerouslySetInnerHTML`. O importador de SVGs de editores passa pelo SVGO e pelo mesmo leitor.

**Consequências.** Nenhum desenho do catálogo pode executar código no site nem nas exportações. Recursos como gradientes e máscaras não podem ser desenhados à mão (o Sólido usa uma máscara gerada pelo próprio código, não pelo arquivo).
