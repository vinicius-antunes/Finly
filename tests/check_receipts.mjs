import assert from "node:assert/strict";
import "fake-indexeddb/auto";
import { zipSync, strToU8, unzipSync } from "fflate";
import { syntheticReimbursementState } from "./fixtures/reimbursement-ledger.mjs";
import { validate } from "../src/finance/model.ts";
import {
  allReceipts,
  inspectFile,
  withReceipts,
  verifyBlob,
  digest,
  FILE_LIMIT,
  validateReceipts,
  safeName,
} from "../src/finance/receipts/model.ts";
import {
  coordinatedSave,
  getBlob,
  listBlobs,
  storageHealth,
  cleanOrphans,
} from "../src/finance/receipts/storage.ts";
import {
  exportZip,
  importZip,
  inspectZip,
} from "../src/finance/receipts/zip.ts";
import { recordSettlement } from "../src/finance/entry-system/commands.ts";
const values = new Map();
let fail = false;
globalThis.localStorage = {
  getItem: (k) => values.get(k) ?? null,
  setItem: (k, v) => {
    if (fail) {
      fail = false;
      throw new DOMException("quota", "QuotaExceededError");
    }
    values.set(k, v);
  },
};
let queue = Promise.resolve();
Object.defineProperty(navigator, "locks", {
  value: {
    request: (_name, fn) => {
      const next = queue.then(fn);
      queue = next.catch(() => {});
      return next;
    },
  },
});
const pdf = (suffix = "") =>
  new Blob(
    [`%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\n${suffix}\n%%EOF\n`],
    { type: "application/pdf" },
  );
const png = new Blob(
  [
    Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j8f8AAAAASUVORK5CYII=",
      "base64",
    ),
  ],
  { type: "image/png" },
);
const p = await inspectFile(pdf(), "sintético.pdf", "application/pdf"),
  image = await inspectFile(png, "imagem.png", "image/png");
assert.equal(p.receipt.size, p.blob.size);
await verifyBlob(
  { ...p.receipt, target: { kind: "operation", id: "x" } },
  p.blob,
);
for (const [blob, name, mime] of [
  [new Blob([]), "empty.pdf", "application/pdf"],
  [new Blob(["<html>evil</html>"]), "evil.pdf", "application/pdf"],
  [pdf(), "evil.svg", "application/pdf"],
  [pdf(), "f.pdf", "text/html"],
  [new Blob(["x".repeat(FILE_LIMIT + 1)]), "large.pdf", "application/pdf"],
  [new Blob(["%PDF-1.4\ntruncated"]), "f.pdf", "application/pdf"],
  [png, "renamed.jpg", "image/jpeg"],
])
  await assert.rejects(() => inspectFile(blob, name, mime));
