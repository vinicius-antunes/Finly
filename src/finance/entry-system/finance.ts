import type { LedgerDraft, Settlement, InvoicePayment } from "./contracts.ts";
import { validateLedgerDraft } from "./schema.ts";
export function checkedSum(values: number[]) {
  const n = values.reduce((a, b) => a + b, 0);
  if (!Number.isSafeInteger(n))
    throw Error("Soma monetária excede limite seguro");
  return n;
}
function net(rows: (Settlement | InvoicePayment)[]) {
  return checkedSum(
    rows.map((x) => (x.reversesId ? -x.amountCents : x.amountCents)),
  );
}
export function settled(l: LedgerDraft, id: string) {
  return net(l.settlements.filter((x) => x.operationId === id));
}
export function invoiceBalance(l: LedgerDraft, id: string) {
  const inv = l.invoices.find((x) => x.id === id);
  if (!inv) throw Error("Fatura inexistente");
  const total = checkedSum(
      inv.installmentIds
        .map((id) => l.operations.find((x) => x.id === id)!)
        .filter((x) => !x.cancelled)
        .map((x) => x.amountCents),
    ),
    paid = net(l.invoicePayments.filter((x) => x.invoiceId === id));
  return {
    total,
    paid,
    remaining: total - paid,
    status: paid === 0 ? "open" : paid === total ? "paid" : "partial",
  };
}
export function operationBalance(l: LedgerDraft, id: string) {
  const o = l.operations.find((x) => x.id === id);
  if (!o || o.type === "card")
    throw Error("Operação não liquidável diretamente");
  const paid = settled(l, id);
  return {
    total: o.amountCents,
    paid,
    remaining: o.cancelled ? 0 : o.amountCents - paid,
    status: o.cancelled
      ? "cancelled"
      : paid === 0
        ? "pending"
        : paid === o.amountCents
          ? "settled"
          : "partial",
  };
}
export function validateFinancialLedger(
  value: unknown,
): asserts value is LedgerDraft {
  validateLedgerDraft(value);
  const l = value;
  const ids = new Set<string>();
  for (const inv of l.invoices) {
    const key = inv.cardId + ":" + inv.period;
    if (ids.has(key)) throw Error("Fatura duplicada por cartão/competência");
    ids.add(key);
    const b = invoiceBalance(l, inv.id);
    if (b.paid < 0 || b.remaining < 0)
      throw Error("Pagamento de fatura excede obrigação");
  }
  for (const rows of [l.settlements, l.invoicePayments]) {
    const reversed = new Set<string>();
    for (const row of rows) {
      const a = l.accounts.find((a) => a.id === row.accountId);
      if (!a || a.type === "credit_card")
        throw Error("Liquidação exige conta de caixa");
      if (row.reversesId) {
        const original = rows.find((x) => x.id === row.reversesId);
        if (
          !original ||
          original.reversesId ||
          original.id === row.id ||
          original.amountCents !== row.amountCents ||
          original.accountId !== row.accountId ||
          original.date > row.date ||
          reversed.has(original.id) ||
          ("invoiceId" in row &&
            (!("invoiceId" in original) ||
              row.invoiceId !== original.invoiceId))
        )
          throw Error("Estorno inválido ou duplicado");
        reversed.add(original.id);
      }
    }
  }
  for (const o of l.operations) {
    if (o.type === "card") {
      if (typeof o.confirmed !== "boolean" || !o.cardId)
        throw Error("Compra exige cartão e confirmação explícita");
    } else {
      const b = operationBalance(l, o.id);
      if (b.paid < 0 || b.paid > o.amountCents || (o.cancelled && b.paid !== 0))
        throw Error(
          "Liquidação excedente ou cancelamento de registro liquidado",
        );
    }
  }
  for (const p of l.purchases) {
    const operations = [
      ...(p.downPaymentEntryId ? [p.downPaymentEntryId] : []),
      ...p.installmentIds,
    ].map((id) => l.operations.find((x) => x.id === id)!);
    if (checkedSum(operations.map((x) => x.amountCents)) !== p.contractedCents)
      throw Error("Parcelas e entrada não correspondem ao contrato");
    for (const o of l.operations.filter((x) => x.purchaseId === p.id))
      if (!operations.some((x) => x.id === o.id))
        throw Error("Vínculo unilateral de compra");
  }
  for (const purchase of l.purchases) {
    const reimbursements = new Set(
      l.claims
        .filter((x) => x.purchaseId === purchase.id)
        .map((x) => x.operationId),
    );
    if (
      checkedSum(
        [...reimbursements]
          .map((id) => l.operations.find((x) => x.id === id)!)
          .filter((x) => !x.cancelled)
          .map((x) => x.amountCents),
      ) > purchase.contractedCents
    )
      throw Error("Reembolsos excedem custo da compra");
  }
  for (const t of l.transfers) {
    for (const id of [t.fromAccountId, t.toAccountId])
      if (l.accounts.find((x) => x.id === id)!.type === "credit_card")
        throw Error("Transferência exige contas próprias de caixa");
  }
  checkedSum([
    ...l.operations.map((x) => x.amountCents),
    ...l.settlements.map((x) => x.amountCents),
    ...l.invoicePayments.map((x) => x.amountCents),
    ...l.transfers.map((x) => x.amountCents),
  ]);
}
export function ledgerProjection(l: LedgerDraft, period: string) {
  const ops = l.operations.filter((x) => x.period === period && !x.cancelled);
  const sum = (type: string) =>
    checkedSum(ops.filter((x) => x.type === type).map((x) => x.amountCents));
  const income = checkedSum(
      ops
        .filter((x) => x.type === "income" && !x.salary)
        .map((x) => settled(l, x.id)),
    ),
    salary = checkedSum(
      ops
        .filter((x) => x.type === "income" && x.salary)
        .map((x) => settled(l, x.id)),
    ),
    received = checkedSum(
      ops
        .filter((x) => x.type === "reimbursement")
        .map((x) => settled(l, x.id)),
    );
  return {
    invoice: sum("card"),
    cash: sum("expense"),
    income,
    salary,
    received,
    pending: sum("reimbursement") - received,
    unconfirmed: checkedSum(
      ops
        .filter((x) => x.type === "card" && !x.confirmed)
        .map((x) => x.amountCents),
    ),
  };
}
/** Net recorded variation only, never a bank balance. All actual dates are respected. */
export function accountVariation(
  l: LedgerDraft,
  accountId: string,
  period?: string,
) {
  const inPeriod = (date: string) => !period || date.slice(0, 7) === period;
  const rows: number[] = [];
  for (const p of l.settlements.filter(
    (x) => x.accountId === accountId && inPeriod(x.date),
  )) {
    const o = l.operations.find((x) => x.id === p.operationId)!;
    rows.push(
      p.amountCents * (o.type === "expense" ? -1 : 1) * (p.reversesId ? -1 : 1),
    );
  }
  for (const p of l.invoicePayments.filter(
    (x) => x.accountId === accountId && inPeriod(x.date),
  ))
    rows.push(p.amountCents * (p.reversesId ? 1 : -1));
  for (const t of l.transfers.filter((x) => x.confirmed && inPeriod(x.date))) {
    if (t.fromAccountId === accountId) rows.push(-t.amountCents);
    if (t.toAccountId === accountId) rows.push(t.amountCents);
  }
  return checkedSum(rows);
}
export function combinedInvoiceStatus(
  l: LedgerDraft | undefined,
  period: string,
  legacyTotal: number,
  legacyStatus: string | undefined,
) {
  const legacyOpen = legacyTotal > 0 && legacyStatus !== "paid";
  if (!l)
    return legacyStatus === "paid"
      ? "Paga"
      : legacyStatus === "unpaid"
        ? "Em aberto"
        : "A confirmar";
  const ops = l.operations.filter(
    (x) => x.type === "card" && x.period === period && !x.cancelled,
  );
  const invoices = l.invoices.filter((x) => x.period === period);
  const balances = invoices.map((x) => invoiceBalance(l, x.id));
  if (!ops.length && !balances.some((x) => x.total > 0 || x.paid > 0))
    return legacyStatus === "paid"
      ? "Paga"
      : legacyStatus === "unpaid"
        ? "Em aberto"
        : "A confirmar";
  const unassigned = ops.some(
    (o) => !invoices.some((i) => i.installmentIds.includes(o.id)),
  );
  if (!legacyOpen && !unassigned && balances.every((x) => x.remaining === 0))
    return "Paga";
  return balances.some((x) => x.paid > 0) ? "Parcialmente paga" : "Em aberto";
}
