import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { emptyLedgerDraft } from "../src/finance/entry-system/contracts.ts";
import {
  validateLedgerDraft,
  dateOK,
} from "../src/finance/entry-system/schema.ts";
import {
  previewEntryMigration,
  confirmEntryMigration,
} from "../src/finance/entry-system/migration.ts";
import { migrate, metrics, validate } from "../src/finance/model.ts";
import { prepareBackup } from "../src/finance/backup.ts";
const s = emptyLedgerDraft();
validateLedgerDraft(s);
s.accounts = [
  { id: "bank-a", name: "Conta sintética A", type: "bank", archived: false },
  { id: "bank-b", name: "Conta sintética B", type: "cash", archived: false },
  {
    id: "card-account",
    name: "Cartão sintético",
    type: "credit_card",
    archived: false,
  },
];
s.cards = [
  { id: "card-a", name: "Cartão sintético", accountId: "card-account" },
];
s.categories = [
  {
    id: "cat-a",
    name: "Categoria sintética",
    types: ["expense", "card"],
    archived: false,
  },
];
const op = (id, type, amountCents, more = {}) => ({
  id,
  type,
  amountCents,
  period: "2026-11",
  description: "Registro sintético",
  cancelled: false,
  ...more,
});
s.operations = [
  op("out-a", "expense", 10000, {
    purchaseId: "purchase-a",
    accountId: "bank-a",
  }),
  op("card-op", "card", 40000, {
    purchaseId: "purchase-a",
    cardId: "card-a",
    accountId: "card-account",
  }),
  op("refund-a", "reimbursement", 5000),
  op("income-a", "income", 60000, { salary: true }),
  op("rec-op", "expense", 2000, { recurrenceId: "rec-a" }),
];
s.purchases = [
  {
    id: "purchase-a",
    originalCents: 50000,
    contractedCents: 50000,
    downPaymentEntryId: "out-a",
    installmentIds: ["card-op"],
  },
];
s.invoices = [
  {
    id: "invoice-a",
    cardId: "card-a",
    period: "2026-11",
    installmentIds: ["card-op"],
  },
];
s.invoicePayments = [
  {
    id: "payment-a",
    invoiceId: "invoice-a",
    accountId: "bank-a",
    amountCents: 10000,
    date: "2026-11-12",
    method: "Pix",
    note: "",
  },
];
s.settlements = [
  {
    id: "settle-a",
    operationId: "refund-a",
    amountCents: 1000,
    date: "2026-11-12",
    accountId: "bank-b",
    method: "Pix",
    note: "",
  },
];
s.transfers = [
  {
    id: "transfer-a",
    fromAccountId: "bank-a",
    toAccountId: "bank-b",
    amountCents: 3000,
    date: "2026-11-12",
    note: "",
    confirmed: true,
  },
];
s.recurrences = [
  {
    id: "rec-a",
    frequency: "annual",
    startsOn: "2026-11-12",
    amountCents: 2000,
    status: "paused",
    occurrences: [{ operationId: "rec-op", scheduledOn: "2026-11-12" }],
  },
];
s.claims = [
  {
    id: "claim-a",
    operationId: "refund-a",
    personId: "person-a",
    personLabel: "Pessoa sintética",
    purchaseId: "purchase-a",
  },
];
s.attachments = [
  {
    id: "attachment-a",
    operationId: "out-a",
    name: "sintetico.pdf",
    mime: "application/pdf",
    size: 100,
    sha256: "0".repeat(64),
  },
];
s.corrections = [
  {
    id: "audit-a",
    operationId: "out-a",
    at: "2026-11-12",
    reason: "Teste sintético",
    previousAmountCents: 10000,
    nextAmountCents: 10000,
  },
];
validateLedgerDraft(s);
validateLedgerDraft(JSON.parse(JSON.stringify(s)));
assert.equal(s.cards[0].closingDay, undefined);
assert.equal(s.operations[1].operationDate, undefined);
const bad = (change) => {
  const copy = structuredClone(s);
  change(copy);
  assert.throws(() => validateLedgerDraft(copy));
};
bad((x) => (x.operations[0].amountCents = 1.2));
bad((x) => (x.operations[0].amountCents = Number.MAX_SAFE_INTEGER + 1));
bad((x) => x.accounts.push(x.accounts[0]));
bad((x) => (x.transfers[0].toAccountId = "bank-a"));
bad((x) => (x.operations[0].accountId = "missing"));
bad((x) => (x.cards[0].closingDay = 0));
bad((x) => (x.cards[0].closingDay = 32));
bad((x) => (x.cards[0].onClosingDay = "guess"));
bad((x) => (x.operations[1].operationDate = "2026-02-31"));
bad((x) => (x.settlements[0].operationId = "card-op"));
bad((x) => (x.operations[0].salary = true));
bad((x) => (x.operations[0].type = "transfer"));
bad((x) => (x.invoices[0].period = "2027-01"));
bad((x) => x.recurrences[0].occurrences.push(x.recurrences[0].occurrences[0]));
bad((x) => (x.attachments[0].mime = "text/html"));
bad((x) => (x.attachments[0].size = 11 * 1024 * 1024));
bad((x) => (x.attachments[0].sha256 = "bad"));
bad((x) => (x.version = 2));
bad((x) => x.operations.push(null));
bad((x) => (x.invoices = undefined));
assert.equal(dateOK("2024-02-29"), true);
assert.equal(dateOK("2025-02-29"), false);
const source = await migrate(
  readFileSync(
    new URL("./fixtures/synthetic-backup-v1.json", import.meta.url),
    "utf8",
  ),
);
source.planning = {
  version: 1,
  goals: [
    {
      id: "synthetic-goal",
      name: "Meta sintética",
      category: "Casa",
      target: 10000,
      monthly: 1000,
      deadline: "",
      note: "",
      status: "active",
      months: {},
      movements: [
        {
          id: "synthetic-deposit",
          delta: 1000,
          date: "2026-11-12",
          period: "2026-11",
          note: "Aporte confirmado",
        },
      ],
    },
  ],
};
validate(source);
const before = JSON.stringify(source),
  m = metrics(source, "2026-11");
