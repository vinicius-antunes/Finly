import type { State } from "./model.ts";
import type { Operation } from "./entry-system/contracts.ts";
import { invoiceBalance, settled } from "./entry-system/finance.ts";
/** Read-only presentation; partial invoice payments have no per-installment allocation. */
export function installmentPayment(s: State, o: Operation) {
  if (o.cancelled) return { paid: 0, remaining: 0, known: true };
  if (o.type !== "card") {
    const paid = settled(s.entryLedger!, o.id);
    return { paid, remaining: o.amountCents - paid, known: true };
  }
  const inv = s.entryLedger!.invoices.find((i) =>
    i.installmentIds.includes(o.id),
  );
  if (!inv) return { paid: 0, remaining: o.amountCents, known: false };
  const b = invoiceBalance(s.entryLedger!, inv.id);
  return b.status === "partial"
    ? { paid: 0, remaining: o.amountCents, known: false }
    : {
        paid: b.status === "paid" ? o.amountCents : 0,
        remaining: b.status === "paid" ? 0 : o.amountCents,
        known: true,
      };
}

/** Exact bounds, without inventing an allocation of shared invoice payments. */
export function pendingInstallments(s: State, ids: Set<string>) {
  const l = s.entryLedger!;
  let minimum = 0,
    maximum = 0;
  const invoices = new Set<string>();
  for (const o of l.operations.filter((o) => ids.has(o.id) && !o.cancelled)) {
    if (o.type === "card") {
      const inv = l.invoices.find((i) => i.installmentIds.includes(o.id));
      if (!inv) {
        maximum += o.amountCents;
        continue;
      }
      if (invoices.has(inv.id)) continue;
      invoices.add(inv.id);
      const b = invoiceBalance(l, inv.id),
        subset = inv.installmentIds
          .filter((id) => ids.has(id))
          .map((id) => l.operations.find((o) => o.id === id)!)
          .filter((o) => !o.cancelled)
          .reduce((n, o) => n + o.amountCents, 0);
      minimum += Math.max(0, subset - b.paid);
      maximum += Math.min(subset, b.remaining);
    } else {
      const r = installmentPayment(s, o).remaining;
      minimum += r;
      maximum += r;
    }
  }
  return { minimum, maximum };
}
