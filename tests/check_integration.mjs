import assert from "node:assert/strict";
import { phase7State, phase7Draft } from "./fixtures/phase7.mjs";
import { validate, metrics } from "../src/finance/model.ts";
import { overviewDetails } from "../src/finance/overview.ts";
import { prepareEntry } from "../src/finance/entry-system/ui/draft.ts";
import {
  recordSettlement,
  recordInvoicePayment,
  recordTransfer,
} from "../src/finance/entry-system/commands.ts";
import {
  accountVariation,
  invoiceBalance,
} from "../src/finance/entry-system/finance.ts";
import {
  changeRecurrence,
  generateOccurrences,
} from "../src/finance/entry-system/credit/recurrences.ts";
import {
  previewInstallments,
  applyInstallments,
} from "../src/finance/entry-system/credit/purchases.ts";
import { ledgerChartEntries } from "../src/finance/entry-system/state.ts";
import { monthlySpending } from "../src/finance/monthlySpending.ts";
import { balance } from "../src/finance/planning/data.ts";
import { inspectFile, verifyBlob } from "../src/finance/receipts/model.ts";
let s = phase7State();
const apply = (d) => {
  s = prepareEntry(s, d).next;
  validate(s);
};
const snapshot = () => ({
  metrics: metrics(s, "2026-11"),
  overview: overviewDetails(s, "2026-11"),
  chart: monthlySpending(ledgerChartEntries(s), "2026-11"),
});
apply(
  phase7Draft(s, "income", {
    description: "Salário auditado",
    amount: "1000",
    salary: true,
  }),
);
const salary = s.entryLedger.operations[0].id;
assert.equal(overviewDetails(s, "2026-11").recordedCash, 0);
assert.equal(metrics(s, "2026-11").revenue, 100000);
for (const [id, accountId, amountCents] of [
  ["salary-a", "a", 40000],
  ["salary-b", "b", 60000],
]) {
  s.entryLedger = recordSettlement(s.entryLedger, {
    id,
    accountId,
    amountCents,
    operationId: salary,
    date: "2026-11-09",
    method: "Pix",
    note: "Sintético",
  });
  validate(s);
}
assert.equal(metrics(s, "2026-11").revenue, 100000);
assert.equal(overviewDetails(s, "2026-11").recordedCash, 100000);
assert.equal(accountVariation(s.entryLedger, "a"), 40000);
assert.equal(accountVariation(s.entryLedger, "b"), 60000);
apply(
  phase7Draft(s, "card", {
    description: "Compra exata auditada",
    amount: "1000,01",
    paymentMode: "installments",
    count: 3,
  }),
);
const purchase = s.entryLedger.purchases.at(-1),
  parts = purchase.installmentIds.map((id) =>
    s.entryLedger.operations.find((o) => o.id === id),
  );
