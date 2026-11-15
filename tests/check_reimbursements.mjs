import assert from "node:assert/strict";
import { empty, validate, metrics } from "../src/finance/model.ts";
import { emptyLedgerDraft } from "../src/finance/entry-system/contracts.ts";
import {
  registerPurchase,
  previewInstallments,
  applyInstallments,
  cancelPurchase,
} from "../src/finance/entry-system/credit/purchases.ts";
import {
  registerAgreement,
  installmentSchedule,
  receiveAgreement,
  agreementBalance,
  previewAgreement,
  correctAgreement,
  cancelAgreement,
  registerPurchaseAgreements,
} from "../src/finance/entry-system/reimbursements/commands.ts";
import { recordInvoicePayment } from "../src/finance/entry-system/commands.ts";
import {
  ledgerProjection,
  invoiceBalance,
  accountVariation,
  validateFinancialLedger,
} from "../src/finance/entry-system/finance.ts";
import {
  previewPlannedPurchase,
  confirmPlannedPurchase,
  persistPlannedPurchase,
} from "../src/finance/planning/entry-purchase.ts";
import { balance } from "../src/finance/planning/data.ts";
import { purchase } from "../src/finance/planning/rules.ts";
import { prepareBackup } from "../src/finance/backup.ts";
export function phase4State() {
  const s = empty();
  s.entryLedger = emptyLedgerDraft();
  s.entryLedger.accounts = [
    { id: "cash", name: "Conta sintética A", type: "bank", archived: false },
    { id: "cash2", name: "Conta sintética B", type: "cash", archived: false },
    {
      id: "ca",
      name: "Cartão sintético",
      type: "credit_card",
      archived: false,
    },
  ];
  s.entryLedger.cards = [
    {
      id: "card",
      accountId: "ca",
      name: "Cartão sintético",
      closingDay: 10,
      dueDay: 20,
      onClosingDay: "current",
    },
  ];
  s.planning = {
    version: 1,
    goals: [
      {
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
            id: "deposit",
            delta: 6000,
            date: "2026-11-01",
            period: "2026-11",
            note: "Aporte sintético",
          },
        ],
      },
    ],
  };
  return s;
}
const buy = {
  id: "p",
  description: "Compra sintética",
  responsibility: "shared",
  cardId: "card",
  operationDate: "2026-11-09",
  confirmed: true,
  quote: { mode: "total", valueCents: 10000, count: 3, downCents: 1000 },
  downPayment: {
    accountId: "cash",
    date: "2026-11-09",
    method: "Pix",
    confirmed: false,
  },
};
const terms = (id, amount, period = "2026-12") => ({
  totalCents: amount,
  personId: id,
  personLabel: "",
  description: "Reembolso sintético " + id,
  note: "Acordo sintético",
  mode: "single",
  schedule: [
    {
      id: "row:" + id,
      amountCents: amount,
      period,
      expectedDate: period + "-20",
      accountId: "cash",
    },
  ],
});
let s = phase4State(),
  l = registerPurchase(s.entryLedger, buy);
