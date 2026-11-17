import { V2_KEY, validate, type State } from "../model.ts";
import { save } from "../storage.ts";
import {
  allReceipts,
  TOTAL_LIMIT,
  verifyBlob,
  type PendingReceipt,
} from "./model.ts";
const DB = "finly-receipts";
type Journal = {
  id: string;
  hashes: string[];
  at: string;
  status: "prepared";
};
export type StoredBlob = { hash: string; blob: Blob };
function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => {
      r.result.createObjectStore("files", { keyPath: "hash" });
      r.result.createObjectStore("journal", { keyPath: "id" });
    };
    r.onsuccess = () => resolve(r.result);
    r.onerror = () =>
      reject(Error("IndexedDB indisponível. Permita armazenamento local."));
    r.onblocked = () =>
      reject(Error("Feche outras abas do Finly e tente novamente."));
  });
}
async function transaction<T>(
  stores: string[],
  mode: IDBTransactionMode,
  action: (tx: IDBTransaction, result: (v: T) => void) => void,
): Promise<T> {
  const db = await database();
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction(stores, mode);
      let value: T;
      tx.oncomplete = () => resolve(value);
      tx.onabort = () =>
        reject(
          Error(
            tx.error?.name === "QuotaExceededError"
              ? "Espaço insuficiente. Exporte um backup e libere espaço."
              : "Falha ao gravar comprovantes. Seus dados financeiros foram preservados.",
          ),
        );
      tx.onerror = () => {};
      try {
        action(tx, (v) => {
          value = v;
        });
      } catch (e) {
        tx.abort();
        reject(
          e instanceof DOMException && e.name === "QuotaExceededError"
            ? Error(
                "Espaço insuficiente para os comprovantes. Exporte um backup e libere espaço; seus dados foram preservados.",
              )
            : e,
        );
      }
    });
  } finally {
    db.close();
  }
}
export const getBlob = (hash: string) =>
  transaction<Blob | undefined>(["files"], "readonly", (tx, done) => {
    const r = tx.objectStore("files").get(hash);
    r.onsuccess = () => done(r.result?.blob);
  });
export const listBlobs = () =>
  transaction<StoredBlob[]>(["files"], "readonly", (tx, done) => {
    const r = tx.objectStore("files").getAll();
    r.onsuccess = () => done(r.result);
  });
const journalRows = () =>
  transaction<Journal[]>(["journal"], "readonly", (tx, done) => {
    const r = tx.objectStore("journal").getAll();
    r.onsuccess = () => done(r.result);
  });