assert.deepEqual(
  parts.map((o) => o.amountCents),
  [33333, 33333, 33335],
);
assert.deepEqual(
  parts.map((o) => o.period),
  ["2026-11", "2026-12", "2027-01"],
);
const inv = s.entryLedger.invoices.find((i) => i.period === "2026-11");
const chartBefore = snapshot().chart;
s.entryLedger = recordInvoicePayment(s.entryLedger, {
  id: "pay-invoice",
  invoiceId: inv.id,
  accountId: "a",
  amountCents: 33333,
  date: "2026-11-15",
  method: "Pix",
  note: "Sintético",
});
assert.deepEqual(snapshot().chart, chartBefore);
assert.equal(invoiceBalance(s.entryLedger, inv.id).status, "paid");
assert.equal(overviewDetails(s, "2026-11").recordedCash, 66667);
const edit = phase7Draft(s, "card", {
  description: parts[0].description,
  amount: "350",
  reason: "Correção histórica auditada",
  scope: "one",
});
const correction = prepareEntry(s, edit, parts[0].id);
assert.equal(correction.paidInvoiceImpacts[0].paid, 33333);
assert.equal(correction.paidInvoiceImpacts[0].after, 35000);
const originalPayments = structuredClone(s.entryLedger.invoicePayments);
s = correction.next;
assert.deepEqual(s.entryLedger.invoicePayments, originalPayments);
assert.equal(invoiceBalance(s.entryLedger, inv.id).remaining, 1667);
assert.throws(() =>
  applyInstallments(
    s.entryLedger,
    previewInstallments(s.entryLedger, parts[0].id, "one", { amountCents: 1 }),
    {
      id: "bad-correction",
      confirmed: true,
      date: "2026-11-16",
      reason: "inválida",
      acknowledgePaidInvoices: true,
    },
  ),
);
const people = [
  {
    id: "person-a",
    name: "Pessoa sintética A",
    amount: "40",
    mode: "single",
    rows: [],
  },
  {
    id: "person-b",
    name: "Pessoa sintética B",
    amount: "30",
    mode: "single",
    rows: [],
  },
];
// Use the UI's own full person contract and then change only the actual input fields.
const { newPerson } = await import("../src/finance/entry-system/ui/draft.ts");
apply(
  phase7Draft(s, "card", {
    description: "Compra compartilhada auditada",
    amount: "100",
    responsibility: "shared",
    people: people.map((p) => ({ ...newPerson(), ...p })),
  }),
);
const agreements = s.entryLedger.agreements.slice(-2);
for (const [i, amountCents] of [
  [0, 1000],
  [1, 2000],
]) {
  const operationId = agreements[i].operationIds[0];
  s.entryLedger = recordSettlement(s.entryLedger, {
    id: "refund-" + i,
    operationId,
    amountCents,
    date: "2026-11-16",
    accountId: i ? "b" : "a",
    method: "Pix",
    note: "",
  });
}
validate(s);
assert.equal(metrics(s, "2026-11").received, 3000);
assert.equal(metrics(s, "2026-11").pending, 4000);
assert.throws(() =>
  recordSettlement(s.entryLedger, {
    id: "overpay",
    operationId: agreements[0].operationIds[0],
    amountCents: 10000,
    date: "2026-11-16",
    accountId: "a",
    method: "Pix",
    note: "",
  }),
);
const beforeTransfer = snapshot();
s.entryLedger = recordTransfer(s.entryLedger, {
  id: "neutral-transfer",
  fromAccountId: "a",
  toAccountId: "b",
  amountCents: 500,
  date: "2026-11-16",
  confirmed: true,
  note: "",
});
assert.deepEqual(snapshot(), beforeTransfer);
apply(
  phase7Draft(s, "expense", {
    description: "Assinatura auditada",
    amount: "10",
    date: "2027-01-31",
    period: "2027-01",
    paymentMode: "recurring",
    frequency: "monthly",
    endsOn: "2027-04-30",
    generateTo: "2027-06",
  }),
);
const rec = s.entryLedger.recurrences.at(-1);
assert.deepEqual(
  rec.occurrences.map((o) => o.scheduledOn),
  ["2027-01-31", "2027-02-28", "2027-03-31", "2027-04-30"],
);
const paymentsBefore = structuredClone(s.entryLedger.settlements);
for (const [id, kind, effectiveOn, amountCents] of [
  ["rec-amount", "amount", "2027-02-28", 1500],
  ["rec-pause", "pause", "2027-03-01"],
  ["rec-resume", "resume", "2027-04-01"],
  ["rec-cancel", "cancel", "2027-04-15"],
])
  s.entryLedger = changeRecurrence(
    s.entryLedger,
    rec.id,
    { id, kind, effectiveOn, ...(amountCents ? { amountCents } : {}) },
    true,
  );