assert(!/[<>/\\]/.test(safeName("../../a<script>.pdf")));
let s = syntheticReimbursementState();
s.transactions.push({
  id: "old-entry",
  description: "Anterior sintético",
  amountCents: 100,
  period: "2026-11",
  legacyKind: "out",
  accountId: "legacy-cash",
  category: "",
  owner: "self",
  status: "planned",
  confirmed: true,
  note: "",
});
const l = s.entryLedger;
const targets = [
  { kind: "legacy", id: "old-entry" },
  { kind: "operation", id: l.operations[0].id },
  { kind: "purchase", id: l.purchases[0].id },
  { kind: "settlement", id: l.settlements[0].id },
  { kind: "transfer", id: l.transfers[0].id },
  { kind: "invoicePayment", id: l.invoicePayments[0].id },
];
// All receipt links resolve to existing entities. Same content is one physical blob across links.
s = withReceipts(
  s,
  targets.map((target, i) => ({ ...p.receipt, id: "receipt-" + i, target })),
);
validate(s);
localStorage.setItem("finly-v2", JSON.stringify(s));
localStorage.setItem("saldoclaro-v1", "preservado");
await coordinatedSave(s, [p], JSON.stringify(s));
assert.equal((await listBlobs()).length, 1);
assert.equal((await storageHealth(s)).problems.length, 0);
const invalid = structuredClone(s);
invalid.receipts[0].target.id = "not-found";
assert.throws(() => validate(invalid));
const duplicate = structuredClone(s);
duplicate.receipts[1].id = duplicate.receipts[0].id;
assert.throws(() => validateReceipts(duplicate));
// Binary write failure/quota does not change finance. IDB transaction abort simulated at put.
const pending = await inspectFile(
  pdf("quota-case"),
  "quota.pdf",
  "application/pdf",
);
const next = withReceipts(s, [
  ...allReceipts(s),
  { ...pending.receipt, target: targets[0] },
]);
const oldRaw = localStorage.getItem("finly-v2");
const originalPut = IDBObjectStore.prototype.put;
IDBObjectStore.prototype.put = function (...args) {
  if (this.name === "files")
    throw new DOMException("quota", "QuotaExceededError");
  return originalPut.apply(this, args);
};
await assert.rejects(() => coordinatedSave(next, [pending], oldRaw));
IDBObjectStore.prototype.put = originalPut;
assert.equal(localStorage.getItem("finly-v2"), oldRaw);
// Financial write failure leaves a journal and recoverable orphan, not partial finance.
fail = true;
await assert.rejects(() => coordinatedSave(next, [pending], oldRaw));
assert.equal(localStorage.getItem("finly-v2"), oldRaw);
let health = await storageHealth(s);
assert.equal(health.orphans.length, 1);
assert.equal(health.recovered.length, 1);
await cleanOrphans(oldRaw);
assert.equal((await listBlobs()).length, 1);
assert(await getBlob(p.receipt.sha256));
// CAS and double/concurrent save. Only one snapshot replacement wins.
await assert.rejects(() => coordinatedSave(next, [pending], "outdated"));
const revised = { ...next, revision: next.revision + 1 };
const race = await Promise.allSettled([
  coordinatedSave(revised, [pending], oldRaw),
  coordinatedSave(revised, [pending], oldRaw),
]);
assert.equal(race.filter((r) => r.status === "fulfilled").length, 1);
s = revised;
// A leftover prepared journal on a committed record is recoverable by reference, not deletion.
const db = await new Promise((resolve, reject) => {
  const r = indexedDB.open("finly-receipts", 1);
  r.onsuccess = () => resolve(r.result);
  r.onerror = () => reject(r.error);
});
await new Promise((resolve) => {
  const tx = db.transaction("journal", "readwrite");
  tx.objectStore("journal").put({
    id: "interrupted-after-commit",
    hashes: [p.receipt.sha256],
    status: "prepared",
    at: new Date().toISOString(),
  });
  tx.oncomplete = resolve;
});
db.close();
assert((await storageHealth(s)).recovered.some((j) => j.committed));
// A failure cleaning the journal after a successful financial commit must still return success.
const originalDelete = IDBObjectStore.prototype.delete;
IDBObjectStore.prototype.delete = function (...args) {
  if (this.name === "journal") throw Error("interrupted cleanup");
  return originalDelete.apply(this, args);
};
const confirmed = { ...s, revision: s.revision + 1 };
await coordinatedSave(confirmed, [p], JSON.stringify(s));
IDBObjectStore.prototype.delete = originalDelete;
s = confirmed;
assert.equal(localStorage.getItem("finly-v2"), JSON.stringify(s));
assert((await storageHealth(s)).recovered.some((j) => j.committed));
// Real ZIP roundtrip restores every byte and metadata. JSON remains binary-free.
const before = JSON.stringify(s),
  bytes = await exportZip(s);
const restored = await importZip(new Blob([bytes]));
assert.deepEqual(restored.state, JSON.parse(JSON.stringify(s)));
assert.equal(restored.pending.length, s.receipts.length);
assert.equal(JSON.stringify(s), before);
assert(!before.includes("base64"));
for (const p of restored.pending)
  assert.equal(await digest(await p.blob.arrayBuffer()), p.receipt.sha256);
