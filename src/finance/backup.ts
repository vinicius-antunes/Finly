import { empty, migrate, validate, type State } from "./model.ts";
export const BACKUP_LIMIT = 4 * 1024 * 1024;
export class BackupError extends Error {
  details: string;
  constructor(message: string, details = "") {
    super(message);
    this.details = details;
  }
}
export async function prepareBackup(raw: string): Promise<State> {
  if (new TextEncoder().encode(raw).byteLength > BACKUP_LIMIT)
    throw new BackupError("O arquivo ultrapassa o limite de 4 MB.");
  const clean = raw.replace(/^\uFEFF/, "").trim();
  let parsed: unknown;
  try {
    parsed = JSON.parse(clean);
  } catch {
    throw new BackupError(
      "Não foi possível ler este arquivo. Selecione um backup JSON completo e sem alterações.",
      "O conteúdo não é JSON válido.",
    );
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
    throw new BackupError("Este arquivo não é um backup do Finly.");
  const data = parsed as Record<string, unknown>;
  if (data.version !== 1 && data.version !== 2)
    throw new BackupError(
      "Este arquivo não é um backup Finly v1 ou v2.",
      "A propriedade version deve ser o número 1 ou 2.",
    );
  if (
    data.version === 1 &&
    (!data.settings ||
      typeof data.settings !== "object" ||
      Array.isArray(data.settings) ||
      !Array.isArray(data.entries))
  )
    throw new BackupError(
      "O backup antigo está incompleto. Selecione o arquivo completo exportado pelo Finly.",
      "O formato v1 exige settings como objeto e entries como lista.",
    );
  try {
    return await migrate(clean);
  } catch (e) {
    throw new BackupError(
      "O backup contém dados que precisam ser conferidos. Nenhum registro foi alterado.",
      e instanceof Error ? e.message : "Falha de validação financeira.",
    );
  }
}
export type CurrentBackup = {
  raw: string | null;
  state: State | null;
  invalid: boolean;
};
export function readCurrentBackup(): CurrentBackup {
  const raw = localStorage.getItem("finly-v2");
  if (raw === null) return { raw, state: null, invalid: false };
  try {
    const state: unknown = JSON.parse(raw);
    validate(state);
    return { raw, state, invalid: false };
  } catch {
    return { raw, state: null, invalid: true };
  }
}
export function needsAcknowledgment(current: CurrentBackup) {
  if (current.invalid) return true;
  const s = current.state;
  if (!s) return false;
  const defaults = empty().settings;
  return !!(
    s.entryLedger?.operations.length ||
    s.entryLedger?.settlements.length ||
    s.entryLedger?.transfers.length ||
    s.entryLedger?.accounts.length ||
    s.planning?.goals.length ||
    s.transactions.length ||
    s.pending.length ||
    Object.keys(s.invoiceStatuses).length ||
    Object.keys(s.notificationReads).length ||
    s.migration ||
    Object.keys(defaults).some(
      (k) =>
        s.settings[k as keyof typeof defaults] !==
        defaults[k as keyof typeof defaults],
    )
  );
}
export function backupSummary(s: State) {
  return {
    ledgerOperations: s.entryLedger?.operations.length ?? 0,
    ledgerTransfers: s.entryLedger?.transfers.length ?? 0,
    goals: s.planning?.goals.length ?? 0,
    entries: s.transactions.length + (s.entryLedger?.operations.length ?? 0),
    groups: new Set(
      s.transactions.filter((x) => x.groupId).map((x) => x.groupId),
    ).size,
    refunds: s.transactions.filter((x) => x.legacyKind === "reimbursement")
      .length,
    pending: s.pending.length,
    forecasts: s.transactions.filter((x) => !x.confirmed).length,
    invoices: Object.keys(s.invoiceStatuses).length,
    periods: Array.from(
      new Set([
        ...s.transactions.map((x) => x.period),
        ...Object.keys(s.invoiceStatuses),
      ]),
    ).sort(),
  };
}