const preview = await previewEntryMigration(source);
assert.deepEqual(await previewEntryMigration(source), preview);
assert.equal(JSON.stringify(source), before);
assert.deepEqual(
  preview.legacyEntryIds,
  source.transactions.map((e) => e.id),
);
assert.equal(preview.totals["2026-11:credit"], 2500);
assert.equal(preview.draft.operations.length, 0);
assert.equal(preview.draft.cards.length, 0);
assert.equal(preview.draft.accounts.length, 0);
assert.ok(preview.unknown[0].fields.includes("operationDate"));
assert.equal(JSON.stringify(preview).includes("2026-11-13"), false);
await assert.rejects(
  confirmEntryMigration(source, preview, {
    backupExported: false,
    confirmed: true,
  }),
);
await assert.rejects(
  confirmEntryMigration(source, preview, {
    backupExported: true,
    confirmed: false,
  }),
);
await assert.rejects(
  confirmEntryMigration({ ...source, revision: source.revision + 1 }, preview, {
    backupExported: true,
    confirmed: true,
  }),
);
await assert.rejects(
  confirmEntryMigration(
    source,
    { ...preview, legacyEntryIds: [] },
    { backupExported: true, confirmed: true },
  ),
);
const stage = await confirmEntryMigration(source, preview, {
  backupExported: true,
  confirmed: true,
});
assert.equal(stage.stage, "prepared");
assert.deepEqual(stage.source, source);
stage.source.transactions[0].description = "Clone independente";
assert.equal(JSON.stringify(source), before);
assert.deepEqual(metrics(source, "2026-11"), m);
assert.deepEqual((await prepareBackup(before)).planning, source.planning);
await assert.rejects(
  previewEntryMigration({
    ...source,
    transactions: [source.transactions[0], source.transactions[0]],
  }),
);
console.log(
  "PASS: versioned contracts, safe cents/dates/IDs/references, independent invoice payments/transfers, legacy unknown fields preserved, idempotent pure preview, complete-state fingerprint, consent/stale/tamper refusal, clone isolation, planning/backup/metrics unchanged",
);