const files = unzipSync(bytes);
assert(files["backup.json"] && files["manifest.json"]);
for (const alter of [
  (m) => {
    m.version = 99;
  },
  (m) => {
    m.attachments[1].id = m.attachments[0].id;
  },
  (m) => {
    m.attachments[1].path = m.attachments[0].path;
  },
  (m) => {
    m.totalBytes++;
  },
]) {
  const m = JSON.parse(new TextDecoder().decode(files["manifest.json"]));
  alter(m);
  await assert.rejects(() =>
    importZip(
      new Blob([
        zipSync({ ...files, "manifest.json": strToU8(JSON.stringify(m)) }),
      ]),
    ),
  );
}
const duplicated = zipSync({
  "backup.json": strToU8("{}"),
  "manifest.json": strToU8("{}"),
  "attachments/a": strToU8("a"),
  "attachments/b": strToU8("b"),
});
const needle = strToU8("attachments/b");
for (let i = 0; i <= duplicated.length - needle.length; i++)
  if (needle.every((v, n) => duplicated[i + n] === v))
    duplicated[i + needle.length - 1] = "a".charCodeAt(0);
assert.throws(() => inspectZip(duplicated));
const damaged = {
  ...files,
  "backup.json": strToU8(JSON.stringify({ ...s, revision: 999 })),
};
await assert.rejects(() => importZip(new Blob([zipSync(damaged)])));
const attachment = Object.keys(files).find((p) => p.startsWith("attachments/"));
await assert.rejects(() =>
  importZip(
    new Blob([zipSync({ ...files, [attachment]: strToU8("tampered") })]),
  ),
);
const missing = { ...files };
delete missing[attachment];
await assert.rejects(() => importZip(new Blob([zipSync(missing)])));
for (const name of ["../escape", "attachments/../x", "unrelated.html"])
  assert.throws(() =>
    inspectZip(zipSync({ ...files, [name]: strToU8("bad") })),
  );
const bomb = zipSync({
  "backup.json": strToU8("a".repeat(5 * 1024 * 1024)),
  "manifest.json": strToU8("{}"),
});
assert.throws(() => inspectZip(bomb));
// A header forged to understate output is bounded during inflation, not just by central metadata.
const lie = zipSync(
  {
    "backup.json": strToU8("a".repeat(500000)),
    "manifest.json": strToU8("{}"),
  },
  { level: 9 },
);
const dv = new DataView(lie.buffer);
for (let i = 0; i < lie.length - 46; i++)
  if (
    dv.getUint32(i, true) === 0x02014b50 &&
    new TextDecoder().decode(lie.subarray(i + 46, i + 57)) === "backup.json"
  ) {
    dv.setUint32(i + 24, 1000, true);
    const off = dv.getUint32(i + 42, true);
    dv.setUint32(off + 22, 1000, true);
    break;
  }
await assert.rejects(() => importZip(new Blob([lie])));
assert.equal(localStorage.getItem("finly-v2"), JSON.stringify(s));
assert.equal(localStorage.getItem("saldoclaro-v1"), "preservado");
// JSON missing files is allowed and explicitly discoverable. Shared blobs survive removal of one link.
const absent = { ...image.receipt, target: targets[0] };
const missingState = withReceipts(s, [...allReceipts(s), absent]);
assert.equal((await storageHealth(missingState)).problems.length, 1);
const shared = withReceipts(s, allReceipts(s).slice(1));
localStorage.setItem("finly-v2", JSON.stringify(shared));
await cleanOrphans(JSON.stringify(shared));
assert(await getBlob(p.receipt.sha256));
const old = syntheticReimbursementState();
old.entryLedger.attachments = [
  { ...p.receipt, operationId: old.entryLedger.operations[0].id },
];
validate(old);
assert.equal(allReceipts(old).length, 1);
assert.equal(
  withReceipts(old, allReceipts(old)).entryLedger.attachments.length,
  0,
);
assert.equal(
  JSON.stringify(
    recordSettlement(s.entryLedger, {
      id: "partial-phase6",
      operationId: s.entryLedger.operations.find(
        (o) => o.type === "reimbursement",
      ).id,
      amountCents: 1,
      date: "2026-11-15",
      accountId: "cash-a",
      method: "Pix",
      note: "",
    }).purchases,
  ),
  JSON.stringify(s.entryLedger.purchases),
);
console.log(
  "PASS receipts: signatures/MIME/limits, links and legacy metadata, deduplication, IndexedDB rollback/quota, CAS/concurrent saves, interruption recovery/orphans, shared-safe removal, JSON missing files, real ZIP/SHA-256 roundtrip and tamper/traversal/bomb rejection, unchanged finance/legacy",
);
