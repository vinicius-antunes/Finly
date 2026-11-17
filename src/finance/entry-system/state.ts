import { validate, empty, type State, type Entry } from "../model.ts";
import type { LedgerDraft } from "./contracts.ts";
import { emptyLedgerDraft } from "./contracts.ts";
import { confirmEntryMigration, type MigrationPreview } from "./migration.ts";
import { validateFinancialLedger, settlementTotals } from "./finance.ts";
import { save } from "../storage.ts";
/** Conservative full-state check, independent of totals, period and filters. */
export function isEmptyEntryInstallation(
  source: State,
  legacyRaw: string | null,
) {
  validate(source);
  const baseline = empty();
  const known = new Set([
    ...Object.keys(baseline),
    "receipts",
    "planning",
    "entryLedger",
    "migration",
  ]);
  return (
    !source.entryLedger &&
    legacyRaw === null &&
    !source.migration &&
    Object.keys(source).every((key) => known.has(key)) &&
    source.transactions.length === 0 &&
    source.pending.length === 0 &&
    source.settings.reserve === 0 &&
    !source.receipts?.length &&
    !source.planning?.goals.length &&
    Object.keys(source.invoiceStatuses).length === 0 &&
    JSON.stringify(source.accounts) === JSON.stringify(baseline.accounts)
  );
}
export async function activateEntryLedger(
  source: State,
  preview: MigrationPreview | null,
  consent:
    | { backupExported: boolean; confirmed: boolean }
    | { emptyInstallation: true; legacyRaw: string | null },
): Promise<State> {
  validate(source);
  if (source.entryLedger) return structuredClone(source);
  if ("emptyInstallation" in consent) {
    if (!isEmptyEntryInstallation(source, consent.legacyRaw))
      throw Error("A instalação contém dados. Use a preparação protegida.");
    return { ...structuredClone(source), entryLedger: emptyLedgerDraft() };
  }
  if (!preview) throw Error("Prévia obrigatória");
  const prepared = await confirmEntryMigration(source, preview, consent);
  return { ...prepared.source, entryLedger: emptyLedgerDraft() };
}
/** Caller supplies the previously loaded raw snapshot; quota/concurrency failures throw. */
export function persistEntryLedger(
  state: State,
  next: LedgerDraft,
  expectedRaw: string,
) {
  if (JSON.stringify(state) !== expectedRaw)
    throw Error("Estado não corresponde ao snapshot carregado");
  validateFinancialLedger(next);
  const updated = { ...state, entryLedger: next, revision: state.revision + 1 };
  return { state: updated, raw: save(updated, expectedRaw) };
}
/** Read-only chart adapter. Never persist these views in transactions. */
export function ledgerChartEntries(s: State): Entry[] {
  const paid = s.entryLedger
    ? settlementTotals(s.entryLedger)
    : new Map<string, number>();
  const categories = new Map(
    s.entryLedger?.categories.map((c) => [c.id, c.name]) ?? [],
  );
  return [
    ...s.transactions,
    ...(s.entryLedger?.operations ?? [])
      .filter((o) => !o.cancelled)
      .map((o) => ({
        id: o.id,
        description: o.description,
        amountCents: o.amountCents,
        period: o.period,
        legacyKind:
          o.type === "expense"
            ? ("out" as const)
            : o.type === "card"
              ? ("credit" as const)
              : o.type === "reimbursement"
                ? ("reimbursement" as const)
                : ("income" as const),
        accountId: o.accountId ?? "",
        category: categories.get(o.categoryId ?? "") ?? "",
        owner: "unknown",
        status:
          s.entryLedger && (paid.get(o.id) ?? 0) === o.amountCents
            ? "received"
            : "planned",
        confirmed: o.confirmed ?? true,
        note: "",
      })),
  ];
}
