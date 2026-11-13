# Novo lançamento — Fase 2: motor financeiro

Relatório desta etapa. A continuação está descrita na [Fase 3](PHASE_3.md).

Base: `8b6a972c6a73c4f738dbda049cfc17ead1580341`. Branch exclusiva `codex/finly-navegacao-ux`. Esta fase entrega regras, persistência e leitura do novo motor; **não substitui ainda o modal antigo**. Cadastro e edição completos pelo novo formulário pertencem à Fase 5. Não há ativação automática do novo motor no primeiro acesso.

## Implementado

- Obrigações de despesa, receita e reembolso com liquidações independentes: valor, conta, data, método, nota e ID.
- Estados derivados: pendente, parcial, liquidado e cancelado. Total liquidado não pode exceder a obrigação; cancelamento exige saldo liquidado zero. Não há segunda cobrança ao registrar o restante.
- Estornos por eventos compensatórios vinculados, sem apagar o histórico; mesmo valor, conta e obrigação, sem estorno duplicado. Métodos/contas podem variar entre pagamentos legítimos.
- Faturas com pagamento parcial/total e estorno, separados das compras. Pagamento reduz dívida e a variação de caixa registrada, sem criar despesa adicional.
- Correções com ID, motivo, data, valor anterior e novo valor. Registro alterado após a prévia é recusado. Fatura com pagamentos exige confirmação explícita na API; pagamentos originais são preservados. A correção não pode tornar o total devido menor que o pagamento líquido. Cancelamento direto nessa situação é recusado.
- Transferências previstas/efetivadas entre contas próprias, sem receita/despesa. Efetivação é idempotente. A consulta de conta retorna somente **variação dos movimentos registrados**, nunca saldo bancário real.
- IDs de comandos/eventos fornecidos pelo chamador: repetir ID e conteúdo não duplica; reutilizar ID com outro conteúdo é recusado. Registros parecidos com IDs distintos podem ser legítimos; `possibleDuplicates` retorna aviso por tipo, descrição normalizada, data, valor e conta, sem bloquear automaticamente.
- Exclusão de operação com vínculo ou histórico é recusada; cancelamento/correção preservam rastreabilidade.

## Salário e competência

A previsão configurada permanece enquanto nenhum recebimento salarial identificado estiver confirmado. A partir do primeiro recebimento salarial líquido positivo, **o recebido substitui integralmente a referência daquela competência**, inclusive se parcial. O restante da previsão não é somado. Outros recebimentos permanecem adicionais. Estornar todo o salário recebido restaura a previsão.

A identificação é `salary: true` em uma operação de receita. Texto/categoria nunca identificam salário automaticamente. Receitas antigas continuam com o comportamento legado, pois não há informação segura para classificá-las retroativamente.

Projeções continuam por competência da obrigação; variações de caixa usam a data real de cada liquidação/transferência. Uma receita com competência novembro e recebimento em dezembro afeta a projeção da competência novembro e a variação de caixa de dezembro. Não são dois recebimentos.

Despesas registradas continuam comprometendo a projeção pelo valor devido, como no modelo anterior; a liquidação parcial informa o pagamento sem descontar a despesa novamente. Reembolso previsto entra somente no cenário condicional configurado, considerando **apenas o restante** depois dos recebimentos.

## Integração e persistência

Extensão opcional `State.entryLedger`, mantendo `version:2` externo e contrato `version:1` interno. Sem o campo, todos os cálculos e backups legados seguem o comportamento anterior. Contas, cartões, pagamentos ou datas antigas não são inventados.

`activateEntryLedger` exige a prévia íntegra da Fase 1 e as declarações explícitas de backup/consentimento, devolvendo cópia com coleções novas vazias. Não grava e não converte as transações legadas. A futura interface deve obter consentimento real e oferecer/verificar o backup antes de usar essa API. Persistência utiliza validação integral e o mecanismo existente de snapshot/compare-and-set. `persistEntryLedger` exige que o estado corresponda ao snapshot carregado, incrementa revisão e recusa concorrência/quota sem retornar um estado como salvo. A inicialização não materializa essa extensão automaticamente.

`validate` valida a extensão financeiramente quando presente e recusa colisão de identidade com registros legados e somas monetárias inseguras. Importação JSON e inicialização recusam dados inválidos. Exportação preserva o ledger inteiro; prévia mostra operações/transferências e a proteção de sobrescrita considera dados exclusivos do novo motor.

`metrics` combina transações antigas e operações novas sem copiar registros entre as coleções. Dashboard, barras mensais, orçamento e disponibilidade dos cofrinhos usam os novos totais. O simulador dos cofrinhos compara seu teto com a fatura agregada, incluindo o novo motor. A reserva protegida e os aportes não se tornam despesas.