assert.equal(l.claims.length, 0);
assert.equal(
  registerPurchase(s.entryLedger, { ...buy, responsibility: "personal" }).claims
    .length,
  0,
);
let a = {
  id: "a",
  purchaseId: "p",
  terms: {
    ...terms("pa", 4501),
    mode: "installments",
    schedule: installmentSchedule(l, "p", 4501, "a"),
  },
};
l = registerAgreement(l, a);
l = registerAgreement(l, {
  id: "b",
  purchaseId: "p",
  terms: terms("pb", 2500),
});
assert.deepEqual(
  a.terms.schedule.map((r) => r.amountCents),
  [1500, 1500, 1501],
);
assert.equal(l.agreements.length, 2);
assert.equal(registerAgreement(l, a), l);
assert.throws(() => registerAgreement(l, { ...a, terms: terms("pa", 4500) }));
assert.throws(() =>
  registerAgreement(l, {
    id: "excess",
    purchaseId: "p",
    terms: terms("pc", 4000),
  }),
);
assert.throws(() =>
  registerAgreement(
    registerPurchase(s.entryLedger, { ...buy, responsibility: "personal" }),
    a,
  ),
);
assert.throws(() =>
  registerAgreement(l, {
    id: "bad",
    terms: {
      ...terms("bad", 500),
      schedule: [{ ...terms("bad", 500).schedule[0], amountCents: 499 }],
    },
  }),
);
const custom = {
  ...terms("custom", 4500),
  mode: "custom",
  schedule: [1000, 1500, 2000].map((amountCents, i) => ({
    id: "custom" + i,
    amountCents,
    period: `2027-0${i + 1}`,
  })),
};
l = registerAgreement(l, { id: "standalone", terms: custom });
assert.equal(l.agreements.at(-1).origin, "standalone");
assert.equal(agreementBalance(l, "b", "2026-11-14").status, "planned");
assert.equal(agreementBalance(l, "b", "2026-12-20").status, "pending");
const receipt = {
  id: "receipt",
  operationId: "row:pb",
  amountCents: 1000,
  date: "2026-12-20",
  accountId: "cash",
  method: "Pix",
  note: "Primeira parte",
};
l = receiveAgreement(l, "b", receipt);
assert.equal(receiveAgreement(l, "b", receipt).settlements.length, 1);
assert.equal(agreementBalance(l, "b", "2026-12-20").status, "partial");
assert.equal(agreementBalance(l, "b", "2026-12-20").pending, 1500);
assert.equal(agreementBalance(l, "a", "2026-12-20").received, 0);
assert.equal(invoiceBalance(l, l.invoices[0].id).paid, 0);
assert.throws(() => receiveAgreement(l, "a", { ...receipt, id: "wrong" }));
assert.throws(() =>
  receiveAgreement(l, "b", { ...receipt, id: "over", amountCents: 1501 }),
);
l = receiveAgreement(l, "b", {
  ...receipt,
  id: "receipt2",
  amountCents: 1500,
  accountId: "cash2",
  method: "Dinheiro",
  date: "2027-01-05",
});
assert.equal(agreementBalance(l, "b", "2027-01-05").status, "received");
assert.equal(accountVariation(l, "cash2", "2027-01"), 1500);
assert.equal(ledgerProjection(l, "2026-12").received, 2500);
assert.equal(ledgerProjection(l, "2026-12").pending, 1500);
assert.throws(() =>
  cancelAgreement(l, "b", {
    id: "cancel",
    date: "2027-01-06",
    reason: "Teste",
    confirmed: true,
  }),
);
const reverse = {
  ...receipt,
  id: "reverse",
  date: "2027-01-06",
  reversesId: "receipt",
};
assert.throws(() => receiveAgreement(l, "b", reverse));
l = receiveAgreement(l, "b", reverse, true);
assert.throws(() =>
  receiveAgreement(l, "b", { ...reverse, id: "reverse2" }, true),
);
const lower = previewAgreement(l, "b", terms("pb", 1400));
assert.throws(() =>
  correctAgreement(l, lower, {
    id: "corr",
    date: "2027-01-06",
    reason: "Correção",
    confirmed: true,
    acknowledgeReceipts: true,
  }),
);
const changed = {
  ...terms("new-person", 3000),
  schedule: [
    {
      ...terms("pb", 3000).schedule[0],
      period: "2027-02",
      expectedDate: "2027-02-20",
    },
  ],
};
const preview = previewAgreement(l, "b", changed),
  approval = {
    id: "corr",
    date: "2027-01-06",
    reason: "Novo acordo confirmado",
    confirmed: true,
    acknowledgeReceipts: true,
  };
