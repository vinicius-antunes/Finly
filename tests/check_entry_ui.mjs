import assert from "node:assert/strict";
import { syntheticReimbursementState } from "./fixtures/reimbursement-ledger.mjs";
import { empty } from "../src/finance/model.ts";
import {
  initialDraft,
  prepareEntry,
  newPerson,
  FormProblem,
} from "../src/finance/entry-system/ui/draft.ts";
import {
  parseMoney,
  formatMoney,
} from "../src/finance/entry-system/ui/money.ts";
import { entryViews } from "../src/finance/entry-system/ui/views.ts";
import { filteredTotals } from "../src/finance/entries.ts";
import { validate } from "../src/finance/model.ts";
import { recordSettlement } from "../src/finance/entry-system/commands.ts";
import {
  deleteCategory,
  configureCategory,
  reclassifyCategory,
} from "../src/finance/entry-system/catalog.ts";
const state = syntheticReimbursementState();
function draft(type) {
  return {
    ...initialDraft(state, type, "2026-11"),
    description: "Operação de formulário sintética",
    amount: "100,01",
    date: "2026-11-09",
    paymentDate: "2026-11-09",
    period: "2026-11",
    accountId: "cash-a",
    downAccountId: "cash-a",
    cardId: "second-card",
  };
}
for (const [s, n] of [
  ["R$ 1.234,56", 123456],
  ["0,01", 1],
  ["90071992547409,91", Number.MAX_SAFE_INTEGER],
  ["25.50", 2550],
])
  assert.equal(parseMoney(s), n);
for (const s of ["1,234", "-1", "NaN", "1.2345", "90071992547409,92"])
  assert.throws(() => parseMoney(s));
