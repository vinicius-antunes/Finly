# Melhoria 04 — Parcelas e recorrências

## Organização

A página possui duas subabas, Parcelamentos e Recorrências, com indicadores, pesquisa, situação, filtro opcional pelo mês e estados vazios próprios. Por padrão são mostrados todos os períodos. Ao filtrar pelo mês, o contrato inteiro continua visível quando contém uma ocorrência nesse mês. Indicadores informam seu alcance e independem da pesquisa/situação.

Compras parceladas têm cards expansíveis, categoria/cartão/responsabilidade quando disponíveis, valor contratado, parcelas uniformes ou personalizadas, progresso, situação, vínculos, lista de parcelas, entrada, diferença contratual, reembolsos, comprovantes, revisões, correções e pagamentos de fatura. A lista vira blocos rotulados no celular. Menus preservam os controles de edição/cancelamento e oferecem consulta de detalhes/histórico/comprovantes. Compras à vista sem parcelas permanecem em Lançamentos/Planejamentos, sem serem apresentadas como parcelamentos.

Recorrências têm valor, tipo de movimentação, categoria, origem, frequência, situação atual, término e próxima ocorrência **já gerada**. A expansão reúne controles existentes e histórico. Pausar, retomar, cancelar, alterar uma ocorrência ou as próximas e gerar previsões continuam explícitos. Não há geração por navegação nem pagamento automático. Os botões de cadastro iniciam o formulário em Cartão/Parcelado ou Despesa/Recorrente, conforme a subaba.

Grupos antigos aparecem na mesma apresentação, com limitação discreta de classificação/pagamento, e preservam as ações anteriores. Não se presume assinatura nem contrato quando a origem não permite distinguir. Grupos incertos ficam acessíveis na subaba Parcelamentos pelo filtro Todas/Classificação incerta. Não há migração ou materialização de novos contratos.

## Indicadores e pagamentos

- Compras ativas e parcelas restantes: todos os contratos parcelados identificados, excluindo compras canceladas; não são totais mensais. Restantes incluem parcelas cuja quitação individual não pode ser determinada.
- Total pendente: parcelas restantes dos contratos ativos, **sem entrada**. Pagamentos individuais seguem `settled`; cartão segue `invoiceBalance`. Uma fatura inteiramente paga quita suas parcelas para apresentação; confirmação da compra não significa pagamento.
- Uma fatura parcial compartilhada não tem rateio por parcela. O card sinaliza valor individual indeterminado. O total agregado usa limites exatos: mínimo `max(0, subtotal - pago da fatura)` e máximo `min(subtotal, restante da fatura)`. Se todas as parcelas da fatura pertencem ao conjunto ativo, os limites coincidem e o total é exato. Nenhum rateio financeiro foi criado ou persistido.
- Antigos ficam fora dos indicadores contratuais, pois não há pagamento individual verificável. Seus valores e registros continuam consultáveis.
- Recorrências ativas: situação atual. Despesas/receitas e quantidade no mês: ocorrências já geradas, não canceladas, no mês global. Valores de receita/reembolso são separados dos de despesa/cartão. Previsões não são pagamentos.

## Arquivos e preservação

- `src/finance/InstallmentsWorkspace.tsx` e `installments.css`: tela unificada e apresentação responsiva/acessível, usando Button e Lucide existentes.
- `src/finance/installment-summary.ts`: projeções de leitura com regras já existentes; não grava nem altera o motor.
- `FinanceApp.tsx`: remove os quatro blocos independentes e conecta navegação, edição e exclusão legada com a mesma confirmação e validação existentes.
- `OperationsManager.tsx`: aceita IDs opcionais para renderizar controles de um único contrato/recorrência, conservando comandos e proteções.
- `EntryComposer.tsx`: modo inicial contextual opcional, sem alterar campos, validações ou contratos financeiros.
- Testes dedicados e seletores de testes de integração/gerenciamento atualizados à nova organização.

Não foram adicionadas bibliotecas, regras de exclusão, migrações ou alterações nos backups/armazenamento. Melhorias 01–03 preservadas. Nenhuma branch além de `codex/finly-navegacao-ux` deve receber alterações; sem PR ou merge.

## Verificação

Aprovados: TypeScript, build de produção, test:static e check_public_release.py. As 12 regressões Node de backup, crédito, lançamentos, fundamentos, interface financeira, domínio, integração, gráfico mensal, planejamento, comprovantes e reembolsos passaram.

`check_installment_summary.mjs` verifica imutabilidade, confirmação sem pagamento, pagamento parcial agregado, fatura concluída e parcela cancelada. As regressões de crédito/interface já cobrem parcelas uniformes e personalizadas, entrada/juros, contratos pagos/cancelados, reembolsos e idempotência; não foram alteradas suas regras para esta tela.

`check_installments_workspace.py` verifica bases vazia/legada/nova/mista, as duas subabas, busca, situação, expansão, edição, cadastro contextual e igualdade literal do estado salvo ao navegar. Exercita os três temas em 1440, 768 e 390 px, sem rolagem horizontal ou erros de página.

`check_credit_browser.py` valida restauração de backup, consulta de contratos/recorrências/cartões, exportação equivalente, recarga e legado intacto. `check_entry_ui_management.py` valida edição por escopo, alterações auditadas, duplicação independente, falha de quota, concorrência, pagamentos/estornos e pausa/retomada/cancelamento pela interface reorganizada.

`check_integration_browser.py` também passou, incluindo fatura paga/correção, reembolsos parciais, recorrências, cofrinhos, entrada/juros e parcelas personalizadas nas jornadas completas.

Somente dados sintéticos. Ensaios em Chromium de desktop com viewport móvel; não equivalem a testes físicos em todos os navegadores.

## Evidências

| Tema | Parcelamentos | Recorrências |
|---|---|---|
| Graphite Green | [desktop](improvement-04-evidence/graphite-1440-Parcelamentos.png) · [mobile](improvement-04-evidence/graphite-390-Parcelamentos.png) | [desktop](improvement-04-evidence/graphite-1440-Recorrências.png) · [mobile](improvement-04-evidence/graphite-390-Recorrências.png) |
| Escuro | [desktop](improvement-04-evidence/dark-1440-Parcelamentos.png) · [mobile](improvement-04-evidence/dark-390-Parcelamentos.png) | [desktop](improvement-04-evidence/dark-1440-Recorrências.png) · [mobile](improvement-04-evidence/dark-390-Recorrências.png) |
| Claro | [desktop](improvement-04-evidence/light-1440-Parcelamentos.png) · [mobile](improvement-04-evidence/light-390-Parcelamentos.png) | [desktop](improvement-04-evidence/light-1440-Recorrências.png) · [mobile](improvement-04-evidence/light-390-Recorrências.png) |
