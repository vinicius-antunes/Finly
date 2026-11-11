/** Leitura defensiva do formato v1, SEM modificar a chave de dados. */
export const LEGACY_KEY = 'saldoclaro-v1';

export type LegacyEntry = {
  id: string;
  description: string;
  amount: number;
  month: string;
  kind: 'credit' | 'out' | 'income' | 'reimbursement';
  status?: string;
  confirmed?: boolean;
  category?: string;
  part?: number;
  parts?: number;
};

export type Snapshot =
  | { kind: 'empty'; entries: LegacyEntry[] }
  | { kind: 'valid'; entries: LegacyEntry[] }
  | { kind: 'invalid'; entries: LegacyEntry[]; message: string };

const kinds = new Set(['credit', 'out', 'income', 'reimbursement']);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function validEntry(value: unknown): value is LegacyEntry {
  if (!isRecord(value)) return false;
  return typeof value.id === 'string' &&
    typeof value.description === 'string' &&
    typeof value.amount === 'number' && Number.isFinite(value.amount) && value.amount >= 0 &&
    typeof value.month === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(value.month) &&
    typeof value.kind === 'string' && kinds.has(value.kind);
}

export function readLegacySnapshot(): Snapshot {
  try {
    const raw = localStorage.getItem(LEGACY_KEY);
    if (raw === null) return { kind: 'empty', entries: [] };
    const value: unknown = JSON.parse(raw);
    if (!isRecord(value) || value.version !== 1 || !Array.isArray(value.entries) ||
        !value.entries.every(validEntry)) {
      return { kind: 'invalid', entries: [], message: 'Os dados existentes precisam ser conferidos no Finly original. Nenhum registro foi alterado.' };
    }
    return { kind: 'valid', entries: value.entries };
  } catch {
    return { kind: 'invalid', entries: [], message: 'Não foi possível acessar ou interpretar os dados locais. O Finly original permanece disponível.' };
  }
}

/** Agrupamento visual apenas: NÃO é fluxo de caixa, fatura ou migração v2. */
export function sumCents(entries: LegacyEntry[], kind: LegacyEntry['kind']): number {
  return entries.filter(entry => entry.kind === kind).reduce(
    (sum, entry) => sum + Math.round(entry.amount * 100), 0,
  );
}

export function formatMoney(cents: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
    .format(cents / 100);
}

export function monthNow(): string {
  const now = new Date();
  return String(now.getFullYear()) + '-' + String(now.getMonth() + 1).padStart(2, '0');
}
