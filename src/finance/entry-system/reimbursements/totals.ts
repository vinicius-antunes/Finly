import type { State } from "../../model.ts";
import { checkedSum, settled } from "../finance.ts";
/** All periods, matching the reimbursement page's existing global summary. */
export function reimbursementTotals(s: State) {
  const legacy = s.transactions.filter((t) => t.legacyKind === "reimbursement");
  const operations =
    s.entryLedger?.operations.filter(
      (o) => o.type === "reimbursement" && !o.cancelled,
    ) ?? [];
  const received = checkedSum([
    ...legacy.filter((t) => t.status === "received").map((t) => t.amountCents),
    ...operations.map((o) => settled(s.entryLedger!, o.id)),
  ]);
  const total = checkedSum([
    ...legacy.map((t) => t.amountCents),
    ...operations.map((o) => o.amountCents),
  ]);
  return { received, pending: total - received };
}
