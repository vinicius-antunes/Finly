# Home React baseada na main

Referência lida diretamente de `origin/main:index.html`, commit `c5e9ae6`. Implementação exclusivamente em `Finly-React`, sobre `9117490`. Nenhum checkout, commit ou merge na main.

## Comparação estrutural

|Home da main|Home React Graphite Green|
|---|---|
|Cabeçalho: título, contexto, competência anterior/próxima, novo lançamento|Mesma organização, com competência e cadastro no grupo de ações do cabeçalho|
|Barra superior com notificações e armazenamento local|Preservada com indicador discreto; abertura real das notificações existentes|
|Mais clareza hoje / Mais possibilidades amanhã|Introdução compacta e competência contextual com Text Morph|
|Saldo à esquerda e reserva à direita|Grid 1,8:1 no desktop, adaptável no tablet e empilhado no celular|
|Saldo com referência mensal, margem e acesso aos lançamentos|Mesmas informações e ação React, incluindo aviso de projeção|
|Reserva informada e acesso aos ajustes|Reserva separada da projeção e botão que abre Ajustes|
|Quatro indicadores horizontais|Fatura/previsões, despesas, entradas recebidas e reembolsos a receber, com ícones e descrições|
|Orçamento e atividade lado a lado|Comprometimento, legenda cartão/despesas/margem e últimos quatro registros em ordem de cadastro|
|Compromissos e recebimentos|Fatura com status editável, vencimento, nome do cartão, compras de terceiros/responsável indefinido|
|Despesas e reembolsos|Listas do período com confirmação/desfazer e explicação de recebimentos pendentes|
|Pendências sem competência|Mantidas com atribuição/descarte existentes e confirmação; não entram na fatura antes de atribuir|
|Convite ao planejamento|Abre o planejamento funcional existente, sem registrar uma compra|
|Sem gráficos React na referência|Donut e Tremor existentes preservados numa seção complementar após os compromissos|

Não foi copiado o HTML nem o CSS integral da main. Os componentes são React/TypeScript, com superfícies Graphite, verde em detalhes e valores, fonte Plus Jakarta Sans, bordas arredondadas e Magic Bento. A identidade azul/roxa da referência não foi importada. Light Rays permanece global e nenhuma grande superfície neon foi introduzida.

## Aparência

Os controles de temas e Efeitos de luz saíram da Home funcional e ficam em **Ajustes e backup → Aparência**. A preferência de tema continua usando a chave visual existente; os efeitos seguem sendo uma escolha da sessão. A prévia de ativação anterior ao v2 continua independente da Home funcional.

## Cálculos e dados

`src/finance/model.ts` e `storage.ts` permanecem byte a byte iguais à base. `HomeOverview` usa `metrics` existente e seleciona os registros para apresentação; não cria outro cálculo de saldo ou armazenamento. Fatura paga continua sem duplicação de despesa; confirmações de despesas/reembolsos usam o mesmo callback da aplicação.

A suíte de domínio foi executada também com a função `metrics` extraída diretamente da main, via `FINLY_REFERENCE=/tmp/finly-main-reference.html`. Os resultados coincidiram. Na fixture de navegador: salário R$ 2.000, entradas recebidas R$ 300, fatura R$ 35, despesas R$ 100 e margem R$ 200 produzem **R$ 1.965 de projeção**; reserva R$ 500 separada. Confirmar R$ 25 de reembolso muda a projeção para R$ 1.990; desfazer restaura o valor. São dados inteiramente sintéticos.

## Evidências completas

|Comparação|Desktop|Celular|
|---|---|---|
|Main escura, referência|[Captura](home-evidence/main-dark-1440.png)|[Captura](home-evidence/main-dark-390.png)|
|React Graphite Green|[Captura](home-evidence/Graphite-1440.png)|[Captura](home-evidence/Graphite-390.png)|
|React Escuro Padrão|[Captura](home-evidence/Escuro-1440.png)|[Captura](home-evidence/Escuro-390.png)|
|Main clara, referência|[Captura](home-evidence/main-light-1440.png)|[Captura](home-evidence/main-light-390.png)|
|React Claro|[Captura](home-evidence/Claro-1440.png)|[Captura](home-evidence/Claro-390.png)|

[Instalação vazia no celular](home-evidence/empty-mobile.png). As imagens são páginas inteiras, incluindo conteúdo abaixo da dobra. Referência e React usam a mesma fixture; os registros são inseridos apenas nos contextos descartáveis dos testes.

## Arquivos e testes

- `src/finance/HomeOverview.tsx`: composição da Home, listas, indicadores e callbacks reais.
- `src/finance/FinanceApp.tsx`: integra a Home, organiza cabeçalho e move Aparência para Ajustes.
- `src/styles.css`: grids, responsividade, hierarquia e adaptação aos temas.
- `tests/check_home.py`: valores, estrutura, ações, vazio, temas, viewports e capturas.
- `tests/check_finance.mjs`: permite comparar também a função original da main.
- `tests/check_finance_browser.py`: navega para Ajustes ao testar temas, preservando os casos financeiros anteriores.

Comandos de validação:

```sh
npm run check
npm run build
npm run test:static
node tests/check_finance.mjs
FINLY_REFERENCE=/tmp/finly-main-reference.html node tests/check_finance.mjs
python3 tests/check_home.py
python3 tests/check_finance_browser.py
python3 tests/check_public_release.py
```

A captura da main é opcional no teste: preparar `/tmp/finly-main-home/index.html` e seus `assets/aurora.css`/`assets/theme.js` via `git show origin/main:...`; não é necessário mudar de branch. O teste principal da Home sempre roda sobre o build de produção React.

Cobertura: valores, status de fatura sem criar registros, recebimento/desfazer, mês anterior/próximo, links para lançamentos/ajustes/planejamento, notificações, temas/efeitos em Ajustes, layouts 1440/1366/768/390, proporções dos cartões, ausência de rolagem horizontal, instalação vazia, dados financeiros inalterados durante navegação/troca visual e chave v1 preservada. A regressão financeira inclui criação, edição, exclusão, parcelas, grupos, backup/restauração e falhas de armazenamento.

**Resultado:** todos os comandos acima passaram. Build sem erros ou aviso de chunk maior que 500 kB. A comparação Git confirmou modelo, persistência e `public/legacy/` sem alterações. A main foi usada somente como referência de leitura. Capturas e testes foram feitos localmente sobre o build; não confirmam a publicação do Cloudflare.
