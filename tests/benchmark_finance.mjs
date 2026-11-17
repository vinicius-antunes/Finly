import { performance } from "node:perf_hooks";
import { empty, validate, metrics } from "../src/finance/model.ts";
import { emptyLedgerDraft } from "../src/finance/entry-system/contracts.ts";
import { ledgerChartEntries } from "../src/finance/entry-system/state.ts";
const results = [];
for (const n of [100, 1000, 5000]) {
  const s = empty();
  s.entryLedger = emptyLedgerDraft();
  s.entryLedger.accounts = [
    { id: "cash", name: "Conta sintética", type: "bank", archived: false },
  ];
  for (let i = 0; i < n; i++) {
    s.entryLedger.operations.push({
      id: "o" + i,
      type: "expense",
      description: "Operação sintética " + i,
      amountCents: 100,
      period: "2026-11",
      operationDate: "2026-11-01",
      accountId: "cash",
      cancelled: false,
    });
    s.entryLedger.settlements.push({
      id: "p" + i,
      operationId: "o" + i,
      amountCents: 50,
      date: "2026-11-02",
      accountId: "cash",
      method: "Pix",
      note: "",
    });
  }
  const row = {
    entries: n,
    serializedBytes: new TextEncoder().encode(JSON.stringify(s)).length,
  };
  for (const [name, fn] of Object.entries({
    validate: () => validate(s),
    metrics: () => metrics(s, "2026-11"),
    chart: () => ledgerChartEntries(s),
  })) {
    const t = performance.now();
    for (let i = 0; i < 3; i++) fn();
    row[name + "Ms"] = +((performance.now() - t) / 3).toFixed(2);
  }
  results.push(row);
}
console.log(JSON.stringify(results, null, 2));
