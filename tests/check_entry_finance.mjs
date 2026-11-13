import assert from "node:assert/strict";
import { empty, validate, metrics } from "../src/finance/model.ts";
import { prepareBackup, needsAcknowledgment } from "../src/finance/backup.ts";
import { save } from "../src/finance/storage.ts";
import { emptyLedgerDraft } from "../src/finance/entry-system/contracts.ts";
import {
  validateFinancialLedger,
  operationBalance,
  invoiceBalance,
  accountVariation,
  combinedInvoiceStatus,
} from "../src/finance/entry-system/finance.ts";
import {
  postOperation,
  recordSettlement,
  recordInvoicePayment,
  recordTransfer,
  confirmTransfer,
  cancelOperation,
  correctOperation,
  deleteOperation,
  possibleDuplicates,
} from "../src/finance/entry-system/commands.ts";
import {
  activateEntryLedger,
  persistEntryLedger,
  ledgerChartEntries,
} from "../src/finance/entry-system/state.ts";
import { previewEntryMigration } from "../src/finance/entry-system/migration.ts";
import { monthlySpending } from "../src/finance/monthlySpending.ts";
let source = empty();
source.settings.salary = 100000;
source.settings.cushion = 1000;
const before = JSON.stringify(source),
  baseline = metrics(source, "2026-11");
const preview = await previewEntryMigration(source);
await assert.rejects(
  activateEntryLedger(source, preview, {
    backupExported: false,
    confirmed: true,
  }),
);
let state = await activateEntryLedger(source, preview, {
  backupExported: true,
  confirmed: true,
});
assert.equal(JSON.stringify(source), before);
assert.deepEqual(metrics(state, "2026-11"), baseline);
let l = emptyLedgerDraft();
l.accounts = [
  { id: "cash-a", name: "Conta sintética A", type: "bank", archived: false },
  { id: "cash-b", name: "Conta sintética B", type: "cash", archived: false },
  {
    id: "card-account",
    name: "Cartão sintético",
    type: "credit_card",
    archived: false,
  },
];
l.cards = [
  { id: "card-a", name: "Cartão sintético", accountId: "card-account" },
];
const op = (id, type, amountCents, extra = {}) => ({
  id,
  type,
  description: "Registro sintético",
  amountCents,
  operationDate: "2026-11-13",
  period: "2026-11",
  cancelled: false,
  ...extra,
});
for (const x of [
  op("expense", "expense", 10000),
  op("income", "income", 5000),
  op("salary", "income", 100000, { salary: true }),
  op("refund", "reimbursement", 2000),
  op("card-op", "card", 6000, { cardId: "card-a", confirmed: true }),
])
  l = postOperation(l, x);
l.invoices = [
  {
    id: "invoice-a",
    cardId: "card-a",
    period: "2026-11",
    installmentIds: ["card-op"],
  },
];
validateFinancialLedger(l);
const settle = (id, operationId, amountCents, extra = {}) => ({
  id,
  operationId,
  amountCents,
  date: "2026-11-13",
  accountId: "cash-a",
  method: "Pix",
  note: "Sintético",
  ...extra,
});
l = recordSettlement(l, settle("s1", "expense", 3000));
assert.equal(operationBalance(l, "expense").status, "partial");
assert.throws(() => recordSettlement(l, settle("bad", "expense", 8000)));
assert.throws(() => cancelOperation(l, "expense"));
assert.deepEqual(recordSettlement(l, settle("s1", "expense", 3000)), l);
assert.throws(() => recordSettlement(l, settle("s1", "expense", 4000)));
l = recordSettlement(
  l,
  settle("s2", "expense", 7000, { accountId: "cash-b", method: "Dinheiro" }),
);
assert.equal(operationBalance(l, "expense").status, "settled");
assert.throws(() => deleteOperation(l, "expense"));
l = recordSettlement(
  l,
  settle("reverse-s2", "expense", 7000, {
    accountId: "cash-b",
    method: "Dinheiro",
    reversesId: "s2",
  }),
);
assert.equal(operationBalance(l, "expense").paid, 3000);
assert.throws(() =>
  recordSettlement(
    l,
    settle("reverse-again", "expense", 7000, {
      accountId: "cash-b",
      reversesId: "s2",
    }),
  ),
);
l = recordSettlement(l, settle("i1", "income", 2000));
l = recordSettlement(l, settle("r1", "refund", 500));
state = { ...state, entryLedger: l };
validate(state);
let m = metrics(state, "2026-11");
assert.equal(m.income, 2000);
assert.equal(m.received, 500);
assert.equal(m.pending, 1500);
assert.equal(m.cash, 10000);
assert.equal(m.available, 85500);
l = recordSettlement(l, settle("salary-1", "salary", 40000));
state = { ...state, entryLedger: l };
m = metrics(state, "2026-11");
assert.equal(m.revenue, 42500);
assert.equal(m.income, 42000);
assert.equal(m.available, 25500);
assert.equal(metrics(state, "2026-12").revenue, 100000);
const current = JSON.stringify(l);
const transfer = {
  id: "t1",
  fromAccountId: "cash-a",
  toAccountId: "cash-b",
  amountCents: 10000,
  date: "2026-11-13",
  note: "Sintético",
  confirmed: false,
};
l = recordTransfer(l, transfer);
const deltaA = accountVariation(l, "cash-a"),
  deltaB = accountVariation(l, "cash-b");
