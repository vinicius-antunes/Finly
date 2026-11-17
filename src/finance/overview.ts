import { metrics, type State } from "./model.ts";
import {
  accountVariation,
  checkedSum,
  settlementTotals,
} from "./entry-system/finance.ts";
import { planningTotals } from "./planning/rules.ts";
/** Presentation of existing finance rules. Effective cash uses actual settlement dates; no opening bank balance is invented. */
export function overviewDetails(s: State, period: string) {
  const l = s.entryLedger,
    active =
      l?.operations.filter((o) => !o.cancelled && o.period === period) ?? [],
    legacy = s.transactions.filter((o) => o.period === period),
    paid = l ? settlementTotals(l) : new Map<string, number>();
  const salaries = active.filter((o) => o.type === "income" && o.salary);
  return {
    incomeExpected: checkedSum([
      salaries.length
        ? checkedSum(salaries.map((o) => o.amountCents))
        : s.settings.salary,
      ...active
        .filter((o) => o.type === "income" && !o.salary)
        .map((o) => o.amountCents),
      ...legacy
        .filter((o) => o.legacyKind === "income")
        .map((o) => o.amountCents),
    ]),
    expensePaid: checkedSum([
      ...active
        .filter((o) => o.type === "expense")
        .map((o) => paid.get(o.id) ?? 0),
      ...legacy
        .filter((o) => o.legacyKind === "out" && o.status === "received")
        .map((o) => o.amountCents),
    ]),
    expensePending: checkedSum([
      ...active
        .filter((o) => o.type === "expense")
        .map((o) => o.amountCents - (paid.get(o.id) ?? 0)),
      ...legacy
        .filter((o) => o.legacyKind === "out" && o.status !== "received")
        .map((o) => o.amountCents),
    ]),
    recordedCash: checkedSum([
      ...(l?.accounts
        .filter((a) => a.type !== "credit_card")
        .map((a) => accountVariation(l, a.id, period)) ?? []),
      ...legacy
        .filter((o) => o.status === "received" && o.legacyKind !== "credit")
        .map((o) => o.amountCents * (o.legacyKind === "out" ? -1 : 1)),
    ]),
    goalReserve: planningTotals(s, period).reserved,
    projection: metrics(s, period).available,
  };
}
