import assert from "node:assert/strict";
import { empty, validate, metrics } from "../src/finance/model.ts";
import { prepareBackup, needsAcknowledgment } from "../src/finance/backup.ts";
import { balance, validatePlanning } from "../src/finance/planning/data.ts";
import {
  move,
  monthly,
  undo,
  forecast,
  planningTotals,
  simulate,
  purchase,
} from "../src/finance/planning/rules.ts";
const date = "2026-11-13",
  p = "2026-11";
let s = empty();
s.settings.salary = 50000;
const original = JSON.stringify(s);
const goal = () => ({
  id: crypto.randomUUID(),
  name: "Objetivo sintético",
  category: "Casa",
  target: 300000,
  monthly: 15000,
  deadline: "",
  note: "",
  status: "active",
  movements: [],
  months: {},
});
let g = goal();
assert.equal(balance(g), 0);
g = move(g, 20000, date, p, "Inicial");
g = monthly(g, 15000, date, p);
assert.equal(balance(g), 35000);
assert.throws(() => monthly(g, 15000, date, p));
assert.throws(() => move(g, -40000, date, p, "Inválida"));
let undone = undo(g, g.movements[1].id, date, p);
assert.equal(balance(undone), 20000);
assert.throws(() => undo(undone, g.movements[1].id, date, p));
assert.equal(forecast(g, p).months, 18);
let b = move(goal(), 5000, date, p, "Segundo");
s = { ...s, planning: { version: 1, goals: [g, b] } };
validate(s);
assert.equal(planningTotals(s, p).reserved, 40000);
assert.equal(planningTotals(s, p).free, 10000 - s.settings.cushion);
assert.equal(
  planningTotals(s, "2026-12").free,
  metrics(s, "2026-12").available,
);
assert.equal(s.settings.reserve, 0);
assert.equal(s.transactions.length, 0);
const v = { price: 100000, down: 10000, parts: 3, rate: 1, period: p };
const sim = simulate(s, g, v);
assert.equal(sim.per, 30900);
assert.equal(sim.total, 102700);
assert.equal(sim.impact.length, 3);
assert.equal(sim.impact[0].card, 30900);
assert.equal(sim.impact[0].capExceeded, true);
const raw = JSON.stringify(s);
simulate(s, g, { ...v, cash: true });
assert.equal(JSON.stringify(s), raw);
let bought = purchase(s, g, v, true, date);
validate(bought);
assert.equal(bought.transactions.length, 4);
assert.equal(balance(bought.planning.goals[0]), 25000);
assert.throws(() => purchase(bought, g, v, true, date));
assert.equal(bought.planning.goals[0].purchaseIds.length, 4);
assert.equal(
  (await prepareBackup(JSON.stringify(bought))).planning.goals.length,
  2,
);
assert.equal((await prepareBackup(original)).planning, undefined);
assert.ok(
  needsAcknowledgment({ raw: JSON.stringify(s), state: s, invalid: false }),
);
assert.throws(() =>
  validatePlanning({
    ...s.planning,
    goals: [{ ...g, movements: [...g.movements, g.movements[0]] }],
  }),
);
assert.throws(() =>
  validatePlanning({ ...s.planning, goals: [{ ...g, target: 1.5 }] }),
);
assert.throws(() =>
  validatePlanning({
    ...s.planning,
    goals: [{ ...g, movements: [{ ...g.movements[0], delta: -1 }] }],
  }),
);
console.log(
  "PASS: optional v2 compatibility, multiple goals, confirmed monthly idempotence, withdrawals/undo/overdraft, cents/history validation, period allocations, immutable simulations, simple interest, cap aggregation, confirmed purchase linked rows/no duplicates and backup roundtrip",
);

const cash = purchase(
  s,
  g,
  { ...v, cash: true, price: 20000, down: 20000, parts: 1 },
  true,
  date,
);
validate(cash);
assert.equal(cash.transactions.length, 1);
assert.equal(cash.transactions[0].legacyKind, "out");
assert.equal(cash.transactions[0].amountCents, 20000);
const offline = purchase(s, g, v, false, date);
assert.equal(offline.transactions.length, s.transactions.length);
assert.equal(balance(offline.planning.goals[0]), 25000);
const corrected = move(
  undo(g, g.movements[1].id, date, p),
  10000,
  date,
  p,
  "Correção",
);
assert.equal(balance(corrected), 30000);
validatePlanning({ version: 1, goals: [corrected] });
for (const status of ["paused", "cancelled", "archived"]) {
  validatePlanning({ version: 1, goals: [{ ...g, status }] });
  assert.equal(balance({ ...g, status }), 35000);
}

const { initialize } = await import("../src/finance/storage.ts");
let stored = JSON.stringify({
  ...empty(),
  planning: {
    version: 1,
    goals: [{ ...g, movements: [{ ...g.movements[0], delta: -10 }] }],
  },
});
const corrupt = stored;
globalThis.localStorage = {
  getItem: () => stored,
  setItem: (k, v) => {
    stored = v;
  },
};
assert.throws(() => initialize());
assert.equal(stored, corrupt);
const archived={...bought,planning:{...bought.planning,goals:bought.planning.goals.map(x=>x.id===g.id?{...x,status:'archived'}:x)}};validate(archived);assert.throws(()=>purchase(archived,archived.planning.goals[0],v,true,date));
