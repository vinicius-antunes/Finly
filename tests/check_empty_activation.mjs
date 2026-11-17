import assert from "node:assert/strict";
import { empty } from "../src/finance/model.ts";
import {
  isEmptyEntryInstallation,
  activateEntryLedger,
} from "../src/finance/entry-system/state.ts";
import { save } from "../src/finance/storage.ts";
const s = empty();
s.settings.cardLabel = "Preferência sintética";
s.settings.salary = 12345;
assert(isEmptyEntryInstallation(s, null));
for (const legacy of ["{}", "{broken", ""])
  assert(!isEmptyEntryInstallation(s, legacy));
for (const patch of [
  { pending: [{ id: "p", description: "Pendente", amountCents: 1 }] },
  {
    planning: {
      version: 1,
      goals: [
        {
          id: "g",
          name: "Meta",
          category: "",
          target: 1,
          monthly: 0,
          deadline: "",
          note: "",
          status: "archived",
          movements: [],
          months: {},
        },
      ],
    },
  },
  { invoiceStatuses: { "2020-01": "paid" } },
  { unknownHistory: [] },
  { settings: { ...s.settings, reserve: 1 } },
])
  assert(!isEmptyEntryInstallation({ ...s, ...patch }, null));
assert.throws(() =>
  isEmptyEntryInstallation({ ...s, transactions: null }, null),
);
const before = JSON.stringify(s),
  next = await activateEntryLedger(s, null, {
    emptyInstallation: true,
    legacyRaw: null,
  });
assert.equal(JSON.stringify(s), before);
assert.deepEqual(next.settings, s.settings);
for (const [k, v] of Object.entries(next.entryLedger))
  if (Array.isArray(v)) assert.equal(v.length, 0, k);
assert.deepEqual(
  await activateEntryLedger(next, null, {
    emptyInstallation: true,
    legacyRaw: null,
  }),
  next,
);
await assert.rejects(
  activateEntryLedger(s, null, { emptyInstallation: true, legacyRaw: "{}" }),
);
let raw = before;
globalThis.localStorage = {
  getItem: () => raw,
  setItem: (k, v) => {
    raw = v;
  },
};
save(next, before);
assert.throws(() => save(next, before));
globalThis.localStorage.setItem = () => {
  throw Error("quota");
};
assert.throws(() => save(next, raw));
console.log(
  "PASS: conservative empty detection, preferences, archive/history protection, idempotence, CAS and quota",
);
