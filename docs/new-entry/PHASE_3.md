# Novo lançamento — Fase 3: cartões, contratos e recorrências

Base confirmada: `0372aec7f075b48f11e84e07f4a3f0e1c21cedf0`, com testes da Fase 2 aprovados antes da implementação. Trabalho exclusivo em `codex/finly-navegacao-ux`.

## Escopo entregue

Motor funcional com APIs internas para configurar/arquivar cartões, calcular faturas, cotar/registrar compras únicas e parceladas, entrada vinculada, juros explícitos, alterações de parcelas com prévia e recorrências mensais/anuais. A aplicação apresenta consultas do novo motor em Configurações e Parcelas e recorrências. **Os controles completos de cadastro/edição no modal continuam na Fase 5**, conforme o pedido; não há ativação automática em dados antigos.

Módulos em `src/finance/entry-system/credit/`:

- `dates.ts`: calendário, fechamento, competência, vencimento e configuração de cartões.
- `quote.ts`: valor total/parcela, divisão exata, juros e total contratado.
- `purchases.ts`: postagem atômica de entrada/parcelas, faturas, prévia/alteração por escopo e cancelamento.
- `recurrences.ts`: criação explícita, geração limitada, alterações, pausa, retomada e cancelamento.
- `CreditActivity.tsx`: leitura das configurações, parcelas, contratos, revisões, ocorrências e eventos.

Contratos opcionais foram acrescentados ao schema da Fase 2, preservando a versão interna 1 e o estado externo `version:2`. `schema.ts` valida os metadados novos sem exigir que estejam presentes em backups antigos. O mecanismo de persistência, validação financeira, pagamentos, importação e cofrinhos das fases anteriores é reutilizado.

## Cartões e fechamento

Cada cartão mantém ID, conta associada, nome, fechamento, vencimento, regra no dia do fechamento e estado de arquivamento. Configurar o cartão não altera competências ou vencimentos históricos. Trocar sua conta com operações existentes é recusado. Arquivar bloqueia novas compras/geração, sem apagar histórico.

O cálculo automático usa a data conhecida da compra:

1. O fechamento é limitado ao último dia civil do mês quando configurado para 29/30/31.
2. Compra depois do fechamento, ou no fechamento com regra `next`, pertence ao ciclo de fechamento seguinte.
3. Se o dia de vencimento ocorrer depois do fechamento nesse ciclo, a competência é o mês desse fechamento; se o vencimento for anterior ou igual, pertence ao mês seguinte.
4. Vencimento é limitado ao último dia civil da competência. Não se presumem ajustes por feriado/fim de semana.

Exemplos: fechamento 10, vencimento 20, regra `next`: compra 09/11 → novembro; compra 10/11 ou 11/11 → dezembro. Fechamento 25 e vencimento 05: compra 20/11 → dezembro; compra 26/11 → janeiro seguinte.

Sem fechamento, vencimento e regra, o modo automático exige configuração. Uma competência manual válida permite prosseguir; vencimento desconhecido continua ausente. Ajuste manual não altera a data real da compra.

## Contrato, centavos e juros

- Modo total: informa-se o custo total; a entrada é descontada antes da divisão.
- Modo parcela: o total informado pelas parcelas é `parcela × quantidade + entrada`.
- Até 120 parcelas positivas. Não são aceitos centavos fracionários, negativos ou totais inseguros.
- Divisão padrão: primeiras parcelas com divisão inteira para baixo; toda a diferença fica na última. R$ 100,00 em 3 → R$ 33,33 + R$ 33,33 + R$ 33,34.
- Parcelas personalizadas são aceitas somente se a soma fechar exatamente o contrato.
- A regra não é aplicada retroativamente aos parcelamentos legados nem recria parcelas ausentes.

Métodos oferecidos, escolhidos explicitamente:

- Simples mensal: principal financiado × `(1 + taxa × número de meses)`.
- Composto mensal: principal financiado × `(1 + taxa) ^ número de meses`.

