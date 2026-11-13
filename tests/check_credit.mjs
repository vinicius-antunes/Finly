import assert from "node:assert/strict";
import { emptyLedgerDraft } from "../src/finance/entry-system/contracts.ts";
import {
  validateFinancialLedger,
  invoiceBalance,
  ledgerProjection,
} from "../src/finance/entry-system/finance.ts";
import { recordInvoicePayment } from "../src/finance/entry-system/commands.ts";
import {
  firstInvoice,
  configureCard,
} from "../src/finance/entry-system/credit/dates.ts";
import { quotePurchase } from "../src/finance/entry-system/credit/quote.ts";
import {
  registerPurchase,
  previewInstallments,
  applyInstallments,
  cancelPurchase,
} from "../src/finance/entry-system/credit/purchases.ts";
import {
  registerRecurrence,
  generateOccurrences,
  changeRecurrence,
} from "../src/finance/entry-system/credit/recurrences.ts";
import { empty, metrics, validate } from "../src/finance/model.ts";
import { prepareBackup } from "../src/finance/backup.ts";
let l = emptyLedgerDraft();
l.accounts = [
  { id: "cash", name: "Conta sintética", type: "bank", archived: false },
  {
    id: "ca",
    name: "Cartão A sintético",
    type: "credit_card",
    archived: false,
  },
  {
    id: "cb",
    name: "Cartão B sintético",
    type: "credit_card",
    archived: false,
  },
];
const a = {
    id: "a",
    name: "Cartão A",
    accountId: "ca",
    closingDay: 10,
    dueDay: 20,
    onClosingDay: "next",
    archived: false,
  },
  b = {
    id: "b",
    name: "Cartão B",
    accountId: "cb",
    closingDay: 25,
    dueDay: 5,
    onClosingDay: "current",
    archived: false,
  };
l = configureCard(configureCard(l, a), b);
assert.equal(firstInvoice(a, "2026-11-09").period, "2026-11");
assert.equal(firstInvoice(a, "2026-11-10").period, "2026-12");
assert.equal(
  firstInvoice({ ...a, onClosingDay: "current" }, "2026-11-10").period,
  "2026-11",
);
assert.equal(firstInvoice(a, "2026-12-11").period, "2027-01");
assert.equal(firstInvoice(b, "2026-11-20").period, "2026-12");
assert.equal(firstInvoice(b, "2026-11-26").period, "2027-01");
assert.equal(
  firstInvoice({ ...a, closingDay: 31, dueDay: 5 }, "2024-02-29").period,
  "2024-04",
);
assert.equal(firstInvoice(a, "2026-11-09", "2027-02").period, "2027-02");
assert.throws(() =>
  firstInvoice(
    { id: "unknown", name: "Legado", accountId: "ca" },
    "2026-11-09",
  ),
);
assert.equal(
  firstInvoice(
    { id: "unknown", name: "Legado", accountId: "ca" },
    "2026-11-09",
    "2026-12",
  ).dueDate,
  undefined,
);
assert.deepEqual(
  quotePurchase({ mode: "total", valueCents: 10000, count: 3 }).installments,
  [3333, 3333, 3334],
);
assert.equal(
  quotePurchase({ mode: "installment", valueCents: 10000, count: 12 })
    .contractedCents,
  120000,
);
assert.equal(
  quotePurchase({
    mode: "total",
    valueCents: 100000,
    count: 3,
    interest: { method: "simple-monthly", ratePercent: "1" },
  }).contractedCents,
  103000,
);
assert.equal(
  quotePurchase({
    mode: "total",
    valueCents: 100000,
    count: 3,
    interest: { method: "compound-monthly", ratePercent: "1" },
  }).contractedCents,
  103030,
);
const final = quotePurchase({
  mode: "total",
  valueCents: 100000,
  count: 3,
  interest: { method: "simple-monthly", ratePercent: "1" },
  finalCents: 104000,
});
assert.equal(final.divergenceCents, 1000);
assert.equal(
  final.installments.reduce((a, b) => a + b, 0),
  104000,
);
assert.deepEqual(
  quotePurchase({
    mode: "total",
    valueCents: 10000,
    count: 3,
    customInstallments: [3000, 3000, 4000],
  }).installments,
  [3000, 3000, 4000],
);
assert.throws(() =>
  quotePurchase({
    mode: "total",
    valueCents: 10000,
    count: 3,
    customInstallments: [3000, 3000, 3000],
  }),
);
assert.throws(() =>
  quotePurchase({ mode: "total", valueCents: 10000, count: 0 }),
);
assert.throws(() =>
  quotePurchase({
    mode: "total",
    valueCents: 10000,
    count: 3,
    downCents: 10001,
  }),
);
assert.throws(() => quotePurchase({ mode: "total", valueCents: 1, count: 3 }));
assert.throws(() =>
  quotePurchase({
    mode: "total",
    valueCents: Number.MAX_SAFE_INTEGER,
    count: 120,
    interest: { method: "compound-monthly", ratePercent: "100" },
  }),
);
const input = {
  id: "purchase-a",
  description: "Compra sintética",
  cardId: "a",
  operationDate: "2026-11-09",
  confirmed: true,
  quote: { mode: "total", valueCents: 200000, count: 5, downCents: 50000 },
  downPayment: {
    accountId: "cash",
    method: "Pix",
    date: "2026-11-09",
    confirmed: true,
  },
};
l = registerPurchase(l, input);
assert.deepEqual(registerPurchase(l, input), l);
assert.equal(l.operations.length, 6);
assert.equal(l.settlements.length, 1);
assert.deepEqual(
  l.operations.filter((x) => x.type === "card").map((x) => x.amountCents),
  [30000, 30000, 30000, 30000, 30000],
);
assert.equal(
  ledgerProjection(l, "2026-11").cash + ledgerProjection(l, "2026-11").invoice,
  80000,
);
l = registerPurchase(l, {
  ...input,
  id: "purchase-b",
  cardId: "b",
  quote: { mode: "total", valueCents: 9000, count: 1 },
  downPayment: undefined,
});
assert.equal(l.invoices.filter((x) => x.cardId === "b").length, 1);
assert.equal(l.invoices.find((x) => x.cardId === "b").period, "2026-12");
assert.ok(
  l.invoices
    .find((x) => x.cardId === "b")
    .installmentIds.every(
      (id) => l.operations.find((o) => o.id === id).cardId === "b",
    ),
);
const ids = l.purchases[0].installmentIds.slice(),
  preview = previewInstallments(l, ids[2], "following", {
    amountCents: 31000,
    firstPeriod: "2027-02",
  });
