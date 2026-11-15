import { cents, type Entry, type Kind } from "./model.ts";
export type EntryFilters = {
  query: string;
  kind: Kind | "all";
  status: string;
  all: boolean;
  min: string;
  max: string;
  category: string;
  order: string;
};
export const initialFilters: EntryFilters = {
  query: "",
  kind: "all",
  status: "all",
  all: false,
  min: "",
  max: "",
  category: "",
  order: "period-desc",
};
export const fold = (v: string) =>
  v
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("pt-BR");
export function categoryOptions(entries: Entry[]) {
  const map = new Map<string, string>();
  for (const value of [
    ...entries.map((x) => x.category),
    "Compras",
    "Assinatura",
    "Alimentação",
    "Transporte",
    "Casa",
    "Outros",
  ]) {
    const trimmed = value.trim().replace(/\s+/g, " ");
    if (trimmed && !map.has(fold(trimmed))) map.set(fold(trimmed), trimmed);
  }
  return [...map.values()].sort((a, b) => a.localeCompare(b, "pt-BR"));
}
export function canonicalCategory(value: string, entries: Entry[]) {
  const text = value.normalize("NFKC").trim().replace(/\s+/g, " ");
  return categoryOptions(entries).find((x) => fold(x) === fold(text)) ?? text;
}
export function selectEntries(
  entries: Entry[],
  period: string,
  f: EntryFilters,
) {
  const min = f.min.trim() ? cents(f.min) : null,
    max = f.max.trim() ? cents(f.max) : null;
  if (min !== null && max !== null && min > max)
    throw Error("O valor mínimo não pode ser maior que o máximo.");
  return entries
    .filter(
      (x) =>
        (f.all || x.period === period) &&
        (f.kind === "all" || x.legacyKind === f.kind) &&
        (!f.category || fold(x.category) === fold(f.category)) &&
        fold(x.description + " " + x.category + " " + x.note).includes(
          fold(f.query),
        ) &&
        (min === null || x.amountCents >= min) &&
        (max === null || x.amountCents <= max) &&
        (f.status === "all" ||
          (f.status === "forecast" &&
            x.legacyKind === "credit" &&
            !x.confirmed) ||
          (f.status === "confirmed" &&
            x.legacyKind === "credit" &&
            x.confirmed) ||
          (f.status === "received" &&
            x.legacyKind !== "credit" &&
            x.status === "received") ||
          (f.status === "partial" &&
            x.ledgerManaged &&
            x.status === "partial") ||
          (f.status === "cancelled" &&
            x.ledgerManaged &&
            x.status === "cancelled") ||
          (f.status === "pending" &&
            x.legacyKind !== "credit" &&
            x.status !== "received" &&
            (!x.ledgerManaged || x.status !== "cancelled"))),
    )
    .sort((a, b) => {
      if (f.all && a.period !== b.period)
        return f.order === "period-asc"
          ? a.period.localeCompare(b.period)
          : b.period.localeCompare(a.period);
      const tie = a.id.localeCompare(b.id);
      switch (f.order) {
        case "amount-asc":
          return a.amountCents - b.amountCents || tie;
        case "amount-desc":
          return b.amountCents - a.amountCents || tie;
        case "description":
          return a.description.localeCompare(b.description, "pt-BR") || tie;
        case "period-asc":
          return (
            a.period.localeCompare(b.period) ||
            a.description.localeCompare(b.description, "pt-BR") ||
            tie
          );
        default:
          return (
            b.period.localeCompare(a.period) ||
            a.description.localeCompare(b.description, "pt-BR") ||
            tie
          );
      }
    });
}
export function entrySituation(x: Entry) {
  if (x.ledgerManaged && x.status === "cancelled")
    return { label: "Cancelada", action: "Consultar registro" };
  if (x.ledgerManaged && x.status === "partial")
    return {
      label:
        x.legacyKind === "out" ? "Parcialmente paga" : "Parcialmente recebido",
      action: "Gerenciar pagamentos",
    };
  if (x.ledgerManaged && x.legacyKind !== "credit")
    return {
      label:
        x.status === "received"
          ? x.legacyKind === "out"
            ? "Paga"
            : "Recebida"
          : "Pendente",
      action: "Gerenciar pagamentos",
    };
  if (x.legacyKind === "credit")
    return {
      label: x.confirmed ? "Confirmada" : "Prevista",
      action: x.confirmed ? "Voltar para prevista" : "Confirmar compra",
    };
  if (x.legacyKind === "out")
    return {
      label: x.status === "received" ? "Paga" : "Pendente",
      action:
        x.status === "received" ? "Marcar como pendente" : "Marcar como paga",
    };
  if (x.legacyKind === "income")
    return {
      label: x.status === "received" ? "Recebida" : "A receber",
      action:
        x.status === "received"
          ? "Desfazer recebimento"
          : "Marcar como recebida",
    };
  return {
    label: x.status === "received" ? "Recebido" : "A receber",
    action:
      x.status === "received" ? "Desfazer recebimento" : "Marcar como recebido",
  };
}
export function toggleSituation(x: Entry): Entry {
  return x.legacyKind === "credit"
    ? { ...x, confirmed: !x.confirmed }
    : { ...x, status: x.status === "received" ? "planned" : "received" };
}
export function filteredTotals(es: Entry[]) {
  const rows = es.filter((x) => !x.ledgerManaged || x.status !== "cancelled");
  const total = (kind: Kind) =>
    rows
      .filter((x) => x.legacyKind === kind)
      .reduce((n, x) => n + x.amountCents, 0);
  const paid = (kind: Kind) =>
    rows
      .filter((x) => x.legacyKind === kind)
      .reduce(
        (n, x) =>
          n +
          (x.ledgerPaidCents ?? (x.status === "received" ? x.amountCents : 0)),
        0,
      );
  return {
    income: total("income"),
    incomeReceived: paid("income"),
    out: total("out"),
    outPaid: paid("out"),
    credit: total("credit"),
    refundReceived: paid("reimbursement"),
    refundPending: total("reimbursement") - paid("reimbursement"),
  };
}
