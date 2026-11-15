import { registerPurchase } from "../credit/purchases.ts";
import type { LedgerDraft, Settlement } from "../contracts.ts";
import type { Agreement, AgreementTerms, ScheduleRow } from "./contracts.ts";
import { validateTerms } from "./validation.ts";
import { checkedSum, settled, validateFinancialLedger } from "../finance.ts";
import { recordSettlement } from "../commands.ts";
import { dateOK } from "../schema.ts";
export function installmentSchedule(
  l: LedgerDraft,
  purchaseId: string,
  totalCents: number,
  agreementId: string,
): ScheduleRow[] {
  const p = l.purchases.find((p) => p.id === purchaseId);
  if (
    !p ||
    p.cancelled ||
    !p.installmentIds.length ||
    !agreementId.trim() ||
    !Number.isSafeInteger(totalCents) ||
    totalCents < p.installmentIds.length
  )
    throw Error("Compra ou total inválido");
  const per = Math.floor(totalCents / p.installmentIds.length);
  return p.installmentIds.map((id, i) => {
    const o = l.operations.find((o) => o.id === id)!;
    return {
      id: `schedule:${agreementId}:${i + 1}`,
      amountCents:
        i === p.installmentIds.length - 1 ? totalCents - per * i : per,
      period: o.period,
      expectedDate: o.dueDate,
    };
  });
}
function putTerms(l: LedgerDraft, a: Agreement, terms: AgreementTerms) {
  validateTerms(terms);
  for (const row of terms.schedule) {
    const old = l.operations.find((o) => o.id === row.id);
    if (old && !a.operationIds.includes(row.id))
      throw Error("ID da previsão já utilizado");
    const op = {
      id: row.id,
      type: "reimbursement" as const,
      description: terms.description,
      amountCents: row.amountCents,
      period: row.period,
      expectedDate: row.expectedDate,
      accountId: row.accountId,
      cancelled: false,
    };
    if (old) Object.assign(old, op);
    else {
      l.operations.push(op);
      l.claims.push({
        id: `claim:${row.id}`,
        operationId: row.id,
        purchaseId: a.purchaseId,
        personId: terms.personId,
        personLabel: terms.personLabel,
      });
      a.operationIds.push(row.id);
    }
  }
  for (const id of a.operationIds) {
    if (!terms.schedule.some((r) => r.id === id))
      l.operations.find((o) => o.id === id)!.cancelled = true;
    const claim = l.claims.find((c) => c.operationId === id)!;
    claim.personId = terms.personId;
    claim.personLabel = terms.personLabel;
  }
  a.terms = structuredClone(terms);
}
export function registerAgreement(
  l: LedgerDraft,
  input: { id: string; purchaseId?: string; terms: AgreementTerms },
) {
  validateFinancialLedger(l);
  const key = JSON.stringify(input),
    old = l.agreements?.find((a) => a.id === input.id);
  if (old) {
    if (old.creationKey !== key) throw Error("ID de acordo reutilizado");
    return l;
  }
  if (
    input.purchaseId &&
    !l.purchases.some((p) => p.id === input.purchaseId && !p.cancelled)
  )
    throw Error("Compra não está ativa");
  const next = structuredClone(l);
  const a: Agreement = {
    id: input.id,
    purchaseId: input.purchaseId,
    origin: input.purchaseId ? "purchase" : "standalone",
    creationKey: key,
    terms: structuredClone(input.terms),
    operationIds: [],
    events: [],
  };
  putTerms(next, a, input.terms);
  next.agreements = [...(next.agreements ?? []), a];
  validateFinancialLedger(next);
  return next;
}
export function agreementBalance(l: LedgerDraft, id: string, asOf: string) {
  if (!dateOK(asOf)) throw Error("Data de consulta inválida");
  const a = l.agreements?.find((a) => a.id === id);
  if (!a) throw Error("Acordo inexistente");
  const ops = a.operationIds.map((id) =>
    l.operations.find((o) => o.id === id)!,
  );
  const total = checkedSum(
    ops.filter((o) => !o.cancelled).map((o) => o.amountCents),
  );
  const received = checkedSum(ops.map((o) => settled(l, o.id)));
  const cancelled = checkedSum(
    ops.filter((o) => o.cancelled).map((o) => o.amountCents),
  );
  const pending = total - received;
  return {
    total,
    received,
    pending,
    cancelled,
    status:
      total === 0
        ? "cancelled"
        : received === total
          ? "received"
          : received > 0
            ? "partial"
            : ops.some(
                  (o) =>
                    !o.cancelled && (!o.expectedDate || o.expectedDate <= asOf),
                )
              ? "pending"
              : "planned",
  };
}
export function receiveAgreement(
  l: LedgerDraft,
  agreementId: string,
  receipt: Settlement,
  reversalConfirmed = false,
) {
  const a = l.agreements?.find((a) => a.id === agreementId);
  if (!a?.operationIds.includes(receipt.operationId))
    throw Error("Recebimento de outro acordo");
  if (receipt.reversesId && !reversalConfirmed)
    throw Error("Confirme o estorno");
  return recordSettlement(l, receipt);
}
export function previewAgreement(
  l: LedgerDraft,
  id: string,
  terms: AgreementTerms,
) {
  validateTerms(terms);
  if (!l.agreements?.some((a) => a.id === id))
    throw Error("Acordo inexistente");
  return { source: JSON.stringify(l), id, terms: structuredClone(terms) };
}
export function correctAgreement(
  l: LedgerDraft,
  preview: ReturnType<typeof previewAgreement>,
  approval: {
    id: string;
    date: string;
    reason: string;
    confirmed: boolean;
    acknowledgeReceipts?: boolean;
  },
) {
  const previousEvent = l.agreements
    ?.find((a) => a.id === preview.id)
    ?.events.find((e) => e.id === approval.id);
  if (previousEvent) {
    if (
      JSON.stringify(previousEvent.next) !== JSON.stringify(preview.terms) ||
      previousEvent.kind !== "correction" ||
      previousEvent.date !== approval.date ||
      previousEvent.reason !== approval.reason
    )
      throw Error("ID de correção reutilizado");
    return l;
  }
  if (
    !approval.confirmed ||
    !dateOK(approval.date) ||
    !approval.reason.trim() ||
    JSON.stringify(l) !== preview.source
  )
    throw Error("Confirmação ou prévia inválida");
  const next = structuredClone(l),
    a = next.agreements?.find((a) => a.id === preview.id);
  if (!a) throw Error("Acordo inexistente");
  if (
    l.settlements.some((p) => a.operationIds.includes(p.operationId)) &&
    !approval.acknowledgeReceipts
  )
    throw Error("Confirme o impacto no histórico de recebimentos");
  a.events.push({
    kind: "correction",
    id: approval.id,
    date: approval.date,
    reason: approval.reason,
    previous: structuredClone(a.terms),
    next: structuredClone(preview.terms),
  });
  putTerms(next, a, preview.terms);
  validateFinancialLedger(next);
  return next;
}
export function cancelAgreement(
  l: LedgerDraft,
  id: string,
  approval: { id: string; date: string; reason: string; confirmed: boolean },
) {
  const a = l.agreements?.find((a) => a.id === id);
  if (
    !a ||
    !approval.confirmed ||
    !dateOK(approval.date) ||
    !approval.reason.trim()
  )
    throw Error("Confirme cancelamento e motivo");
  const event = a.events.find((e) => e.id === approval.id);
  if (event) {
    if (
      event.kind !== "cancel" ||
      event.reason !== approval.reason ||
      event.date !== approval.date
    )
      throw Error("ID reutilizado");
    return l;
  }
  const next = structuredClone(l),
    target = next.agreements!.find((a) => a.id === id)!;
  target.events.push({
    kind: "cancel",
    id: approval.id,
    date: approval.date,
    reason: approval.reason,
    previous: structuredClone(a.terms),
    next: structuredClone(a.terms),
  });
  for (const id of a.operationIds)
    next.operations.find((o) => o.id === id)!.cancelled = true;
  validateFinancialLedger(next);
  return next;
}

/** Immutable composition: callers persist only the final result. */
export function registerPurchaseAgreements(
  l: LedgerDraft,
  purchase: import("../credit/purchases.ts").PurchaseInput,
  agreements: Parameters<typeof registerAgreement>[1][],
) {
  let next = registerPurchase(l, purchase);
  for (const a of agreements) {
    if (a.purchaseId !== purchase.id) throw Error("Acordo de outra compra");
    next = registerAgreement(next, a);
  }
  return next;
}
