import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { migrate, metrics, csv } from "../src/finance/model.ts";
import {
  initialFilters,
  selectEntries,
  entrySituation,
  toggleSituation,
  filteredTotals,
  canonicalCategory,
  categoryOptions,
} from "../src/finance/entries.ts";
const s = await migrate(
  readFileSync(
    new URL("./fixtures/synthetic-backup-v1.json", import.meta.url),
    "utf8",
  ),
);
const original = JSON.stringify(s),
  credit = s.transactions[0],
  refund = s.transactions[1];
assert.equal(entrySituation(credit).label, "Confirmada");
const forecast = toggleSituation(credit);
assert.equal(forecast.confirmed, false);
assert.equal(forecast.status, credit.status);
assert.deepEqual(toggleSituation(forecast), credit);
for (const kind of ["income", "out", "reimbursement"]) {
  const x = { ...refund, legacyKind: kind };
  assert.equal(toggleSituation(x).status, "received");
  assert.deepEqual(toggleSituation(toggleSituation(x)), {
    ...x,
    status: "planned",
  });
}
assert.equal(
  entrySituation({ ...refund, legacyKind: "out" }).label,
  "Pendente",
);
assert.equal(
  entrySituation({ ...refund, legacyKind: "income", status: "received" }).label,
  "Recebida",
);
const f = {
  ...initialFilters,
  query: "PARCELA",
  min: "20",
  max: "30",
  category: "",
  kind: "credit",
};
assert.equal(selectEntries(s.transactions, "2026-11", f).length, 1);
assert.equal(selectEntries(s.transactions, "2026-12", f).length, 0);
assert.equal(
  selectEntries(s.transactions, "2026-12", { ...f, all: true }).length,
  1,
);
assert.throws(() =>
  selectEntries(s.transactions, "2026-11", { ...f, min: "90", max: "1" }),
);
assert.equal(filteredTotals(s.transactions).refundReceived, 0);
assert.equal(filteredTotals(s.transactions).refundPending, 2500);
assert.equal(filteredTotals(s.transactions).credit, 2500);
assert.equal(filteredTotals(s.transactions).income, 0);
const categories = [
  { ...credit, category: "Alimentação" },
  { ...refund, category: " alimentação " },
];
assert.equal(canonicalCategory(" ALIMENTACAO ", categories), "Alimentação");
assert.equal(
  categoryOptions(categories).filter((x) =>
    x.toLowerCase().includes("alimenta"),
  ).length,
  1,
);
assert.equal(JSON.stringify(s), original);
const paid = {
  ...s,
  invoiceStatuses: { ...s.invoiceStatuses, "2026-11": "paid" },
  transactions: [forecast, refund],
};
assert.equal(metrics(paid, "2026-11").invoice, metrics(s, "2026-11").invoice);
assert.ok(csv(selectEntries(s.transactions, "2026-11", f)).includes(credit.id));
assert.ok(
  !csv(selectEntries(s.transactions, "2026-11", f)).includes(refund.id),
);
console.log(
  "PASS: combined read-only filters, normalized suggestions, independent totals, contextual status without schema changes and invoice isolation",
);
