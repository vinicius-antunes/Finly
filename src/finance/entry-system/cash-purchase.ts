import type { LedgerDraft, Purchase } from "./contracts.ts";
import { validateFinancialLedger } from "./finance.ts";
import { dateOK, periodOK } from "./schema.ts";
export type CashPurchaseInput = {
  id: string;
  description: string;
  operationDate: string;
  confirmed: boolean;
  responsibility?: Purchase["responsibility"];
  cash: {
    paymentDate?: string;
    amountCents: number;
    accountId: string;
    method: string;
    period: string;
  };
};
/** Single expense, with optional actual settlement; reserve release is never income. */
export function registerCashPurchase(l: LedgerDraft, input: CashPurchaseInput) {
  const key = JSON.stringify(input),
    old = l.purchases.find((p) => p.id === input.id);
  if (old) {
    if (old.creationKey !== key) throw Error("ID da compra reutilizado");
    return l;
  }
  const c = input.cash;
  if (
    !dateOK(input.operationDate) ||
    (c.paymentDate !== undefined && !dateOK(c.paymentDate)) ||
    !periodOK(c.period) ||
    !c.method.trim() ||
    typeof input.confirmed !== "boolean" ||
    !Number.isSafeInteger(c.amountCents) ||
    c.amountCents <= 0 ||
    !l.accounts.some(
      (a) => a.id === c.accountId && !a.archived && a.type !== "credit_card",
    )
  )
    throw Error("Compra à vista inválida");
  const next = structuredClone(l),
    id = `purchase:${input.id}:cash`;
  next.purchases.push({
    id: input.id,
    responsibility: input.responsibility,
    originalCents: c.amountCents,
    contractedCents: c.amountCents,
    installmentIds: [],
    downPaymentEntryId: id,
    creationKey: key,
  });
  next.operations.push({
    id,
    type: "expense",
    description: input.description,
    amountCents: c.amountCents,
    operationDate: input.operationDate,
    period: c.period,
    accountId: c.accountId,
    purchaseId: input.id,
    cancelled: false,
  });
  if (input.confirmed)
    next.settlements.push({
      id: `payment:${input.id}:cash`,
      operationId: id,
      amountCents: c.amountCents,
      accountId: c.accountId,
      method: c.method,
      date: c.paymentDate ?? input.operationDate,
      note: "Compra à vista confirmada",
    });
  validateFinancialLedger(next);
  return next;
}
