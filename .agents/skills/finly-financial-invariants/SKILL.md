---
name: finly-financial-invariants
description: Use ao alterar saldo, lançamentos, cartões, faturas, parcelas, transferências, reembolsos, assinaturas ou projeções. Não ativar para mudanças apenas documentais ou cosméticas.
---

# finly-financial-invariants

Entrada: diff e regra financeira afetada. Leia AGENTS.md e o contrato relevante; examine somente funções relacionadas.
- No modelo v2, use centavos inteiros: `totalCents = installmentCents * installmentCount`. Não converta o legado v1 incidentalmente.
- Pagamento de fatura não cria nova despesa; transferência não cria receita nem despesa.
- Reembolso prometido não é saldo recebido. Separe confirmado e previsto.
- Distinga compra, competência, vencimento e pagamento; cancelamento mantém histórico sem gerar cobranças após o fim.
- Proponha testes sintéticos para parcelas, total, meses e ausência de contagem dupla.
Saída: regras afetadas, testes mínimos, evidências e riscos. Não implemente funcionalidades fora do pedido.
