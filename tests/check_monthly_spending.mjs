import assert from "node:assert/strict";
import { monthlySpending } from "../src/finance/monthlySpending.ts";
const entry = (period, legacyKind, amountCents, confirmed = true) => ({
  id: crypto.randomUUID(),
  period,
  legacyKind,
  amountCents,
  confirmed,
});
const entries = [
  entry("2026-11", "credit", 2500),
  entry("2026-12", "credit", 2500),
  entry("2026-11", "credit", 9999, false),
  entry("2026-11", "out", 1000),
  entry("2026-11", "income", 90000),
  entry("2026-11", "reimbursement", 2500),
];
const raw = JSON.stringify(entries),
  series = monthlySpending(entries, "2026-11");
assert.equal(series.length, 6);
assert.deepEqual(
  series.map((x) => x.period),
  ["2026-06", "2026-07", "2026-08", "2026-09", "2026-10", "2026-11"],
);
assert.equal(series[5].total, 3500);
assert.ok(series.slice(0, 5).every((x) => x.total === 0));
assert.deepEqual(
  monthlySpending(entries, "2027-01").map((x) => x.period),
  ["2026-08", "2026-09", "2026-10", "2026-11", "2026-12", "2027-01"],
);
assert.equal(monthlySpending(entries, "2027-01")[4].total, 2500);
assert.equal(JSON.stringify(entries), raw);
console.log(
  "PASS: six months/year rollover/zero months, installment competence, confirmed-only cards, no income/refund/payment double count, immutable inputs",
);