São estimativas de acumulação do principal, **não sistema Price, CET ou amortização bancária**. Taxa aceita até quatro casas decimais percentuais, de 0 a 100% ao mês. O cálculo usa frações inteiras/BigInt, arredondando o resultado a centavos; valores monetários persistidos são inteiros seguros.

Custo R$ 1.000,00, 3 meses, 1%: estimativa simples R$ 1.030,00; composta R$ 1.030,30. Se o usuário informar total final R$ 1.040,00, ele prevalece, com divergência de R$ 10,00 contra a estimativa simples. Os diagnósticos de diferença podem ser negativos em um desconto; nenhum lançamento monetário negativo é criado.

Quando só o total final é conhecido e difere do custo original, o contrato é marcado `contract-only`, sem presumir método de juros.

Em modo parcela com juros, o custo original deve ser informado explicitamente para comparação; não se infere custo à vista de um contrato desconhecido.

## Entrada e postagem

Exemplo R$ 2.000,00, entrada Pix R$ 500,00 e 5 parcelas: cria-se uma despesa de R$ 500,00 e cinco compras de R$ 300,00, todas ligadas à mesma compra. **Não se cria outra despesa de R$ 2.000,00.**

Entrada tem conta, forma, data e confirmação próprias. Somente confirmação de pagamento cria a liquidação, reutilizando o modelo da Fase 2. Entrada prevista permanece obrigação sem pagamento inventado.

Compra e parcelas usam IDs determinísticos derivados da identidade da compra. Repetir a mesma requisição não duplica registros; reutilizar o ID com payload diferente é recusado. Uma fatura existente é encontrada por cartão + competência, preservando seu ID. Cartões distintos não compartilham fatura, mesmo no mesmo mês.

Adicionar uma compra/previsão a fatura que já possui pagamentos exige reconhecimento explícito e data da correção, com evento auditável. Pagamentos originais permanecem intactos. A quitação continua separada e não aumenta as despesas.

## Alterações e cancelamento

`previewInstallments` recebe a parcela inicial e escopo `one`, `following` ou `all`. Expõe valores/competências anteriores e posteriores, total contratual antes/depois, pagamentos das faturas envolvidas e bloqueios para mudanças de competência. Aplicação exige confirmação, motivo, data, ID de revisão e snapshot ainda atual.

- IDs, data original da compra e vínculos são preservados.
- Competências podem ser ajustadas individualmente ou consecutivamente dentro do escopo selecionado.
- Alterar valor de uma parcela de fatura com pagamentos exige confirmação adicional; não reduz a obrigação abaixo do pagamento líquido.
- Mover uma parcela para fora de fatura com pagamentos é recusado, preservando a alocação histórica da quitação. A fatura de destino com pagamentos também exige reconhecimento explícito.
- Alterações geram correções individuais e revisão do total contratual; a cotação original é preservada como histórico, sem reescrever o contrato inicial.
- Cancelar uma compra exige confirmação, data, motivo e identidade. Não exclui parcelas nem histórico. Se houver pagamento líquido na entrada/fatura, o cancelamento direto é recusado; os pagamentos precisam ser tratados explicitamente pelos mecanismos de estorno/correção antes disso.

## Recorrências

Recorrência é entidade separada de compra parcelada. Configuração inclui descrição, tipo, valor, frequência mensal/anual, origem, categoria, início, término opcional, situação inicial e eventos posteriores.

A geração só ocorre por comando explícito, para janela de até 24 meses. Nunca é acionada automaticamente na inicialização e nunca cria cobranças ilimitadas. A consulta de uma tela não grava previsões.

Datas são calculadas sempre a partir do dia-base original. Uma mensal do dia 31 gera 31/01, 28/02, 31/03, 30/04 etc. Anual de 29/02 usa 28/02 em anos comuns e volta a 29/02 em bissextos. Não gera antes do início nem após o término.

IDs são derivados de recorrência + data esperada, e a lista de ocorrências também impede duplicação por data. Uma ocorrência antiga com ID diferente é preservada, sem substituição. A operação gerada tem **data esperada** (`expectedDate`), não uma data real de compra inventada. Cartão é `confirmed:false`; outras previsões não têm liquidação. A competência do cartão usa seu calendário, ou ajuste manual por data quando a configuração estiver incompleta.