assert.equal(preview.changes.length, 3);
const old = JSON.stringify(l);
assert.throws(() =>
  applyInstallments(l, preview, {
    confirmed: false,
    date: "2026-11-10",
    reason: "Teste",
    id: "adjust",
  }),
);
assert.equal(JSON.stringify(l), old);
l = applyInstallments(l, preview, {
  confirmed: true,
  date: "2026-11-10",
  reason: "Revisão contratual sintética",
  id: "adjust",
});
assert.deepEqual(l.purchases[0].installmentIds, ids);
assert.equal(l.operations.find((x) => x.id === ids[0]).period, "2026-11");
assert.equal(l.operations.find((x) => x.id === ids[2]).period, "2027-02");
assert.equal(l.purchases[0].contractedCents, 203000);
const invoice = l.invoices.find(
  (x) => x.cardId === "a" && x.period === "2026-11",
);
l = recordInvoicePayment(l, {
  id: "payment",
  invoiceId: invoice.id,
  amountCents: 30000,
  date: "2026-11-20",
  accountId: "cash",
  method: "Pix",
  note: "",
});
assert.equal(invoiceBalance(l, invoice.id).status, "paid");
const paidPreview = previewInstallments(l, ids[0], "one", {
  firstPeriod: "2026-12",
});
assert.throws(() =>
  applyInstallments(l, paidPreview, {
    confirmed: true,
    acknowledgePaidInvoices: true,
    date: "2026-11-21",
    reason: "Teste",
    id: "invalid",
  }),
);
assert.throws(() =>
  cancelPurchase(l, "purchase-a", {
    confirmed: true,
    date: "2026-11-21",
    reason: "Cancelamento sintético",
    id: "cancel-paid",
  }),
);
const totals = ledgerProjection(l, "2026-11");
assert.equal(totals.invoice, 30000);
const cardBefore = JSON.stringify(l.operations);
l = configureCard(l, { ...a, closingDay: 15, dueDay: 28 });
assert.equal(JSON.stringify(l.operations), cardBefore);
const cancelled = cancelPurchase(l, "purchase-b", {
  confirmed: true,
  date: "2026-11-21",
  reason: "Cancelamento sintético",
  id: "cancel-purchase-b",
});
assert.equal(
  cancelled.purchases.find((x) => x.id === "purchase-b").cancelled,
  true,
);
const r = {
  id: "rec-monthly",
  description: "Recorrência sintética",
  operationType: "expense",
  frequency: "monthly",
  startsOn: "2026-01-31",
  amountCents: 1000,
  accountId: "cash",
  status: "active",
  initialStatus: "active",
  occurrences: [],
  events: [],
};
l = registerRecurrence(l, r);
l = generateOccurrences(l, r.id, "2026-01-01", "2026-05-31");
assert.deepEqual(
  l.recurrences
    .find((x) => x.id === r.id)
    .occurrences.map((x) => x.scheduledOn),
  ["2026-01-31", "2026-02-28", "2026-03-31", "2026-04-30", "2026-05-31"],
);
assert.deepEqual(generateOccurrences(l, r.id, "2026-01-01", "2026-05-31"), l);
assert.equal(l.settlements.length, 1);
l = changeRecurrence(
  l,
  r.id,
  {
    id: "override",
    kind: "override",
    effectiveOn: "2026-02-28",
    amountCents: 1500,
  },
  true,
);
assert.equal(
  l.operations.find((x) => x.id === "recurrence:rec-monthly:2026-02-28")
    .amountCents,
  1500,
);
assert.equal(
  l.operations.find((x) => x.id === "recurrence:rec-monthly:2026-03-31")
    .amountCents,
  1000,
);
l = changeRecurrence(
  l,
  r.id,
  {
    id: "amount",
    kind: "amount",
    effectiveOn: "2026-03-31",
    amountCents: 2000,
  },
  true,
);
l = changeRecurrence(
  l,
  r.id,
  { id: "pause", kind: "pause", effectiveOn: "2026-04-01" },
  true,
);
assert.equal(
  l.operations.find((x) => x.id === "recurrence:rec-monthly:2026-04-30")
    .cancelled,
  true,
);
l = changeRecurrence(
  l,
  r.id,
  { id: "resume", kind: "resume", effectiveOn: "2026-05-01" },
  true,
);
assert.equal(
  l.operations.find((x) => x.id === "recurrence:rec-monthly:2026-05-31")
    .cancelled,
  false,
);
l = generateOccurrences(l, r.id, "2026-06-01", "2026-07-31");
assert.equal(
  l.operations.find((x) => x.id === "recurrence:rec-monthly:2026-06-30")
    .amountCents,
  2000,
);
l = changeRecurrence(
  l,
  r.id,
  { id: "cancel", kind: "cancel", effectiveOn: "2026-07-01" },
  true,
);
const count = l.operations.length;
l = generateOccurrences(l, r.id, "2026-07-01", "2026-12-31");
assert.equal(l.operations.length, count);
assert.throws(() =>
  changeRecurrence(
    l,
    r.id,
    { id: "bad-resume", kind: "resume", effectiveOn: "2026-08-01" },
    true,
  ),
);
const annual = {
  ...r,
  id: "rec-annual",
  frequency: "annual",
  startsOn: "2024-02-29",
  endsOn: "2026-02-28",
  occurrences: [],
  events: [],
};
l = registerRecurrence(l, annual);
l = generateOccurrences(l, annual.id, "2024-02-01", "2026-02-28");
assert.deepEqual(
  l.recurrences
    .find((x) => x.id === annual.id)
    .occurrences.map((x) => x.scheduledOn),
  ["2024-02-29", "2025-02-28", "2026-02-28"],
);
assert.throws(() =>
  generateOccurrences(l, annual.id, "2024-01-01", "2030-01-01"),
);
const state = { ...empty(), entryLedger: l };
validate(state);
assert.equal(
  JSON.stringify((await prepareBackup(JSON.stringify(state))).entryLedger),
  JSON.stringify(l),
);
assert.equal(metrics(state, "2026-11").invoice, 30000);
assert.equal(
  (await prepareBackup(JSON.stringify(empty()))).entryLedger,
  undefined,
);
validateFinancialLedger(l);
console.log(
  "PASS: independent cards, closing rules/manual/year/leap dates, exact total/per-part/custom/interest/down contracts, atomic posting and idempotence, scoped audited edits/paid history, monthly/annual/clamped recurring schedules, overrides/future amounts, pause/resume/cancel/end, deterministic generation and backup compatibility",
);
// Paid amount remains an independent historical event after acknowledged amount correction.
const preserve = l.invoicePayments.find((x) => x.id === "payment");
const paidAmountPreview = previewInstallments(l, ids[0], "one", {
  amountCents: 31000,
});
assert.throws(() =>
  applyInstallments(l, paidAmountPreview, {
    confirmed: true,
    date: "2026-11-21",
    reason: "Correção sintética",
    id: "paid-no-ack",
  }),
);
const correctedPaid = applyInstallments(l, paidAmountPreview, {
  confirmed: true,
  acknowledgePaidInvoices: true,
  date: "2026-11-21",
  reason: "Correção sintética",
  id: "paid-ack",
});
assert.deepEqual(
  correctedPaid.invoicePayments.find((x) => x.id === "payment"),
  preserve,
);
assert.equal(invoiceBalance(correctedPaid, invoice.id).paid, 30000);
assert.equal(previewInstallments(l, ids[1], "all", {}).changes.length, 5);
const cardRec = {
  ...r,
  id: "card-rec",
  operationType: "card",
  cardId: "a",
  accountId: undefined,
  startsOn: "2027-01-31",
  occurrences: [],
  events: [],
};
let withCard = registerRecurrence(l, cardRec);
withCard = generateOccurrences(
  withCard,
  cardRec.id,
  "2027-01-01",
  "2027-03-31",
);
assert.ok(
  withCard.operations
    .filter((x) => x.recurrenceId === cardRec.id)
    .every((x) => x.confirmed === false),
);
assert.ok(
  withCard.invoices.some((x) => x.cardId === "a" && x.period === "2027-02"),
);
let archived = configureCard(l, { ...a, archived: true });
assert.throws(() =>
  registerPurchase(archived, { ...input, id: "archived-purchase" }),
);
let paidRec = registerRecurrence(l, {
  ...r,
  id: "paid-rec",
  startsOn: "2027-01-01",
  occurrences: [],
  events: [],
});
paidRec = generateOccurrences(paidRec, "paid-rec", "2027-01-01", "2027-01-31");
const { recordSettlement } =
  await import("../src/finance/entry-system/commands.ts");