l = confirmTransfer(l, "t1");
assert.equal(accountVariation(l, "cash-a"), deltaA - 10000);
assert.equal(accountVariation(l, "cash-b"), deltaB + 10000);
assert.deepEqual(confirmTransfer(l, "t1"), l);
assert.equal(
  metrics({ ...state, entryLedger: l }, "2026-11").available,
  m.available,
);
assert.throws(() =>
  recordTransfer(l, { ...transfer, id: "bad-t", toAccountId: "cash-a" }),
);
assert.notEqual(JSON.stringify(l), current);
const pay = (id, amountCents, extra = {}) => ({
  id,
  invoiceId: "invoice-a",
  amountCents,
  accountId: "cash-a",
  date: "2026-11-13",
  method: "Pix",
  note: "",
  ...extra,
});
l = recordInvoicePayment(l, pay("p1", 2000));
assert.equal(invoiceBalance(l, "invoice-a").status, "partial");
assert.equal(
  combinedInvoiceStatus(l, "2026-11", 0, undefined),
  "Parcialmente paga",
);
l = recordInvoicePayment(l, pay("p2", 4000));
assert.equal(invoiceBalance(l, "invoice-a").status, "paid");
assert.throws(() => recordInvoicePayment(l, pay("bad-pay", 1)));
assert.deepEqual(recordInvoicePayment(l, pay("p2", 4000)), l);
assert.equal(
  metrics({ ...state, entryLedger: l }, "2026-11").available,
  m.available,
);
assert.throws(() => cancelOperation(l, "card-op"));
const correction = {
  id: "c1",
  operationId: "card-op",
  at: "2026-11-13",
  reason: "Correção sintética confirmada",
  previousAmountCents: 6000,
  nextAmountCents: 7000,
};
assert.throws(() => correctOperation(l, correction));
l = correctOperation(l, correction, true);
assert.equal(invoiceBalance(l, "invoice-a").paid, 6000);
assert.equal(invoiceBalance(l, "invoice-a").remaining, 1000);
assert.deepEqual(correctOperation(l, correction, true), l);
assert.equal(l.corrections.length, 1);
assert.throws(() =>
  correctOperation(
    l,
    {
      ...correction,
      id: "c2",
      previousAmountCents: 7000,
      nextAmountCents: 5000,
    },
    true,
  ),
);
l = recordInvoicePayment(l, pay("reverse-pay", 4000, { reversesId: "p2" }));
assert.equal(invoiceBalance(l, "invoice-a").paid, 2000);
const dup = op("similar", "income", 5000);
assert.ok(possibleDuplicates(l, dup).includes("income"));
l = postOperation(l, dup);
assert.equal(l.operations.filter((x) => x.type === "income").length, 3);
l = cancelOperation(l, "similar");
assert.equal(operationBalance(l, "similar").status, "cancelled");
state = { ...state, entryLedger: l };
validate(state);
assert.equal(
  monthlySpending(ledgerChartEntries(state), "2026-11")[5].total,
  17000,
);
assert.equal(
  (await prepareBackup(JSON.stringify(state))).entryLedger.operations.length,
  l.operations.length,
);
assert.equal((await prepareBackup(before)).entryLedger, undefined);
assert.ok(needsAcknowledgment({ raw: "", state, invalid: false }));
assert.equal(JSON.stringify(source), before);
let stored = JSON.stringify(state);
globalThis.localStorage = {
  getItem: () => stored,
  setItem: (key, v) => {
    stored = v;
  },
};
const snapshot = stored;
const next = postOperation(l, op("new", "expense", 10));
const committed = persistEntryLedger(state, next, snapshot);
assert.equal(committed.state.revision, state.revision + 1);
assert.equal(
  JSON.parse(stored).entryLedger.operations.length,
  next.operations.length,
);
assert.throws(() => persistEntryLedger(state, next, snapshot));
stored = snapshot;
globalThis.localStorage.setItem = () => {
  throw Error("Quota");
};
assert.throws(() => persistEntryLedger(state, next, snapshot));
assert.equal(stored, snapshot);
assert.throws(() =>
  save(
    {
      ...state,
      entryLedger: {
        ...l,
        settlements: [...l.settlements, settle("over", "income", 999999)],
      },
    },
    snapshot,
  ),
);
assert.equal(stored, snapshot);
console.log(
  "PASS: opt-in activation, legacy compatibility, partial/total/reversed settlements, overpay/duplicate refusal, salary replacement, transfer neutrality/account deltas, invoice partial payments without double expense, paid invoice audit, duplicate warnings, charts, JSON roundtrip and atomic storage/concurrency/quota",
);

const { simulate } = await import("../src/finance/planning/rules.ts");
const planningState = {
  ...state,
  settings: { ...state.settings, installmentCap: 7500 },
};
const goal = {
  id: "synthetic-goal",
  name: "Meta sintética",
  category: "Casa",
  target: 1000,
  monthly: 100,
  deadline: "",
  note: "",
  status: "active",
  movements: [],
  months: {},
};
assert.equal(
  simulate(planningState, goal, {
    price: 1000,
    down: 0,
    parts: 1,
    rate: 0,
    period: "2026-11",
  }).impact[0].capExceeded,
  true,
);

assert.equal(
  combinedInvoiceStatus(emptyLedgerDraft(), "2026-11", 0, undefined),
  "A confirmar",
);
