# Migração segura: Finly v1.1 → v1.2

**Este arquivo descreve a migração futura. A v1.1.1 neste repositório permanece `version:1` e não executa migração v2.**

## O que existe na v1.1

- Chave de armazenamento: `saldoclaro-v1` (mantida por compatibilidade).
- Estado JSON: `{version:1, settings, entries, invoiceStatuses, pending, noticeDismissed}`.
- Cada `entry`: `id`, `description`, `amount` (reais decimais), `month` (`YYYY-MM`), `kind` (`credit`, `out`, `income`, `reimbursement`), `category`, `owner`, `status`, `confirmed`, `note`.
- Parcelas podem ter `groupId`, `parts`, `part`. Um mesmo grupo pode conter compras e reembolsos de valores semelhantes.
- `pending[]` registra cobranças sem mês atribuído.
- `invoiceStatuses` associa período a situação, sem ID de cartão (existe apenas um cartão lógico).

## Procedimento de migração seguro

1. Mostrar aviso para **exportar backup v1 JSON**. Nunca fazer publicação de dados privados como parte da migração.
2. Ler `saldoclaro-v1` sem apagar nem sobrescrever essa chave.
3. Validar schema, comprimento, IDs e valores; abortar com mensagem se houver corrupção. Não aceitar campos inventados como dados financeiros novos.
4. Criar no novo estado `version:2`, com contas padrão `legacy-credit`, `legacy-cash` e `legacy-reserve`, além das categorias de cada lançamento.
5. Converter `amount` decimal para `amountCents = Math.round(amount * 100)` (confirmar ausência de números negativos ou inválidos). Usar **centavos inteiros** daí em diante.
6. Copiar cada `entry` da v1 exatamente **uma vez** para `transactions` com `legacyId`, `period` = `month`, `legacyKind`, `confirmed`, `status`, `owner`, `note`, `groupId`, `part`, `parts`. `credit` fica em `legacy-credit`; `out`/`income`/`reimbursement` ficam em `legacy-cash`, com vínculo financeiro de reembolso preservado.
7. Converter `invoiceStatuses[YYYY-MM]` para as faturas do cartão `legacy-credit` sem criar nenhuma nova despesa de pagamento.
8. Copiar `pending[]` para uma coleção de lançamentos **sem período definido**; não forçar uma data para atribuição.
9. Copiar `settings` sem recalcular salário, reserva, limites ou previsão. Novos campos recebem valores neutros e opcionais.
10. Não transformar recorrências previstas em assinaturas ativas automaticamente: oferecer revisão manual, para evitar gerar novos lançamentos além dos registros existentes.
11. Validar totais por mês/tipo, conjunto de IDs, série de parcelas e vínculo de reembolsos com a v1; em caso de falha, abortar e deixar v1 intacta.
12. Salvar estado novo em `finly-v2` **somente após validação integral**, guardar manifesto com data e hash do backup de origem e oferecer relatório de migração. Nunca apagar `saldoclaro-v1` automaticamente.

## Exemplo fictício de parcela

Compra de terceiro 3 × R$ 25,00 → três lançamentos de crédito com `amountCents=2500`, `part=1,2,3`; três reembolsos associados permanecem independentes. O total do contrato de compra é R$ 75,00, **não R$ 225,00**; a migração não cria outras parcelas.

## Particularidades

- **Parcela final isolada:** se v1 contém apenas 2/2, preservar apenas essa parcela; não inventar 1/2.
- **Assinatura prevista (`confirmed:false`):** preservar como previsão, não somar nova recorrência gerada por regras.
- **Reembolso:** `status:'received'` impacta caixa; `status:'planned'` nunca entra em saldo real, mesmo que apareça em simulações condicionais.
- **Quitação da fatura:** registrar liquidação contra obrigação de cartão, não duplicar a compra na categoria.
- **Arquivo em outro local/Pages:** `localStorage` de `file://` e `https://` não é compartilhado. Importação do backup é o caminho previsto.
- **Falha:** não substituir nenhum estado existente; oferecer restauração e relatório de validação sem valores sensíveis.

## Verificação pós-migração

- Mesma quantidade de entradas, mesmos IDs legados, mesmos totais por mês e por tipo.
- Mesmo valor de reserva e salário, mesmo mês da fatura e situação pago/aberto.
- Mesma quantidade de reembolsos e status recebidos.
- Nenhuma assinatura, transferência ou pagamento novo criado sem consentimento.
- Backup exportável e importável com reconstrução integral.

## Importação de backups v1.1 no futuro

A v1.2 deverá aceitar JSON `version:1` da v1.1 via fluxo explícito `Prévia → Validação → Confirmação → Migração`. Nunca substituir automaticamente os dados v2 atuais sem oferecer backup, confirmação e opção de cancelar. Detectar IDs duplicados na importação. Recomenda-se importar para um perfil novo ou exigir escolha entre substituir e mesclar, com comportamento claro para cada opção.