const r = s.entryLedger.recurrences.at(-1);
assert.equal(r.status, "cancelled");
assert.deepEqual(s.entryLedger.settlements, paymentsBefore);
assert.equal(
  s.entryLedger.operations.find(
    (o) => o.expectedDate === "2027-03-31" && o.recurrenceId === r.id,
  ).cancelled,
  true,
);
s.entryLedger = generateOccurrences(
  s.entryLedger,
  r.id,
  "2027-01-01",
  "2027-06-01",
);
assert.equal(s.entryLedger.recurrences.at(-1).occurrences.length, 4);
s.planning.goals.push({
  id: "goal",
  name: "Objetivo sintético",
  category: "Casa",
  target: 10000,
  monthly: 1000,
  deadline: "",
  note: "",
  status: "active",
  months: {},
  movements: [
    {
      id: "goal-deposit",
      delta: 8000,
      date: "2026-11-01",
      period: "2026-11",
      note: "Aporte manual sintético",
    },
  ],
});
assert.equal(overviewDetails(s, "2026-11").goalReserve, 8000);
const beforeReserve = snapshot();
const planned = prepareEntry(
  s,
  phase7Draft(s, "expense", {
    description: "Compra com reserva auditada",
    amount: "100",
    goalId: "goal",
    useReserve: "40",
    reserveConfirmed: true,
  }),
);
assert.deepEqual(snapshot(), beforeReserve);
s = planned.next;
assert.equal(balance(s.planning.goals[0]), 4000);
assert.equal(s.settings.reserve, 20000);
assert.equal(overviewDetails(s, "2026-11").goalReserve, 4000);
validate(s);
const clone = JSON.parse(JSON.stringify(s));
validate(clone);
assert.deepEqual(
  overviewDetails(clone, "2026-11"),
  overviewDetails(s, "2026-11"),
);
const dup = prepareEntry(
  s,
  phase7Draft(s, "income", {
    description: "Salário auditado",
    amount: "1000",
    salary: true,
  }),
);
assert(dup.complex && dup.warnings.length);
assert.equal(
  dup.next.entryLedger.operations.length,
  s.entryLedger.operations.length + 1,
);
s.entryLedger.operations.push({
  id: "last-account",
  type: "income",
  description: "Conta sugerida sintética",
  amountCents: 1,
  period: "2026-11",
  accountId: "b",
  cancelled: false,
});
const { initialDraft } =
  await import("../src/finance/entry-system/ui/draft.ts");
assert.equal(initialDraft(s, "income", "2026-11").accountId, "b");
const b = new Blob(["%PDF-1.4\nobj\nendobj\n%%EOF\n"], {
    type: "application/pdf",
  }),
  pending = await inspectFile(b, "auditado.pdf", "application/pdf");
let reads = 0;
const original = b.arrayBuffer.bind(b);
b.arrayBuffer = () => {
  reads++;
  return original();
};
await verifyBlob(
  { ...pending.receipt, target: { kind: "operation", id: salary } },
  b,
);
assert.equal(reads, 1);
const customized = phase7Draft(s, "card", {
  amount: "100",
  paymentMode: "installments",
  count: 3,
  customInstallments: [
    { amount: "20", period: "2026-11" },
    { amount: "30", period: "2027-01" },
    { amount: "50", period: "2027-03" },
  ],
});
const cp = prepareEntry(s, customized);
assert.deepEqual(
  cp.next.entryLedger.purchases.at(-1).quote.installments,
  [2000, 3000, 5000],
);
assert.deepEqual(
  cp.next.entryLedger.purchases
    .at(-1)
    .installmentIds.map(
      (id) => cp.next.entryLedger.operations.find((o) => o.id === id).period,
    ),
  ["2026-11", "2027-01", "2027-03"],
);
assert.throws(() =>
  prepareEntry(s, {
    ...customized,
    customInstallments: [
      { amount: "19", period: "2026-11" },
      ...customized.customInstallments.slice(1),
    ],
  }),
);
const { currentSnapshot } = await import("../src/finance/receipts/storage.ts");
const pretty = JSON.stringify(s, null, 2);
const originalStorage = globalThis.localStorage;
globalThis.localStorage = { getItem: () => pretty };
assert.equal(currentSnapshot(s), pretty);
assert.throws(() => currentSnapshot({ ...s, revision: 999 }));
globalThis.localStorage = originalStorage;
console.log(
  "PASS Fase 7: salário parcial em contas distintas, centavos/fechamento/quitação neutra, correção paga com impacto, múltiplos responsáveis/teto/parciais, transferência neutra, recorrência 31/pausa/retomada/fim/sem pagamentos, cofrinho preservado, JSON equivalente, aviso real de duplicata, última conta e verificação binária sem leitura duplicada",
);