const original = JSON.stringify(state);
assert.throws(() => prepareEntry(empty(), draft("expense")), FormProblem);
let d = draft("expense");
d.status = "partial";
d.paymentAmount = "25,01";
let p = prepareEntry(state, d);
assert.equal(JSON.stringify(state), original);
assert.equal(p.next.entryLedger.settlements.at(-1).amountCents, 2501);
assert.equal(p.next.entryLedger.operations.at(-1).amountCents, 10001);
assert.equal(p.next.transactions.length, state.transactions.length);
const views = entryViews(p.next);
const row = views.find((r) => r.id === d.id);
assert.equal(row.status, "partial");
assert.equal(filteredTotals([row]).outPaid, 2501);
d = draft("income");
d.salary = true;
d.status = "paid";
p = prepareEntry(state, d);
assert.equal(p.next.entryLedger.operations.at(-1).salary, true);
assert.equal(p.next.entryLedger.settlements.at(-1).amountCents, 10001);
d = draft("card");
d.paymentMode = "installments";
d.count = 3;
d.down = "10";
d.downPaid = true;
d.downDate = "2026-11-09";
p = prepareEntry(state, d);
let buy = p.next.entryLedger.purchases.at(-1);
assert.equal(buy.contractedCents, 10001);
assert.deepEqual(buy.quote.installments, [3000, 3000, 3001]);
assert.equal(buy.quote.downCents, 1000);
assert.equal(p.complex, true);
d.valueMode = "installment";
d.amount = "30";
p = prepareEntry(state, d);
assert.equal(p.next.entryLedger.purchases.at(-1).contractedCents, 10000);
d.valueMode = "total";
d.amount = "100";
d.interestMethod = "simple-monthly";
d.rate = "1";
d.original = "100";
p = prepareEntry(state, d);
assert.equal(p.next.entryLedger.purchases.at(-1).contractedCents, 10270);
d = draft("card");
d.responsibility = "shared";
d.people = [
  {
    ...newPerson(),
    name: "Pessoa sintética A",
    amount: "40",
    period: "2026-12",
    date: "2026-12-20",
  },
  {
    ...newPerson(),
    name: "",
    amount: "30",
    period: "2027-01",
    date: "2027-01-20",
  },
];
p = prepareEntry(state, d);
assert.equal(
  p.next.entryLedger.agreements.length,
  state.entryLedger.agreements.length + 2,
);
assert.equal(
  p.next.entryLedger.settlements.length,
  state.entryLedger.settlements.length,
);
d.people[1].amount = "70";
assert.throws(() => prepareEntry(state, d));
d = draft("reimbursement");
d.people = [
  {
    ...newPerson(),
    name: "Pessoa sintética",
    amount: d.amount,
    mode: "custom",
    rows: [
      { id: crypto.randomUUID(), amount: "50", period: "2026-12", date: "" },
      { id: crypto.randomUUID(), amount: "50,01", period: "2027-01", date: "" },
    ],
  },
];
p = prepareEntry(state, d);
assert.equal(p.next.entryLedger.agreements.at(-1).origin, "standalone");
assert.equal(p.next.entryLedger.agreements.at(-1).terms.schedule.length, 2);
d = draft("transfer");
d.destinationId = "cash-b";
p = prepareEntry(state, d);
assert.equal(
  p.next.entryLedger.operations.length,
  state.entryLedger.operations.length,
);
assert.equal(
  p.next.entryLedger.transfers.length,
  state.entryLedger.transfers.length + 1,
);
d.destinationId = "cash-a";
assert.throws(() => prepareEntry(state, d), FormProblem);
for (const frequency of ["monthly", "annual"]) {
  d = draft("income");
  d.paymentMode = "recurring";
  d.frequency = frequency;
  d.salary = true;
  d.generateTo = "2027-11";
  p = prepareEntry(state, d);
  assert.equal(p.next.entryLedger.recurrences.at(-1).frequency, frequency);
  assert.ok(
    p.next.entryLedger.operations
      .filter((o) => o.recurrenceId === d.id)
      .every((o) => o.salary),
  );
  assert.equal(
    p.next.entryLedger.settlements.length,
    state.entryLedger.settlements.length,
  );
}
// Reuse an active synthetic goal, never the already completed one.
const goalState = structuredClone(state);
goalState.planning.goals.push({
  id: "new-goal",
  name: "Cofrinho sintético",
  category: "Casa",
  target: 10000,
  monthly: 1000,
  deadline: "",
  note: "",
  status: "active",
  months: {},
  movements: [
    {
      id: "new-deposit",
      delta: 6000,
      date: "2026-11-01",
      period: "2026-11",
      note: "Aporte",
    },
  ],
});
d = draft("expense");
d.goalId = "new-goal";
d.useReserve = "40";
assert.throws(() => prepareEntry(goalState, d));
d.reserveConfirmed = true;
p = prepareEntry(goalState, d);
assert.equal(p.next.planning.goals.at(-1).movements.at(-1).delta, -4000);
assert.equal(p.next.transactions.length, goalState.transactions.length);
assert.throws(() => prepareEntry(p.next, d));
let edit = draft("expense");
p = prepareEntry(state, edit);
let paidState = p.next;
paidState.entryLedger = recordSettlement(paidState.entryLedger, {
  id: "paid",
  operationId: edit.id,
  amountCents: 5000,
  date: "2026-11-09",
  accountId: "cash-a",
  method: "Pix",
  note: "",
});
const e = initialDraft(paidState, "expense", "2026-11", edit.id);
e.description = "Descrição corrigida";
e.amount = "120";
e.reason = "Correção sintética";
e.id = crypto.randomUUID();
p = prepareEntry(paidState, e, edit.id);
assert.equal(
  p.next.entryLedger.settlements.length,
  paidState.entryLedger.settlements.length,
);
assert.equal(
  p.next.entryLedger.corrections.at(-1).previousOperation.description,
  edit.description,
);
assert.equal(
  p.next.entryLedger.operations.find((o) => o.id === edit.id).description,
  e.description,
);
e.amount = "40";
assert.throws(() => prepareEntry(paidState, e, edit.id));
const copy = initialDraft(paidState, "expense", "2026-11", edit.id, true);
assert.notEqual(copy.id, edit.id);
assert.equal(copy.status, "pending");
assert.equal(copy.goalId, "");
assert.equal(copy.people.length, 0);
let cat = configureCategory(state.entryLedger, {
  id: "category-test",
  name: "Categoria sintética",
  types: ["expense"],
  archived: false,
});
cat = structuredClone(cat);
cat.operations.push({
  id: "categorized",
  type: "expense",
  description: "Despesa sintética",
  amountCents: 100,
  period: "2026-11",
  categoryId: "category-test",
  cancelled: false,
});
assert.throws(() => deleteCategory(cat, "category-test"));
cat = configureCategory(cat, {
  id: "category-test2",
  name: "Destino",
  types: ["expense"],
  archived: false,
});
cat = reclassifyCategory(cat, "category-test", "category-test2", true);
assert.throws(() => deleteCategory(cat, "category-test"));
assert.equal(cat.operations.at(-1).categoryId, "category-test2");
validate(paidState);
assert.equal(JSON.stringify(state), original);
console.log(
  "PASS: form money integers, five persisted types, partial payments, salary, exact installments/interest/down, multi-person/custom claims, transfer neutrality, recurrence forecasts, atomic goal use, audited edits, independent duplicates and protected categories",
);

