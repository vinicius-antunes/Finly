import { validatePlanning, type Planning } from "./planning/data.ts";
export type Kind = "credit" | "out" | "income" | "reimbursement";
export type Entry = {
  id: string;
  description: string;
  amountCents: number;
  period: string;
  legacyKind: Kind;
  accountId: string;
  legacyId?: string;
  category: string;
  owner: string;
  status: string;
  confirmed: boolean;
  note: string;
  groupId?: string | null;
  part?: number;
  parts?: number;
  purchaseId?: string;
  original?: Record<string, unknown>;
};
export type Settings = {
  salary: number;
  reserve: number;
  cushion: number;
  goal: number;
  installmentCap: number;
  dueDay: number;
  cardLabel: string;
  includeExpectedRefunds: boolean;
};
export type Pending = {
  id: string;
  description: string;
  amountCents: number;
  chargedAt?: string;
  note?: string;
  original?: Record<string, unknown>;
};
export type State = {
  planning?: Planning;
  version: 2;
  transactions: Entry[];
  settings: Settings;
  invoiceStatuses: Record<string, string>;
  pending: Pending[];
  notificationReads: Record<string, boolean>;
  accounts: { id: string; type: string; name: string }[];
  migration?: { sourceHash: string; at: string; original: unknown };
  revision: number;
};
export const V2_KEY = "finly-v2";
export const kinds: Kind[] = ["credit", "out", "income", "reimbursement"];
export const names: Record<Kind, string> = {
  credit: "Cartão",
  out: "Despesa fora do cartão",
  income: "Receita",
  reimbursement: "Reembolso",
};
export const monthOK = (v: unknown): v is string =>
  typeof v === "string" && /^20\d\d-(0[1-9]|1[0-2])$/.test(v);
