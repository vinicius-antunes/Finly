# Planejamentos e cofrinhos

Implementação exclusiva em `codex/finly-navegacao-ux`, a partir de `f3b44653bbaf7c2c11794553b700d23e57730a5b`. Sem novas dependências, serviços ou acesso bancário.

## Funcionalidades

- Vários objetivos com categoria personalizada, preço, contribuição mensal, data desejada e observações; criação e edição em formulário próprio.
- Aporte inicial somente com declaração de dinheiro separado. Zero inicial não cria movimentação. A configuração antiga `settings.goal` permanece intacta, sem converter projeções antigas em dinheiro reservado.
- Indicadores de objetivos ativos, saldo reservado de todos os cofrinhos, valor restante nas metas ativas e contribuições ainda aguardando confirmação no mês.
- Progresso e previsão condicional de meses/competência de conclusão. Meta atingida é uma apresentação derivada, sem concluir a compra automaticamente.
- Aportes extras, retiradas, contribuição mensal por valor normal ou diferente, adiamento e ignorar no mês. Nenhuma passagem de mês movimenta dinheiro.
- Histórico com IDs, data, competência, observação, tipo e saldo após cada registro. Desfazer cria compensação identificada; corrigir cria estorno + valor substituto atomicamente. Não apaga eventos. Saldo negativo é recusado, inclusive em estornos.
- Pausa, retomada, cancelamento e arquivamento. A confirmação explica que os fundos continuam reservados; a liberação exige retirada explícita. Compras concluídas podem ser arquivadas mantendo a identidade da conclusão e bloqueando nova criação.
- Simulação à vista (preço editável para desconto), parcelada e com entrada, com comparação das três modalidades, tabela de impacto por competência e gráfico Recharts/shadcn dos primeiros 12 meses.
- Confirmação de compra exibe modalidade, total, valor usado do cofrinho e saldo restante. Checkbox separado autoriza criar lançamentos. Sem essa autorização, apenas o objetivo/histórico são atualizados e a interface avisa que a projeção não inclui a compra.
- Compra com lançamentos gera despesa de entrada e parcelas confirmadas vinculadas por IDs, grupo existente do modelo e nota do objetivo. À vista gera uma despesa. Confirmação repetida ou estado desatualizado é recusado.

## Integração financeira

Todos os valores persistidos são centavos inteiros; juros são parâmetros percentuais da simulação, com resultados arredondados em centavos.

`metrics().available` não foi alterado. Para cada competência:

```
alocação líquida = soma dos aportes − retiradas de todos os cofrinhos nessa competência
disponibilidade livre estimada = saldo projetado original − alocação líquida
```

O saldo histórico continua pertencendo ao objetivo, mas não vira uma obrigação repetida nos meses seguintes. Retiradas liberam a alocação na competência informada. O saldo do cofrinho é controlado na ordem de registro; datas são informativas e competências determinam a alocação. Operações retroativas alteram a estimativa da competência escolhida, sem reordenar/destruir o histórico.

Exemplo: projeção de R$ 500, aporte de R$ 200 → livre estimado R$ 300. No mês seguinte o saldo reservado continua R$ 200, mas não se desconta novamente. Um segundo objetivo recebe sua própria movimentação, e sua alocação é somada, sem reutilizar o mesmo saldo como livre.

Aportes não geram despesas nem usam a reserva protegida. Na compra, retirar a entrada do cofrinho libera sua alocação e o lançamento correspondente registra o gasto: esses efeitos se compensam na parcela já reservada, evitando desconto duplo. Valores históricos liberados são sinalizados na competência da retirada; a estimativa nunca é apresentada como saldo bancário. Projeção negativa não impede uma declaração manual de fundos reais, pois o Finly não conhece os saldos bancários.

O impacto usa compromissos registrados, margem e receitas/reembolsos conforme `metrics`, além das alocações do mês. O teto compara o total das compras de cartão já registradas naquela competência com a parcela nova, incluindo previsões existentes.

## Compatibilidade e segurança

Extensão aditiva opcional `State.planning = {version: 1, goals: [...]}` dentro do v2. Estados antigos sem esse campo são lidos como coleção vazia, sem regravação automática. O campo é materializado somente ao salvar um planejamento. Transações, IDs, configurações, faturas e migração anteriores são preservados.

