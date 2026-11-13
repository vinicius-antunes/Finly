import type { LedgerDraft } from "../contracts.ts";
import {
  validateFinancialLedger,
  invoiceBalance,
  checkedSum,
  settled,
} from "../finance.ts";
import { dateOK, periodOK } from "../schema.ts";
import { firstInvoice, dateInMonth, monthOffset } from "./dates.ts";
import { quotePurchase, type QuoteInput } from "./quote.ts";
export function syncInvoices(l: LedgerDraft) {
  const next = structuredClone(l);
  for (const invoice of next.invoices)
    invoice.installmentIds = next.operations
      .filter(
        (o) =>
          o.type === "card" &&
          o.cardId === invoice.cardId &&
          o.period === invoice.period,
      )
      .map((o) => o.id);
  for (const o of next.operations.filter((x) => x.type === "card"))
    if (
      !next.invoices.some((i) => i.cardId === o.cardId && i.period === o.period)
    )
      next.invoices.push({
        id: `invoice:${o.cardId}:${o.period}`,
        cardId: o.cardId!,
        period: o.period,
        installmentIds: next.operations
          .filter(
            (x) =>
              x.type === "card" &&
              x.cardId === o.cardId &&
              x.period === o.period,
          )
          .map((x) => x.id),
      });
  return next;
}
export type PurchaseInput = {
  id: string;
  description: string;
  cardId: string;
  operationDate: string;
  firstPeriod?: string;
  periods?: string[];
  confirmed: boolean;
  quote: QuoteInput;
  downPayment?: {
    accountId: string;
    method: string;
    date: string;
    confirmed: boolean;
  };
  acknowledgePaidInvoices?: boolean;
  acknowledgementDate?: string;
};
export function registerPurchase(l: LedgerDraft, input: PurchaseInput) {
  const key = JSON.stringify(input),
    old = l.purchases.find((x) => x.id === input.id);
  if (old) {
    if (old.creationKey !== key) throw Error("ID da compra reutilizado");
    return l;
  }
  const card = l.cards.find((x) => x.id === input.cardId);
  if (
    !card ||
    card.archived ||
    l.accounts.find((a) => a.id === card.accountId)?.archived
  )
    throw Error("Cartão não está ativo");
  if (!input.id || typeof input.confirmed !== "boolean")
    throw Error("Identidade e confirmação obrigatórias");
  const quote = quotePurchase(input.quote),
    first = firstInvoice(card, input.operationDate, input.firstPeriod),
    periods =
      input.periods ??
      quote.installments.map((_, i) => monthOffset(first.period, i));
  if (
    periods.length !== quote.installments.length ||
    periods.some((x) => !periodOK(x))
  )
    throw Error("Competências inválidas");
  const next = structuredClone(l);
  const installmentIds = quote.installments.map((amountCents, index) => {
    const id = `purchase:${input.id}:part:${index + 1}`,
      period = periods[index];
    next.operations.push({
      id,
      type: "card",
      amountCents,
      description: input.description,
      operationDate: input.operationDate,
      period,
      dueDate: card.dueDay ? dateInMonth(period, card.dueDay) : undefined,
      accountId: card.accountId,
      cardId: card.id,
      purchaseId: input.id,
      cancelled: false,
      confirmed: input.confirmed,
      installmentNumber: index + 1,
      installmentCount: quote.installments.length,
    });
    return id;
  });
  let downPaymentEntryId: string | undefined;
  if (quote.downCents) {
    const pay = input.downPayment;
    if (
      !pay ||
      !dateOK(pay.date) ||
      !pay.method ||
      typeof pay.confirmed !== "boolean" ||
      !next.accounts.some(
        (a) =>
          a.id === pay.accountId && a.type !== "credit_card" && !a.archived,
      )
    )
      throw Error("Informe conta, forma e data da entrada");
    downPaymentEntryId = `purchase:${input.id}:down`;
    next.operations.push({
      id: downPaymentEntryId,
      type: "expense",
      amountCents: quote.downCents,
      description: "Entrada — " + input.description,
      operationDate: input.operationDate,
      period: pay.date.slice(0, 7),
      accountId: pay.accountId,
      purchaseId: input.id,
      cancelled: false,
    });
    if (pay.confirmed)
      next.settlements.push({
        id: `purchase:${input.id}:down-payment`,
        operationId: downPaymentEntryId,
        amountCents: quote.downCents,
        date: pay.date,
        accountId: pay.accountId,
        method: pay.method,
        note: "Entrada confirmada",
      });
  }
  next.purchases.push({
    id: input.id,
    originalCents: quote.originalCents,
    contractedCents: quote.contractedCents,
    installmentIds,
    downPaymentEntryId,
    creationKey: key,
    quote,
  });
  for (const id of installmentIds) {
    const o = next.operations.find((x) => x.id === id)!;
    const invoice = l.invoices.find(
      (x) => x.cardId === card.id && x.period === o.period,
    );
    if (invoice && invoiceBalance(l, invoice.id).paid > 0) {
      if (!input.acknowledgePaidInvoices || !dateOK(input.acknowledgementDate))
        throw Error("Fatura com pagamentos exige confirmação explícita");
      next.corrections.push({
        id: `purchase:${input.id}:paid:${id}`,
        operationId: id,
        at: input.acknowledgementDate!,
        reason: "Inclusão confirmada em fatura com pagamentos",
        previousAmountCents: 0,
        nextAmountCents: o.amountCents,
      });
    }
  }
  const result = syncInvoices(next);
  validateFinancialLedger(result);
  return result;
}
export type InstallmentChange = {
  operationId: string;
  amountCents?: number;
  period?: string;
};
export function previewInstallments(
  l: LedgerDraft,
  startId: string,
  scope: "one" | "following" | "all",
  patch: { amountCents?: number; firstPeriod?: string },
) {
  const start = l.operations.find((x) => x.id === startId);
  if (
    !start?.purchaseId ||
    start.type !== "card" ||
    !["one", "following", "all"].includes(scope)
  )
    throw Error("Parcela ou escopo inválido");
  const purchase = l.purchases.find((x) => x.id === start.purchaseId)!;
  const ordered = purchase.installmentIds.map((id) =>
    l.operations.find((o) => o.id === id)!,
  );
  const selected =
    scope === "one"
      ? [start]
      : scope === "all"
        ? ordered
        : ordered.slice(ordered.findIndex((x) => x.id === start.id));
  const changes = selected.map((o, i) => ({
    operationId: o.id,
    amountCents: patch.amountCents ?? o.amountCents,
    period: patch.firstPeriod ? monthOffset(patch.firstPeriod, i) : o.period,
  }));
  const impacts = changes.map((c) => {
    const op = l.operations.find((x) => x.id === c.operationId)!;
    const invoice = l.invoices.find((x) => x.installmentIds.includes(op.id)),
      destination = l.invoices.find(
        (x) => x.cardId === op.cardId && x.period === c.period,
      );
    return {
      ...c,
      previousAmountCents: op.amountCents,
      previousPeriod: op.period,
      paidInvoiceCents: invoice ? invoiceBalance(l, invoice.id).paid : 0,
      destinationPaidCents: destination
        ? invoiceBalance(l, destination.id).paid
        : 0,
    };
  });
  if (
    impacts.some(
      (x) => !Number.isSafeInteger(x.amountCents) || x.amountCents <= 0,
    )
  )
    throw Error("Valor de parcela inválido");
  return {
    source: JSON.stringify(l),
    purchaseId: purchase.id,
    changes: impacts,
    previousContractCents: purchase.contractedCents,
    nextContractCents: checkedSum([
      purchase.contractedCents,
      ...impacts.map((x) => x.amountCents - x.previousAmountCents),
    ]),
    requiresPaidInvoiceAcknowledgement: impacts.some(
      (x) => x.paidInvoiceCents > 0 || x.destinationPaidCents > 0,
    ),
    blockedPeriodChanges: impacts
      .filter((x) => x.paidInvoiceCents > 0 && x.period !== x.previousPeriod)
      .map((x) => x.operationId),
  };
}
export function applyInstallments(
  l: LedgerDraft,
  preview: ReturnType<typeof previewInstallments>,
  approval: {
    confirmed: boolean;
    acknowledgePaidInvoices?: boolean;
    date: string;
    reason: string;
    id: string;
  },
) {
  if (
    !approval.confirmed ||
    !dateOK(approval.date) ||
    !approval.reason.trim() ||
    JSON.stringify(l) !== preview.source
  )
    throw Error("Confirmação, motivo, data ou prévia inválidos");
  const next = structuredClone(l),
    purchase = next.purchases.find((x) => x.id === preview.purchaseId);
  if (
    !purchase ||
    new Set(preview.changes.map((x) => x.operationId)).size !==
      preview.changes.length
  )
    throw Error("Compra inválida");
  for (const c of preview.changes) {
    const o = next.operations.find((x) => x.id === c.operationId)!;
    if (
      !o ||
      !purchase.installmentIds.includes(o.id) ||
      !Number.isSafeInteger(c.amountCents) ||
      c.amountCents! <= 0 ||
      !periodOK(c.period)
    )
      throw Error("Alteração inválida");
    const invoice = l.invoices.find((x) => x.installmentIds.includes(o.id));
    if (invoice && invoiceBalance(l, invoice.id).paid > 0) {
      if (c.period !== o.period)
        throw Error(
          "Parcela de fatura com pagamento não pode mudar de competência",
        );
      if (!approval.acknowledgePaidInvoices)
        throw Error("Confirme o impacto na fatura com pagamentos");
    }
    const destination = l.invoices.find(
      (i) => i.cardId === o.cardId && i.period === c.period,
    );
    if (
      destination &&
      destination.id !== invoice?.id &&
      invoiceBalance(l, destination.id).paid > 0 &&
      !approval.acknowledgePaidInvoices
    )
      throw Error("Fatura de destino tem pagamentos; confirme o impacto");
    next.corrections.push({
      id: `${approval.id}:${o.id}`,
      operationId: o.id,
      at: approval.date,
      reason: approval.reason,
      previousAmountCents: o.amountCents,
      nextAmountCents: c.amountCents!,
    });
    o.amountCents = c.amountCents!;
    o.period = c.period!;
    const card = next.cards.find((x) => x.id === o.cardId)!;
    o.dueDate = card.dueDay ? dateInMonth(o.period, card.dueDay) : undefined;
  }
  purchase.revisions = [
    ...(purchase.revisions ?? []),
    {
      id: approval.id,
      at: approval.date,
      reason: approval.reason,
      previousCents: purchase.contractedCents,
    },
  ];
  purchase.contractedCents = checkedSum(
    [
      ...purchase.installmentIds,
      ...(purchase.downPaymentEntryId ? [purchase.downPaymentEntryId] : []),
    ].map((id) => next.operations.find((x) => x.id === id)!.amountCents),
  );
  const result = syncInvoices(next);
  validateFinancialLedger(result);
  return result;
}
export function cancelPurchase(
  l: LedgerDraft,
  id: string,
  approval: { confirmed: boolean; date: string; reason: string; id: string },
) {
  if (
    !approval.confirmed ||
    !dateOK(approval.date) ||
    !approval.reason.trim() ||
    !approval.id
  )
    throw Error("Confirme o cancelamento, data, identidade e motivo");
  const p = l.purchases.find((x) => x.id === id);
  if (!p) throw Error("Compra inexistente");
  if (p.cancelled) return l;
  const ids = [
    ...p.installmentIds,
    ...(p.downPaymentEntryId ? [p.downPaymentEntryId] : []),
  ];
  if (
    ids.some((id) => settled(l, id) > 0) ||
    l.invoices.some(
      (i) =>
        i.installmentIds.some((id) => ids.includes(id)) &&
        invoiceBalance(l, i.id).paid > 0,
    )
  )
    throw Error(
      "Compra com histórico de pagamento exige correção guiada; cancelamento direto recusado",
    );
  const next = structuredClone(l);
  const purchase = next.purchases.find((x) => x.id === id)!;
  purchase.cancelled = true;
  purchase.revisions = [
    ...(purchase.revisions ?? []),
    {
      id: approval.id,
      at: approval.date,
      reason: approval.reason,
      previousCents: purchase.contractedCents,
    },
  ];
  for (const o of next.operations.filter((x) => ids.includes(x.id)))
    o.cancelled = true;
  validateFinancialLedger(next);
  return next;
}