Eventos de valor podem afetar somente uma ocorrência (`override`) ou a atual e seguintes (`amount`). Alteram previsões existentes elegíveis e a geração futura correspondente. Uma ocorrência confirmada/liquidada exige correção guiada da Fase 2; alterações em lote não reescrevem esse histórico silenciosamente. Eventos cronologicamente retroativos são recusados em vez de reorganizar a história sem revisão.

Pausa bloqueia a geração no intervalo e cancela previsões já geradas, sem removê-las. Retomada restaura as previsões canceladas especificamente pela pausa a partir da data de retomada, com os mesmos IDs; o intervalo pausado permanece cancelado/sem novas ocorrências. Cancelamento encerra a geração após a data e não pode ser retomado; pode-se criar nova recorrência com identidade própria. Operações já confirmadas ou liquidadas são preservadas, inclusive se futuras, pois representam obrigações reais que exigem tratamento explícito.

## Integração e compatibilidade

- Indicadores, gráficos, projeções e cofrinhos continuam usando as regras da Fase 2.
- Compra registrada = entrada + parcelas; juros integram o contrato, não criam segunda despesa.
- Quitação é entidade independente. Previsões não geram movimento de caixa.
- Configurações mostra os cartões novos em seção própria; Parcelas e recorrências mostra contratos e históricos novos, em modo leitura. O cartão principal e os controles legados não foram reinterpretados como cadastro de cartões novos.
- Backup JSON preserva contratos, cotação, números de parcela, revisões e eventos. Prévia informa cartões, contratos e recorrências. Importação valida o estado completo antes de confirmar substituição.
- `saldoclaro-v1`, transações antigas, faturas antigas, períodos, IDs e cofrinhos não são migrados automaticamente. Nenhuma parcela ou assinatura é inferida de um grupo legado.

## Testes

Todos os comandos abaixo passaram.

```sh
npm run check
npm run build
npm run test:static
node tests/check_credit.mjs
node tests/check_entry_finance.mjs
node tests/check_entry_foundation.mjs
node tests/check_finance.mjs
node tests/check_backup.mjs
node tests/check_planning.mjs
node tests/check_entries.mjs
node tests/check_monthly_spending.mjs
python3 tests/check_public_release.py
python3 tests/check_credit_browser.py
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

A suíte nova cobre cartões independentes, antes/no/depois do fechamento, regra no mesmo dia, ajuste manual, virada de ano, fevereiro, cartão desconhecido, total/parcela/personalizadas, centavos finais, juros simples/compostos, total contratado prioritário, entrada, postagem idempotente, prévia por escopo, IDs preservados, correção com fatura paga, arquivamento e cancelamento. Recorrências cobrem mensal/anual/bissexto, dia 31, override/futuras, pausa/retomada/cancelamento/término, geração repetida e fatura com pagamentos.

As regressões das Fases 1/2, parcelamentos legados, Planejamentos, JSON antigo e roundtrip completo são mantidas. Chromium restaura backup sintético com cartões, compra exata, recorrência e cofrinho, testa consultas, exportação/reload e três temas/mobile.

[Cartões](phase-3-evidence/cards.png) · [Contratos e recorrências](phase-3-evidence/contracts.png) · [Mobile](phase-3-evidence/graphite-mobile.png)

## Limites e pendências seguintes

- APIs de gerenciamento e consultas prontas; cadastro/edição visual completos continuam na Fase 5, sem novos formulários sobrepostos nesta etapa.
- Cálculos assumem dias civis, sem feriados, CET, IOF, tarifas ou convenções de amortização não declaradas. Total contratado conhecido prevalece.
- Integração flexível de responsáveis/reembolsos e nova compra usando cofrinho: Fase 4. Cofrinhos existentes permanecem preservados.
- Anexos/ZIP permanecem na Fase 6. Não houve backend, login ou dependência nova.
- Validação visual automatizada em Chromium; não houve ensaio em aparelho físico.