assert.equal(
  parseMoney(formatMoney(Number.MAX_SAFE_INTEGER)),
  Number.MAX_SAFE_INTEGER,
);

const cardNotes = draft("card");
cardNotes.note = "Observação da compra sintética";
let noted = prepareEntry(state, cardNotes).next;
const selected = noted.entryLedger.purchases.at(-1).installmentIds[0];
assert.equal(
  noted.entryLedger.operations.find((o) => o.id === selected).note,
  cardNotes.note,
);
const changeNote = initialDraft(noted, "card", "2026-11", selected);
changeNote.note = "Observação corrigida";
changeNote.reason = "Correção da observação";
noted = prepareEntry(noted, changeNote, selected).next;
assert.equal(
  noted.entryLedger.operations.find((o) => o.id === selected).note,
  changeNote.note,
);
assert.equal(
  noted.entryLedger.corrections.at(-1).previousOperation.note,
  cardNotes.note,
);
const recurringNote = draft("expense");
recurringNote.paymentMode = "recurring";
recurringNote.generateTo = "2026-12";
recurringNote.note = "Observação de previsão";
const generated = prepareEntry(state, recurringNote).next;
assert.ok(
  generated.entryLedger.operations
    .filter((o) => o.recurrenceId === recurringNote.id)
    .every((o) => o.note === recurringNote.note),
);

assert.equal(
  filteredTotals([
    {
      id: "legacy-unknown",
      legacyKind: "out",
      amountCents: 1234,
      status: "cancelled",
    },
  ]).out,
  1234,
);

const oldExtras = structuredClone(state);
oldExtras.transactions.push({
  id: "legacy-view-flags",
  description: "Registro legado sintético",
  amountCents: 1000,
  legacyKind: "out",
  period: "2026-11",
  accountId: "legacy-cash",
  category: "Casa",
  owner: "self",
  status: "planned",
  confirmed: true,
  note: "",
  ledgerManaged: true,
  ledgerPaidCents: 999,
});
assert.equal(
  entryViews(oldExtras).find((x) => x.id === "legacy-view-flags")
    .ledgerPaidCents,
  undefined,
);
assert.equal(oldExtras.transactions[0].ledgerPaidCents, 999);

const archivedSource = structuredClone(noted);
archivedSource.entryLedger.cards.find((c) => c.id === "second-card").archived =
  true;
const archivedEdit = initialDraft(archivedSource, "card", "2026-11", selected);
archivedEdit.reason = "Correção de histórico de cartão arquivado";
archivedEdit.note = "Histórico preservado";
assert.equal(
  prepareEntry(
    archivedSource,
    archivedEdit,
    selected,
  ).next.entryLedger.operations.find((o) => o.id === selected).note,
  archivedEdit.note,
);

const paidGoal = draft("expense");
Object.assign(paidGoal, {
  goalId: "new-goal",
  useReserve: "40",
  reserveConfirmed: true,
  status: "paid",
  paymentDate: "2026-12-03",
});
const paidGoalState = prepareEntry(goalState, paidGoal).next;
assert.equal(paidGoalState.entryLedger.settlements.at(-1).date, "2026-12-03");
assert.equal(
  paidGoalState.entryLedger.operations.at(-1).operationDate,
  "2026-11-09",
);
