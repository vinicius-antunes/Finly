# Equilíbrio dos cartões financeiros

Alteração exclusivamente visual em `src/styles.css`, sobre a base `cd9fd61`, na branch `Finly-React`.

Receitas usa agora `var(--card)`, como os demais cartões: grafite nos temas escuros e superfície clara no tema Claro. O valor mantém `var(--primary)`, enquanto rótulo e descrição usam o texto secundário do tema. A borda mistura apenas 22% da cor primária com a borda neutra. A dimensão de duas colunas/duas linhas e o número maior continuam destacando receitas.

O Magic Bento permanece ativo: a opacidade máxima da iluminação interna caiu de 12% para 8%, e a borda de hover de 70% para 45%, em todos os indicadores. Despesas/cartão mantêm valores neutros; receitas/reembolsos usam o destaque positivo. Não há nova grande superfície saturada, alteração de layout ou nova biblioteca. Light Rays global, navegação e código financeiro permanecem intactos.

## Capturas comparáveis

Mesma fixture sintética (receita de R$ 1.000 e despesa de R$ 260), fontes carregadas, viewports de 1440 × 1000 e 390 × 844. Recorte real do grid no Chromium; nenhuma informação financeira pessoal.

|Tema|Antes desktop|Depois desktop|Antes mobile|Depois mobile|
|---|---|---|---|---|
|Graphite Green|[Antes](card-balance/before-graphite-desktop.png)|[Depois](card-balance/after-graphite-desktop.png)|[Antes](card-balance/before-graphite-mobile.png)|[Depois](card-balance/after-graphite-mobile.png)|
|Escuro Padrão|[Antes](card-balance/before-dark-desktop.png)|[Depois](card-balance/after-dark-desktop.png)|[Antes](card-balance/before-dark-mobile.png)|[Depois](card-balance/after-dark-mobile.png)|
|Claro|[Antes](card-balance/before-light-desktop.png)|[Depois](card-balance/after-light-desktop.png)|[Antes](card-balance/before-light-mobile.png)|[Depois](card-balance/after-light-mobile.png)|

## Validação

Todos passaram:

```sh
npm run check
npm run build
npm run test:static
python3 tests/check_react_visual.py
python3 tests/check_public_release.py
```

A regressão de interface verifica os três temas, contraste mínimo de 4,5:1 dos pares de tokens usados no texto, valores financeiros invariantes, viewports 1440/1366/768/390 sem rolagem horizontal, hover Bento, Light Rays/checkbox, movimento reduzido, touch, armazenamento indisponível/inválido e integridade do legado. As capturas confirmam a leitura dos números e a mesma composição assimétrica. O hover ficou mais suave sem remover seu comportamento.

Sem alterações na main, armazenamento, lógica financeira, dependências ou funcionalidades.
