# Novo lançamento — Fase 4: acordos de reembolso e Planejamentos

Base remota conferida: `047804ff3f88037a05d2bd8e928fa99988c9ed03`, entrega da Fase 3 na branch `codex/finly-navegacao-ux`. Os relatórios PHASE_1, PHASE_2 e PHASE_3 foram revisados, e suas suítes financeiras foram executadas novamente antes da integração. Nenhuma alteração em `main` ou `Finly-React`, nem merge automático.

## Implementação

APIs internas e consultas integradas; o formulário operacional definitivo continua na Fase 5. Não há ativação, migração ou alteração de armazenamento no primeiro acesso.

- Compra pessoal, para outra pessoa ou compartilhada: campo opcional `Purchase.responsibility`. Pessoal não admite obrigações de reembolso ativas vinculadas. Compras nunca geram acordos automaticamente.
- `LedgerDraft.agreements` opcional, mantendo versão interna 1 e estado externo `version:2`. Backups anteriores não precisam materializar a coleção.
- Cada acordo tem ID, origem explícita (`purchase`/`standalone`), compra opcional, identidade estável do responsável, rótulo opcional, descrição, nota, modalidade, valor contratado e cronograma. `personLabel: ""` significa identificação pendente; nenhum nome é inventado. A identidade fornecida pelo chamador não depende do nome.
- Uma compra pode ter vários acordos, inclusive pessoas diferentes. Cada obrigação de cronograma tem exatamente um claim e um acordo, com IDs exclusivos. O acordo agrega os recebimentos e saldos individuais.
- Modalidades `single`, `installments`, `custom`. Total declarado deve ser exatamente a soma de centavos positivos do cronograma. Datas previstas são opcionais; competência é obrigatória. Até 120 previsões por acordo. `installmentSchedule` copia as competências/vencimentos conhecidos das parcelas, divide igualmente e deixa todos os centavos restantes no último valor; o namespace de IDs é o do acordo, permitindo várias pessoas na mesma compra. Entrada não cria uma segunda previsão de reembolso. Custom permite meses independentes da compra.
- `registerPurchaseAgreements` compõe postagem de compra e acordos sem mutar o original; falha não devolve resultado parcial. O chamador persiste somente o resultado completo.

## Dinheiro recebido, limites e projeções

As previsões são as próprias operações `reimbursement` já utilizadas pelo motor da Fase 2, e os claims ligam cada uma ao acordo/responsável/compra. Não existe uma segunda fonte monetária nos acordos.

`receiveAgreement` exige a obrigação correta e reutiliza `recordSettlement`: ID, centavos, data efetiva, conta de destino, método e nota. Diferentes contas e meses são aceitos. O responsável é rastreável pelo claim e acordo; suas alterações ficam nos eventos com termos anteriores. Previsão/data vencida não cria pagamento. Cada recebimento se destina a uma obrigação; um valor que cobre várias previsões deve ser distribuído explicitamente em eventos distintos.

O teto é **`Purchase.contractedCents` vigente**, incluindo juros contratados e entrada uma única vez. Ele já corresponde à soma entrada + parcelas; não se soma novamente o preço. A soma de todos os claims ativos, antigos ou novos, vinculados à compra não pode exceder esse teto. Extras precisam de uma receita independente. Uma liquidação nunca ultrapassa sua obrigação. Qualquer soma monetária insegura é recusada.

`agreementBalance` deriva previsto, pendente, parcialmente recebido, totalmente recebido e cancelado das operações e liquidações, com data de consulta explícita. Zero recebido com todas as datas futuras é previsto; data ausente/vencida é pendente. Saldo parcial é valor ativo menos recebimentos líquidos. Valores cancelados são expostos separadamente (incluindo previsões aposentadas por renegociação).

Projeções, salário, transferências e variações de caixa continuam usando o motor existente: somente saldo pendente entra na projeção condicional; dinheiro recebido entra uma vez. Competência da obrigação e mês efetivo do recebimento continuam distintos, conforme Fase 2. Quitação da fatura não recebe reembolso; recebimento não quita fatura.

## Correções e cancelamentos

- Prévia carrega snapshot completo; mudança no estado invalida a confirmação. Exige ID, data, motivo e confirmação. Histórico com recebimentos exige reconhecimento adicional, inclusive quando todos foram estornados.
- Eventos guardam termos anteriores e novos: pessoa, total, cronograma, datas, descrição e nota. Operações e pagamentos históricos não são excluídos. IDs antigos continuam em `operationIds`; linhas retiradas são canceladas. Linhas novas recebem novas identidades.
- Reduzir valor abaixo do recebido ou retirar uma previsão com saldo recebido é recusado. Primeiro é necessário regularizar explicitamente os recebimentos. Renegociação não transfere silenciosamente um recebimento entre obrigações.
- Estornos são eventos compensatórios da Fase 2 e exigem confirmação no comando do acordo. Só é permitido estornar uma vez, com valor, obrigação e conta do original. Não se apagam pagamentos.
- Cancelar acordo exige confirmação e saldo recebido líquido zero; eventos ficam preservados. Cancelamento genérico de operação vinculada é recusado para não contornar o comando auditado.
- Prévia de alteração das parcelas identifica claims vinculados. Aplicação exige decisão explícita de preservar os acordos; nunca redistribui cronogramas automaticamente. Se o novo teto for insuficiente, ajustar os acordos antes. Faturas com pagamentos preservam as proteções anteriores.
- Cancelar compra com claims ativos exige regularização/cancelamento explícito desses claims. Pagamentos da compra/fatura continuam protegidos.

