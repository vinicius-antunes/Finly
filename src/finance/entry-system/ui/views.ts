import type { State, Entry } from "../../model.ts";
import { settled } from "../finance.ts";
/** UI-only adapter; these rows are never written into legacy transactions. */
export function entryViews(s: State): Entry[] {
  return [
    ...s.transactions.map((x) => ({
      ...x,
      ledgerManaged: false,
      ledgerPaidCents: undefined,
    })),
    ...(s.entryLedger?.operations ?? []).map((o) => ({
      id: o.id,
      description: o.description,
      amountCents: o.amountCents,
      period: o.period,
      legacyKind:
        o.type === "expense"
          ? ("out" as const)
          : o.type === "card"
            ? ("credit" as const)
            : o.type === "income"
              ? ("income" as const)
              : ("reimbursement" as const),
      accountId: o.accountId ?? "",
      category:
        s.entryLedger!.categories.find((c) => c.id === o.categoryId)?.name ??
        "",
      owner: s.entryLedger!.claims.some(
        (c) => c.purchaseId === o.purchaseId && o.purchaseId,
      )
        ? "third"
        : "self",
      status: o.cancelled
        ? "cancelled"
        : settled(s.entryLedger!, o.id) === o.amountCents
          ? "received"
          : settled(s.entryLedger!, o.id) > 0
            ? "partial"
            : "planned",
      confirmed: o.confirmed ?? true,
      note: [
        o.note ??
          s.entryLedger!.agreements?.find((a) => a.operationIds.includes(o.id))
            ?.terms.note ??
          "",
        s.entryLedger!.claims.find((c) => c.operationId === o.id)
          ?.personLabel ?? "",
      ]
        .filter(Boolean)
        .join(" · "),
      part: o.installmentNumber,
      parts: o.installmentCount,
      ledgerManaged: true,
      ledgerPaidCents: settled(s.entryLedger!, o.id),
    })),
  ];
}