paidRec = recordSettlement(paidRec, {
  id: "paid-rec-pay",
  operationId: "recurrence:paid-rec:2027-01-01",
  amountCents: 1000,
  date: "2027-01-01",
  accountId: "cash",
  method: "Pix",
  note: "",
});
assert.throws(() =>
  changeRecurrence(
    paidRec,
    "paid-rec",
    {
      id: "paid-rec-change",
      kind: "amount",
      effectiveOn: "2027-01-01",
      amountCents: 2000,
    },
    true,
  ),
);
const ended = generateOccurrences(
  paidRec,
  annual.id,
  "2026-03-01",
  "2027-03-01",
);
assert.equal(
  ended.recurrences.find((x) => x.id === annual.id).occurrences.length,
  3,
);
const leapAnnual = {
  ...annual,
  id: "leap-annual",
  endsOn: undefined,
  occurrences: [],
  events: [],
};
let leap = registerRecurrence(l, leapAnnual);
leap = generateOccurrences(leap, leapAnnual.id, "2027-02-01", "2028-03-01");
assert.deepEqual(
  leap.recurrences
    .find((x) => x.id === leapAnnual.id)
    .occurrences.map((x) => x.scheduledOn),
  ["2027-02-28", "2028-02-29"],
);
assert.ok(
  leap.operations
    .filter((x) => x.recurrenceId === leapAnnual.id)
    .every((x) => x.operationDate === undefined && x.expectedDate),
);

