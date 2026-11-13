import { validate, type State } from "../model.ts";
import { emptyLedgerDraft, type LedgerDraft } from "./contracts.ts";
import { validateLedgerDraft } from "./schema.ts";
export type MigrationPreview = {
  version: 1;
  sourceHash: string;
  legacyEntryIds: string[];
  unknown: { entryId: string; fields: string[] }[];
  totals: Record<string, number>;
  draft: LedgerDraft;
};
export async function fingerprint(raw: string) {
  return [
    ...new Uint8Array(
      await crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw)),
    ),
  ]
    .map((x) => x.toString(16).padStart(2, "0"))
    .join("");
}
/** Pure preview: no storage calls, dates, inferred cards/accounts or generated financial events. */
export async function previewEntryMigration(
  source: unknown,
): Promise<MigrationPreview> {
  validate(source);
  const s = source as State;
  const totals: Record<string, number> = Object.create(null);
  for (const e of s.transactions) {
    const key = e.period + ":" + e.legacyKind;
    totals[key] = (totals[key] ?? 0) + e.amountCents;
    if (!Number.isSafeInteger(totals[key]))
      throw Error("Total excede limite seguro");
  }
  return {
    version: 1,
    sourceHash: await fingerprint(JSON.stringify(s)),
    legacyEntryIds: s.transactions.map((e) => e.id),
    unknown: s.transactions.map((e) => ({
      entryId: e.id,
      fields: [
        "operationDate",
        "dueDate",
        ...(e.legacyKind === "credit"
          ? ["cardClosingDay", "cardClosingRule"]
          : []),
        ...(e.status === "received"
          ? ["settlementDate", "settlementMethod"]
          : []),
      ],
    })),
    totals,
    draft: emptyLedgerDraft(),
  };
}
/** An explicitly accepted staging artifact, never a replacement State or automatic migration. */
export async function confirmEntryMigration(
  source: unknown,
  preview: MigrationPreview,
  consent: { backupExported: boolean; confirmed: boolean },
) {
  if (!consent.backupExported || !consent.confirmed)
    throw Error("Backup e confirmação explícita obrigatórios");
  const expected = await previewEntryMigration(source);
  if (
    preview.version !== 1 ||
    preview.sourceHash !== expected.sourceHash ||
    JSON.stringify(preview) !== JSON.stringify(expected)
  )
    throw Error("Prévia mudou ou ficou desatualizada");
  validateLedgerDraft(preview.draft);
  return {
    stage: "prepared" as const,
    preview: structuredClone(preview),
    source: structuredClone(source as State),
  };
}