export function cents(v: unknown): number {
  if (typeof v !== "number" && typeof v !== "string")
    throw Error("Valor inválido");
  let s = String(v)
    .trim()
    .replace(/R\$|\s/g, "");
  if (!s) throw Error("Informe o valor");
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  else if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(s))
    throw Error("Use um valor positivo com até duas casas decimais");
  const n = Math.round(Number(s) * 100);
  if (!Number.isSafeInteger(n)) throw Error("Valor excede o limite seguro");
  return n;
}
export function money(v: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(v / 100);
}
export function empty(): State {
  return {
    version: 2,
    revision: 0,
    transactions: [],
    settings: {
      salary: 0,
      reserve: 0,
      cushion: 0,
      goal: 100000,
      installmentCap: 10000,
      dueDay: 10,
      cardLabel: "Cartão principal",
      includeExpectedRefunds: false,
    },
    pending: [],
    invoiceStatuses: {},
    notificationReads: {},
    accounts: [
      { id: "legacy-credit", type: "credit_card", name: "Cartão principal" },
      { id: "legacy-cash", type: "cash", name: "Movimentos legados" },
      { id: "legacy-reserve", type: "savings", name: "Reserva informada" },
    ],
  };
}
const record = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === "object" && !Array.isArray(v);
function integer(v: unknown) {
  if (!Number.isSafeInteger(v) || Number(v) < 0)
    throw Error("Centavos inválidos");
}
export function validate(s: unknown): asserts s is State {
  if (
    !record(s) ||
    s.version !== 2 ||
    !Array.isArray(s.transactions) ||
    s.transactions.length >= 20000 ||
    !record(s.settings) ||
    !Array.isArray(s.pending) ||
    !record(s.invoiceStatuses) ||
    !record(s.notificationReads) ||
    !Array.isArray(s.accounts) ||
    !Number.isSafeInteger(s.revision)
  )
    throw Error("Backup v2 inválido");
  for (const key of ["salary", "reserve", "cushion", "goal", "installmentCap"])
    integer(s.settings[key]);
  if (
    !Number.isInteger(s.settings.dueDay) ||
    Number(s.settings.dueDay) < 1 ||
    Number(s.settings.dueDay) > 28 ||
    typeof s.settings.cardLabel !== "string" ||
    typeof s.settings.includeExpectedRefunds !== "boolean"
  )
    throw Error("Configurações inválidas");
  if (s.planning !== undefined) validatePlanning(s.planning);
  const ids = new Set<string>();
  for (const x of s.transactions) {
    if (
      !record(x) ||
      typeof x.id !== "string" ||
      !x.id ||
      ids.has(x.id) ||
      typeof x.description !== "string" ||
      !monthOK(x.period) ||
      !kinds.includes(x.legacyKind as Kind) ||
      typeof x.accountId !== "string" ||
      typeof x.confirmed !== "boolean" ||
      ["category", "owner", "status", "note"].some(
        (k) => typeof x[k] !== "string",
      )
    )
      throw Error("Lançamento inválido ou ID duplicado");
    integer(x.amountCents);
    if (
      (x.groupId !== undefined &&
        x.groupId !== null &&
        typeof x.groupId !== "string") ||
      (x.purchaseId !== undefined && typeof x.purchaseId !== "string") ||
      (x.part !== undefined && x.parts === undefined)
    )
      throw Error("Vínculo ou parcela inválida");
    ids.add(x.id);
    if (
      x.parts !== undefined &&
      (!Number.isInteger(x.parts) ||
        Number(x.parts) < 1 ||
        !Number.isInteger(x.part) ||
        Number(x.part) < 1 ||
        Number(x.part) > Number(x.parts))
    )
      throw Error("Parcelas inválidas");
  }
  const pendingIds = new Set();
  for (const x of s.pending) {
    if (
      !record(x) ||
      typeof x.id !== "string" ||
      pendingIds.has(x.id) ||
      typeof x.description !== "string"
    )
      throw Error("Pendência inválida");
    integer(x.amountCents);
    pendingIds.add(x.id);
  }
  if (
    Object.entries(s.invoiceStatuses).some(
      ([k, v]) =>
        !monthOK(k) || !["unknown", "unpaid", "paid"].includes(String(v)),
    )
  )
    throw Error("Situação de fatura inválida");
  const total = (s.transactions as Entry[]).reduce(
    (a, x) => a + x.amountCents,
    0,
  );
  const budget = [
    "salary",
    "reserve",
    "cushion",
    "goal",
    "installmentCap",
  ].reduce(
    (n, k) => n + Number((s.settings as Record<string, unknown>)[k]),
    total,
  );
  if (!Number.isSafeInteger(budget)) throw Error("Soma excede o limite seguro");
}
export async function migrate(raw: string): Promise<State> {
  if (raw.length > 4 * 1024 * 1024) throw Error("Backup excede 4 MB");
  const v: unknown = JSON.parse(raw);
  if (!record(v)) throw Error("Backup inválido");
  if (v.version === 2) {
    validate(v);
    return v;
  }
  if (v.version !== 1 || !record(v.settings) || !Array.isArray(v.entries))
    throw Error("Backup v1 incompatível");
  const out = empty(),
    source = v.settings;
  for (const k of [
    "salary",
    "reserve",
    "cushion",
    "goal",
    "installmentCap",
  ] as const)
    if (source[k] !== undefined) out.settings[k] = cents(source[k]);
  if (source.dueDay !== undefined) out.settings.dueDay = Number(source.dueDay);
  if (source.cardLabel !== undefined)
    out.settings.cardLabel = String(source.cardLabel);
  if (source.includeExpectedRefunds !== undefined)
    out.settings.includeExpectedRefunds =
      source.includeExpectedRefunds === true;
  out.transactions = v.entries.map((x) => {
    if (
      !record(x) ||
      typeof x.id !== "string" ||
      typeof x.description !== "string" ||
      !monthOK(x.month) ||
      !kinds.includes(x.kind as Kind)
    )
      throw Error("Registro legado inválido");
    return {
      id: x.id,
      legacyId: x.id,
      description: x.description,
      amountCents: cents(x.amount),
      period: x.month,
      legacyKind: x.kind as Kind,
      accountId: x.kind === "credit" ? "legacy-credit" : "legacy-cash",
      category: String(x.category ?? ""),
      owner: String(x.owner ?? "self"),
      status: String(x.status ?? "planned"),
      confirmed: x.confirmed !== false,
      note: String(x.note ?? ""),
      ...(x.groupId !== undefined
        ? { groupId: x.groupId as string | null }
        : {}),
      ...(x.part !== undefined
        ? { part: Number(x.part), parts: Number(x.parts) }
        : {}),
      original: x,
    };
  });
  if (v.pending !== undefined && !Array.isArray(v.pending))
    throw Error("Pendências inválidas");
  out.pending = ((v.pending ?? []) as unknown[]).map((x) => {
    if (
      !record(x) ||
      typeof x.id !== "string" ||
      typeof x.description !== "string"
    )
      throw Error("Pendência inválida");
    return {
      id: x.id,
      description: x.description,
      amountCents: cents(x.amount),
      chargedAt: String(x.chargedAt ?? ""),
      note: String(x.note ?? ""),
      original: x,
    };
  });
  out.invoiceStatuses = (v.invoiceStatuses ?? {}) as Record<string, string>;
  const hash = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(raw),
  );
  out.migration = {
    at: new Date().toISOString(),
    sourceHash: Array.from(new Uint8Array(hash))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join(""),
    original: v,
  };
  validate(out);
  if (
    out.transactions.length !== v.entries.length ||
    out.transactions.some(
      (x, i) => x.id !== (v.entries as Record<string, unknown>[])[i].id,
    )
  )
    throw Error("Falha na equivalência");
  return out;
}
export function offset(period: string, n: number) {
  if (!monthOK(period)) throw Error("Competência inválida");
  const [y, m] = period.split("-").map(Number),
    d = new Date(Date.UTC(y, m - 1 + n, 1));
  const next = d.toISOString().slice(0, 7);
  if (!monthOK(next)) throw Error("Competência fora do intervalo");
  return next;
}
export function generate(
  input: Omit<Entry, "id" | "accountId">,
  parts = 1,
  repeat = 1,
  refund = false,
): Entry[] {
  if (
    !Number.isInteger(parts) ||
    parts < 1 ||
    parts > 120 ||
    !Number.isInteger(repeat) ||
    repeat < 1 ||
    repeat > 120 ||
    (parts > 1 && repeat > 1)
  )
    throw Error("Parcelas/recorrência inválidas (1–120)");
  const count = input.legacyKind === "credit" ? Math.max(parts, repeat) : 1,
    group = count > 1 ? crypto.randomUUID() : undefined;
  const entries: Entry[] = [];
  for (let i = 0; i < count; i++) {
    const x: Entry = {
      ...input,
      id: crypto.randomUUID(),
      accountId:
        input.legacyKind === "credit" ? "legacy-credit" : "legacy-cash",
      period: offset(input.period, i),
      confirmed: i === 0 ? input.confirmed : false,
      ...(group ? { groupId: group } : {}),
      ...(parts > 1 ? { parts, part: i + 1 } : {}),
    };
    entries.push(x);
    if (refund && x.legacyKind === "credit" && x.owner === "third")
      entries.push({
        ...x,
        id: crypto.randomUUID(),
        accountId: "legacy-cash",
        legacyKind: "reimbursement",
        description: "Reembolso — " + x.description,
        owner: "self",
        status: "planned",
        confirmed: true,
        purchaseId: x.id,
        note: "Gerado para compra de outra pessoa.",
      });
  }
  return entries;
}
export function metrics(s: State, period: string) {
  const a = s.transactions.filter((x) => x.period === period);
  const sum = (xs: Entry[]) => xs.reduce((n, x) => n + x.amountCents, 0),
    cards = a.filter((x) => x.legacyKind === "credit"),
    refund = a.filter((x) => x.legacyKind === "reimbursement"),
    received = sum(refund.filter((x) => x.status === "received")),
    pending = sum(refund.filter((x) => x.status !== "received")),
    income = sum(
      a.filter((x) => x.legacyKind === "income" && x.status === "received"),
    ),
    invoice = sum(cards),
    cash = sum(a.filter((x) => x.legacyKind === "out")),
    revenue =
      s.settings.salary +
      received +
      income +
      (s.settings.includeExpectedRefunds ? pending : 0),
    commitment = invoice + cash + s.settings.cushion;
  return {
    invoice,
    cash,
    received,
    pending,
    income,
    revenue,
    commitment,
    available: revenue - commitment,
    unconfirmed: sum(cards.filter((x) => !x.confirmed)),
    third: sum(cards.filter((x) => x.owner === "third")),
    unknown: sum(cards.filter((x) => x.owner === "unknown")),
  };
}
export function csv(es: Entry[]) {
  const safe = (v: unknown) =>
    '"' +
    String(v ?? "")
      .replace(/^[=+@\-\t\r]/, "'$&")
      .replaceAll('"', '""') +
    '"';
  return (
    "\ufeff" +
    [
      [
        "ID",
        "Competência",
        "Tipo",
        "Descrição",
        "Categoria",
        "Valor",
        "Responsável",
        "Situação",
        "Confirmado",
        "Parcela",
        "Parcelas",
        "Grupo",
        "Observação",
      ],
      ...es.map((x) => [
        x.id,
        x.period,
        x.legacyKind,
        x.description,
        x.category,
        (x.amountCents / 100).toFixed(2).replace(".", ","),
        x.owner,
        x.status,
        x.confirmed,
        x.part,
        x.parts,
        x.groupId,
        x.note,
      ]),
    ]
      .map((r) => r.map(safe).join(";"))
      .join("\r\n")
  );
}