let recurringPaid = registerRecurrence(l, {
  ...cardRec,
  id: "rec-into-paid",
  startsOn: "2026-11-01",
  occurrences: [],
  events: [],
});
assert.throws(() =>
  generateOccurrences(
    recurringPaid,
    "rec-into-paid",
    "2026-11-01",
    "2026-11-30",
  ),
);
recurringPaid = generateOccurrences(
  recurringPaid,
  "rec-into-paid",
  "2026-11-01",
  "2026-11-30",
  {},
  { acknowledgePaidInvoices: true, correctionDate: "2026-11-21" },
);
assert.equal(
  recurringPaid.invoicePayments.find((x) => x.id === "payment").amountCents,
  30000,
);
let allEdit = registerPurchase(emptyLedgerDraftWithAccounts(), {
  ...input,
  id: "all-scope",
  downPayment: undefined,
  quote: { mode: "total", valueCents: 10000, count: 3 },
});
function emptyLedgerDraftWithAccounts() {
  const x = emptyLedgerDraft();
  x.accounts = structuredClone(l.accounts);
  x.cards = structuredClone(l.cards);
  return x;
}
const allIds = allEdit.purchases[0].installmentIds.slice();
const allPreview = previewInstallments(allEdit, allIds[0], "all", {
  amountCents: 4000,
  firstPeriod: "2027-01",
});
assert.equal(allPreview.previousContractCents, 10000);
assert.equal(allPreview.nextContractCents, 12000);
allEdit = applyInstallments(allEdit, allPreview, {
  confirmed: true,
  date: "2026-11-22",
  reason: "Teste de todo o contrato",
  id: "all-edit",
});
assert.deepEqual(allEdit.purchases[0].installmentIds, allIds);
assert.deepEqual(
  allEdit.operations.map((x) => x.period),
  ["2027-01", "2027-02", "2027-03"],
);

assert.equal(
  quotePurchase({
    mode: "total",
    valueCents: 100000,
    count: 3,
    finalCents: 110000,
  }).method,
  "contract-only",
);
