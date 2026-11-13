import { dateOK } from "./schema.ts";
import type {
  LedgerDraft,
  Operation,
  Settlement,
  InvoicePayment,
  Transfer,
  Correction,
} from "./contracts.ts";
import { validateFinancialLedger, invoiceBalance } from "./finance.ts";
function append<T extends { id: string }>(rows: T[], item: T) {
  const old = rows.find((x) => x.id === item.id);
  if (old) {
    if (JSON.stringify(old) !== JSON.stringify(item))
      throw Error("ID reutilizado com dados diferentes");
    return rows;
  }
  return [...rows, structuredClone(item)];
}
function commit(l: LedgerDraft) {
  validateFinancialLedger(l);
  return l;
}
export function postOperation(l: LedgerDraft, o: Operation) {
  if (!dateOK(o.operationDate)) throw Error("Data da operação obrigatória");
  return commit({ ...l, operations: append(l.operations, o) });
}
export function recordSettlement(l: LedgerDraft, p: Settlement) {
  if (l.accounts.find((x) => x.id === p.accountId)?.archived)
    throw Error("Conta arquivada");
  return commit({ ...l, settlements: append(l.settlements, p) });
}
export function recordInvoicePayment(l: LedgerDraft, p: InvoicePayment) {
  if (l.accounts.find((x) => x.id === p.accountId)?.archived)
    throw Error("Conta arquivada");
  return commit({ ...l, invoicePayments: append(l.invoicePayments, p) });
}
export const recordTransfer = (l: LedgerDraft, t: Transfer) =>
  commit({ ...l, transfers: append(l.transfers, t) });
export function confirmTransfer(l: LedgerDraft, id: string) {
  if (!l.transfers.some((x) => x.id === id))
    throw Error("Transferência inexistente");
  return commit({
    ...l,
    transfers: l.transfers.map((x) =>
      x.id === id ? { ...x, confirmed: true } : x,
    ),
  });
}
export function cancelOperation(l: LedgerDraft, id: string) {
  if (!l.operations.some((x) => x.id === id))
    throw Error("Operação inexistente");
  if (
    l.invoices.some(
      (x) => x.installmentIds.includes(id) && invoiceBalance(l, x.id).paid > 0,
    )
  )
    throw Error("Fatura com pagamentos exige correção guiada");
  return commit({
    ...l,
    operations: l.operations.map((x) =>
      x.id === id ? { ...x, cancelled: true } : x,
    ),
  });
}
export function correctOperation(
  l: LedgerDraft,
  change: Correction,
  paidInvoiceAcknowledged = false,
) {
  const old = l.corrections.find((x) => x.id === change.id);
  if (old) {
    if (JSON.stringify(old) !== JSON.stringify(change))
      throw Error("ID de correção reutilizado");
    return l;
  }
  const op = l.operations.find((x) => x.id === change.operationId);
  if (!op || op.amountCents !== change.previousAmountCents)
    throw Error("Registro mudou; atualize a prévia");
  if (
    l.invoices.some(
      (x) =>
        x.installmentIds.includes(op.id) && invoiceBalance(l, x.id).paid > 0,
    ) &&
    !paidInvoiceAcknowledged
  )
    throw Error("Fatura tem pagamentos: confirmação explícita obrigatória");
  return commit({
    ...l,
    operations: l.operations.map((x) =>
      x.id === op.id ? { ...x, amountCents: change.nextAmountCents } : x,
    ),
    corrections: append(l.corrections, change),
  });
}
export function deleteOperation(l: LedgerDraft, id: string) {
  if (!l.operations.some((x) => x.id === id))
    throw Error("Operação inexistente");
  if (
    l.operations.find((x) => x.id === id)!.purchaseId ||
    l.operations.find((x) => x.id === id)!.recurrenceId ||
    l.settlements.some((x) => x.operationId === id) ||
    l.corrections.some((x) => x.operationId === id) ||
    l.invoices.some((x) => x.installmentIds.includes(id)) ||
    l.claims.some((x) => x.operationId === id) ||
    l.attachments.some((x) => x.operationId === id)
  )
    throw Error("Registro possui vínculos ou histórico; exclusão recusada");
  return commit({ ...l, operations: l.operations.filter((x) => x.id !== id) });
}
export function possibleDuplicates(l: LedgerDraft, o: Operation) {
  const norm = (s: string) =>
    s.normalize("NFKD").replace(/\p{M}/gu, "").trim().toLowerCase();
  return l.operations
    .filter(
      (x) =>
        x.id !== o.id &&
        x.type === o.type &&
        x.amountCents === o.amountCents &&
        x.operationDate === o.operationDate &&
        x.accountId === o.accountId &&
        norm(x.description) === norm(o.description),
    )
    .map((x) => x.id);
}