/** Preserve the actual raw CAS token, including whitespace/property order in older stored JSON. */
export function currentSnapshot(s: State): string {
  const raw = localStorage.getItem(V2_KEY);
  try {
    if (raw !== null && JSON.stringify(JSON.parse(raw)) === JSON.stringify(s))
      return raw;
  } catch {
    /* report stale/invalid storage below */
  }
  throw Error(
    "Os dados mudaram em outra aba ou não podem ser lidos. Revise antes de salvar.",
  );
}
/** Every writer of binary data and garbage collector shares this origin-wide lock. Fail closed when unavailable. */
export async function receiptLock<T>(fn: () => Promise<T>): Promise<T> {
  if (!navigator.locks)
    return Promise.reject(
      Error(
        "Este navegador precisa oferecer Web Locks para salvar comprovantes com segurança. Use uma versão atual em HTTPS.",
      ),
    );
  return await navigator.locks.request("finly-receipts-write", fn);
}
export async function storageHealth(s: State) {
  const rows = allReceipts(s),
    blobs = await listBlobs(),
    referenced = new Set(rows.map((r) => r.sha256));
  const problems: string[] = [];
  for (const r of rows) {
    const b = blobs.find((b) => b.hash === r.sha256);
    try {
      if (!b) throw Error("Arquivo ausente");
      await verifyBlob(r, b.blob);
    } catch (e) {
      problems.push(
        `${r.name}: ${e instanceof Error ? e.message : "indisponível"}`,
      );
    }
  }
  const journals = await journalRows();
  return {
    count: rows.length,
    physicalCount: blobs.length,
    bytes: blobs.reduce((n, b) => n + b.blob.size, 0),
    orphans: blobs.filter((b) => !referenced.has(b.hash)),
    problems,
    recovered: journals
      .filter((j) => j.status === "prepared")
      .map((j) => ({
        id: j.id,
        committed: j.hashes.every((h) => referenced.has(h)),
      })),
  };
}
/** Prepare and verify blobs first, then synchronous financial CAS; interrupted/failed writes remain recoverable orphans, never auto-deleted. */
export function coordinatedSave(
  next: State,
  pending: PendingReceipt[],
  expected: string | null,
  commit?: (s: State) => boolean,
): Promise<string> {
  return receiptLock(async () => {
    validate(next);
    if (localStorage.getItem(V2_KEY) !== expected)
      throw Error("Os dados mudaram em outra aba. Revise antes de salvar.");
    if (!pending.length) {
      if (commit) {
        if (!commit(next)) throw Error("Não foi possível salvar os dados.");
        return localStorage.getItem(V2_KEY)!;
      }
      return save(next, expected);
    }
    const current = await listBlobs(),
      additions = new Map(pending.map((p) => [p.receipt.sha256, p]));
    for (const p of additions.values()) {
      const meta = allReceipts(next).find((r) => r.sha256 === p.receipt.sha256);
      if (!meta) throw Error("Arquivo sem vínculo financeiro.");
      await verifyBlob(meta, p.blob);
    }
    const total =
      current.reduce((n, b) => n + b.blob.size, 0) +
      [...additions]
        .filter(([h]) => !current.some((b) => b.hash === h))
        .reduce((n, [, p]) => n + p.blob.size, 0);
    if (total > TOTAL_LIMIT)
      throw Error(
        "O armazenamento de comprovantes ultrapassaria 100 MiB. Verifique os órfãos em Configurações.",
      );
    const job: Journal = {
      id: crypto.randomUUID(),
      hashes: [...additions.keys()],
      at: new Date().toISOString(),
      status: "prepared",
    };
    await transaction<void>(["files", "journal"], "readwrite", (tx) => {
      for (const [hash, p] of additions)
        tx.objectStore("files").put({ hash, blob: p.blob });
      tx.objectStore("journal").put(job);
    });
    for (const [hash, p] of additions) {
      const b = await getBlob(hash);
      if (!b) throw Error("Não foi possível confirmar a gravação do arquivo.");
      await verifyBlob({ ...p.receipt, target: { kind: "legacy", id: "" } }, b);
    }
    // No await between CAS callback and financial persistence. Non-receipt writers retain their own synchronous CAS.
    let raw: string;
    if (commit) {
      if (localStorage.getItem(V2_KEY) !== expected || !commit(next))
        throw Error(
          "Não foi possível salvar. Seus arquivos selecionados foram preservados; revise o armazenamento e outras abas.",
        );
      raw = localStorage.getItem(V2_KEY)!;
    } else raw = save(next, expected);
    // Financial commit already succeeded: a journal cleanup failure must never turn success into a retry of a payment.
    try {
      await transaction<void>(["journal"], "readwrite", (tx) =>
        tx.objectStore("journal").delete(job.id),
      );
    } catch {
      /* recovered on inspection */
    }
    return raw;
  });
}
export function cleanOrphans(expected: string) {
  return receiptLock(async () => {
    const s: unknown = JSON.parse(expected);
    validate(s);
    const refs = new Set(allReceipts(s).map((r) => r.sha256)),
      files = await listBlobs();
    if (localStorage.getItem(V2_KEY) !== expected)
      throw Error("Dados alterados em outra aba. Verifique novamente.");
    await transaction<void>(["files", "journal"], "readwrite", (tx) => {
      // A competing receipt writer cannot enter until this transaction completes.
      for (const f of files)
        if (!refs.has(f.hash)) tx.objectStore("files").delete(f.hash);
      tx.objectStore("journal").clear();
    });
  });
}