Validação inclui IDs únicos de objetivos/movimentações, centavos seguros, histórico sem saldo negativo, estornos únicos vinculados a eventos anteriores, competências, situações e contribuições confirmadas ligadas ao histórico. Dados inválidos são recusados por load/save/importação, sem substituir a chave corrompida. Exportação JSON preserva a extensão inteira; a prévia de importação mostra a quantidade de planejamentos, e a proteção contra sobrescrita considera cofrinhos mesmo sem lançamentos comuns. A chave `saldoclaro-v1` continua intacta.

## Estrutura

`src/finance/planning/`:

- `data.ts`: tipos e validação do histórico.
- `rules.ts`: saldo, alocação por competência, mensalidade idempotente, estornos, prazo, simulação e compra.
- `PlanningPage.tsx`: indicadores, grade, filtros históricos e estados.
- `GoalForm.tsx`: criação/edição do objetivo.
- `Movements.tsx`: aportes, retiradas, correções e histórico.
- `Simulator.tsx`: modalidades, comparação e confirmação separada.
- `SimulationChart.tsx`: impacto hipotético versus compromissos registrados.

Integração pequena em `FinanceApp.tsx`; extensão validada em `model.ts`; proteção/prévia em `backup.ts` e `BackupImport.tsx`; estilos exclusivos em `styles.css`. Testes novos `check_planning.mjs` e `check_planning_browser.py`; seletores/fluxo de simulação ajustados nas regressões de navegação e finanças. Teste unitário adicionado ao GitHub Actions.

## Demonstração e evidências sintéticas

[Objetivos desktop](evidence/goals-desktop.png) · [Histórico e simulação](evidence/simulation-desktop.png) · [Graphite mobile](evidence/graphite-mobile.png) · [Escuro mobile](evidence/dark-mobile.png) · [Claro mobile](evidence/light-mobile.png)

Fluxo testado: criar objetivo com R$ 200 confirmados e outro sem aporte; confirmar R$ 150 no mês; recusar confirmação repetida e retirada de R$ 400; retirar R$ 50 e estornar; comparar à vista, juros e entrada; autorizar separadamente os lançamentos de uma compra; verificar IDs e recarregar. Adiar contribuição do outro objetivo, pausar/retomar e exportar/restaurar backup mantendo os históricos.

## Testes

Todos os comandos abaixo passaram.

```sh
npm run check
npm run build
npm run test:static
node tests/check_planning.mjs
node tests/check_finance.mjs
node tests/check_backup.mjs
node tests/check_entries.mjs
node tests/check_monthly_spending.mjs
python3 tests/check_public_release.py
python3 tests/check_planning_browser.py
python3 tests/check_navigation_ux.py
python3 tests/check_finance_browser.py
python3 tests/check_backup_browser.py
python3 tests/check_entries_browser.py
python3 tests/check_startup.py
python3 tests/check_header.py
python3 tests/check_home.py
```

Unitários cobrem compatibilidade v2 antiga, inicialização recusando histórico corrompido sem sobrescrever, múltiplos objetivos, mensalidade sem duplicidade, retiradas/estorno/correção, prazo, alocação por competência, reserva independente, estados históricos, simulação imutável, juros, teto agregado, compra à vista e financiada, conclusão sem lançamentos, duplicação recusada e roundtrip de backup. Chromium cobre fluxos reais e três temas em 1440/768/390 px, sem rolagem horizontal e sem erros JavaScript. Regressões monetárias, de armazenamento, backup, navegação e outras abas foram preservadas.

## Limites explícitos

- Juros simples mensais sobre o principal, sem CET, tarifas, amortização Price ou consulta a ofertas reais. Parcelas iguais são arredondadas para cima; o total efetivo e a diferença de juros/arredondamento aparecem antes da confirmação.
- Adiar retira a cobrança planejada daquela competência; o mês seguinte mantém a contribuição base, sem acumular automaticamente uma cobrança extra.
- Prazo é condicional às contribuições futuras; a data desejada é referência informada, sem promessa de rendimento ou disponibilidade.
- O gráfico limita-se às primeiras 12 competências; a tabela apresenta todas as parcelas (máximo 120).
- Uso ligado a compra concluída não pode ser estornado isoladamente pelo histórico do cofrinho. Correções dos lançamentos correspondentes permanecem nas abas financeiras, preservando o vínculo histórico e a trava contra recriação automática.
- Não há sincronização bancária, transferências bancárias automáticas, rendimento de cofrinhos ou comprovação de que o dinheiro existe na instituição. As confirmações são declarações manuais do usuário.
- Validação visual automatizada em Chromium, sem teste em aparelho físico.
