# Visão Geral — dashboard executivo

Trabalho exclusivo em `codex/finly-navegacao-ux`, partindo de
`32c94e6d8495dc3401622df4e01adef013ac5077`. `main` e `Finly-React`
preservadas. Sem novas dependências.

## Organização

O cabeçalho da Home mantém identificação, armazenamento local, sino, competência
 e menu Novo lançamento. Remove o texto redundante e usa “Resumo das suas
finanças”. As alterações de espaçamento do cabeçalho são restritas à Home.

Três linhas:

1. Saldo projetado, reserva protegida e barras dos últimos seis meses.
2. Fatura, despesas fora do cartão, entradas recebidas e reembolsos a receber,
   com atalhos para as páginas correspondentes.
3. Comprometimento do orçamento e até quatro tipos de avisos dinâmicos.
   Os avisos resumem quantidades/situações, sem listar cada transação. Sem avisos,
   o painel informa “Tudo em dia”.

Saíram **somente da Home**: registros recentes, listas da fatura, despesas e
reembolsos, compromissos futuros, gráficos secundários de distribuição e
recebimentos e bloco promocional de planejamento. As operações continuam em
Lançamentos, Fatura, Parcelas e recorrências, Reembolsos e Planejamentos.
Componentes compartilhados foram preservados; apenas seus imports/renderizações
na Home foram removidos.

Pendências sem competência continuam no estado original, com os mesmos controles
de atribuição/descarte na Fatura. “Atenção do mês” mostra sua quantidade e oferece
atalho direto à página. Não houve descarte ou classificação automática.

## Cálculos

Projeção, reserva, quatro indicadores e orçamento continuam usando `metrics` e
os campos existentes. Comprometimento é fatura + despesas fora do cartão + margem;
o percentual usa os recursos considerados pela projeção, com reserva excluída.
Pagamentos de fatura não geram outra despesa. Recebimentos previstos continuam
sob a configuração existente. O percentual textual pode superar 100%; a barra
visual é limitada a 100%, sem ocultar o percentual real.

A agregação isolada `monthlySpending` é somente leitura e gera seis pontos para
as competências terminando no mês selecionado, inclusive na virada do ano:

- Soma `amountCents` das despesas fora do cartão registradas, incluindo pendentes.
  É a mesma interpretação de despesa registrada usada por `metrics.cash`.
- Soma apenas compras de cartão com `confirmed === true`, pelo valor da parcela
  já atribuído àquela competência. Não multiplica parcelas nem recria as ausentes.
- Ignora receitas, reembolsos, pagamento/estado da fatura e vínculos de reembolso.
- Meses sem registros têm zero na série, sem criar lançamentos.

A fatura/projeção existente inclui compras previstas; as barras representam
somente compras confirmadas. Por isso podem diferir. No cenário sintético de
novembro, a fatura é R$ 35,00 (R$ 25,00 confirmados + R$ 10,00 previstos), enquanto
os gastos da barra são R$ 125,00 (R$ 25,00 confirmados + R$ 100,00 fora do cartão).
Reembolsos não reduzem nem aumentam a barra de gastos brutos.

## Gráfico e acessibilidade

Recharts e primitivas shadcn/ui existentes: BarChart, Bar, CartesianGrid, XAxis,
ChartContainer, ChartTooltip, ChartTooltipContent e ChartConfig. Uma métrica,
sem empilhamento ou seletores adicionais. Altura fixa de 110 px, cantos
arredondados, gradiente discreto usando tokens do tema e tooltip com mês/ano em
português e valor em reais. Dados também disponíveis no controle “Valores do
gráfico”, acessível por teclado. Carregamento lazy e animação desativada com
movimento reduzido. Contenção horizontal impede que o redimensionamento
assíncrono do SVG gere rolagem lateral.

## Evidências e proporções

- [Antes, desktop](evidence/before-desktop.png)
- [Depois, Graphite desktop](evidence/Graphite-1440.png)
- [Depois, Graphite mobile](evidence/Graphite-390.png)
- [Escuro desktop](evidence/Escuro-1440.png)
- [Claro desktop](evidence/Claro-1440.png)
- [Gráfico e tooltip](evidence/chart-tooltip-desktop.png)
- [Instalação vazia](evidence/empty-mobile.png)
- [Medições de layout](layout.json)

A captura anterior de 1440 px tem 2691 px de altura. A nova captura full-page em
1440 × 1000 permanece em 1000 px; o conteúdo principal termina em 782 px. Em
1366 × 768 há pequena rolagem vertical; em tablet e celular há rolagem natural,
sem redução artificial da interface. Nenhuma das quatro larguras testadas
(1440, 1366, 768 e 390) apresentou rolagem horizontal. As capturas usam somente
dados sintéticos. O cenário mantém os mesmos valores do mês anterior e acrescenta
dois registros históricos sintéticos para demonstrar barras em meses distintos.

## Testes

Todos os comandos abaixo passaram.

```sh
npm run check
npm run build
npm run test:static
node tests/check_finance.mjs
node tests/check_backup.mjs
node tests/check_entries.mjs
node tests/check_monthly_spending.mjs
python3 tests/check_public_release.py
python3 tests/check_home.py
python3 tests/check_navigation_ux.py
python3 tests/check_backup_browser.py
python3 tests/check_finance_browser.py
python3 tests/check_entries_browser.py
python3 tests/check_startup.py
python3 tests/check_header.py
```

Testes unitários cobrem seis competências, virada dezembro/janeiro, zeros,
parcelas por competência, previstas/confirmadas, exclusão de receitas e
reembolsos e imutabilidade. A suíte Home mantém verificações financeiras e
exercita os atalhos para fatura, reembolsos, lançamentos, ajustes e pendências,
três temas, quatro larguras, alteração de competência e estados vazios.
As ações antes feitas nas listas da Home agora são testadas nas páginas de
destino. Regressões cobrem persistência/reload, regras monetárias, backup,
importação, navegação, Sidebar, toasts e notificações. O teste unitário novo foi
adicionado ao GitHub Actions. Validação visual em Chromium automatizado, sem
ensaio em aparelho físico.

## Arquivos alterados

- `src/finance/HomeOverview.tsx`: nova composição executiva.
- `src/finance/MonthlySpendingChart.tsx`: gráfico lazy e alternativa textual.
- `src/finance/monthlySpending.ts`: agregação isolada em centavos.
- `src/finance/FinanceApp.tsx`: integração e remoção de blocos da Home.
- `src/styles.css`: layout responsivo e estilos restritos ao dashboard.
- `tests/check_home.py`, `tests/check_monthly_spending.mjs`, workflow, README e
  documentação/evidências.

Nenhuma mudança em `model.ts`, `storage.ts`, `backup.ts`, `BackupImport.tsx`,
componentes de Sidebar/notificações ou artefatos legados.