assert.throws(() =>
  correctAgreement(l, preview, { ...approval, acknowledgeReceipts: false }),
);
l = correctAgreement(l, preview, approval);
assert.equal(correctAgreement(l, preview, approval), l);
assert.equal(l.agreements[1].events[0].previous.totalCents, 2500);
assert.equal(l.settlements.length, 3);
const installments = previewInstallments(
  l,
  l.purchases[0].installmentIds[0],
  "one",
  { amountCents: 3200 },
);
assert.equal(installments.linkedClaimIds.length, 4);
assert.throws(() =>
  applyInstallments(l, installments, {
    id: "edit",
    date: "2027-01-06",
    reason: "Compra alterada",
    confirmed: true,
  }),
);
l = applyInstallments(l, installments, {
  id: "edit",
  date: "2027-01-06",
  reason: "Compra alterada",
  confirmed: true,
  acknowledgeReimbursements: true,
});
assert.deepEqual(l.agreements[0].terms, a.terms);
const inv = l.invoices[0];
l = recordInvoicePayment(l, {
  id: "ip",
  invoiceId: inv.id,
  amountCents: 3200,
  date: "2027-01-06",
  accountId: "cash",
  method: "Pix",
  note: "",
});
assert.equal(invoiceBalance(l, inv.id).status, "paid");
assert.equal(agreementBalance(l, "a", "2027-01-06").received, 0);
assert.throws(() =>
  cancelPurchase(l, "p", {
    id: "cp",
    date: "2027-01-06",
    reason: "Cancelar",
    confirmed: true,
  }),
);
let cancel = registerAgreement(s.entryLedger, {
  id: "cancel",
  terms: terms("cancel", 800),
});
cancel = cancelAgreement(cancel, "cancel", {
  id: "ce",
  date: "2026-11-14",
  reason: "Desistência",
  confirmed: true,
});
assert.equal(agreementBalance(cancel, "cancel", "2026-11-14").cancelled, 800);
assert.equal(
  cancelAgreement(cancel, "cancel", {
    id: "ce",
    date: "2026-11-14",
    reason: "Desistência",
    confirmed: true,
  }),
  cancel,
);
const planned = {
  goalId: "goal",
  useCents: 4000,
  date: "2026-11-09",
  period: "2026-11",
  purchase: buy,
};
const before = JSON.stringify(s);
const pp = previewPlannedPurchase(s, planned);
assert.equal(JSON.stringify(s), before);
assert.equal(pp.remainingCents, 2000);
assert.throws(() => confirmPlannedPurchase(s, pp, false));
assert.throws(() => previewPlannedPurchase(s, { ...planned, useCents: 6001 }));
const completed = confirmPlannedPurchase(s, pp, true);
assert.equal(balance(completed.planning.goals[0]), 2000);
assert.equal(completed.transactions.length, 0);
assert.equal(completed.settings.reserve, s.settings.reserve);
assert.equal(completed.planning.goals[0].movements.length, 2);
assert.equal(confirmPlannedPurchase(completed, pp, true), completed);
assert.throws(() => previewPlannedPurchase(completed, planned));
assert.throws(() =>
  purchase(
    completed,
    completed.planning.goals[0],
    { price: 10000, down: 0, parts: 1, rate: 0, period: "2026-11" },
    true,
    "2026-11-09",
  ),
);
let raw = JSON.stringify(s),
  data = raw;
globalThis.localStorage = {
  getItem: () => data,
  setItem: (k, v) => {
    data = v;
  },
};
const saved = persistPlannedPurchase(s, pp, true, raw);
assert.equal(JSON.parse(data).planning.goals[0].ledgerPurchaseId, "p");
assert.equal(saved.state.revision, s.revision + 1);
data = "concurrent";
assert.throws(() => persistPlannedPurchase(s, pp, true, raw));
assert.equal(data, "concurrent");
data = raw;
localStorage.setItem = () => {
  throw Error("Quota");
};
assert.throws(() => persistPlannedPurchase(s, pp, true, raw));
assert.equal(data, raw);
const old = purchase(
  s,
  s.planning.goals[0],
  { price: 10000, down: 1000, parts: 2, rate: 0, period: "2026-11" },
  true,
  "2026-11-09",
);
assert.throws(() => previewPlannedPurchase(old, planned));
s = {
  ...completed,
  entryLedger: {
    ...l,
    purchases: l.purchases.map((p) => ({
      ...p,
      goalId: "goal",
      planningCompletionKey: completed.planning.goals[0].completionKey,
    })),
  },
};
validate(s);
validate(JSON.parse(JSON.stringify(s)));
assert.equal(
  (await prepareBackup(JSON.stringify(s))).entryLedger.agreements.length,
  3,
);
const corrupted = structuredClone(s);
corrupted.planning.goals[0].ledgerPurchaseId = "missing";
assert.throws(() => validate(corrupted));
assert.throws(() =>
  registerPurchaseAgreements(phase4State().entryLedger, buy, [
    { ...a, terms: terms("bad", 10001) },
  ]),
);
assert.equal(phase4State().entryLedger.purchases.length, 0);
console.log(
  "PASS: phase 4 synthetic agreements, multiple/unknown people, single/installment/custom schedules, cents, bounds, mixed-account partial receipts, reversals, corrections, purchase/invoice isolation, goal links, reserve use, legacy guards, backup and atomic persistence",
);