## Planejamentos e atomicidade

`planning/entry-purchase.ts` reutiliza Goal, Movement, balance, validação e persistência existentes. Prévia informa reserva atual, uso solicitado, saldo restante e total contratado. Abrir, simular e selecionar pagamento não altera estado.

`confirmPlannedPurchase` exige confirmação explícita e snapshot atual; registra compra à vista (`registerCashPurchase`) ou contrato de cartão com entrada/parcelas (`registerPurchase`). Compra à vista gera uma despesa, com liquidação somente se confirmada; a retirada do cofrinho não cria receita, despesa ou segunda compra.

O uso gera Movement negativo `purchase: true`, com ID determinístico e `ledgerPurchaseId`. Goal preserva aportes e recebe `ledgerPurchaseId`, `completionKey` e `purchaseIds: []` (marcador de conclusão compatível com as proteções antigas). Purchase recebe `goalId` e `planningCompletionKey`; este marcador distingue vínculos novos de dicas opcionais aceitas em contratos anteriores. Claims antigos não são convertidos nem passam a exigir a unicidade dos novos acordos. A conclusão é idempotente e os vínculos são validados nos dois sentidos. Objetivo concluído pelo sistema antigo, inclusive com `purchaseIds: []`, não pode gerar nova compra pelo motor. O fluxo antigo também recusa objetivos concluídos pelo novo comando.

A movimentação é interna, limitada à reserva do objetivo e ao custo; nunca altera `settings.reserve`. O saldo não fica negativo. Conclusão não acontece ao atingir a meta. A consulta do objetivo mostra o ID e um link para contratos. Arquivar não recria compra nem parcelas. Cancelar compra não devolve automaticamente dinheiro à reserva e mantém o vínculo/histórico.

`persistPlannedPurchase` valida o estado completo e faz **uma única gravação compare-and-set em `finly-v2`**, com incremento de revisão. Compra e objetivo são gravados no mesmo JSON; quota ou concorrência lança erro sem devolver resultado como salvo. Repetição mantém o mesmo resultado, verificando o snapshot. A chave `saldoclaro-v1` não é tocada. APIs puras não gravam por conta própria.

## Arquivos e compatibilidade

- `entry-system/reimbursements/{contracts,validation,commands,AgreementActivity}`: contratos, validação, acordos, consultas e histórico.
- `entry-system/cash-purchase.ts`: compra à vista atômica pelo mesmo ledger.
- Contratos, schema, validação financeira, compras e comandos existentes: extensão opcional e proteção de vínculos.
- `planning/{entry-purchase,entry-links,data,PlanningPage}`: confirmação conjunta, validação recíproca, vínculos opcionais e consulta.
- `model.ts`, `backup.ts`, `LedgerActivity.tsx`: validação integral, resumo e leitura nas telas atuais.
- `tests/check_reimbursements.mjs`, fixture sintética, teste Chromium e CI.

Nenhuma conversão automática de reembolso legado: operações e claims antigos continuam existindo com os mesmos IDs. A única flexibilização estrutural é aceitar rótulo vazio para responsável desconhecido; identidade continua obrigatória. Backups preservam operações, claims, acordos/eventos e movimentos do objetivo. A extensão passa pelo fluxo existente de backup/prévia/confirmação; não cria dados financeiros ou datas ausentes.

## Validação

Somente dados sintéticos. Resultados finais registrados após a execução das suítes:

- TypeScript, build, static scaffold e `check_public_release.py`.
- `check_reimbursements.mjs`: pessoal/terceiro/compartilhada, múltiplos responsáveis, desconhecido, avulso, único/parcelas/custom, soma declarada/centavos finais, parcial/integral, contas e meses distintos, excesso contratual e por obrigação, cancelamento, correção, estorno/duplicado, preservação dos cronogramas ao editar compra, fatura independente, juros no teto, alteração da quantidade de previsões, reserva parcial/insuficiente/duplicada, conclusão antiga/nova, cancelamento sem devolução automática, backup e falhas de quota/concorrência.
- Regressão: `check_entry_foundation`, `check_entry_finance`, `check_credit`, `check_finance`, `check_backup`, `check_planning`, `check_entries`, `check_monthly_spending`.
- Chromium: novo acordo parcial/responsável/histórico, três temas, mobile, backup completo/exportação/reload e chave antiga intacta; testes anteriores de crédito, motor financeiro, Planejamentos, finanças, backup, navegação, Home, lançamentos, inicialização e cabeçalho.

[Evidência sintética de acordos](phase-4-evidence/agreements.png).

## Limites e Fase 5

Os comandos e consultas desta fase são internos. Cadastro e edição visuais, seleção de responsável, alocação visual de recebimentos, prévias/impactos com confirmação e uso da reserva no novo modal serão conectados na Fase 5. O formulário legado e o simulador existente continuam utilizando seu fluxo anterior; não são apresentados como interface do motor novo. O resumo da aba Reembolsos agrega todos os períodos dos dois modelos, contando somente os saldos pendentes e recebidos líquidos; as linhas antigas mantêm suas ações e os acordos têm histórico próprio acima. CSV/filtros antigos mantêm seu escopo anterior; backup JSON inclui todas as coleções.

Não há retorno automático ao cofrinho por cancelamento nem compensação de excedente como reembolso; essas ações exigem eventos financeiros explícitos pelos fluxos existentes. Não há sincronização bancária, pessoas inventadas, reinterpretação de dados legados nem migração executada nesta entrega. Anexos/ZIP permanecem na Fase 6. Testes de interface usam Chromium, sem ensaio em dispositivo físico.
