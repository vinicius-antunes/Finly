import { validate, type State, type Entry } from "../model.ts";
import type { LedgerDraft } from "./contracts.ts";
import { emptyLedgerDraft } from "./contracts.ts";
import { confirmEntryMigration, type MigrationPreview } from "./migration.ts";
import { validateFinancialLedger, settled } from "./finance.ts";
import { save } from "../storage.ts";
export async function activateEntryLedger(
  source: State,
  preview: MigrationPreview,
  consent: { backupExported: boolean; confirmed: boolean },
): Promise<State> {
  validate(source);
  if (source.entryLedger) return structuredClone(source);
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
        category: "",
        owner: "unknown",
        status:
          s.entryLedger && settled(s.entryLedger, o.id) === o.amountCents
            ? "received"
            : "planned",
        confirmed: o.confirmed ?? true,
        note: "",
      })),
  ];
}