A Home mostra o estado agregado das faturas, incluindo parcial. Na página Fatura, o seletor manual antigo continua referente somente ao cartão legado, com total legado; as faturas novas aparecem separadamente, com pagamentos derivados. Não se usa a quitação manual legada para quitar todos os cartões novos.

Em Lançamentos, Fatura e Reembolsos existe um histórico **somente leitura** do novo motor. As ações do formulário antigo continuam operando apenas no legado. Isso impede edição sem auditoria de pagamentos novos antes da Fase 5. Os filtros/CSV da lista antiga ainda cobrem somente suas transações; o JSON contém ambas as coleções. Os comandos novos são APIs TypeScript internas, sem formulário operacional de cadastro nesta fase.

## Arquivos

- `entry-system/finance.ts`: validação financeira, saldos de obrigações/faturas, projeção e variação registrada por conta.
- `entry-system/commands.ts`: criação idempotente, liquidações, transferências, cancelamento, correção e exclusão protegida.
- `entry-system/state.ts`: ativação consentida, persistência por snapshot e adaptação somente leitura para gráficos.
- `entry-system/LedgerActivity.tsx`: leitura das operações e histórico de liquidações.
- `contracts.ts`: confirmação da compra separada da quitação e referência de estorno de pagamento de fatura.
- `model.ts`, `backup.ts`, `BackupImport.tsx`, `FinanceApp.tsx`, `HomeOverview.tsx`, `planning/rules.ts`: integração e compatibilidade.
- `tests/check_entry_finance.mjs`, `tests/check_entry_finance_browser.py`, `tests/fixtures/entry-ledger.mjs` e GitHub Actions.

## Testes e evidências sintéticas

Todos os comandos abaixo passaram.

```sh
npm run check
npm run build
npm run test:static
node tests/check_entry_foundation.mjs
node tests/check_entry_finance.mjs
node tests/check_finance.mjs
node tests/check_backup.mjs
node tests/check_planning.mjs
node tests/check_entries.mjs
node tests/check_monthly_spending.mjs
python3 tests/check_public_release.py
python3 tests/check_entry_finance_browser.py
python3 tests/check_planning_browser.py
python3 tests/check_finance_browser.py
python3 tests/check_backup_browser.py
python3 tests/check_navigation_ux.py
python3 tests/check_home.py
python3 tests/check_entries_browser.py
python3 tests/check_startup.py
python3 tests/check_header.py
```

Testes novos cobrem ativação opt-in, imutabilidade do legado, pagamentos mistos/parciais/totais, estornos, recusa de excedente, repetição de eventos, salário identificado, transferências neutras, variações por conta, faturas parciais/pagas/corrigidas, exclusão com vínculos, avisos de duplicação, gráficos, backup e persistência atômica com quota/concorrência. Navegador testa importação explicitamente confirmada, indicadores, histórico novo, reload, exportação, três temas e larguras 1440/768/390, sem erros JavaScript e mantendo `saldoclaro-v1` intacta.

[Dashboard integrado](phase-2-evidence/dashboard.png) · [Histórico somente leitura](phase-2-evidence/activity.png)

Cenário: referência R$ 1.000, salário recebido R$ 400, extra recebido R$ 20, reembolso recebido R$ 5 → receita considerada R$ 425. Despesa R$ 100, cartão R$ 60, margem R$ 10 → projeção R$ 255. A fatura parcialmente paga continua sendo R$ 60 de compromisso; seu pagamento não cria outra despesa. O gráfico apresenta R$ 160 de gastos, sem transferências ou quitação.

## Limites e próximas fases

- Múltiplos cartões configuráveis, fechamento, juros, parcelamentos e recorrências: Fase 3.
- Interface de responsáveis/cronogramas e integração da nova compra com cofrinhos: Fase 4. A validação já recusa reembolsos vinculados acima do custo contratado, mas os fluxos de configuração ainda não existem.
- Modal com cinco abas, entrada de pagamentos, máscaras, erros por campo e correção guiada visual: Fase 5. Confirmações citadas nesta fase são exigências das APIs, não novos diálogos de cadastro.
- Anexos reais, IndexedDB, ZIP e integridade de binários: Fase 6.
- Acabamento e regressão integral dos novos fluxos de interface: Fase 7.

Não há sincronização bancária, inferência de datas/contas ou atribuição salarial retroativa. A fase preserva os dados existentes; não transforma todos os usuários automaticamente para um ledger novo.
