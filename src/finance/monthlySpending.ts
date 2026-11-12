import type { Entry } from "./model";
/** Registered cash expenses (including pending) plus confirmed card installments.
 * Invoice payments, income and reimbursements never enter this series. */
export function monthlySpending(entries: Entry[], period: string) {
  const [year, month] = period.split("-").map(Number);
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(Date.UTC(year, month - 6 + i, 1));
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    return {
      period: key,
      label: d.toLocaleDateString("pt-BR", { month: "short", timeZone: "UTC" }),
      total: entries
        .filter(
          (x) =>
            x.period === key &&
            (x.legacyKind === "out" ||
              (x.legacyKind === "credit" && x.confirmed)),
        )
        .reduce((n, x) => n + x.amountCents, 0),
    };
  });
}
