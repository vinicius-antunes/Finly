import type { State, Entry } from "../../model.ts";
import { settlementTotals } from "../finance.ts";
/** UI-only adapter; these rows are never written into legacy transactions. */
export function entryViews(s: State): Entry[] {
  const l = s.entryLedger,
    paid = l ? settlementTotals(l) : new Map<string, number>();
  const categories = new Map(l?.categories.map((c) => [c.id, c.name]) ?? []),
    claims = new Map<
      string,
      NonNullable<State["entryLedger"]>["claims"][number]
    >(),
    notes = new Map<string, string>(),
    thirdParty = new Set(
      l?.claims.flatMap((c) => (c.purchaseId ? [c.purchaseId] : [])) ?? [],
    );
  for (const c of l?.claims ?? [])
    if (!claims.has(c.operationId)) claims.set(c.operationId, c);
  for (const a of l?.agreements ?? [])
    for (const id of a.operationIds)
      if (!notes.has(id)) notes.set(id, a.terms.note);
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
      category: categories.get(o.categoryId ?? "") ?? "",
      owner: thirdParty.has(o.purchaseId ?? "") ? "third" : "self",
      status: o.cancelled
        ? "cancelled"
        : (paid.get(o.id) ?? 0) === o.amountCents
          ? "received"
          : (paid.get(o.id) ?? 0) > 0
            ? "partial"
            : "planned",
      confirmed: o.confirmed ?? true,
      note: [
        o.note ?? notes.get(o.id) ?? "",
        claims.get(o.id)?.personLabel ?? "",
      ]
        .filter(Boolean)
        .join(" · "),
      part: o.installmentNumber,
      parts: o.installmentCount,
      ledgerManaged: true,
      ledgerPaidCents: paid.get(o.id) ?? 0,
    })),
  ];
}