const cs = phase4State(),
  cp = {
    ...planned,
    purchase: {
      id: "cash-buy",
      description: "Compra à vista sintética",
      operationDate: "2026-11-09",
      confirmed: true,
      cash: {
        amountCents: 10000,
        accountId: "cash",
        method: "Pix",
        period: "2026-11",
      },
    },
  };
const cashDone = confirmPlannedPurchase(
  cs,
  previewPlannedPurchase(cs, cp),
  true,
);
assert.equal(cashDone.entryLedger.operations.length, 1);
assert.equal(cashDone.entryLedger.settlements.length, 1);
assert.equal(ledgerProjection(cashDone.entryLedger, "2026-11").cash, 10000);
assert.equal(accountVariation(cashDone.entryLedger, "cash"), -10000);
assert.equal(balance(cashDone.planning.goals[0]), 2000);
// Changing schedule length preserves retired operations and their original IDs.
let scheduled = registerAgreement(phase4State().entryLedger, {
  id: "variable",
  terms: custom,
});
const changedSchedule = {
  ...custom,
  totalCents: 4000,
  schedule: [{ id: "new-schedule", amountCents: 4000, period: "2027-04" }],
};
scheduled = correctAgreement(
  scheduled,
  previewAgreement(scheduled, "variable", changedSchedule),
  {
    id: "schedule-edit",
    date: "2026-11-14",
    reason: "Cronograma renegociado",
    confirmed: true,
  },
);
assert.equal(scheduled.operations.length, 4);
assert.equal(scheduled.operations.filter((o) => o.cancelled).length, 3);
assert.equal(ledgerProjection(scheduled, "2027-04").pending, 4000);
// Contracted interest and down payment are part of one cap, never summed again.
const interestBuy = {
  ...buy,
  id: "interest",
  responsibility: "other",
  quote: { mode: "total", valueCents: 10000, count: 3, finalCents: 11000 },
};
let il = registerPurchase(phase4State().entryLedger, interestBuy);
const cap = il.purchases[0].contractedCents;
assert.equal(cap, 11000);
il = registerAgreement(il, {
  id: "interest-agreement",
  purchaseId: "interest",
  terms: terms("interest-person", cap),
});
assert.throws(() =>
  registerAgreement(il, {
    id: "one-more",
    purchaseId: "interest",
    terms: terms("extra", 1),
  }),
);
// Cancel a planned purchase without inventing a reserve refund.
const unconfirmed = { ...cp, purchase: { ...cp.purchase, confirmed: false } };
let cancelState = confirmPlannedPurchase(
  cs,
  previewPlannedPurchase(cs, unconfirmed),
  true,
);
cancelState = {
  ...cancelState,
  entryLedger: cancelPurchase(cancelState.entryLedger, "cash-buy", {
    id: "cancel-linked",
    date: "2026-11-14",
    reason: "Cancelamento confirmado",
    confirmed: true,
  }),
};
validate(cancelState);
assert.equal(balance(cancelState.planning.goals[0]), 2000);
assert.equal(cancelState.entryLedger.operations[0].cancelled, true);
const { reimbursementTotals } =
  await import("../src/finance/entry-system/reimbursements/totals.ts");
assert.equal(reimbursementTotals(s).received, 1500);
assert.equal(reimbursementTotals(s).pending, 10501);

// Previously valid claims and optional goal hints remain unconverted.
const compatible = phase4State();
compatible.entryLedger = registerPurchase(compatible.entryLedger, buy);
compatible.entryLedger = registerAgreement(compatible.entryLedger, {
  id: "compat",
  purchaseId: "p",
  terms: terms("compat-person", 500),
});
delete compatible.entryLedger.agreements;
compatible.entryLedger.claims.push({
  ...compatible.entryLedger.claims[0],
  id: "legacy-second-claim",
  personId: "legacy-second-person",
});
compatible.entryLedger.purchases[0].goalId = "previous-optional-hint";
validate(compatible);
assert.equal(compatible.entryLedger.agreements, undefined);
